import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, User, Mail, Lock, Phone, MapPin, Loader } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../lib/api'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen', ward: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.register(form)
      const { access_token, user } = res.data
      setAuth(user, access_token)
      toast.success(`Welcome to CivicFix, ${user.name}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--teal-dark), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Create Account</h1>
          <p style={{ color: 'var(--gray-400)', marginTop: 6, fontSize: 14 }}>Join CivicFix AI Platform</p>
        </div>
        <div className="card">
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Full Name" icon={<User size={16} />} type="text" value={form.name} onChange={update('name')} placeholder="John Doe" required />
            <Field label="Email" icon={<Mail size={16} />} type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required />
            <Field label="Password" icon={<Lock size={16} />} type="password" value={form.password} onChange={update('password')} placeholder="Min 8 characters" required />
            <Field label="Phone (Optional)" icon={<Phone size={16} />} type="tel" value={form.phone} onChange={update('phone')} placeholder="+91 XXXXX XXXXX" />
            <Field label="Ward / Area (Optional)" icon={<MapPin size={16} />} type="text" value={form.ward} onChange={update('ward')} placeholder="Ward 12, Koramangala" />
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Role</label>
              <select value={form.role} onChange={update('role')} className="input" style={{ cursor: 'pointer' }}>
                <option value="citizen">Citizen</option>
                <option value="officer">Municipal Officer</option>
                <option value="maintenance">Maintenance Team</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? <><Loader size={16} className="spinner" /> Creating Account...</> : 'Create Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-400)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, icon, ...props }: { label: string; icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}>{icon}</span>
        <input {...props} className="input" style={{ paddingLeft: 38 }} />
      </div>
    </div>
  )
}
