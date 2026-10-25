import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Mail, Lock, Eye, EyeOff, Loader } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../lib/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('demo@civicfix.ai')
  const [password, setPassword] = useState('demo1234')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const { access_token, user } = res.data
      setAuth(user, access_token)
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const demoLogins = [
    { label: 'Citizen', email: 'citizen@demo.com', pass: 'demo1234', color: 'var(--teal)' },
    { label: 'Officer', email: 'officer@demo.com', pass: 'demo1234', color: 'var(--warning)' },
    { label: 'Maintenance', email: 'maint@demo.com', pass: 'demo1234', color: 'var(--success)' },
    { label: 'Admin', email: 'admin@demo.com', pass: 'demo1234', color: 'var(--danger)' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--teal-dark), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Welcome Back</h1>
          <p style={{ color: 'var(--gray-400)', marginTop: 6, fontSize: 14 }}>Sign in to CivicFix AI</p>
        </div>

        {/* Demo quick login */}
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Quick Demo Login</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {demoLogins.map(d => (
              <button key={d.label} onClick={() => { setEmail(d.email); setPassword(d.pass) }}
                style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid rgba(255,255,255,0.1)`, background: 'rgba(255,255,255,0.05)', color: d.color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" style={{ paddingLeft: 38 }} placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input" style={{ paddingLeft: 38, paddingRight: 40 }} placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? <><Loader size={16} className="spinner" /> Signing In...</> : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-400)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
