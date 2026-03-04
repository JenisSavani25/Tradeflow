import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function RegisterPage() {
    const { register } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ username: '', email: '', password: '', initial_capital: '' })
    const [loading, setLoading] = useState(false)

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await register(form.username, form.email, form.password, parseFloat(form.initial_capital) || 0)
            toast.success('Account created! Welcome 🎉')
            navigate('/')
        } catch (err) {
            const data = err.response?.data
            toast.error(
                data && typeof data === 'object'
                    ? Object.values(data).flat().join(', ')
                    : 'Registration failed'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden bg-gray-50">
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
                <div className="flex flex-col items-center mb-8">
                    <img
                        src="/logo.png"
                        alt="TradeFlow"
                        className="h-28 w-auto object-contain mb-4 drop-shadow-xl hover:scale-105 transition-transform duration-500"
                    />
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
                        Initialize Terminal
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">Create Account</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Fill in your details to get started</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {[
                            { id: 'reg-username', label: 'Username', key: 'username', type: 'text', placeholder: 'Choose a username' },
                            { id: 'reg-email', label: 'Email (optional)', key: 'email', type: 'email', placeholder: 'your@email.com', required: false },
                            { id: 'reg-password', label: 'Password', key: 'password', type: 'password', placeholder: 'Min. 6 characters' },
                            { id: 'reg-capital', label: 'Initial Capital (₹)', key: 'initial_capital', type: 'number', placeholder: '100000', required: false, step: '0.01', min: '0' },
                        ].map(({ id, label, key, required = true, ...props }) => (
                            <div key={id} className="space-y-1.5">
                                <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
                                <input
                                    id={id}
                                    value={form[key]}
                                    onChange={e => set(key, e.target.value)}
                                    required={required}
                                    className={inputCls}
                                    {...props}
                                />
                            </div>
                        ))}

                        <button
                            id="reg-submit" type="submit" disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                                : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
