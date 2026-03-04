import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
    const { loginWithGoogle } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const googleButtonRef = useRef(null)

    useEffect(() => {
        const handleGoogleResponse = async (response) => {
            setLoading(true)
            try {
                await loginWithGoogle(response.credential)
                toast.success('Welcome back!')
                navigate('/')
            } catch (err) {
                toast.error('Google Sign-In failed')
                setLoading(false)
            }
        }

        // Initialize Google Sign-In when the script loads or if it's already there
        const initializeLogin = () => {
            if (window.google?.accounts?.id && googleButtonRef.current) {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE",
                    callback: handleGoogleResponse
                })

                window.google.accounts.id.renderButton(
                    googleButtonRef.current,
                    { theme: "outline", size: "large", width: 250, shape: "rectangular" }
                )
            }
        }

        // Check if script is already loaded
        if (window.google?.accounts?.id) {
            initializeLogin()
        } else {
            // Wait for script to load (by looking for global onload or checking interval)
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval)
                    initializeLogin()
                }
            }, 100)
            return () => clearInterval(interval)
        }

    }, [loginWithGoogle, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gray-50">
            {/* Stock Market Background */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none">
                <img
                    src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1920&q=80"
                    alt="Stock Market Pattern"
                    className="w-full h-full object-cover opacity-[0.15] mix-blend-multiply scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/90 to-blue-50/50 backdrop-blur-[2px]" />
            </div>

            <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-700">
                {/* Logo */}
                <div className="flex flex-col items-center mb-10">
                    <img
                        src="/logo.png"
                        alt="TradeFlow"
                        className="h-28 w-auto object-contain mb-4 drop-shadow-xl hover:scale-105 transition-transform duration-500"
                    />
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
                        Smart Portfolio Tracker
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5 flex flex-col items-center text-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 mb-1">Sign In</h1>
                        <p className="text-sm text-gray-500">Secure access via Google</p>
                    </div>

                    {loading ? (
                        <div className="py-8 flex flex-col items-center justify-center space-y-3">
                            <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-semibold text-gray-600">Authenticating...</p>
                        </div>
                    ) : (
                        <div className="w-full relative mt-4 flex flex-col items-center">
                            {/* Google Button renders here */}
                            <div ref={googleButtonRef} className="mt-2 h-12 flex justify-center w-full"></div>

                            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                                <p className="text-xs text-red-500 mt-6 pt-4 border-t border-gray-100 w-full">
                                    Please ensure VITE_GOOGLE_CLIENT_ID is set in your .env file and restart dev server.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
