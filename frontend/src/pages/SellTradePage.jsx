import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { fetchAvailableLots, fetchStockSuggestions, placeSellOrder } from '../services/tradeService'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { fmtINR } from '../utils/fmt'

export default function SellTradePage() {
    const { refreshUser } = useAuth()

    const [suggestions, setSuggestions] = useState([])
    const [symbol, setSymbol] = useState('')
    const [sellPrice, setSellPrice] = useState('')
    const [lots, setLots] = useState([])
    const [selected, setSelected] = useState({})   // { lotId: qty }
    const [loadingLots, setLoadingLots] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [result, setResult] = useState(null)

    useEffect(() => {
        fetchStockSuggestions().then(r => setSuggestions(r.data || [])).catch(() => { })
    }, [])

    const loadLots = async (sym) => {
        if (!sym.trim()) return
        setLoadingLots(true)
        setSelected({})
        setLots([])
        try {
            const res = await fetchAvailableLots(sym.trim().toUpperCase())
            setLots(res.data || [])
        } catch {
            toast.error('Failed to load lots')
        } finally {
            setLoadingLots(false)
        }
    }

    const handleSymbolChange = (val) => {
        setSymbol(val)
        setResult(null)
        if (val.length >= 2) loadLots(val)
    }

    const toggleLot = (lotId, maxQty) => {
        setSelected(s => {
            if (s[lotId] !== undefined) {
                const { [lotId]: _, ...rest } = s
                return rest
            }
            return { ...s, [lotId]: maxQty }
        })
    }

    const setLotQty = (lotId, qty, maxQty) => {
        const v = Math.max(1, Math.min(maxQty, parseInt(qty) || 1))
        setSelected(s => ({ ...s, [lotId]: v }))
    }

    const selectAll = () => {
        const all = {}
        lots.forEach(l => { all[l.id] = l.remaining_quantity })
        setSelected(all)
    }

    const clearAll = () => setSelected({})

    const sp = parseFloat(sellPrice) || 0

    const summary = useMemo(() => {
        let totalQty = 0, grossProfit = 0, sellValue = 0
        Object.entries(selected).forEach(([id, qty]) => {
            const lot = lots.find(l => l.id === parseInt(id))
            if (!lot) return
            totalQty += qty
            sellValue += qty * sp
            grossProfit += qty * (sp - parseFloat(lot.price))
        })
        return { totalQty, grossProfit, sellValue }
    }, [selected, lots, sp])

    const selectedLots = Object.entries(selected).map(([id, qty]) => ({
        lot_id: parseInt(id),
        quantity: qty,
    }))

    const handleSell = async () => {
        setShowConfirm(false)
        setSubmitting(true)
        try {
            const res = await placeSellOrder({
                stock_symbol: symbol.trim().toUpperCase(),
                sell_price: sp,
                selected_lots: selectedLots,
            })
            setResult(res.data)
            toast.success('Sell order executed!')
            refreshUser()
            setSelected({})
            loadLots(symbol)
        } catch (err) {
            toast.error(err.response?.data?.error || 'Sell order failed')
        } finally {
            setSubmitting(false)
        }
    }

    const canSell = sp > 0 && selectedLots.length > 0 && summary.totalQty > 0

    return (
        <div className="space-y-6">
            {showConfirm && (
                <ConfirmModal
                    title="Confirm Sell Order"
                    message={`Sell ${summary.totalQty} shares of ${symbol.toUpperCase()} at ${fmtINR(sp)}/share. Gross P/L: ${fmtINR(summary.grossProfit)}. Confirm?`}
                    confirmLabel="Yes, Sell"
                    danger
                    onConfirm={handleSell}
                    onCancel={() => setShowConfirm(false)}
                />
            )}

            <div>
                <h1 className="text-xl font-semibold text-gray-900">Sell Trade</h1>
                <p className="text-sm text-gray-500 mt-0.5">Select specific buy lots to sell</p>
            </div>

            {/* Result banner */}
            {result && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2">✅ Sell Order Executed</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-900">
                        <span>Symbol:</span>      <span className="font-bold">{result.stock_symbol}</span>
                        <span>Qty Sold:</span>    <span className="font-bold">{result.quantity_sold}</span>
                        <span>Gross P/L:</span>   <span className={`font-bold mono ${parseFloat(result.gross_profit) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtINR(result.gross_profit)}</span>
                        <span>Charges:</span>     <span className="font-bold mono">{fmtINR(result.total_charges)}</span>
                        <span>Net P/L:</span>     <span className={`font-bold mono ${parseFloat(result.net_profit) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtINR(result.net_profit)}</span>
                        <span>Lots Matched:</span><span className="font-bold">{result.lots_matched}</span>
                    </div>
                    <button onClick={() => setResult(null)} className="mt-3 text-xs text-blue-600 hover:underline">
                        Place another sell
                    </button>
                </div>
            )}

            {/* Inputs row */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Symbol */}
                    <div className="space-y-1.5">
                        <label htmlFor="sell-symbol" className="block text-sm font-medium text-gray-700">Stock Symbol</label>
                        <input
                            id="sell-symbol"
                            list="sell-suggestions"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
                            placeholder="e.g. RELIANCE"
                            value={symbol}
                            onChange={e => handleSymbolChange(e.target.value.toUpperCase())}
                        />
                        <datalist id="sell-suggestions">
                            {suggestions.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>

                    {/* Sell price */}
                    <div className="space-y-1.5">
                        <label htmlFor="sell-price" className="block text-sm font-medium text-gray-700">Sell Price (₹)</label>
                        <input
                            id="sell-price"
                            type="number" min="0.01" step="0.01"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="500.00"
                            value={sellPrice}
                            onChange={e => setSellPrice(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Lots table */}
            {(loadingLots || lots.length > 0) && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700">
                            Available Buy Lots — {symbol}
                            {Object.keys(selected).length > 0 && (
                                <span className="ml-2 text-blue-600">{Object.keys(selected).length} selected</span>
                            )}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline font-medium">Select All</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={clearAll} className="text-xs text-gray-500 hover:underline font-medium">Clear</button>
                        </div>
                    </div>

                    {loadingLots ? (
                        <div className="p-6"><LoadingSkeleton rows={3} /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {['', 'Buy Date', 'Buy Price', 'Remaining Qty', 'Sell Price', 'P/L per share', 'Qty to Sell'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lots.map(lot => {
                                        const isSelected = selected[lot.id] !== undefined
                                        const pnlPerShare = sp > 0 ? sp - parseFloat(lot.price) : null

                                        return (
                                            <tr
                                                key={lot.id}
                                                onClick={() => toggleLot(lot.id, lot.remaining_quantity)}
                                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        readOnly
                                                        checked={isSelected}
                                                        className="rounded border-gray-300 text-blue-600 pointer-events-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {new Date(lot.trade_date).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-4 py-3 mono text-sm text-gray-900 font-medium">
                                                    {fmtINR(lot.price)}
                                                </td>
                                                <td className="px-4 py-3 mono text-sm text-gray-700">
                                                    {lot.remaining_quantity}
                                                </td>
                                                <td className="px-4 py-3 mono text-sm text-gray-700">
                                                    {sp > 0 ? fmtINR(sp) : '—'}
                                                </td>
                                                <td className="px-4 py-3 mono text-sm font-semibold">
                                                    {pnlPerShare !== null ? (
                                                        <span className={pnlPerShare >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {pnlPerShare >= 0 ? '+' : ''}{fmtINR(pnlPerShare)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                    {isSelected ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={lot.remaining_quantity}
                                                            value={selected[lot.id]}
                                                            onChange={e => setLotQty(lot.id, e.target.value, lot.remaining_quantity)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Summary panel */}
            {summary.totalQty > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                        {[
                            ['Total Shares', `${summary.totalQty} shares`, 'text-gray-900'],
                            ['Total Sell Value', fmtINR(summary.sellValue), 'text-gray-900'],
                            ['Gross P/L', fmtINR(summary.grossProfit), summary.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'],
                            ['Est. Net P/L', '(after charges)', 'text-gray-400'],
                        ].map(([label, value, cls]) => (
                            <div key={label}>
                                <p className="text-xs text-gray-400 mb-1">{label}</p>
                                <p className={`text-base font-bold mono ${cls}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        id="sell-submit"
                        onClick={() => setShowConfirm(true)}
                        disabled={!canSell || submitting}
                        className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</>
                        ) : `↓ Sell ${summary.totalQty} shares of ${symbol}`}
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!loadingLots && lots.length === 0 && symbol && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-sm font-medium text-gray-500">No available lots for {symbol}</p>
                    <p className="text-xs mt-1">Buy shares first before placing a sell order</p>
                </div>
            )}
        </div>
    )
}
