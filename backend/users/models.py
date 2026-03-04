from django.contrib.auth.models import AbstractUser
from django.db import models
from decimal import Decimal


class User(AbstractUser):
    """
    Custom user model with capital tracking fields.
    """
    total_capital = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0.00'),
        help_text="Total capital added by the user"
    )
    available_capital = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0.00'),
        help_text="Capital available for trading"
    )
    risk_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('1.00'),
        help_text="Risk percentage per trade (e.g., 1.00 = 1%)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} | Capital: ₹{self.available_capital}"

    def add_capital(self, amount: Decimal):
        """Add capital to both total and available."""
        self.total_capital += amount
        self.available_capital += amount
        self.save(update_fields=['total_capital', 'available_capital'])

    def deduct_capital(self, amount: Decimal):
        """Deduct from available capital (used on BUY)."""
        if self.available_capital < amount:
            raise ValueError("Insufficient capital")
        self.available_capital -= amount
        self.save(update_fields=['available_capital'])

    def credit_capital(self, amount: Decimal):
        """Credit back to available capital (used on SELL)."""
        self.available_capital += amount
        self.save(update_fields=['available_capital'])
