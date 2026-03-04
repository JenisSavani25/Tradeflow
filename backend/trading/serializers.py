from decimal import Decimal
from rest_framework import serializers
from .models import ChargesConfig, Order, Position, TradeMatching, PortfolioHistory


class ChargesConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChargesConfig
        exclude = ['user']


class OrderSerializer(serializers.ModelSerializer):
    is_fully_sold = serializers.SerializerMethodField()
    available_to_sell = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'stock_symbol', 'order_type', 'price', 'effective_price',
            'quantity', 'remaining_quantity', 'brokerage_amount', 'total_charges',
            'total_amount', 'net_profit', 'status', 'created_at',
            'is_fully_sold', 'available_to_sell',
        ]
        read_only_fields = ['id', 'created_at']

    def get_is_fully_sold(self, obj):
        return obj.order_type == 'BUY' and obj.remaining_quantity == 0

    def get_available_to_sell(self, obj):
        """How many units are still available from this BUY lot."""
        if obj.order_type == 'BUY':
            return obj.remaining_quantity
        return None


class PositionSerializer(serializers.ModelSerializer):
    invested_value = serializers.SerializerMethodField()

    class Meta:
        model = Position
        fields = [
            'id', 'stock_symbol', 'total_quantity', 'average_price',
            'status', 'updated_at', 'invested_value',
        ]

    def get_invested_value(self, obj):
        return float(obj.average_price * obj.total_quantity)


class TradeMatchingSerializer(serializers.ModelSerializer):
    buy_order_date = serializers.SerializerMethodField()

    class Meta:
        model = TradeMatching
        fields = [
            'id', 'stock_symbol', 'matched_quantity',
            'buy_price_snapshot', 'sell_price_snapshot',
            'gross_profit', 'charges_allocated', 'net_profit',
            'buy_order', 'sell_order', 'buy_order_date', 'created_at',
        ]
        read_only_fields = fields

    def get_buy_order_date(self, obj):
        return obj.buy_order.created_at.strftime('%d %b %Y') if obj.buy_order else None


class PortfolioHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioHistory
        fields = ['date', 'total_equity']


# ── Input Serializers ─────────────────────────────────────────────────────────

class PlaceBuyOrderSerializer(serializers.Serializer):
    """Validates a BUY order request."""
    stock_symbol = serializers.CharField(max_length=30)
    price        = serializers.DecimalField(max_digits=12, decimal_places=4, min_value=Decimal('0.0001'))
    quantity     = serializers.IntegerField(min_value=1)

    def validate_stock_symbol(self, value):
        return value.strip().upper()


class SelectedLotSerializer(serializers.Serializer):
    """A single lot selection inside a SELL request."""
    lot_id   = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class PlaceSellOrderSerializer(serializers.Serializer):
    """
    Validates a SELL order request with manual lot selection.
    
    Example payload:
    {
        "stock_symbol": "RELIANCE",
        "sell_price": 2500.00,
        "selected_lots": [
            {"lot_id": 5, "quantity": 10},
            {"lot_id": 3, "quantity": 5}
        ]
    }
    """
    stock_symbol   = serializers.CharField(max_length=30)
    sell_price     = serializers.DecimalField(max_digits=12, decimal_places=4, min_value=Decimal('0.0001'))
    selected_lots  = SelectedLotSerializer(many=True, min_length=1)

    def validate_stock_symbol(self, value):
        return value.strip().upper()

    def validate_selected_lots(self, value):
        if not value:
            raise serializers.ValidationError("At least one lot must be selected.")
        # Check for duplicate lot_ids
        ids = [lot['lot_id'] for lot in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Duplicate lot IDs are not allowed.")
        return value
