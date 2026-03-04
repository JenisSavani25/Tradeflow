import { useEffect, useState } from 'react'
import { fetchLedger } from '../services/tradeService'
import LoadingSkeleton from '../components/LoadingSkeleton'
import StatCard from '../components/StatCard'
import { fmtINR, fmtPnl } from '../utils/fmt'

export default function LedgerPage() {
    // Backend /api/ledger/ returns a PLAIN ARRAY of TradeMatching objects (no wrapper)
    const [trades, setTrades] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchLedger()
            .then(res => {
                // res.data is a plain array from TradeMatchingListView
                const data = Array.isArray(res.data) ? res.data : []
                setTrades(data)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="p-8"><LoadingSkeleton rows={5} /></div>

    // ── Compute summary client-side from the flat array ─────────────────
    const totalNetPnl = trades.reduce((s, t) => s + parseFloat(t.net_profit || 0), 0)
    const totalGrossPnl = trades.reduce((s, t) => s + parseFloat(t.gross_profit || 0), 0)
    const totalCharges = trades.reduce((s, t) => s + parseFloat(t.charges_allocated || 0), 0)
    const matchedCount = trades.length

    const filtered = trades.filter(t =>
        t.stock_symbol.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-10 pb-12">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Trade Ledger</h1>
                    <p className="text-gray-500 mt-1 font-medium">History of all realized profits and losses</p>
                </div>
                <div className="flex flex-col sm:items-end gap-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Matched Trades</p>
                    <p className="text-xl font-black text-gray-900 mono">{matchedCount}</p>
                </div>
            </div>

            <div className="h-px bg-gray-200/60" />

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Net P/L" value={totalNetPnl} icon="🏅" trend={fmtPnl(totalNetPnl)} primary />
                <StatCard label="Gross Profit" value={totalGrossPnl} icon="📈" />
                <StatCard label="Total Charges" value={totalCharges} icon="🧾" />
                <StatCard label="Matched Lots" value={matchedCount} icon="🧩" isCurrency={false} />
            </div>

            {/* ── Search ── */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-96 group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
                    <input
                        type="text"
                        placeholder="Search symbol in history..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">
                    {filtered.length} entries
                </span>
            </div>

            {trades.length > 0 ? (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[750px]">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    {['Stock', 'Buy Date / Price', 'Sell Price', 'Qty', 'Gross P/L', 'Charges', 'Net P/L'].map(h => (
                                        <th key={h} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((t, i) => {
                                    // TradeMatchingSerializer field names:
                                    // stock_symbol, matched_quantity, buy_price_snapshot,
                                    // sell_price_snapshot, gross_profit, charges_allocated,
                                    // net_profit, buy_order_date (SerializerMethodField)
                                    const isPos = parseFloat(t.net_profit) >= 0
                                    return (
                                        <tr key={i} className="group hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-5">
                                                <span className="text-sm font-black text-gray-900 tracking-tight">{t.stock_symbol}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    {/* buy_order_date from SerializerMethodField */}
                                                    <span className="text-xs font-bold text-gray-700">{t.buy_order_date ?? '—'}</span>
                                                    {/* buy_price_snapshot — correct field */}
                                                    <span className="text-[10px] text-gray-400 font-bold mono">{fmtINR(t.buy_price_snapshot)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {/* sell_price_snapshot — correct field */}
                                                <span className="text-sm font-bold mono text-gray-800">{fmtINR(t.sell_price_snapshot)}</span>
                                            </td>
                                            {/* matched_quantity — correct field */}
                                            <td className="px-6 py-5 mono text-sm font-bold text-gray-700">{t.matched_quantity}</td>
                                            <td className="px-6 py-5 mono text-sm font-bold text-gray-600">{fmtPnl(t.gross_profit)}</td>
                                            {/* charges_allocated — correct field */}
                                            <td className="px-6 py-5 mono text-[11px] font-bold text-red-400">-{fmtINR(t.charges_allocated)}</td>
                                            <td className="px-6 py-5">
                                                <div className={`inline-flex px-4 py-2 rounded-xl text-sm font-black mono ${isPos ? 'bg-green-50 text-green-600 ring-1 ring-green-100' : 'bg-red-50 text-red-600 ring-1 ring-red-100'
                                                    }`}>
                                                    {isPos ? '+' : ''}{fmtPnl(t.net_profit)}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-30">📜</div>
                    <p className="text-sm font-black text-gray-700 uppercase tracking-widest mb-2">No entries yet</p>
                    <p className="text-xs text-gray-400 font-medium">Completed trades will appear here automatically.</p>
                </div>
            )}
        </div>
    )
}
