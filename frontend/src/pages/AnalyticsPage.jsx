import { useEffect, useState } from 'react'
import api from '../api/axios'
import {
    LineChart, Line, AreaChart, Area,
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts'

const fmt = (n) =>
    n !== undefined && n !== null
        ? `₹${parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '—'

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="custom-tooltip">
            <div className="label">{label}</div>
            {payload.map(p => (
                <div key={p.dataKey} className="value" style={{ color: p.color }}>
                    {p.name}: {typeof p.value === 'number' && Math.abs(p.value) > 1000
                        ? fmt(p.value) : typeof p.value === 'number'
                            ? p.value.toFixed(2) : p.value}
                </div>
            ))}
        </div>
    )
}

function MetricCard({ label, value, sublabel, color }) {
    return (
        <div className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color: color || 'var(--text-primary)', fontSize: '1.25rem' }}>
                {value}
            </div>
            {sublabel && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{sublabel}</div>}
        </div>
    )
}

export default function AnalyticsPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/api/analytics/')
            .then(res => setData(res.data))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="loading-center"><div className="spinner" /> Loading analytics...</div>
    if (!data) return <div className="empty-state"><div className="icon">📈</div><p>No data available.</p></div>

    const curve = data.equity_curve || []
    const pnl = parseFloat(data.realized_pnl || 0)

    // Build drawdown series from equity curve
    const drawdownData = (() => {
        let peak = 0
        return curve.map(point => {
            const val = parseFloat(point.equity)
            if (val > peak) peak = val
            const dd = peak > 0 ? ((peak - val) / peak * 100) : 0
            return { date: point.date, drawdown: parseFloat(dd.toFixed(2)) }
        })
    })()

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2>📈 Analytics</h2>
                <p>Comprehensive trading performance metrics and visual analysis.</p>
            </div>

            {/* Key Metrics */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
                <MetricCard
                    label="Realized P/L"
                    value={fmt(pnl)}
                    color={pnl >= 0 ? 'var(--profit)' : 'var(--loss)'}
                    sublabel="From closed trades"
                />
                <MetricCard
                    label="Win Rate"
                    value={`${data.win_rate || 0}%`}
                    color={data.win_rate > 50 ? 'var(--profit)' : 'var(--loss)'}
                    sublabel={`${data.win_count}W / ${data.loss_count}L`}
                />
                <MetricCard
                    label="Profit Factor"
                    value={parseFloat(data.profit_factor || 0).toFixed(2)}
                    color={data.profit_factor > 1 ? 'var(--profit)' : 'var(--loss)'}
                    sublabel="Wins / Losses"
                />
                <MetricCard
                    label="Expectancy"
                    value={fmt(data.expectancy)}
                    color={parseFloat(data.expectancy || 0) >= 0 ? 'var(--profit)' : 'var(--loss)'}
                    sublabel="Per trade"
                />
                <MetricCard
                    label="Avg Win"
                    value={fmt(data.avg_win)}
                    color="var(--profit)"
                    sublabel="Per winning trade"
                />
                <MetricCard
                    label="Avg Loss"
                    value={fmt(data.avg_loss)}
                    color="var(--loss)"
                    sublabel="Per losing trade"
                />
                <MetricCard
                    label="Max Drawdown"
                    value={`${parseFloat(data.max_drawdown || 0).toFixed(2)}%`}
                    color="var(--warning)"
                    sublabel="Peak to trough"
                />
                <MetricCard
                    label="Total Trades"
                    value={data.total_trades || 0}
                    sublabel={`${data.total_buy_orders} BUY / ${data.total_sell_orders} SELL`}
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid-2" style={{ marginBottom: 16 }}>
                {/* Equity Curve */}
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>📈 Equity Curve</h3>
                    {curve.length > 1 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={curve}>
                                <defs>
                                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                                    hide={curve.length > 10} />
                                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={70}
                                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="equity" name="Equity"
                                    stroke="#2563eb" strokeWidth={2}
                                    fill="url(#equityGrad)"
                                    dot={false} activeDot={{ r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state" style={{ padding: '40px' }}>
                            <div className="icon">📊</div>
                            <p>Trade more to generate equity curve data.</p>
                        </div>
                    )}
                </div>

                {/* Drawdown Chart */}
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>📉 Drawdown Chart</h3>
                    {drawdownData.length > 1 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={drawdownData}>
                                <defs>
                                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                                    hide={drawdownData.length > 10} />
                                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={45}
                                    tickFormatter={v => `${v}%`} reversed />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="drawdown" name="Drawdown %"
                                    stroke="#ef4444" strokeWidth={2}
                                    fill="url(#ddGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state" style={{ padding: '40px' }}>
                            <div className="icon">📉</div>
                            <p>No drawdown data yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Capital Utilization */}
            <div className="card">
                <h3 style={{ marginBottom: 16 }}>💰 Capital Overview</h3>
                <div className="grid-3">
                    {[
                        { label: 'Total Capital', value: fmt(data.total_capital), color: 'var(--accent-light)' },
                        { label: 'Available', value: fmt(data.available_capital), color: 'var(--profit)' },
                        { label: 'Invested', value: fmt(data.invested_capital), color: 'var(--warning)' },
                    ].map(item => (
                        <div key={item.label} style={{ textAlign: 'center' }}>
                            <div className="stat-label">{item.label}</div>
                            <div className="mono" style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color }}>
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Utilization Bar */}
                <div style={{ marginTop: 20 }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6
                    }}>
                        <span>Capital Utilization</span>
                        <span className="mono">{data.capital_utilization || 0}%</span>
                    </div>
                    <div style={{
                        height: 8, background: 'var(--bg-input)',
                        borderRadius: 100, overflow: 'hidden', border: '1px solid var(--border)'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(100, data.capital_utilization || 0)}%`,
                            background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                            borderRadius: 100,
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                </div>
            </div>
        </div>
    )
}
