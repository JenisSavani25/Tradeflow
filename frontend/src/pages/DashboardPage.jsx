import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { fetchAnalytics, fetchPositions } from '../services/tradeService'
import StatCard from '../components/StatCard'
import { CardSkeleton } from '../components/LoadingSkeleton'
import { fmtINR, fmtPnl } from '../utils/fmt'

export default function DashboardPage() {
    const { user } = useAuth()
    const [analytics, setAnalytics] = useState(null)
    const [positions, setPositions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([fetchAnalytics(), fetchPositions()])
            .then(([analyticsRes, positionsRes]) => {
                setAnalytics(analyticsRes.data)
                setPositions(Array.isArray(positionsRes.data) ? positionsRes.data : [])
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="space-y-8 animate-pulse">
            <div className="h-10 w-64 bg-gray-200 rounded-lg mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
            </div>
        </div>
    )

    // ── Correct field names from get_analytics() ──────────────────────
    const stats = analytics || {}
    // equity_curve returns [{date, equity}] from get_equity_curve()
    const chartData = stats.equity_curve || []

    return (
        <div className="space-y-10 pb-12">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Welcome back, {user?.username || 'Trader'} 👋</p>
                </div>
                <Link
                    to="/trade"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 transition-all hover:-translate-y-0.5"
                >
                    + New Trade
                </Link>
            </div>

            <div className="h-px bg-gray-200/60" />

            {/* ── Primary Stat Cards ── */}
            <section>
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-6 bg-blue-600 rounded-full" />
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Market Overview</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* invested_capital — correct key from get_analytics() */}
                    <StatCard label="Total Invested" value={stats.invested_capital} icon="💰" primary />
                    {/* available_capital — correct key */}
                    <StatCard label="Available Cash" value={stats.available_capital} icon="🏦" primary />
                    {/* total_capital — correct key */}
                    <StatCard label="Total Capital" value={stats.total_capital} icon="📦" primary />
                    {/* realized_pnl — correct key */}
                    <StatCard label="Realized P/L" value={stats.realized_pnl} icon="🎯" trend={fmtPnl(stats.realized_pnl)} primary />
                </div>
            </section>

            {/* ── Secondary Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* open_positions_count — correct key */}
                <StatCard label="Open Positions" value={stats.open_positions_count} icon="📂" isCurrency={false} />
                {/* total_trades — correct key (NOT total_trades_count) */}
                <StatCard label="Total Trades" value={stats.total_trades} icon="🔄" isCurrency={false} />
                {/* profit_factor — correct key */}
                <StatCard label="Profit Factor" value={stats.profit_factor ?? '—'} icon="⚡" isCurrency={false} />
                {/* win_rate — correct key */}
                <StatCard label="Win Rate" value={`${stats.win_rate ?? 0}%`} icon="🏆" isCurrency={false} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Equity Curve ── */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-gray-900">Equity Curve</h3>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">All Time</span>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(v) => [fmtINR(v), 'Equity']}
                                />
                                {/* dataKey="equity" — matches get_equity_curve() return: [{date, equity}] */}
                                <Area type="monotone" dataKey="equity" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorEquity)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Open Positions ── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Open Positions</h3>
                    <div className="flex-1 space-y-3">
                        {positions.length > 0 ? positions.slice(0, 6).map(pos => (
                            // Uses PositionSerializer fields: stock_symbol, total_quantity, average_price, invested_value
                            <div key={pos.stock_symbol} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <div>
                                    <p className="text-sm font-bold text-gray-900 tracking-tight">{pos.stock_symbol}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{pos.total_quantity} Shares</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold mono">{fmtINR(pos.invested_value)}</p>
                                    <p className="text-[10px] font-bold text-gray-400">@ {fmtINR(pos.average_price)}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4 grayscale">🚀</div>
                                <p className="text-sm font-bold text-gray-600 mb-1">No open positions</p>
                                <p className="text-xs text-gray-400 mb-6">Start your first trade to see activity here.</p>
                                <Link to="/trade" className="text-xs font-bold text-blue-600 hover:underline">Go to Trade ↗</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
