from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from trading.models import Position, Order, TradeMatching, ChargesConfig, PortfolioHistory
from decimal import Decimal
from django.db import transaction

class Command(BaseCommand):
    help = 'Wipes ALL trade data for a user and sets capital to ₹5,70,795'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to reset')

    def handle(self, *args, **options):
        username = options['username']
        User = get_user_model()

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User "{username}" does not exist.'))
            return

        with transaction.atomic():
            # 1. Delete all trade data (order matters — FK constraints)
            deleted_matching  = TradeMatching.objects.filter(user=user).delete()
            deleted_orders    = Order.objects.filter(user=user).delete()
            deleted_positions = Position.objects.filter(user=user).delete()
            deleted_history   = PortfolioHistory.objects.filter(user=user).delete()

            # 2. Set capital
            user.total_capital     = Decimal('570795.00')
            user.available_capital = Decimal('570795.00')
            user.save()

        self.stdout.write(self.style.SUCCESS('─' * 50))
        self.stdout.write(self.style.SUCCESS(f'✅ Reset complete for: {username}'))
        self.stdout.write(self.style.WARNING(f'   TradeMatching rows deleted : {deleted_matching[0]}'))
        self.stdout.write(self.style.WARNING(f'   Orders deleted             : {deleted_orders[0]}'))
        self.stdout.write(self.style.WARNING(f'   Positions deleted          : {deleted_positions[0]}'))
        self.stdout.write(self.style.WARNING(f'   Portfolio history deleted  : {deleted_history[0]}'))
        self.stdout.write(self.style.SUCCESS(f'   Total Capital set to       : ₹5,70,795.00'))
        self.stdout.write(self.style.SUCCESS(f'   Available Capital set to   : ₹5,70,795.00'))
        self.stdout.write(self.style.SUCCESS('─' * 50))
