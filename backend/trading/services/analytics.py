"""
Analytics Engine — Computes all trading performance metrics.
Uses TradeMatching as the source of truth for realized P/L.
"""
from decimal import Decimal
from datetime import date
from django.db.models import Sum, Count, Q

from trading.models import TradeMatching, Order, Position, PortfolioHistory


def get_analytics(user) -> dict:
    """
    Returns a comprehensive dict of trading performance metrics for a user.
    """
    # All TradeMatching entries = realized closed trades
    matchings = TradeMatching.objects.filter(user=user)

    total_trades = matchings.count()

    # Realized P/L
    agg = matchings.aggregate(
        total_net=Sum('net_profit'),
        total_gross=Sum('gross_profit'),
        total_charges=Sum('charges_allocated'),
    )
    realized_pnl  = agg['total_net']  or Decimal('0')
    total_gross   = agg['total_gross'] or Decimal('0')
    total_charges = agg['total_charges'] or Decimal('0')

    # Win / Loss (per TradeMatching row)
    wins   = matchings.filter(net_profit__gt=0).count()
    losses = matchings.filter(net_profit__lte=0).count()

    win_rate = round((wins / total_trades * 100), 2) if total_trades > 0 else 0

    # Avg win / avg loss
    win_qs  = matchings.filter(net_profit__gt=0).aggregate(avg=Sum('net_profit'))
    loss_qs = matchings.filter(net_profit__lte=0).aggregate(avg=Sum('net_profit'))

    avg_win  = (win_qs['avg']  or Decimal('0')) / wins   if wins   > 0 else Decimal('0')
    avg_loss = (loss_qs['avg'] or Decimal('0')) / losses if losses > 0 else Decimal('0')

    # Profit Factor
    gross_wins   = matchings.filter(net_profit__gt=0).aggregate(s=Sum('net_profit'))['s'] or Decimal('0')
    gross_losses = abs(matchings.filter(net_profit__lte=0).aggregate(s=Sum('net_profit'))['s'] or Decimal('0'))

    profit_factor = round(float(gross_wins / gross_losses), 2) if gross_losses > 0 else 0

    # Expectancy
    expectancy = (
        (win_rate / 100) * float(avg_win) + ((1 - win_rate / 100) * float(avg_loss))
        if total_trades > 0 else 0
    )

    # Open positions
    open_positions = Position.objects.filter(user=user, status='OPEN')
    open_count    = open_positions.count()

    # Invested capital = sum of (avg_price * qty) for open positions
    invested = open_positions.aggregate(
        total=Sum('average_price')  # approximate; real = sum(avg_price*qty)
    )
    invested_capital = Decimal('0')
    for pos in open_positions:
        invested_capital += pos.average_price * pos.total_quantity

    # Capital utilization
    user_obj = user.__class__.objects.get(pk=user.pk)
    total_capital     = user_obj.total_capital
    available_capital = user_obj.available_capital
    capital_util = (
        round(float((total_capital - available_capital) / total_capital * 100), 2)
        if total_capital > 0 else 0
    )

    # Order counts
    buy_count  = Order.objects.filter(user=user, order_type='BUY',  status='EXECUTED').count()
    sell_count = Order.objects.filter(user=user, order_type='SELL', status='EXECUTED').count()

    # Max drawdown (from PortfolioHistory)
    max_drawdown = _calculate_max_drawdown(user)

    return {
        'realized_pnl':          float(realized_pnl),
        'total_gross_profit':    float(total_gross),
        'total_charges_paid':    float(total_charges),
        'total_trades':          total_trades,
        'win_count':             wins,
        'loss_count':            losses,
        'win_rate':              win_rate,
        'avg_win':               float(avg_win),
        'avg_loss':              float(avg_loss),
        'profit_factor':         profit_factor,
        'expectancy':            round(expectancy, 2),
        'open_positions_count':  open_count,
        'invested_capital':      float(invested_capital),
        'total_capital':         float(total_capital),
        'available_capital':     float(available_capital),
        'capital_utilization':   capital_util,
        'total_buy_orders':      buy_count,
        'total_sell_orders':     sell_count,
        'max_drawdown':          max_drawdown,
    }


def _calculate_max_drawdown(user) -> float:
    """Calculate maximum peak-to-trough drawdown from portfolio history."""
    history = list(
        PortfolioHistory.objects.filter(user=user)
        .order_by('date')
        .values_list('total_equity', flat=True)
    )
    if len(history) < 2:
        return 0.0
    peak     = history[0]
    max_dd   = Decimal('0')
    for equity in history:
        if equity > peak:
            peak = equity
        if peak > 0:
            dd = (peak - equity) / peak * 100
            if dd > max_dd:
                max_dd = dd
    return round(float(max_dd), 2)


def get_equity_curve(user) -> list:
    """Return list of {date, equity} dicts for charting."""
    records = (
        PortfolioHistory.objects
        .filter(user=user)
        .order_by('date')
        .values('date', 'total_equity')
    )
    return [
        {'date': str(r['date']), 'equity': float(r['total_equity'])}
        for r in records
    ]


def record_portfolio_snapshot(user):
    """
    Record (or update) today's portfolio equity snapshot.
    Total equity = available_capital + sum of current open position values.
    """
    user.refresh_from_db()
    today = date.today()

    open_positions = Position.objects.filter(user=user, status='OPEN')
    invested = Decimal('0')
    for pos in open_positions:
        invested += pos.average_price * pos.total_quantity

    total_equity = user.available_capital + invested

    PortfolioHistory.objects.update_or_create(
        user=user,
        date=today,
        defaults={'total_equity': total_equity}
    )
