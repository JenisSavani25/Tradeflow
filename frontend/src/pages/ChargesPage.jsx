import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function ChargesPage() {
    const [config, setConfig] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api.get('/api/charges/').then(res => setConfig(res.data)).finally(() => setLoading(false))
    }, [])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setConfig(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await api.put('/api/charges/', config)
            setConfig(res.data)
            toast.success('Charges configuration saved! ✅')
        } catch (err) {
            toast.error('Failed to save charges')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="loading-center"><div className="spinner" /> Loading charges...</div>

    const fields = [
        { name: 'brokerage_value', label: 'Brokerage Value', help: 'Fixed ₹ amount or percentage (e.g. 0.0003 = 0.03%)' },
        { name: 'stt_percent', label: 'STT %', help: 'Securities Transaction Tax (e.g. 0.001 = 0.1%)' },
        { name: 'gst_percent', label: 'GST % on Brokerage', help: 'GST on brokerage (e.g. 0.18 = 18%)' },
        { name: 'exchange_percent', label: 'Exchange Charges %', help: 'Exchange tx fee (e.g. 0.0000345)' },
        { name: 'slippage_percent', label: 'Slippage %', help: 'Price slippage on execution (e.g. 0.0005 = 0.05%)' },
    ]

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2>⚙️ Charges Configuration</h2>
                <p>Configure brokerage, taxes, and charges. These apply to every new order.</p>
            </div>

            <div style={{ maxWidth: 680 }}>
                <form onSubmit={handleSave}>
                    {/* Master Toggle */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3>Apply Charges</h3>
                                <p style={{ fontSize: '0.8rem', marginTop: 4 }}>
                                    Toggle all brokerage & tax charges on/off globally.
                                </p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    name="apply_charges"
                                    checked={config.apply_charges}
                                    onChange={handleChange}
                                    id="toggle-charges"
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                    </div>

                    {/* Brokerage Type */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="section-title">Brokerage Settings</div>
                        <div className="form-group">
                            <label className="form-label">Brokerage Type</label>
                            <select id="brokerage-type" className="form-select" name="brokerage_type"
                                value={config.brokerage_type} onChange={handleChange}>
                                <option value="percentage">Percentage (% of trade value)</option>
                                <option value="fixed">Fixed (flat ₹ per trade)</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">
                                Brokerage Value
                                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                                    ({config.brokerage_type === 'percentage' ? '% e.g. 0.0003 = 0.03%' : '₹ per trade'})
                                </span>
                            </label>
                            <input id="brokerage-value" className="form-input" type="number" step="any" name="brokerage_value"
                                value={config.brokerage_value} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Other Charges */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="section-title">Taxes & Other Charges</div>
                        {fields.slice(1).map(f => (
                            <div className="form-group" key={f.name}>
                                <label className="form-label">
                                    {f.label}
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>— {f.help}</span>
                                </label>
                                <input
                                    id={`charge-${f.name}`}
                                    className="form-input"
                                    type="number" step="any"
                                    name={f.name}
                                    value={config[f.name]}
                                    onChange={handleChange}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Preview */}
                    <div className="card" style={{ marginBottom: 24, borderColor: 'var(--border-glow)' }}>
                        <div className="section-title">💡 Charges Preview (per ₹10,000 trade)</div>
                        {(() => {
                            const tradeVal = 10000
                            const brok = config.brokerage_type === 'fixed'
                                ? parseFloat(config.brokerage_value)
                                : tradeVal * parseFloat(config.brokerage_value)
                            const stt = tradeVal * parseFloat(config.stt_percent)
                            const gst = brok * parseFloat(config.gst_percent)
                            const exch = tradeVal * parseFloat(config.exchange_percent)
                            const total = brok + stt + gst + exch
                            const items = [
                                ['Brokerage', brok],
                                ['STT', stt],
                                ['GST', gst],
                                ['Exchange', exch],
                                ['Total Charges', total],
                            ]
                            return items.map(([label, val]) => (
                                <div key={label} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    padding: '5px 0', borderBottom: '1px solid var(--border)',
                                    fontSize: '0.8rem'
                                }}>
                                    <span style={{ color: label === 'Total Charges' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: label === 'Total Charges' ? 700 : 400 }}>{label}</span>
                                    <span className="mono" style={{ fontWeight: label === 'Total Charges' ? 700 : 400 }}>
                                        ₹{isNaN(val) ? '—' : val.toFixed(4)}
                                    </span>
                                </div>
                            ))
                        })()}
                    </div>

                    <button id="save-charges" className="btn btn-primary btn-full" type="submit" disabled={saving}>
                        {saving ? <><div className="spinner" /> Saving...</> : '💾 Save Configuration'}
                    </button>
                </form>
            </div>
        </div>
    )
}
