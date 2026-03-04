import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
    placeBuyOrder,
    placeSellOrder,
    fetchAvailableLots,
    fetchStockSuggestions,
} from '../services/tradeService'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { fmtINR } from '../utils/fmt'

function Field({ label, id, hint, children }) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-[11px] font-extrabold text-gray-400 uppercase tracking-widest leading-none">
                {label}
                {hint && <span className="ml-1.5 text-xs text-gray-300 font-normal normal-case tracking-normal">{hint}</span>}
            </label>
            {children}
        </div>
    )
}

const inputCls =
    'w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm'

const Spinner = () => (
    <span className="w-4 h-4 border-[3px] border-white/40 border-t-white rounded-full animate-spin flex-shrink-0" />
)

const Row = ({ label, value, bold = false, valueClass = 'text-gray-900' }) => (
    <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`mono text-base ${bold ? 'font-black' : 'font-bold'} ${valueClass}`}>{value}</span>
    </div>
)

/* ─────────────────── BUY FORM ─────────────────── */
function BuyForm({ suggestions, available, onSuccess }) {
    const [form, setForm] = useState({
        stock_symbol: '', quantity: '', price: '',
        trade_date: new Date().toISOString().slice(0, 10),
    })
    const [loading, setLoading] = useState(false)

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const qty = parseFloat(form.quantity) || 0
    const price = parseFloat(form.price) || 0
    const gross = qty * price
    const canAfford = gross === 0 || gross <= available

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.stock_symbol.trim()) return toast.error('Stock symbol required')
        if (qty <= 0) return toast.error('Quantity must be > 0')
        if (price <= 0) return toast.error('Price must be > 0')
        if (gross > available) return toast.error('Insufficient available capital')

        setLoading(true)
        try {
            const res = await placeBuyOrder({
                stock_symbol: form.stock_symbol.trim().toUpperCase(),
                quantity: qty, price,
                trade_date: form.trade_date,
            })
            onSuccess(res.data)  // res.data = { message, order:{}, available_capital, charges_breakdown:{} }
            toast.success(`Bought ${qty} shares of ${form.stock_symbol.toUpperCase()}!`)
            setForm(f => ({ ...f, quantity: '', price: '' }))
        } catch (err) {
            toast.error(err.response?.data?.error || 'Buy order failed')
        } finally { setLoading(false) }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
            <Field label="Stock Symbol" id="buy-symbol">
                <div className="relative group">
                    <input
                        id="buy-symbol" list="buy-sym-list"
                        className={`${inputCls} uppercase tracking-wider font-bold`}
                        placeholder="e.g. RELIANCE"
                        value={form.stock_symbol}
                        onChange={e => set('stock_symbol', e.target.value.toUpperCase())}
                        autoComplete="off" required
                    />
                    <datalist id="buy-sym-list">
                        {suggestions.map(s => <option key={s} value={s} />)}
                    </datalist>
                </div>
            </Field>

            <div className="grid grid-cols-2 gap-5">
                <Field label="Quantity" id="buy-qty">
                    <input id="buy-qty" type="number" min="1" step="1"
                        className={`${inputCls} mono`} placeholder="0"
                        value={form.quantity} onChange={e => set('quantity', e.target.value)} required />
                </Field>
                <Field label="Price / share (₹)" id="buy-price">
                    <input id="buy-price" type="number" min="0.01" step="0.01"
                        className={`${inputCls} mono`} placeholder="0.00"
                        value={form.price} onChange={e => set('price', e.target.value)} required />
                </Field>
            </div>

            <Field label="Trade Date" id="buy-date">
                <input id="buy-date" type="date" className={inputCls}
                    value={form.trade_date} onChange={e => set('trade_date', e.target.value)} required />
            </Field>

            {/* Order Preview */}
            {gross > 0 && (
                <div className={`rounded-3xl border p-6 space-y-3 transition-all duration-500 ${canAfford ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100 shadow-inner'}`}>
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Execution Summary</p>
                    <Row label={`${qty} × ${fmtINR(price)}`} value={fmtINR(gross)} bold />
                    <div className="h-px border-t border-dashed border-gray-300" />
                    <Row label="Available Cash" value={fmtINR(available)}
                        valueClass={canAfford ? 'text-green-600' : 'text-red-600'} />
                    {!canAfford && (
                        <p className="text-xs text-red-600 font-bold flex items-center gap-1 bg-white/50 p-2 rounded-xl border border-red-100">
                            <span>⚠</span> Short by {fmtINR(gross - available)}
                        </p>
                    )}
                </div>
            )}

            <button id="buy-submit" type="submit"
                disabled={loading || (!canAfford && gross > 0)}
                className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 active:bg-green-800
                   disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                   text-white font-bold transition-all shadow-xl shadow-green-100
                   hover:-translate-y-0.5 active:translate-y-0
                   flex items-center justify-center gap-2">
                {loading
                    ? <><Spinner /> Placing order...</>
                    : <>Place Buy Order {gross > 0 ? `— ${fmtINR(gross)}` : ''} ↗</>}
            </button>
        </form>
    )
}

/* ─────────────────── SELL FORM ─────────────────── */
function SellForm({ suggestions, onSuccess, refreshUser }) {
    const [symbol, setSymbol] = useState('')
    const [sellPrice, setSellPrice] = useState('')
    const [lots, setLots] = useState([])
    const [selected, setSelected] = useState({})
    const [loadingLots, setLoadingLots] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const loadLots = async (sym) => {
        if (!sym.trim() || sym.length < 2) return
        setLoadingLots(true); setSelected({}); setLots([])
        try {
            const res = await fetchAvailableLots(sym.trim().toUpperCase())
            setLots(res.data || [])
        } catch { toast.error('Could not load lots') }
        finally { setLoadingLots(false) }
    }

    const handleSymChange = (val) => {
        setSymbol(val)
        if (val.length >= 2) loadLots(val)
        else { setLots([]); setSelected({}) }
    }

    const toggleLot = (id, max) =>
        setSelected(s => id in s ? (({ [id]: _, ...r }) => r)(s) : { ...s, [id]: max })

    const setLotQty = (id, v, max) =>
        setSelected(s => ({ ...s, [id]: Math.max(1, Math.min(max, parseInt(v) || 1)) }))

    const selectAll = () => setSelected(Object.fromEntries(lots.map(l => [l.id, l.remaining_quantity])))
    const clearAll = () => setSelected({})

    const sp = parseFloat(sellPrice) || 0

    const summary = useMemo(() => {
        let totalQty = 0, grossPnl = 0, sellValue = 0
        Object.entries(selected).forEach(([id, qty]) => {
            // OrderSerializer returns 'price' (not 'buy_price') and 'remaining_quantity'
            const lot = lots.find(l => l.id === +id); if (!lot) return
            totalQty += qty; sellValue += qty * sp
            grossPnl += qty * (sp - parseFloat(lot.price))
        })
        return { totalQty, grossPnl, sellValue }
    }, [selected, lots, sp])

    const selectedLots = Object.entries(selected).map(([id, qty]) => ({ lot_id: +id, quantity: qty }))

    const executeSell = async () => {
        setShowConfirm(false); setSubmitting(true)
        try {
            const res = await placeSellOrder({
                stock_symbol: symbol.toUpperCase(),
                sell_price: sp,
                selected_lots: selectedLots
            })
            // res.data = { message, order:{}, available_capital, net_profit, matched_lots, charges_breakdown:{} }
            onSuccess(res.data)
            toast.success('Sell executed!')
            refreshUser()
            setSelected({}); loadLots(symbol)
        } catch (err) { toast.error(err.response?.data?.error || 'Sell failed') }
        finally { setSubmitting(false) }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {showConfirm && (
                <ConfirmModal
                    title="Confirm Sell Order"
                    message={`Sell ${summary.totalQty} shares of ${symbol.toUpperCase()} at ${fmtINR(sp)}/share. Est. Gross P/L: ${fmtINR(summary.grossPnl)}. Proceed?`}
                    confirmLabel="Execute Sell Order" danger
                    onConfirm={executeSell} onCancel={() => setShowConfirm(false)}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Stock Symbol / Search" id="sell-symbol">
                    <input id="sell-symbol" list="sell-sym-list"
                        className={`${inputCls} uppercase tracking-wider font-bold`}
                        placeholder="e.g. RELIANCE"
                        value={symbol} onChange={e => handleSymChange(e.target.value.toUpperCase())}
                        autoComplete="off" />
                    <datalist id="sell-sym-list">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
                </Field>
                <Field label="Target Sell Price (₹)" id="sell-price">
                    <input id="sell-price" type="number" min="0.01" step="0.01"
                        className={`${inputCls} mono`} placeholder="0.00"
                        value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
                </Field>
            </div>

            {/* Lots Table */}
            {(loadingLots || lots.length > 0) && (
                <div className="rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50/80 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Available Buy Lots</span>
                            {Object.keys(selected).length > 0 && (
                                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                                    {Object.keys(selected).length} selected
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                            <button type="button" onClick={selectAll} className="text-blue-600 hover:text-blue-700">Select All</button>
                            <div className="w-1 h-1 bg-gray-300 rounded-full" />
                            <button type="button" onClick={clearAll} className="text-gray-400 hover:text-gray-600">Clear</button>
                        </div>
                    </div>

                    {loadingLots ? (
                        <div className="p-8"><LoadingSkeleton rows={3} /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[580px]">
                                <thead>
                                    <tr className="bg-white border-b border-gray-50">
                                        {['', 'Date', 'Buy Price', 'Avail. Qty', 'P/L per share', 'Sell Qty'].map(h => (
                                            <th key={h} className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {lots.map(lot => {
                                        const isSel = lot.id in selected
                                        const pnl = sp > 0 ? sp - parseFloat(lot.price) : null
                                        const isPos = pnl >= 0
                                        return (
                                            <tr key={lot.id} onClick={() => toggleLot(lot.id, lot.remaining_quantity)}
                                                className={`cursor-pointer transition-colors ${isSel ? 'bg-blue-50/50 hover:bg-blue-100/50' : 'hover:bg-gray-50/50'}`}>
                                                <td className="pl-6 pr-2 py-4">
                                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSel ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100' : 'border-gray-200 bg-white'}`}>
                                                        {isSel && <span className="text-white text-[10px] leading-none font-black">✓</span>}
                                                    </div>
                                                </td>
                                                {/* OrderSerializer: created_at (not trade_date) */}
                                                <td className="px-6 py-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                                                    {lot.created_at
                                                        ? new Date(lot.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                                                        : '—'}
                                                </td>
                                                {/* OrderSerializer: price (the buy price) */}
                                                <td className="px-6 py-4 mono text-sm font-bold text-gray-900">{fmtINR(lot.price)}</td>
                                                {/* OrderSerializer: remaining_quantity */}
                                                <td className="px-6 py-4 mono text-sm font-semibold text-gray-500">{lot.remaining_quantity}</td>
                                                <td className="px-6 py-4">
                                                    {pnl !== null
                                                        ? <span className={`mono text-sm font-black ${isPos ? 'text-green-600' : 'text-red-500'}`}>
                                                            {isPos ? '+' : ''}{fmtINR(pnl)}
                                                        </span>
                                                        : <span className="text-gray-200">—</span>}
                                                </td>
                                                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                    {isSel ? (
                                                        <input type="number" min="1" max={lot.remaining_quantity}
                                                            value={selected[lot.id]}
                                                            onChange={e => setLotQty(lot.id, e.target.value, lot.remaining_quantity)}
                                                            className="w-24 px-3 py-2 bg-white border-2 border-blue-200 rounded-xl text-sm font-bold mono text-center focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                                                    ) : <span className="text-gray-200 select-none text-xs">—</span>}
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

            {/* No lots empty state */}
            {!loadingLots && lots.length === 0 && symbol.length >= 2 && (
                <div className="rounded-3xl border-2 border-dashed border-gray-100 py-16 flex flex-col items-center text-center bg-gray-50/30">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm grayscale opacity-50">📭</div>
                    <p className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Stock not in holdings</p>
                    <p className="text-xs text-gray-400 font-medium">You need to buy {symbol} shares before you can sell.</p>
                </div>
            )}

            {/* Summary + Submit */}
            {summary.totalQty > 0 && (
                <div className="rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-100 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Execution Summary</span>
                    </div>
                    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-6 mb-2">
                        {[
                            ['Total Quantity', `${summary.totalQty} Shares`, 'text-gray-900'],
                            ['Order Value', fmtINR(summary.sellValue), 'text-gray-900 font-black'],
                            ['Estimated P/L', fmtINR(summary.grossPnl), summary.grossPnl >= 0 ? 'text-green-600 font-black' : 'text-red-500 font-black'],
                        ].map(([l, v, c]) => (
                            <div key={l}>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">{l}</p>
                                <p className={`text-base mono ${c}`}>{v}</p>
                            </div>
                        ))}
                    </div>
                    <div className="px-6 pb-6">
                        <button id="sell-submit" type="button"
                            onClick={() => setShowConfirm(true)}
                            disabled={sp <= 0 || summary.totalQty === 0 || submitting}
                            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800
                         disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                         text-white font-bold transition-all shadow-xl shadow-red-100
                         hover:-translate-y-0.5 active:translate-y-0
                         flex items-center justify-center gap-2">
                            {submitting
                                ? <><Spinner /> Executing Trade...</>
                                : <>Sell {summary.totalQty} Shares of {symbol} ↘</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ─────────────────── RESULT BANNER ─────────────────── */
function ResultBanner({ type, data, onDismiss }) {
    if (!data) return null
    const isBuy = type === 'buy'

    let rows
    if (isBuy) {
        // Buy response: { message, order: {stock_symbol, quantity, price, total_charges, total_amount...}, charges_breakdown:{total_charges, total_cost} }
        const o = data.order || {}
        const cb = data.charges_breakdown || {}
        rows = [
            ['Symbol', o.stock_symbol],
            ['Qty', o.quantity],
            ['Price', fmtINR(o.price)],
            ['Gross', fmtINR(o.quantity * parseFloat(o.price || 0))],
            ['Charges', fmtINR(cb.total_charges)],
            ['Net Total', fmtINR(cb.total_cost)],
        ]
    } else {
        // Sell response: { message, order:{stock_symbol, quantity}, net_profit, matched_lots, charges_breakdown:{total_charges} }
        const o = data.order || {}
        const cb = data.charges_breakdown || {}
        rows = [
            ['Symbol', o.stock_symbol],
            ['Qty Sold', o.quantity],                   // order.quantity (not quantity_sold)
            ['Net P/L', fmtINR(data.net_profit)],
            ['Charges', fmtINR(cb.total_charges)],
            ['Lots Matched', data.matched_lots],            // matched_lots (not lots_matched)
            ['Received', fmtINR(cb.total_received)],
        ]
    }

    return (
        <div className={`rounded-3xl border-2 p-6 mb-8 animate-in zoom-in duration-500 ${isBuy ? 'bg-green-50/50 border-green-100' : 'bg-blue-50/50 border-blue-100'}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${isBuy ? 'bg-green-600' : 'bg-blue-600'}`}>✓</div>
                    <p className={`text-sm font-black uppercase tracking-widest ${isBuy ? 'text-green-700' : 'text-blue-700'}`}>
                        {isBuy ? 'Buy Executed' : 'Sell Executed'}
                    </p>
                </div>
                <button onClick={onDismiss} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest underline decoration-dotted">Dismiss</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {rows.map(([label, val]) => (
                    <div key={label}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">{label}</p>
                        <p className="text-sm font-black mono text-gray-800">{val ?? '—'}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ─────────────────── MAIN PAGE ─────────────────── */
export default function TradePage() {
    const { user, refreshUser } = useAuth()
    const [tab, setTab] = useState('buy')
    const [suggestions, setSuggestions] = useState([])
    const [result, setResult] = useState(null)
    const [resultType, setResultType] = useState(null)

    useEffect(() => {
        fetchStockSuggestions().then(r => setSuggestions(r.data || [])).catch(() => { })
    }, [])

    const available = parseFloat(user?.available_capital || 0)

    const onBuySuccess = (data) => { setResultType('buy'); setResult(data); refreshUser() }
    const onSellSuccess = (data) => { setResultType('sell'); setResult(data) }
    const changeTab = (t) => { setTab(t); setResult(null); setResultType(null) }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* ── Page Header ── */}
            <div className="mb-10 text-center sm:text-left">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Trade Terminal</h1>
                <p className="text-gray-500 mt-2 font-medium">
                    Available Liquidity:{' '}
                    <span className="font-black text-green-600 mono ml-1 bg-green-50 px-2 py-1 rounded-lg border border-green-100">{fmtINR(available)}</span>
                </p>
            </div>

            {/* ── Main Tab Card ── */}
            <div className="bg-white rounded-[2rem] border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden">

                {/* Tab Switcher */}
                <div className="flex p-2 bg-gray-50/50 border-b border-gray-100">
                    {[
                        { id: 'buy', label: 'BUY ORDER', icon: '↑', activeStyle: 'bg-white text-green-600 shadow-lg shadow-gray-100 ring-1 ring-gray-100' },
                        { id: 'sell', label: 'SELL ORDER', icon: '↓', activeStyle: 'bg-white text-red-600 shadow-lg shadow-gray-100 ring-1 ring-gray-100' },
                    ].map(({ id, label, icon, activeStyle }) => (
                        <button key={id} type="button"
                            onClick={() => changeTab(id)}
                            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300
                          ${tab === id ? activeStyle : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}`}>
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-300
                ${tab === id
                                    ? id === 'buy' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                    : 'bg-gray-200 text-gray-400'}`}>
                                {icon}
                            </span>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Form Area */}
                <div className="p-8 sm:p-10">
                    <ResultBanner type={resultType} data={result}
                        onDismiss={() => { setResult(null); setResultType(null) }} />
                    {tab === 'buy'
                        ? <BuyForm suggestions={suggestions} available={available} onSuccess={onBuySuccess} />
                        : <SellForm suggestions={suggestions} onSuccess={onSellSuccess} refreshUser={refreshUser} />}
                </div>
            </div>

            {/* ── Footer tip ── */}
            <div className="mt-8 flex items-center gap-3 px-6 py-4 bg-blue-50/30 rounded-2xl border border-blue-50">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg flex-shrink-0">💡</div>
                <p className="text-[11px] text-blue-800 font-bold leading-relaxed tracking-wide uppercase opacity-70">
                    {tab === 'buy'
                        ? 'Execution includes STT, Exchange Charges, GST & Brokerage as per Settings.'
                        : 'Manual lot selection overrides LIFO. Select specific lots for precise P/L control.'}
                </p>
            </div>
        </div>
    )
}
