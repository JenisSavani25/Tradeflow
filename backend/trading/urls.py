from django.urls import path
from .views import (
    ChargesConfigView,
    PlaceBuyOrderView,
    PlaceSellOrderView,
    AvailableLotsView,
    OrderListView,
    PositionListView,
    TradeMatchingListView,
    AnalyticsView,
    PortfolioHistoryView,
    StockSuggestionsView,
)

urlpatterns = [
    # Charges configuration
    path('charges/',                ChargesConfigView.as_view(),    name='charges-config'),

    # Order placement — split into BUY and SELL
    path('orders/buy/',             PlaceBuyOrderView.as_view(),    name='place-buy'),
    path('orders/sell/',            PlaceSellOrderView.as_view(),   name='place-sell'),

    # Available lots for sell UI
    path('orders/lots/',            AvailableLotsView.as_view(),    name='available-lots'),

    # History lists
    path('orders/',                 OrderListView.as_view(),         name='order-list'),
    path('positions/',              PositionListView.as_view(),      name='position-list'),
    path('ledger/',                 TradeMatchingListView.as_view(), name='ledger-list'),

    # Analytics & history
    path('analytics/',              AnalyticsView.as_view(),         name='analytics'),
    path('portfolio/history/',      PortfolioHistoryView.as_view(),  name='portfolio-history'),

    # Suggestions
    path('stocks/suggestions/',     StockSuggestionsView.as_view(), name='stock-suggestions'),
]
