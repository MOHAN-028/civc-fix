import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Settings, User, Shield, Bell, Database, HelpCircle, Book, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [notif, setNotif] = useState({ email: true, push: false, sms: false })

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Settings & Help</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Manage your account, preferences, and access documentation.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} color="var(--teal)" /> Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-400)', display: 'block', marginBottom: 4 }}>Full Name</label>
                <input defaultValue={user?.name} className="input" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-400)', display: 'block', marginBottom: 4 }}>Email</label>
                <input defaultValue={user?.email} className="input" disabled />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-400)', display: 'block', marginBottom: 4 }}>Role</label>
                <input defaultValue={user?.role} className="input" disabled style={{ textTransform: 'capitalize' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-400)', display: 'block', marginBottom: 4 }}>Ward</label>
                <input defaultValue={user?.ward || ''} className="input" placeholder="Your ward" />
              </div>
            </div>
            <button onClick={() => toast.success('Profile updated')} className="btn-primary" style={{ marginTop: 14 }}>Save Profile</button>
          </div>

          {/* Notifications */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><Bell size={16} color="var(--teal)" /> Notifications</h3>
            {[
              { key: 'email', label: 'Email Notifications', desc: 'Get status updates via email' },
              { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
              { key: 'sms', label: 'SMS Alerts', desc: 'Critical alerts via SMS' },
            ].map(n => (
              <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{n.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{n.desc}</div>
                </div>
                <div
                  onClick={() => setNotif(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                  style={{ width: 44, height: 24, borderRadius: 12, background: notif[n.key as keyof typeof notif] ? 'var(--teal)' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  <div style={{ position: 'absolute', top: 2, left: notif[n.key as keyof typeof notif] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Security */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={16} color="var(--teal)" /> Security</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="password" placeholder="Current password" className="input" />
              <input type="password" placeholder="New password" className="input" />
              <input type="password" placeholder="Confirm new password" className="input" />
              <button onClick={() => toast.success('Password updated')} className="btn-primary" style={{ width: 'fit-content' }}>Update Password</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* System info */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><Database size={16} color="var(--teal)" /> System Info</h3>
            {[
              ['Platform', 'CivicFix AI v1.0'],
              ['AI Model', 'Demo Mode (v1.0)'],
              ['Database', 'SQLite (dev)'],
              ['API Status', '● Connected'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: v.includes('●') ? 'var(--success)' : 'var(--gray-400)' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Help */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><HelpCircle size={16} color="var(--teal)" /> Help & Docs</h3>
            {[
              { label: 'Getting Started Guide', icon: Book },
              { label: 'Camera Setup', icon: Settings },
              { label: 'API Documentation', icon: Database },
              { label: 'Report an Issue', icon: HelpCircle },
            ].map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => toast('Opening docs…')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', width: '100%', color: 'white', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <Icon size={14} color="var(--teal)" /> {label}
                </span>
                <ChevronRight size={14} color="var(--gray-400)" />
              </button>
            ))}
          </div>

          {/* Danger zone */}
          <div className="card" style={{ borderColor: 'rgba(239,71,111,0.2)', background: 'rgba(239,71,111,0.03)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 15, color: 'var(--danger)' }}>Danger Zone</h3>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12 }}>Delete your account and all associated data. This action cannot be undone.</p>
            <button onClick={() => toast.error('Account deletion requires admin approval')} className="btn-danger" style={{ fontSize: 13 }}>Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  )
}
