from django.db import models
from django.conf import settings
from decimal import Decimal


class ChargesConfig(models.Model):
    """
    Per-user brokerage and charges configuration.
    Snapshot values are stored on each Order to preserve history.
    """
    BROKERAGE_TYPE_CHOICES = [
        ('fixed', 'Fixed Amount'),
        ('percentage', 'Percentage'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='charges_config'
    )
    brokerage_type = models.CharField(
        max_length=20, choices=BROKERAGE_TYPE_CHOICES, default='percentage'
    )
    brokerage_value = models.DecimalField(
        max_digits=10, decimal_places=4, default=Decimal('0.0003'),
        help_text="Fixed amount in ₹ or percentage (e.g., 0.0003 = 0.03%)"
    )
    stt_percent = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal('0.001'),
        help_text="Securities Transaction Tax (e.g., 0.001 = 0.1%)"
    )
    gst_percent = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal('0.18'),
        help_text="GST on brokerage (e.g., 0.18 = 18%)"
    )
    exchange_percent = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal('0.0000345'),
        help_text="Exchange transaction charges"
    )
    slippage_percent = models.DecimalField(
        max_digits=6, decimal_places=4, default=Decimal('0.0005'),
        help_text="Slippage percentage (e.g., 0.0005 = 0.05%)"
    )
    apply_charges = models.BooleanField(
        default=True, help_text="Toggle all charges on/off"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'charges_config'
        verbose_name = 'Charges Configuration'

    def __str__(self):
        return f"{self.user.username} — {self.brokerage_type} @ {self.brokerage_value}"


class Order(models.Model):
    """
    Represents a single BUY or SELL trade record.
    
    BUY:  remaining_quantity starts = quantity, decreases as lots are sold.
    SELL: remaining_quantity = 0 always. net_profit stores the final P/L.
    """
    ORDER_TYPE_CHOICES = [('BUY', 'Buy'), ('SELL', 'Sell')]
    STATUS_CHOICES = [('EXECUTED', 'Executed'), ('CANCELLED', 'Cancelled')]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    stock_symbol = models.CharField(max_length=30, db_index=True)
    order_type = models.CharField(max_length=4, choices=ORDER_TYPE_CHOICES)
    price = models.DecimalField(max_digits=12, decimal_places=4)
    effective_price = models.DecimalField(max_digits=12, decimal_places=4)
    quantity = models.PositiveIntegerField()
    remaining_quantity = models.PositiveIntegerField(default=0)
    brokerage_amount = models.DecimalField(
        max_digits=12, decimal_places=4, default=Decimal('0.0000')
    )
    total_charges = models.DecimalField(
        max_digits=12, decimal_places=4, default=Decimal('0.0000')
    )
    total_amount = models.DecimalField(
        max_digits=15, decimal_places=4, default=Decimal('0.0000'),
        help_text="Total capital impact of this order"
    )
    # ── SELL-only field ──────────────────────────────────────────────────────
    net_profit = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True,
        help_text="Net realized profit for this SELL order (after all charges)"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='EXECUTED')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'stock_symbol', 'order_type']),
            models.Index(fields=['user', 'stock_symbol', 'remaining_quantity']),
        ]

    def __str__(self):
        return f"{self.order_type} {self.quantity} {self.stock_symbol} @ ₹{self.price}"

    @property
    def is_fully_sold(self):
        """True when this BUY lot has no remaining quantity."""
        return self.order_type == 'BUY' and self.remaining_quantity == 0

    @property
    def can_be_deleted(self):
        """Protect BUY lots that have matching records."""
        return not self.buy_matchings.exists()


class Position(models.Model):
    """
    Aggregated view of current open holdings per user per stock.
    Derived from BUY orders; updated on every BUY and SELL.
    """
    STATUS_CHOICES = [('OPEN', 'Open'), ('CLOSED', 'Closed')]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='positions'
    )
    stock_symbol = models.CharField(max_length=30, db_index=True)
    total_quantity = models.PositiveIntegerField(default=0)
    average_price = models.DecimalField(
        max_digits=12, decimal_places=4, default=Decimal('0.0000')
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'positions'
        unique_together = [['user', 'stock_symbol']]
        indexes = [
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} | {self.stock_symbol} | {self.total_quantity} @ ₹{self.average_price}"

    def recalculate_average(self, new_qty: int, new_price: Decimal):
        """Weighted average price after a new BUY."""
        if self.total_quantity == 0:
            self.average_price = new_price
        else:
            total_cost = (self.average_price * self.total_quantity) + (new_price * new_qty)
            self.total_quantity += new_qty
            self.average_price = total_cost / self.total_quantity
            return
        self.total_quantity += new_qty


class TradeMatching(models.Model):
    """
    Core matching table — connects one SELL order to one or more BUY lots.
    
    Design:
        One SELL → multiple BUY lots  (user selected)
        One BUY  → multiple SELLs    (partially sold over time)
    
    buy_price_snapshot and sell_price_snapshot are stored here so that
    profit calculations remain correct even if original orders are later viewed
    in a different way.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trade_matchings'
    )
    # PROTECT ensures you cannot delete a BUY lot that has been partially sold
    buy_order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name='buy_matchings'
    )
    # PROTECT ensures SELL order cannot be deleted after matching is recorded
    sell_order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name='sell_matchings'
    )
    stock_symbol = models.CharField(max_length=30, db_index=True)
    matched_quantity = models.PositiveIntegerField()

    # Price snapshots — immutable historical record
    buy_price_snapshot = models.DecimalField(max_digits=12, decimal_places=4)
    sell_price_snapshot = models.DecimalField(max_digits=12, decimal_places=4)

    gross_profit = models.DecimalField(
        max_digits=15, decimal_places=4,
        help_text="(sell_price - buy_price) × matched_quantity"
    )
    charges_allocated = models.DecimalField(
        max_digits=12, decimal_places=4, default=Decimal('0.0000'),
        help_text="Proportional share of total charges for this lot"
    )
    net_profit = models.DecimalField(
        max_digits=15, decimal_places=4,
        help_text="gross_profit - charges_allocated"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'trade_matching'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'stock_symbol']),
            models.Index(fields=['sell_order', 'buy_order']),
        ]

    def __str__(self):
        return (
            f"{self.stock_symbol} | {self.matched_quantity} units | "
            f"Buy ₹{self.buy_price_snapshot} → Sell ₹{self.sell_price_snapshot} | "
            f"Net P/L: ₹{self.net_profit}"
        )


class PortfolioHistory(models.Model):
    """
    Daily snapshot of total equity — used for equity curve & drawdown chart.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='portfolio_history'
    )
    date = models.DateField(db_index=True)
    total_equity = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'portfolio_history'
        unique_together = [['user', 'date']]
        ordering = ['date']

    def __str__(self):
        return f"{self.user.username} | {self.date} | ₹{self.total_equity}"
