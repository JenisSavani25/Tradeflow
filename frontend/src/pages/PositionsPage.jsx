import { useEffect, useState } from 'react'
import api from '../api/axios'

const fmt = (n) =>
    n !== undefined && n !== null
        ? `₹${parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '—'

export default function PositionsPage() {
    const [positions, setPositions] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('OPEN')

    const fetchPositions = (status) => {
        setLoading(true)
        api.get(`/api/positions/?status=${status}`)
            .then(res => setPositions(res.data.results || res.data))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchPositions(filter) }, [filter])

    const totalValue = positions.reduce(
        (sum, p) => sum + parseFloat(p.average_price) * p.total_quantity, 0
    )

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2>📁 Positions</h2>
                <p>Track your open holdings and closed positions.</p>
            </div>

            {/* Filter + Summary */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['OPEN', 'CLOSED'].map(s => (
                        <button key={s}
                            className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ padding: '7px 18px', fontSize: '0.8rem' }}
                            onClick={() => setFilter(s)}
                        >
                            {s === 'OPEN' ? '🟢' : '⚫'} {s}
                        </button>
                    ))}
                </div>
                {filter === 'OPEN' && positions.length > 0 && (
                    <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Invested: <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                            {fmt(totalValue)}
                        </span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /> Loading positions...</div>
            ) : positions.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">📁</div>
                    <h3>No {filter.toLowerCase()} positions</h3>
                    <p>Place a BUY order to open a position.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Symbol</th>
                                <th>Qty</th>
                                <th>Avg Price</th>
                                <th>Invested Value</th>
                                <th>Status</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map((pos, idx) => {
                                const invested = parseFloat(pos.average_price) * pos.total_quantity
                                return (
                                    <tr key={pos.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                                        <td>
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{pos.stock_symbol}</span>
                                        </td>
                                        <td className="td-mono">{pos.total_quantity.toLocaleString()}</td>
                                        <td className="td-mono">{fmt(pos.average_price)}</td>
                                        <td className="td-mono" style={{ fontWeight: 600 }}>{fmt(invested)}</td>
                                        <td>
                                            <span className={`badge badge-${pos.status.toLowerCase()}`}>
                                                {pos.status === 'OPEN' ? '🟢' : '⚫'} {pos.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                            {new Date(pos.updated_at).toLocaleDateString('en-IN')}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
