from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'total_capital', 'available_capital', 'risk_percent', 'date_joined']
    list_filter = ['is_active', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Trading Info', {'fields': ('total_capital', 'available_capital', 'risk_percent')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Trading Info', {'fields': ('total_capital', 'available_capital', 'risk_percent')}),
    )
    search_fields = ['username', 'email']
