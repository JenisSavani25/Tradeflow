import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { withdrawCapital } from '../services/tradeService'
import { fmtINR } from '../utils/fmt'

export default function WithdrawFundsModal({ onClose }) {
    const { user } = useAuth()
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)

    const total = parseFloat(user?.total_capital || 0)
    const available = parseFloat(user?.available_capital || 0)
    const invested = Math.max(0, total - available)
    const parsed = parseFloat(amount) || 0
    const isOver = parsed > available

    const quickPcts = [0.25, 0.5, 0.75, 1].map(p => Math.floor(available * p))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!parsed || parsed <= 0) return toast.error('Enter a valid amount')
        if (parsed > available) return toast.error(`Max withdrawable: ${fmtINR(available)}`)
        setLoading(true)
        try {
            await withdrawCapital(parsed)
            toast.success(`${fmtINR(parsed)} withdrawn!`)
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Withdrawal failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border border-red-200 w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Withdraw Funds</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Only available cash can be withdrawn</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 text-sm">×</button>
                </div>

                {/* Current summary */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Available to Withdraw</span>
                        <span className="font-bold mono text-green-600">{fmtINR(available)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Locked in Stocks</span>
                        <span className="font-semibold mono text-orange-500">{fmtINR(invested)}</span>
                    </div>
                    {invested > 0 && (
                        <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
                            ⚠️ {fmtINR(invested)} is in open positions. Sell holdings first to free it.
                        </p>
                    )}
                </div>

                {/* Quick % buttons */}
                <div className="flex gap-2 mb-4">
                    {['25%', '50%', '75%', '100%'].map((label, i) => (
                        <button key={label} type="button"
                            disabled={quickPcts[i] === 0}
                            onClick={() => setAmount(String(quickPcts[i]))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-30 ${parsed === quickPcts[i]
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}>
                            {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount to Withdraw (₹)</label>
                        <input
                            id="withdraw-amount" type="number" min="1" max={available} step="1"
                            placeholder="Enter amount"
                            value={amount} onChange={e => setAmount(e.target.value)}
                            autoFocus required
                            className={`w-full px-3 py-2.5 border rounded-lg text-sm mono focus:outline-none focus:ring-2 ${isOver ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'
                                }`}
                        />
                        {isOver && (
                            <p className="text-xs text-red-600 mt-1">Exceeds available cash by {fmtINR(parsed - available)}</p>
                        )}
                    </div>

                    {parsed > 0 && !isOver && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 text-sm">
                            <p className="text-xs text-gray-500 mb-1">After withdrawal preview</p>
                            <div className="flex justify-between">
                                <span className="text-gray-600">New Net Infusion</span>
                                <span className="font-bold mono">{fmtINR(total - parsed)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">New Available Cash</span>
                                <span className="font-bold mono text-green-600">{fmtINR(available - parsed)}</span>
                            </div>
                        </div>
                    )}

                    <button id="withdraw-submit" type="submit"
                        disabled={loading || !parsed || isOver || parsed <= 0}
                        className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                        {loading
                            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Withdrawing...</>
                            : `🏧 Withdraw ${parsed > 0 && !isOver ? fmtINR(parsed) : 'Funds'}`}
                    </button>
                </form>
            </div>
        </div>
    )
}
