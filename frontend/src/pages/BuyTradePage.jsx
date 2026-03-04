import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { placeBuyOrder, fetchStockSuggestions } from '../services/tradeService'
import { useAuth } from '../context/AuthContext'
import { fmtINR } from '../utils/fmt'

export default function BuyTradePage() {
    const { user, refreshUser } = useAuth()
    const [suggestions, setSuggestions] = useState([])
    const [form, setForm] = useState({
        stock_symbol: '', quantity: '', price: '', trade_date: new Date().toISOString().slice(0, 10),
    })
    const [charges, setCharges] = useState(null)
    const [loading, setLoading] = useState(false)
    const [fetchingCharges, setFetchingCharges] = useState(false)
    const [result, setResult] = useState(null)

    useEffect(() => {
        fetchStockSuggestions().then(r => setSuggestions(r.data || [])).catch(() => { })
    }, [])

    const qty = parseFloat(form.quantity) || 0
    const price = parseFloat(form.price) || 0
    const gross = qty * price

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.stock_symbol.trim()) return toast.error('Enter a stock symbol')
        if (qty <= 0) return toast.error('Quantity must be > 0')
        if (price <= 0) return toast.error('Price must be > 0')

        setLoading(true)
        try {
            const res = await placeBuyOrder({
                stock_symbol: form.stock_symbol.trim().toUpperCase(),
                quantity: qty,
                price,
                trade_date: form.trade_date,
            })
            setResult(res.data)
            toast.success('Buy order placed!')
            refreshUser()
            setForm(f => ({ ...f, quantity: '', price: '' }))
        } catch (err) {
            toast.error(err.response?.data?.error || 'Buy order failed')
        } finally {
            setLoading(false)
        }
    }

    const available = parseFloat(user?.available_capital || 0)
    const canAfford = gross <= available

    const Field = ({ label, id, ...props }) => (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                id={id}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...props}
            />
        </div>
    )

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900">Buy Trade</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Available cash: <span className="font-semibold text-green-600">{fmtINR(available)}</span>
                </p>
            </div>

            {/* Result banner */}
            {result && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-700 mb-2">✅ Buy Order Confirmed</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                        <span>Symbol:</span>   <span className="font-bold">{result.stock_symbol}</span>
                        <span>Quantity:</span> <span className="font-bold">{result.quantity}</span>
                        <span>Price:</span>    <span className="font-bold mono">{fmtINR(result.price)}</span>
                        <span>Gross:</span>    <span className="font-bold mono">{fmtINR(result.gross_value)}</span>
                        <span>Charges:</span>  <span className="font-bold mono">{fmtINR(result.total_charges)}</span>
                        <span>Total Cost:</span><span className="font-bold mono">{fmtINR(result.net_cost)}</span>
                    </div>
                    <button
                        onClick={() => setResult(null)}
                        className="mt-3 text-xs text-green-600 hover:underline"
                    >
                        Place another trade
                    </button>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4"
            >
                {/* Stock symbol with datalist */}
                <div className="space-y-1.5">
                    <label htmlFor="buy-symbol" className="block text-sm font-medium text-gray-700">
                        Stock Symbol
                    </label>
                    <input
                        id="buy-symbol"
                        list="buy-suggestions"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        placeholder="e.g. RELIANCE"
                        value={form.stock_symbol}
                        onChange={e => set('stock_symbol', e.target.value.toUpperCase())}
                        required
                    />
                    <datalist id="buy-suggestions">
                        {suggestions.map(s => <option key={s} value={s} />)}
                    </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field
                        label="Quantity" id="buy-qty" type="number" min="1" step="1"
                        placeholder="100"
                        value={form.quantity}
                        onChange={e => set('quantity', e.target.value)}
                        required
                    />
                    <Field
                        label="Buy Price (₹)" id="buy-price" type="number" min="0.01" step="0.01"
                        placeholder="500.00"
                        value={form.price}
                        onChange={e => set('price', e.target.value)}
                        required
                    />
                </div>

                <Field
                    label="Trade Date" id="buy-date" type="date"
                    value={form.trade_date}
                    onChange={e => set('trade_date', e.target.value)}
                    required
                />

                {/* Live calculation */}
                {gross > 0 && (
                    <div className={`rounded-lg border p-4 space-y-2 text-sm ${canAfford ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Gross Value</span>
                            <span className="mono font-semibold">{fmtINR(gross)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Available Cash</span>
                            <span className={`mono font-semibold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                                {fmtINR(available)}
                            </span>
                        </div>
                        {!canAfford && (
                            <p className="text-xs text-red-600 font-medium">
                                ⚠️ Insufficient capital — short by {fmtINR(gross - available)}
                            </p>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    id="buy-submit"
                    disabled={loading || !canAfford && gross > 0}
                    className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</>
                    ) : '↑ Place Buy Order'}
                </button>
            </form>
        </div>
    )
}
