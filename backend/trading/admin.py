from django.contrib import admin
from .models import ChargesConfig, Order, Position, TradeMatching, PortfolioHistory


@admin.register(ChargesConfig)
class ChargesConfigAdmin(admin.ModelAdmin):
    list_display  = ['user', 'brokerage_type', 'brokerage_value', 'apply_charges', 'updated_at']
    list_filter   = ['brokerage_type', 'apply_charges']
    search_fields = ['user__username']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = [
        'id', 'user', 'stock_symbol', 'order_type', 'quantity',
        'remaining_quantity', 'price', 'effective_price',
        'total_charges', 'net_profit', 'status', 'created_at',
    ]
    list_filter   = ['order_type', 'status', 'stock_symbol']
    search_fields = ['user__username', 'stock_symbol']
    readonly_fields = ['created_at']
    ordering      = ['-created_at']


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display  = ['user', 'stock_symbol', 'total_quantity', 'average_price', 'status', 'updated_at']
    list_filter   = ['status']
    search_fields = ['user__username', 'stock_symbol']


@admin.register(TradeMatching)
class TradeMatchingAdmin(admin.ModelAdmin):
    list_display  = [
        'id', 'user', 'stock_symbol', 'matched_quantity',
        'buy_price_snapshot', 'sell_price_snapshot',
        'gross_profit', 'charges_allocated', 'net_profit', 'created_at',
    ]
    list_filter   = ['stock_symbol']
    search_fields = ['user__username', 'stock_symbol']
    readonly_fields = [
        'buy_order', 'sell_order', 'buy_price_snapshot', 'sell_price_snapshot',
        'gross_profit', 'charges_allocated', 'net_profit', 'created_at',
    ]
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of matching records from admin."""
        return False


@admin.register(PortfolioHistory)
class PortfolioHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'total_equity']
    ordering     = ['-date']
