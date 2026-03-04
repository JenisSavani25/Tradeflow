import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AddFundsModal from './AddFundsModal'
import WithdrawFundsModal from './WithdrawFundsModal'
import { fmtINR } from '../utils/fmt'

const NAV = [
    { to: '/', label: 'Dashboard', icon: '▣' },
    { to: '/portfolio', label: 'Portfolio', icon: '⊞' },
    { to: '/trade', label: 'Trade', icon: '⇅' },
    { to: '/ledger', label: 'Ledger', icon: '≡' },
    { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ mobileOpen, onClose }) {
    const { user, logout, refreshUser } = useAuth()
    const navigate = useNavigate()
    const [showAdd, setShowAdd] = useState(false)
    const [showWithdraw, setShowWithdraw] = useState(false)

    const available = parseFloat(user?.available_capital || 0)
    const total = parseFloat(user?.total_capital || 0)
    const pct = total > 0 ? ((total - available) / total) * 100 : 0

    const handleLogout = () => {
        // Provided mostly to satisfy lint, but Navbar should handle it now
    }

    const closeModals = () => {
        setShowAdd(false)
        setShowWithdraw(false)
        refreshUser()
    }

    return (
        <>
            {/* Global Backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-gray-50 border-r border-gray-200 shadow-2xl
        transform transition-transform duration-300 ease-in-out flex flex-col overflow-y-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                {/* Brand / Logo */}
                <div className="px-6 py-8 flex items-center justify-center -ml-4 flex-shrink-0">
                    <img
                        src="/logo.png"
                        alt="TradeFlow"
                        className="max-h-24 w-auto object-contain drop-shadow-md scale-110"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <p className="hidden text-xl font-bold text-blue-600 tracking-tight">TradeFlow</p>
                </div>

                {/* Capital block - Redesigned as a Mini Card */}
                <div className="px-4 mb-6 flex-shrink-0">
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm transition-all hover:shadow-md group">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Available Cash</p>
                        <p className="text-2xl font-bold text-green-600 tracking-tight mono mb-4 leading-none">
                            {fmtINR(available)}
                        </p>

                        <div className="space-y-3 mb-5">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-400 font-medium">Utilization</span>
                                <span className="text-gray-600 font-bold">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl border border-green-200 text-green-700 text-sm font-bold hover:bg-green-50 hover:border-green-300 transition-colors shadow-sm"
                            >
                                <span className="text-lg leading-none">+</span> Add
                            </button>
                            <button
                                onClick={() => setShowWithdraw(true)}
                                className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
                            >
                                <span className="text-lg leading-none">−</span> Pay out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 overscroll-contain mb-6">
                    {NAV.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center gap-4 px-5 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 group relative
                                ${isActive
                                    ? 'bg-blue-50 text-blue-600 pl-7 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'}`
                            }
                        >
                            <span className="text-xl">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {showAdd && <AddFundsModal onClose={closeModals} />}
            {showWithdraw && <WithdrawFundsModal onClose={closeModals} />}
        </>
    )
}
