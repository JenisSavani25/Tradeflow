"""
Manual Lot Selection Engine — Sell order matching with user-selected BUY lots.

Rules enforced:
  ✅ User explicitly selects which BUY lots to sell from
  ✅ Partial selling supported per lot
  ✅ @transaction.atomic — full atomicity, zero partial states
  ✅ select_for_update() — prevents double-sell and race conditions
  ✅ Instrument mismatch check — cannot mix symbols in one sell
  ✅ Oversell protection — remaining_quantity >= requested per lot
  ✅ Snapshots stored — historical P/L immune to future price changes
  ✅ PROTECT FK — BUY lots with matchings cannot be deleted
"""
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError

from trading.models import Order, Position, TradeMatching


@transaction.atomic
def execute_manual_sell(user, sell_order: Order, selected_lots: list) -> list:
    """
    Match a SELL order against user-selected BUY lots.

    Args:
        user:          User instance
        sell_order:    The newly created SELL Order (already saved with status=EXECUTED)
        selected_lots: List of dicts — [{'lot_id': int, 'quantity': int}, ...]

    Returns:
        List of TradeMatching entries created

    Raises:
        ValidationError on any validation failure (rolls back entire transaction)
    """
    stock_symbol = sell_order.stock_symbol
    sell_price   = sell_order.effective_price
    total_charges = sell_order.total_charges  # Full charges on the sell order

    # ── Step B: Lock selected BUY lots (prevents race conditions) ────────────
    lot_ids = [lot['lot_id'] for lot in selected_lots]
    locked_lots = (
        Order.objects
        .select_for_update()
        .filter(
            id__in=lot_ids,
            order_type='BUY',
            user=user,
            status='EXECUTED',
        )
    )

    # Build a lookup map for quick access
    lot_map = {lot.id: lot for lot in locked_lots}

    # ── Step C: Validate every requested lot ─────────────────────────────────
    requested_map = {lot['lot_id']: lot['quantity'] for lot in selected_lots}

    for lot_id, requested_qty in requested_map.items():
        # 1. Lot must exist and belong to this user
        if lot_id not in lot_map:
            raise ValidationError(
                f"BUY lot #{lot_id} not found or does not belong to this account."
            )

        lot = lot_map[lot_id]

        # 2. Instrument mismatch protection
        if lot.stock_symbol != stock_symbol:
            raise ValidationError(
                f"Lot #{lot_id} is for {lot.stock_symbol}, "
                f"but sell is for {stock_symbol}. Cannot mix instruments."
            )

        # 3. Oversell protection
        if lot.remaining_quantity < requested_qty:
            raise ValidationError(
                f"Lot #{lot_id} has only {lot.remaining_quantity} units remaining, "
                f"but you requested {requested_qty}."
            )

        # 4. Quantity must be positive
        if requested_qty <= 0:
            raise ValidationError(f"Quantity for lot #{lot_id} must be greater than 0.")

    # ── Step D: Validate total quantity matches sell order ────────────────────
    total_requested = sum(requested_map.values())
    if total_requested != sell_order.quantity:
        raise ValidationError(
            f"Total selected quantity ({total_requested}) does not match "
            f"sell quantity ({sell_order.quantity})."
        )

    # ── Steps F + G: Perform matching and calculate profit ───────────────────
    matching_entries = []
    total_gross_profit = Decimal('0')

    for lot_id, matched_qty in requested_map.items():
        lot = lot_map[lot_id]
        buy_price = lot.effective_price

        # Gross profit for this lot
        gross_profit = (sell_price - buy_price) * matched_qty

        # Proportional charges for this lot
        if total_requested > 0:
            charges_allocated = (
                total_charges * Decimal(str(matched_qty)) / Decimal(str(total_requested))
            )
        else:
            charges_allocated = Decimal('0')

        net_profit_for_lot = gross_profit - charges_allocated

        # Create TradeMatching record
        matching = TradeMatching.objects.create(
            user=user,
            buy_order=lot,
            sell_order=sell_order,
            stock_symbol=stock_symbol,
            matched_quantity=matched_qty,
            buy_price_snapshot=buy_price,
            sell_price_snapshot=sell_price,
            gross_profit=gross_profit,
            charges_allocated=charges_allocated,
            net_profit=net_profit_for_lot,
        )
        matching_entries.append(matching)
        total_gross_profit += gross_profit

        # Reduce remaining_quantity on BUY lot
        lot.remaining_quantity -= matched_qty
        lot.save(update_fields=['remaining_quantity'])

    # ── Update SELL order net_profit ──────────────────────────────────────────
    sell_order.net_profit = total_gross_profit - total_charges
    sell_order.save(update_fields=['net_profit'])

    # ── Update Position ───────────────────────────────────────────────────────
    try:
        position = (
            Position.objects
            .select_for_update()
            .get(user=user, stock_symbol=stock_symbol, status='OPEN')
        )
    except Position.DoesNotExist:
        raise ValidationError(f"No open position found for {stock_symbol}.")

    position.total_quantity -= total_requested
    if position.total_quantity <= 0:
        position.total_quantity = 0
        position.status = 'CLOSED'
    position.save(update_fields=['total_quantity', 'status'])

    # ── Credit capital back to user ───────────────────────────────────────────
    user.credit_capital(sell_order.total_amount)
    user.refresh_from_db()

    return matching_entries
