import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (token) {
            api.get('/api/auth/profile/')
                .then(res => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem('access_token')
                    localStorage.removeItem('refresh_token')
                })
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const login = async (username, password) => {
        const res = await api.post('/api/auth/login/', { username, password })
        localStorage.setItem('access_token', res.data.access)
        localStorage.setItem('refresh_token', res.data.refresh)
        setUser(res.data.user)
        return res.data
    }

    const loginWithGoogle = async (credential) => {
        const res = await api.post('/api/auth/google/', { credential })
        localStorage.setItem('access_token', res.data.access)
        localStorage.setItem('refresh_token', res.data.refresh)
        setUser(res.data.user)
        return res.data
    }

    const register = async (username, email, password, initial_capital) => {
        const res = await api.post('/api/auth/register/', {
            username, email, password, initial_capital
        })
        localStorage.setItem('access_token', res.data.access)
        localStorage.setItem('refresh_token', res.data.refresh)
        setUser(res.data.user)
        return res.data
    }

    const logout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
    }

    const refreshUser = async () => {
        try {
            const res = await api.get('/api/auth/profile/')
            setUser(res.data)
        } catch { }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
