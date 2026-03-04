import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
        <Toaster
            position="top-right"
            toastOptions={{
                style: {
                    background: '#111c2d',
                    color: '#e2e8f0',
                    border: '1px solid #1e3050',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.875rem',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#111c2d' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#111c2d' } },
            }}
        />
    </React.StrictMode>
)
