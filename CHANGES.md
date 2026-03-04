# CHANGES.md — TradeFlow Project

## Session: 2026-03-04 — Full UI Redesign (Tailwind Light Theme)

### Summary
Complete frontend redesign from dark custom CSS to a **Modern Light Theme**
using TailwindCSS v3, inspired by Zerodha / Groww / Upstox.
Zero inline styles. Utility-first only.

### Installation
```
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

### New Files
| File | Purpose |
|------|---------|
| `tailwind.config.js`                         | Tailwind config — content paths, Inter font, profit/loss colors |
| `src/index.css`                              | Tailwind directives + Inter/JetBrains Mono import |
| `src/utils/fmt.js`                           | Shared `fmtINR`, `fmtPnl`, `fmtQty` formatters |
| `src/services/tradeService.js`               | Central API service layer (one fn per endpoint) |
| `src/layouts/MainLayout.jsx`                 | Sidebar + Navbar + scrollable main area |
| `src/components/Navbar.jsx`                  | Sticky top bar, portfolio value, available cash, avatar |
| `src/components/StatCard.jsx`                | Reusable stat card |
| `src/components/LoadingSkeleton.jsx`         | Row + card skeleton components |
| `src/components/ConfirmModal.jsx`            | Reusable confirm dialog |
| `src/pages/PortfolioPage.jsx`                | Searchable + sortable positions table |
| `src/pages/BuyTradePage.jsx`                 | Centered buy form + live cost check |
| `src/pages/SellTradePage.jsx`                | Lot selection table + summary panel + ConfirmModal |
| `src/pages/SettingsPage.jsx`                 | Brokerage settings card |

### Updated Files
| File | What Changed |
|------|-------------|
| `src/App.jsx`                                | New routes: /portfolio /buy /sell /settings, uses MainLayout |
| `src/components/Sidebar.jsx`                 | Light theme, mobile-responsive, capital block |
| `src/components/AddFundsModal.jsx`           | Tailwind only rewrite |
| `src/components/WithdrawFundsModal.jsx`      | Tailwind only rewrite |
| `src/pages/DashboardPage.jsx`                | 8 stat cards, equity chart, positions list |
| `src/pages/LedgerPage.jsx`                   | Summary cards + searchable table |
| `src/pages/LoginPage.jsx`                    | Light centered card |
| `src/pages/RegisterPage.jsx`                 | Light centered card |

### Route Map (New)
| Route | Page |
|-------|------|
| `/`            | Dashboard |
| `/portfolio`   | Portfolio (positions) |
| `/buy`         | Buy Trade |
| `/sell`        | Sell Trade (lot selection) |
| `/ledger`      | Trade Ledger |
| `/settings`    | Brokerage Settings |

### Theme Rules
- Background: `bg-gray-50`
- Cards: `bg-white rounded-xl border border-gray-200 shadow-sm`
- Profit: `text-green-600` / `bg-green-50`
- Loss: `text-red-600` / `bg-red-50`
- Primary btn: `bg-blue-600 hover:bg-blue-700`
- Buy btn: `bg-green-600 hover:bg-green-700`
- Sell btn: `bg-red-600 hover:bg-red-700`
- Numbers: `mono` (JetBrains Mono)

---

