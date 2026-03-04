import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { addCapital } from '../services/tradeService'
import { fmtINR } from '../utils/fmt'

const QUICK = [5000, 10000, 25000, 50000, 100000]

export default function AddFundsModal({ onClose }) {
    const { user } = useAuth()
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)

    const total = parseFloat(user?.total_capital || 0)
    const available = parseFloat(user?.available_capital || 0)
    const invested = Math.max(0, total - available)
    const parsed = parseFloat(amount) || 0

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!parsed || parsed <= 0) return toast.error('Enter a valid amount')
        setLoading(true)
        try {
            await addCapital(parsed)
            toast.success(`${fmtINR(parsed)} added!`)
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add funds')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Add Funds</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Funds go to Available Capital instantly</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 text-sm">×</button>
                </div>

                {/* Current summary */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Net Infusion</span>
                        <span className="font-semibold mono">{fmtINR(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Available Cash</span>
                        <span className="font-semibold mono text-green-600">{fmtINR(available)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">In Stocks</span>
                        <span className="font-semibold mono text-orange-500">{fmtINR(invested)}</span>
                    </div>
                </div>

                {/* Quick amounts */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK.map(q => (
                        <button key={q} type="button" onClick={() => setAmount(String(q))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${parsed === q
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}>
                            ₹{(q / 1000).toFixed(0)}K
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Custom Amount (₹)</label>
                        <input
                            id="deposit-amount" type="number" min="1" step="1"
                            placeholder="Enter amount"
                            value={amount} onChange={e => setAmount(e.target.value)}
                            autoFocus required
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {parsed > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1 text-sm">
                            <p className="text-xs text-gray-500 mb-1">After deposit preview</p>
                            <div className="flex justify-between">
                                <span className="text-gray-600">New Total Infusion</span>
                                <span className="font-bold mono">{fmtINR(total + parsed)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">New Available Cash</span>
                                <span className="font-bold mono text-green-600">{fmtINR(available + parsed)}</span>
                            </div>
                        </div>
                    )}

                    <button id="deposit-submit" type="submit" disabled={loading || !parsed}
                        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                        {loading
                            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</>
                            : `💰 Add ${parsed > 0 ? fmtINR(parsed) : 'Funds'}`}
                    </button>
                </form>
            </div>
        </div>
    )
}
