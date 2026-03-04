import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPositions } from '../services/tradeService'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { fmtINR, fmtQty } from '../utils/fmt'

export default function PortfolioPage() {
    const [positions, setPositions] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchPositions()
            .then(res => setPositions(Array.isArray(res.data) ? res.data : []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const filtered = positions.filter(p =>
        (p.stock_symbol || '').toLowerCase().includes((search || '').toLowerCase())
    )

    const totalInvested = positions.reduce((sum, p) => sum + (parseFloat(p.invested_value) || 0), 0)

    if (loading) return <div className="p-8"><LoadingSkeleton rows={5} /></div>

    return (
        <div className="space-y-8 pb-12">
            {/* ── Header Section ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Portfolio</h1>
                    <p className="text-gray-500 mt-1 font-medium">Manage your active stock holdings</p>
                </div>

                <div className="flex flex-col sm:items-end gap-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total Invested Value</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight mono">{fmtINR(totalInvested)}</p>
                </div>
            </div>

            {positions.length > 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    {['Stock', 'Qty', 'Avg Buy Price', 'Invested Value', 'Unrealized P/L', 'Status'].map(h => (
                                        <th key={h} className="px-6 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(pos => {
                                    return (
                                        <tr key={pos.stock_symbol} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">{pos.stock_symbol}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Equity</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 mono text-sm font-semibold text-gray-700">{fmtQty(pos.total_quantity)}</td>
                                            <td className="px-6 py-5 mono text-sm font-semibold text-gray-700">{fmtINR(pos.average_price)}</td>
                                            <td className="px-6 py-5 mono text-sm font-bold text-gray-900">{fmtINR(pos.invested_value)}</td>
                                            <td className="px-6 py-5">
                                                <span className="text-xs text-gray-400 font-medium italic">No live feed</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${pos.status === 'OPEN' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {pos.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ── Modern Empty State ── */
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-200 border-dashed animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner ring-8 ring-gray-50/50">
                        📉
                    </div>
                    <h2 className="text-xl font-black text-gray-900 mb-2">Portfolio is Empty</h2>
                    <p className="text-gray-500 mb-8 max-w-xs text-center font-medium">
                        You haven't placed any trades yet. Start building your portfolio today.
                    </p>
                    <Link
                        to="/trade"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-blue-200 transition-all hover:scale-105 active:scale-95"
                    >
                        Create First Trade ↗
                    </Link>
                </div>
            )}
        </div>
    )
}
