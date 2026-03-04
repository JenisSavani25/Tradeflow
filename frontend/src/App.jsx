import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PortfolioPage from './pages/PortfolioPage'
import TradePage from './pages/TradePage'
import LedgerPage from './pages/LedgerPage'
import SettingsPage from './pages/SettingsPage'

function PrivateRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    )
    return user ? children : <Navigate to="/login" replace />
}

function App() {
    const Protected = (Page) => (
        <PrivateRoute>
            <MainLayout><Page /></MainLayout>
        </PrivateRoute>
    )

    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        borderRadius: '10px',
                        fontSize: '13px',
                        background: '#fff',
                        color: '#111827',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
                    },
                }}
            />
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={
                    <PrivateRoute><MainLayout><DashboardPage /></MainLayout></PrivateRoute>
                } />
                <Route path="/portfolio" element={
                    <PrivateRoute><MainLayout><PortfolioPage /></MainLayout></PrivateRoute>
                } />
                <Route path="/trade" element={
                    <PrivateRoute><MainLayout><TradePage /></MainLayout></PrivateRoute>
                } />
                <Route path="/buy" element={<Navigate to="/trade" replace />} />
                <Route path="/sell" element={<Navigate to="/trade" replace />} />
                <Route path="/ledger" element={
                    <PrivateRoute><MainLayout><LedgerPage /></MainLayout></PrivateRoute>
                } />
                <Route path="/settings" element={
                    <PrivateRoute><MainLayout><SettingsPage /></MainLayout></PrivateRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    )
}

export default function Root() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    )
}
