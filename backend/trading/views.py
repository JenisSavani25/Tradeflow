from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChargesConfig, Order, Position, TradeMatching, PortfolioHistory
from .serializers import (
    ChargesConfigSerializer, OrderSerializer,
    PlaceBuyOrderSerializer, PlaceSellOrderSerializer,
    PositionSerializer, TradeMatchingSerializer, PortfolioHistorySerializer
)
from .services.charges import calculate_charges
from .services.manual_engine import execute_manual_sell
from .services.analytics import get_analytics, get_equity_curve, record_portfolio_snapshot


# ── Charges Config ────────────────────────────────────────────────────────────

class ChargesConfigView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/charges/ — Get or update user's charges config."""
    serializer_class = ChargesConfigSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        config, _ = ChargesConfig.objects.get_or_create(user=self.request.user)
        return config


# ── BUY Order ─────────────────────────────────────────────────────────────────

class PlaceBuyOrderView(APIView):
    """POST /api/orders/buy/ — Place a BUY order."""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = PlaceBuyOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data         = serializer.validated_data
        user         = request.user
        stock_symbol = data['stock_symbol']
        price        = Decimal(str(data['price']))
        quantity     = int(data['quantity'])

        # Fetch charges config
        config, _ = ChargesConfig.objects.get_or_create(user=user)
        charges   = calculate_charges(price, quantity, 'BUY', config)
        total_cost = charges['total_amount']

        # Capital validation
        user.refresh_from_db()
        if user.available_capital < total_cost:
            return Response(
                {
                    'error': (
                        f"Insufficient capital. "
                        f"Required: ₹{total_cost:.2f}, "
                        f"Available: ₹{user.available_capital:.2f}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create BUY Order (remaining_quantity = quantity)
        order = Order.objects.create(
            user=user,
            stock_symbol=stock_symbol,
            order_type='BUY',
            price=price,
            effective_price=charges['effective_price'],
            quantity=quantity,
            remaining_quantity=quantity,        # Full lot available to sell
            brokerage_amount=charges['brokerage_amount'],
            total_charges=charges['total_charges'],
            total_amount=total_cost,
            status='EXECUTED',
        )

        # Update Position (weighted average)
        position, _ = Position.objects.select_for_update().get_or_create(
            user=user,
            stock_symbol=stock_symbol,
            defaults={
                'total_quantity': 0,
                'average_price': Decimal('0'),
                'status': 'OPEN',
            }
        )
        if position.total_quantity == 0:
            position.average_price = charges['effective_price']
            position.total_quantity = quantity
        else:
            total_cost_existing = position.average_price * position.total_quantity
            total_cost_new      = charges['effective_price'] * quantity
            new_qty             = position.total_quantity + quantity
            position.average_price = (total_cost_existing + total_cost_new) / new_qty
            position.total_quantity = new_qty
        position.status = 'OPEN'
        position.save()

        # Deduct capital
        user.deduct_capital(total_cost)

        # Record portfolio snapshot
        record_portfolio_snapshot(user)

        return Response(
            {
                'message': f"BUY order executed. ₹{total_cost:.2f} deducted.",
                'order': OrderSerializer(order).data,
                'available_capital': float(user.available_capital),
                'charges_breakdown': {
                    'effective_price':  float(charges['effective_price']),
                    'brokerage':        float(charges['brokerage_amount']),
                    'stt':              float(charges['stt']),
                    'gst':              float(charges['gst']),
                    'exchange':         float(charges['exchange_charges']),
                    'total_charges':    float(charges['total_charges']),
                    'total_cost':       float(total_cost),
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ── SELL Order ────────────────────────────────────────────────────────────────

class PlaceSellOrderView(APIView):
    """
    POST /api/orders/sell/
    
    Accepts:
    {
        "stock_symbol": "RELIANCE",
        "sell_price": 2500.00,
        "selected_lots": [
            {"lot_id": 5, "quantity": 10},
            {"lot_id": 3, "quantity": 5}
        ]
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PlaceSellOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data          = serializer.validated_data
        user          = request.user
        stock_symbol  = data['stock_symbol']
        sell_price    = Decimal(str(data['sell_price']))
        selected_lots = data['selected_lots']   # [{'lot_id': int, 'quantity': int}]

        total_qty = sum(lot['quantity'] for lot in selected_lots)

        # Calculate charges on the sell
        config, _ = ChargesConfig.objects.get_or_create(user=user)
        charges   = calculate_charges(sell_price, total_qty, 'SELL', config)

        # Create SELL Order record
        sell_order = Order.objects.create(
            user=user,
            stock_symbol=stock_symbol,
            order_type='SELL',
            price=sell_price,
            effective_price=charges['effective_price'],
            quantity=total_qty,
            remaining_quantity=0,       # SELL orders never have remaining qty
            brokerage_amount=charges['brokerage_amount'],
            total_charges=charges['total_charges'],
            total_amount=charges['total_amount'],
            status='EXECUTED',
        )

        # Run manual matching engine (atomic inside)
        try:
            matching_entries = execute_manual_sell(user, sell_order, selected_lots)
        except DjangoValidationError as e:
            # Rollback sell order
            sell_order.status = 'CANCELLED'
            sell_order.save(update_fields=['status'])
            msg = e.messages[0] if hasattr(e, 'messages') else str(e)
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

        user.refresh_from_db()
        record_portfolio_snapshot(user)

        total_net_profit = sum(m.net_profit for m in matching_entries)

        return Response(
            {
                'message': f"SELL executed. {total_qty} units of {stock_symbol} sold.",
                'order': OrderSerializer(sell_order).data,
                'available_capital': float(user.available_capital),
                'net_profit': float(total_net_profit),
                'matched_lots': len(matching_entries),
                'charges_breakdown': {
                    'effective_price':  float(charges['effective_price']),
                    'brokerage':        float(charges['brokerage_amount']),
                    'stt':              float(charges['stt']),
                    'gst':              float(charges['gst']),
                    'exchange':         float(charges['exchange_charges']),
                    'total_charges':    float(charges['total_charges']),
                    'total_received':   float(charges['total_amount']),
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ── Available BUY Lots for Sell UI ────────────────────────────────────────────

class AvailableLotsView(APIView):
    """
    GET /api/orders/lots/?symbol=RELIANCE
    
    Returns all BUY lots for a symbol that still have remaining_quantity > 0.
    Used by the frontend to show the lot selection UI during a SELL.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        symbol = request.query_params.get('symbol', '').upper()
        if not symbol:
            return Response({'error': 'symbol query param is required.'}, status=400)

        lots = (
            Order.objects
            .filter(
                user=request.user,
                stock_symbol=symbol,
                order_type='BUY',
                remaining_quantity__gt=0,
                status='EXECUTED',
            )
            .order_by('-created_at')   # Newest first (LIFO order for display)
        )
        return Response(OrderSerializer(lots, many=True).data)


# ── Orders List ───────────────────────────────────────────────────────────────

class OrderListView(generics.ListAPIView):
    """GET /api/orders/ — List all orders for the user."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.filter(user=self.request.user)
        order_type = self.request.query_params.get('type')
        symbol     = self.request.query_params.get('symbol')
        if order_type:
            qs = qs.filter(order_type=order_type.upper())
        if symbol:
            qs = qs.filter(stock_symbol=symbol.upper())
        return qs


# ── Positions ─────────────────────────────────────────────────────────────────

class PositionListView(generics.ListAPIView):
    """GET /api/positions/ — All positions."""
    serializer_class = PositionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status', 'OPEN')
        return Position.objects.filter(
            user=self.request.user,
            status=status_filter.upper()
        )


# ── Trade Matching Ledger ─────────────────────────────────────────────────────

class TradeMatchingListView(generics.ListAPIView):
    """GET /api/ledger/ — All TradeMatching entries (SELL ↔ BUY pairs)."""
    serializer_class = TradeMatchingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            TradeMatching.objects
            .filter(user=self.request.user)
            .select_related('buy_order', 'sell_order')
        )
        symbol = self.request.query_params.get('symbol')
        if symbol:
            qs = qs.filter(stock_symbol=symbol.upper())
        return qs


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsView(APIView):
    """GET /api/analytics/ — Full analytics dashboard data."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        analytics    = get_analytics(request.user)
        equity_curve = get_equity_curve(request.user)
        analytics['equity_curve'] = equity_curve
        return Response(analytics)


# ── Portfolio History ─────────────────────────────────────────────────────────

class PortfolioHistoryView(generics.ListAPIView):
    """GET /api/portfolio/history/ — Equity history for charts."""
    serializer_class = PortfolioHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PortfolioHistory.objects.filter(user=self.request.user)


# ── Stock Suggestions ─────────────────────────────────────────────────────────

class StockSuggestionsView(APIView):
    """GET /api/stocks/suggestions/ — Unique stock symbols from user history."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        order_syms    = Order.objects.filter(user=request.user).values_list('stock_symbol', flat=True).distinct()
        position_syms = Position.objects.filter(user=request.user).values_list('stock_symbol', flat=True).distinct()
        symbols = sorted(set(list(order_syms) + list(position_syms)))
        return Response(symbols)
