// Shared number formatters used across all pages
export const fmtINR = (n) =>
    n !== undefined && n !== null
        ? `₹${parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '—'

export const fmtPnl = (n) => {
    const v = parseFloat(n) || 0
    return `${v >= 0 ? '+' : ''}${fmtINR(Math.abs(v))}`
}

export const fmtQty = (n) =>
    n !== undefined ? Number(n).toLocaleString('en-IN') : '—'
