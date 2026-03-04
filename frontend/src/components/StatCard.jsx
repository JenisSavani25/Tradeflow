import { fmtINR } from '../utils/fmt'

/**
 * @param {string} label - The label for the card
 * @param {string|number} value - The main number to show
 * @param {string} icon - Emoji or dash icon
 * @param {string} trend - Optional subtext like (+5.2%)
 * @param {boolean} primary - Whether to show as a primary card with deeper shadow
 * @param {boolean} isCurrency - Whether to treat value as currency
 */
export default function StatCard({ label, value, icon, trend, primary = false, isCurrency = true }) {
    const isLoss = trend?.includes('-') || (typeof value === 'number' && value < 0)
    const isGain = trend?.includes('+') || (typeof value === 'number' && value > 0)

    const formattedValue = isCurrency && typeof value === 'number' ? fmtINR(value) : value

    return (
        <div className={`
      relative overflow-hidden bg-white rounded-3xl border border-gray-100 p-6
      transition-all duration-300 ease-in-out
      hover:shadow-xl hover:-translate-y-1 group
      ${primary ? 'shadow-lg border-blue-50/50 ring-1 ring-blue-600/5' : 'shadow-sm'}
    `}>
            {/* Icon Background Decor */}
            <div className="absolute -top-3 -right-3 w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl opacity-10 group-hover:scale-125 transition-transform duration-500">
                {icon}
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className={`
          w-10 h-10 rounded-xl flex items-center justify-center text-lg
          ${primary ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-500'}
        `}>
                    {icon}
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
            </div>

            <div className="flex items-baseline gap-2">
                <h3 className={`text-2xl font-bold tracking-tight mono ${primary ? 'text-gray-900' : 'text-gray-800'}`}>
                    {formattedValue}
                </h3>
                {trend && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLoss ? 'bg-red-50 text-red-600' : isGain ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
                        }`}>
                        {trend}
                    </span>
                )}
            </div>

            {primary && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Position</span>
                    </div>
                </div>
            )}
        </div>
    )
}
