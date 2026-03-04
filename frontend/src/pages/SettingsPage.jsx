import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchCharges, saveCharges } from '../services/tradeService'
import LoadingSkeleton from '../components/LoadingSkeleton'

const inputCls = "w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"

/**
 * ChargesConfig model fields (exact DB names):
 *   brokerage_type, brokerage_value, stt_percent, gst_percent,
 *   exchange_percent, slippage_percent, apply_charges, updated_at
 * ChargesConfigSerializer uses `exclude = ['user']` so all model fields come through.
 */
function ChargeInput({ label, id, value, onChange, note }) {
    return (
        <div className="space-y-2">
            <div className="flex items-end gap-2">
                <label htmlFor={id} className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
                {note && <span className="text-[9px] text-gray-300 font-medium mb-px">{note}</span>}
            </div>
            <div className="relative">
                <input
                    id={id} type="number" step="0.0001"
                    className={inputCls}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
            </div>
        </div>
    )
}

export default function SettingsPage() {
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchCharges()
            .then(res => setSettings(res.data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    // Update a single field in the settings object
    const setVal = (k, v) => setSettings(p => ({ ...p, [k]: v }))

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await saveCharges(settings)
            toast.success('Settings updated!')
        } catch {
            toast.error('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8"><LoadingSkeleton rows={4} /></div>
    if (!settings) return <div className="p-8 text-gray-500">Could not load settings.</div>

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-12">
            {/* ── Header ── */}
            <div className="text-center sm:text-left">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Settings</h1>
                <p className="text-gray-500 mt-1 font-medium">Configure transaction taxes and brokerage rates</p>
            </div>

            <div className="h-px bg-gray-200/60" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Form Card ── */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
                    <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-50">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Brokerage Profile</h3>
                    </div>

                    <form onSubmit={handleSave} className="p-8 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* brokerage_value — exact model field */}
                            <ChargeInput
                                label="Brokerage" id="brokerage_value"
                                note="e.g. 0.0003 = 0.03%"
                                value={settings.brokerage_value}
                                onChange={v => setVal('brokerage_value', v)}
                            />
                            {/* stt_percent — exact model field */}
                            <ChargeInput
                                label="STT / CTT" id="stt_percent"
                                note="e.g. 0.001 = 0.1%"
                                value={settings.stt_percent}
                                onChange={v => setVal('stt_percent', v)}
                            />
                            {/* exchange_percent — exact model field */}
                            <ChargeInput
                                label="Exchange Charges" id="exchange_percent"
                                note="e.g. 0.0000345"
                                value={settings.exchange_percent}
                                onChange={v => setVal('exchange_percent', v)}
                            />
                            {/* gst_percent — exact model field */}
                            <ChargeInput
                                label="GST (on Brokerage)" id="gst_percent"
                                note="e.g. 0.18 = 18%"
                                value={settings.gst_percent}
                                onChange={v => setVal('gst_percent', v)}
                            />
                            {/* slippage_percent — exact model field */}
                            <ChargeInput
                                label="Slippage" id="slippage_percent"
                                note="e.g. 0.0005 = 0.05%"
                                value={settings.slippage_percent}
                                onChange={v => setVal('slippage_percent', v)}
                            />

                            {/* apply_charges toggle */}
                            <div className="space-y-2 flex flex-col justify-end">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Apply All Charges</label>
                                <div className="flex items-center gap-3 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setVal('apply_charges', !settings.apply_charges)}
                                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${settings.apply_charges ? 'bg-blue-600' : 'bg-gray-200'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${settings.apply_charges ? 'left-7' : 'left-1'}`} />
                                    </button>
                                    <span className="text-sm font-bold text-gray-600">{settings.apply_charges ? 'Enabled' : 'Disabled'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit" disabled={saving}
                                className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 transition-all hover:-translate-y-1 active:translate-y-0"
                            >
                                {saving ? 'Saving...' : '🔥 Update Settings'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── Info Panel ── */}
                <div className="space-y-6">
                    <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        <h4 className="text-lg font-black uppercase tracking-widest mb-4">Pro Tip 💡</h4>
                        <p className="text-sm text-blue-50 leading-relaxed font-medium">
                            All rates should be entered as decimals. For example, 0.1% STT = <code className="bg-white/20 px-1 rounded">0.001</code>. These match the charges applied by most Indian brokers.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Charge Fields Reference</h4>
                        <ul className="space-y-4 text-[11px]">
                            {[
                                ['brokerage_value', 'Fixed ₹ or % of trade value'],
                                ['stt_percent', 'Securities Transaction Tax on sell'],
                                ['exchange_percent', 'Exchange / NSE transaction fee'],
                                ['gst_percent', 'GST applied on brokerage + exchange'],
                                ['slippage_percent', 'Price slippage on execution'],
                            ].map(([field, desc]) => (
                                <li key={field} className="flex flex-col gap-0.5">
                                    <code className="text-blue-600 font-black tracking-tight">{field}</code>
                                    <span className="text-gray-400 font-medium">{desc}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
