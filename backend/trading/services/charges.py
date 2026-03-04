"""
Brokerage & Charges Calculation Engine.

Supports:
  - Fixed brokerage (flat ₹ amount per trade)
  - Percentage brokerage (% of trade value)
  - Slippage adjustment
  - STT (Securities Transaction Tax)
  - GST on brokerage
  - Exchange transaction charges

BUY:  effective_price = price + slippage
      total_cost = trade_value + all_charges

SELL: effective_price = price - slippage
      total_received = trade_value - all_charges

All monetary values use Python Decimal for precision.
"""
from decimal import Decimal, ROUND_HALF_UP


def _round(val: Decimal, places: int = 4) -> Decimal:
    quantize_str = Decimal(10) ** -places
    return val.quantize(quantize_str, rounding=ROUND_HALF_UP)


def calculate_charges(
    price: Decimal,
    quantity: int,
    order_type: str,
    config,
) -> dict:
    """
    Calculate all charges for a single order.

    Args:
        price: Input price (raw, before slippage)
        quantity: Number of shares
        order_type: 'BUY' or 'SELL'
        config: ChargesConfig model instance (or None)

    Returns:
        dict with keys:
            effective_price, brokerage_amount, stt, gst,
            exchange_charges, total_charges, trade_value, total_amount
    """
    price = Decimal(str(price))
    quantity = int(quantity)

    # If no config or charges disabled, return clean values
    if config is None or not config.apply_charges:
        return {
            'effective_price': price,
            'brokerage_amount': Decimal('0'),
            'stt': Decimal('0'),
            'gst': Decimal('0'),
            'exchange_charges': Decimal('0'),
            'total_charges': Decimal('0'),
            'trade_value': price * quantity,
            'total_amount': price * quantity,
        }

    slippage_pct = Decimal(str(config.slippage_percent))

    # Apply slippage
    if order_type == 'BUY':
        effective_price = price * (1 + slippage_pct)
    else:
        effective_price = price * (1 - slippage_pct)

    effective_price = _round(effective_price)
    trade_value = _round(effective_price * quantity)

    # Brokerage
    if config.brokerage_type == 'fixed':
        brokerage = _round(Decimal(str(config.brokerage_value)))
    else:
        brokerage = _round(trade_value * Decimal(str(config.brokerage_value)))

    # STT
    stt = _round(trade_value * Decimal(str(config.stt_percent)))

    # GST on brokerage
    gst = _round(brokerage * Decimal(str(config.gst_percent)))

    # Exchange charges
    exchange_charges = _round(trade_value * Decimal(str(config.exchange_percent)))

    total_charges = _round(brokerage + stt + gst + exchange_charges)

    if order_type == 'BUY':
        total_amount = _round(trade_value + total_charges)
    else:
        total_amount = _round(trade_value - total_charges)

    return {
        'effective_price': effective_price,
        'brokerage_amount': brokerage,
        'stt': stt,
        'gst': gst,
        'exchange_charges': exchange_charges,
        'total_charges': total_charges,
        'trade_value': trade_value,
        'total_amount': total_amount,
    }
