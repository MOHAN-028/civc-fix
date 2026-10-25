import { useNavigate } from 'react-router-dom'
import { Shield, Camera, MapPin, BarChart3, ChevronRight, CheckCircle, Zap, Users } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  const features = [
    { icon: Camera, title: 'Live Detection', desc: 'AI-powered camera analysis identifies road damage, drainage issues, and streetlight failures in real time.' },
    { icon: MapPin, title: 'GPS Reporting', desc: 'Automatically attach GPS coordinates and map every detected issue for precise location tracking.' },
    { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track resolution progress, view ward-wise distributions, and monitor KPIs across your city.' },
    { icon: Users, title: 'Multi-Role Access', desc: 'Citizens, municipal officers, maintenance teams, and admins each have tailored workflows.' },
  ]

  const stats = [
    { value: '98%', label: 'Detection Accuracy' },
    { value: '<2s', label: 'Analysis Time' },
    { value: '3', label: 'Infrastructure Types' },
    { value: '4', label: 'Severity Levels' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', color: 'white' }}>
      {/* Nav */}
      <nav style={{ padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--teal-dark), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color="white" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 20 }}>CivicFix</span>
            <span style={{ color: 'var(--teal)', fontWeight: 800, fontSize: 20 }}> AI</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/login')} className="btn-secondary">Sign In</button>
          <button onClick={() => navigate('/register')} className="btn-primary">Get Started <ChevronRight size={16} /></button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 48px 80px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,180,216,0.12)', border: '1px solid rgba(0,180,216,0.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 32, fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>
          <Zap size={14} fill="currentColor" /> AI-Powered Smart City Platform
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
          Detect & Fix City<br />
          <span className="gradient-text">Infrastructure Issues</span><br />
          Automatically
        </h1>
        <p style={{ fontSize: 18, color: 'var(--gray-400)', lineHeight: 1.7, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
          CivicFix AI uses computer vision to identify potholes, drainage blockages, and streetlight failures through your camera — then generates actionable reports for municipal authorities.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
            Start Detecting <ChevronRight size={18} />
          </button>
          <button onClick={() => navigate('/login')} className="btn-secondary" style={{ fontSize: 16, padding: '14px 32px' }}>
            View Demo
          </button>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '40px 48px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--teal)' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, marginBottom: 60 }}>
          Everything You Need to <span className="gradient-text">Fix Your City</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card" style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(0,150,199,0.2), rgba(0,180,216,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(0,180,216,0.2)' }}>
                <Icon size={26} color="var(--teal)" />
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: 10 }}>{title}</h3>
              <p style={{ color: 'var(--gray-400)', fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Infrastructure categories */}
      <section style={{ padding: '40px 48px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 40 }}>Detects 3 Infrastructure Categories</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { emoji: '🛣️', title: 'Road Damage', items: ['Potholes', 'Cracks & Surface Damage', 'Road Erosion', 'Debris & Obstructions'] },
            { emoji: '🚧', title: 'Drainage Issues', items: ['Blocked Drains', 'Missing Manhole Covers', 'Waterlogged Streets', 'Overflow & Flooding'] },
            { emoji: '💡', title: 'Streetlights', items: ['Damaged Poles', 'Broken Fixtures', 'Lighting Failures', 'Exposed Wiring'] },
          ].map(cat => (
            <div key={cat.title} className="card">
              <div style={{ fontSize: 32, marginBottom: 12 }}>{cat.emoji}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--teal)' }}>{cat.title}</h3>
              {cat.items.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <CheckCircle size={14} color="var(--success)" />
                  <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 48px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,150,199,0.1), rgba(0,180,216,0.05))', borderTop: '1px solid rgba(0,180,216,0.15)' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Ready to Fix Your City?</h2>
        <p style={{ color: 'var(--gray-400)', marginBottom: 32 }}>Join CivicFix AI and start detecting infrastructure issues today.</p>
        <button onClick={() => navigate('/register')} className="btn-primary" style={{ fontSize: 16, padding: '14px 40px' }}>
          Create Free Account <ChevronRight size={18} />
        </button>
      </section>

      <footer style={{ padding: '24px 48px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
        © 2024 CivicFix AI · Smart City Infrastructure Detection Platform
      </footer>
    </div>
  )
}
