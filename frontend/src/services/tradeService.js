import api from '../api/axios'

// ─── Auth ────────────────────────────────────────
export const addCapital = (amount) => api.post('/api/auth/capital/add/', { amount })
export const withdrawCapital = (amount) => api.post('/api/auth/capital/withdraw/', { amount })

// ─── Analytics ───────────────────────────────────
export const fetchAnalytics = () => api.get('/api/analytics/')

// ─── Positions ───────────────────────────────────
export const fetchPositions = () => api.get('/api/positions/')

// ─── Orders ──────────────────────────────────────
export const placeBuyOrder = (data) => api.post('/api/orders/buy/', data)
export const placeSellOrder = (data) => api.post('/api/orders/sell/', data)
export const fetchAvailableLots = (sym) => api.get(`/api/orders/lots/?symbol=${sym}`)
export const fetchStockSuggestions = () => api.get('/api/stocks/suggestions/')

// ─── Ledger ──────────────────────────────────────
export const fetchLedger = () => api.get('/api/ledger/')

// ─── Charges ─────────────────────────────────────
export const fetchCharges = () => api.get('/api/charges/')
export const saveCharges = (data) => api.patch('/api/charges/', data)
