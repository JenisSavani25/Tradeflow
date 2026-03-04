import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fmtINR } from '../utils/fmt'

export default function Navbar({ onMenuClick }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [showUserMenu, setShowUserMenu] = useState(false)

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const available = parseFloat(user?.available_capital || 0)
    const total = parseFloat(user?.total_capital || 0)
    const invested = Math.max(0, total - available)
    // Simple net worth = available + invested (at cost — no live prices from backend)
    const netWorth = available + invested

    return (
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-16 flex items-center px-4 sm:px-8 gap-4 shadow-sm">
            {/* Hamburger Menu (Universal) */}
            <button
                onClick={onMenuClick}
                className="p-2 -ml-2 rounded-lg text-gray-800 hover:bg-gray-100 transition-colors focus:ring-4 focus:ring-blue-100"
                aria-label="Toggle Sidebar"
            >
                <div className="w-5 h-4 flex flex-col justify-between">
                    <span className="block h-0.5 w-full bg-current rounded-full" />
                    <span className="block h-0.5 w-full bg-current rounded-full" />
                    <span className="block h-0.5 w-full bg-current rounded-full" />
                </div>
            </button>

            {/* Logo in Navbar */}
            <div className="flex items-center">
                <img
                    src="/logo.png"
                    alt="TradeFlow"
                    className="h-10 w-auto object-contain pl-2 drop-shadow-sm origin-left scale-125"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                />
                <span className="hidden text-lg font-black text-blue-600 tracking-tight ml-2">TradeFlow</span>
            </div>

            <div className="flex-1" />

            {/* Right: Premium Metric Layout */}
            <div className="hidden sm:flex items-center gap-8 mr-2">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold leading-none mb-1.5">Net Portfolio</span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-gray-900 tracking-tight mono">{fmtINR(netWorth)}</span>
                        <span className="text-[10px] font-bold text-green-600">(+0.00%)</span>
                    </div>
                </div>

                <div className="w-px h-8 bg-gray-100" />

                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold leading-none mb-1.5">Available Cash</span>
                    <span className="text-base font-bold text-green-600 tracking-tight mono">{fmtINR(available)}</span>
                </div>
            </div>

            {/* Avatar / User Panel */}
            <div className="relative flex items-center gap-3 pl-4 border-l border-gray-100">
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-blue-100 shadow-lg border-2 border-white ring-1 ring-blue-600/10 hover:scale-105 transition-transform"
                >
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                        <div className="absolute top-14 right-0 w-64 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <p className="text-sm font-bold text-gray-900 truncate">@{user?.username || 'user'}</p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email || 'trader@tradeflow.com'}</p>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    🚪 Sign Out
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </header>
    )
}
