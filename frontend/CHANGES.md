# CHANGES — TradeFlow Frontend

---

## [2026-03-04] Master Bug Fix — Variable Name Alignment

Performed a full audit of all frontend pages against the Django backend serializers
and fixed every mismatched field name.

### DashboardPage.jsx
- Fixed: `stats.total_invested` → `stats.invested_capital`
- Fixed: `stats.total_trades_count` → `stats.total_trades`
- Fixed: `stats.open_positions_count` (was missing `stats.` prefix)
- Fixed: AreaChart `dataKey="value"` → `dataKey="equity"` (matches `get_equity_curve()` return)
- Fixed: Open positions now loaded from `/api/positions/` (separate call) — analytics endpoint does NOT return position list
- Fixed: Position card now uses `pos.total_quantity`, `pos.average_price`, `pos.invested_value` (PositionSerializer fields)

### LedgerPage.jsx
- Fixed: Backend `/api/ledger/` returns a **plain array** (not `{trades, summary}` wrapper)
  - Summary stats are now computed client-side from the flat array
- Fixed: `t.buy_date` → `t.buy_order_date` (SerializerMethodField)
- Fixed: `t.buy_price` → `t.buy_price_snapshot`
- Fixed: `t.sell_price` → `t.sell_price_snapshot`
- Fixed: `t.quantity` → `t.matched_quantity`
- Fixed: `t.total_charges` → `t.charges_allocated`

### TradePage.jsx
- Fixed Buy Banner: `data.stock_symbol` → `data.order.stock_symbol`
- Fixed Buy Banner: `data.quantity` → `data.order.quantity`
- Fixed Buy Banner: `data.price` → `data.order.price`
- Fixed Buy Banner: `data.total_charges` → `data.charges_breakdown.total_charges`
- Fixed Buy Banner: `data.net_cost` → `data.charges_breakdown.total_cost`
- Fixed Sell Banner: `data.quantity_sold` → `data.order.quantity`
- Fixed Sell Banner: `data.lots_matched` → `data.matched_lots`
- Fixed Lot Table: `lot.trade_date` → `lot.created_at` (OrderSerializer field)
- Fixed P/L per lot: uses `lot.price` (buy price from OrderSerializer) correctly

### SettingsPage.jsx
- Fixed: `stt` → `stt_percent`
- Fixed: `gst` → `gst_percent`
- Fixed: `exchange_charges` → `exchange_percent`
- Fixed: `brokerage` → `brokerage_value`
- Added: `slippage_percent` field (was missing entirely)
- Added: `apply_charges` toggle (boolean field on the model)

### PortfolioPage.jsx (fixed in previous session)
- Fixed: `pos.quantity` → `pos.total_quantity`
- Fixed: `pos.avg_buy_price` → `pos.average_price`
- Fixed: removed non-existent `pos.current_price` and `pos.pnl` references
- Fixed: `totalInvested` now uses `pos.invested_value`

---

## [2026-03-04] Major UI Redesign — Sidebar, Navbar, Dashboard, Trade Terminal

### Sidebar.jsx
- Replaced bg-white with bg-gray-50 + border-r border-gray-200
- Strong active state: left border indicator (border-l-4 border-blue-600 bg-blue-50)
- Redesigned Available Cash block as a floating card with utilization bar
- Premium User Card at bottom with avatar, username, email, and sign-out button

### Navbar.jsx
- Added shadow-sm and h-16 for more presence
- Premium metric layout: label over value with mono bold fonts
- Added "🟢 Live Market" pulse indicator
- Avatar styled as rounded-xl with ring and shadow

### DashboardPage.jsx
- AreaChart with gradient fill instead of LineChart
- Primary / Secondary card hierarchy via `primary` prop on StatCard
- Separate open positions panel using /api/positions/

### StatCard.jsx
- Hover lift animation: hover:-translate-y-1 hover:shadow-xl
- Primary vs secondary visual hierarchy
- Decorative icon background with scale animation

### TradePage.jsx (Trade Terminal)
- Rounded-[2rem] premium card design
- Animated BUY/SELL tab switcher
- Improved lot selection UI with checkbox and quantity input
- Consolidated ResultBanner (correctly reading API response shape)

### LedgerPage.jsx
- Summary stats computed client-side from flat array
- Table column headers corrected to match API fields

### SettingsPage.jsx
- Correct model field names throughout
- Added apply_charges toggle
- Field reference panel showing exact backend names

### MainLayout.jsx
- Wrapped children in max-w-7xl mx-auto container
- Added responsive px-4 sm:px-6 lg:px-8 padding

---

## [2026-03-04] Logo Integration

- TradeFlow logo (logo.png) placed in frontend/public/
- Used in: Sidebar brand, Navbar (mobile), LoginPage, RegisterPage
- Fallback text shown if image fails to load
