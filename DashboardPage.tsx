import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, CheckCircle, Clock, MapPin, TrendingUp, Zap, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { reportsApi } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

const COLORS = ['#EF476F', '#FF9900', '#FFD166', '#06D6A0']

interface Stats {
  total: number
  verified: number
  critical: number
  resolved: number
  pending: number
  road: number
  drainage: number
  streetlight: number
  recent: Report[]
}

interface Report {
  id: number
  report_id: string
  category: string
  subtype: string
  severity: string
  status: string
  created_at: string
  address?: string
}

const mockStats: Stats = {
  total: 248, verified: 186, critical: 23, resolved: 142, pending: 46,
  road: 134, drainage: 78, streetlight: 36,
  recent: [
    { id: 1, report_id: 'CF-2024-00248', category: 'Road Damage', subtype: 'Pothole', severity: 'High', status: 'Verified', created_at: new Date().toISOString(), address: 'MG Road, Ward 12' },
    { id: 2, report_id: 'CF-2024-00247', category: 'Drainage', subtype: 'Blocked Drain', severity: 'Critical', status: 'In Progress', created_at: new Date(Date.now() - 3600000).toISOString(), address: 'Koramangala, Ward 8' },
    { id: 3, report_id: 'CF-2024-00246', category: 'Streetlight', subtype: 'Broken Fixture', severity: 'Medium', status: 'Assigned', created_at: new Date(Date.now() - 7200000).toISOString(), address: 'Indiranagar, Ward 34' },
    { id: 4, report_id: 'CF-2024-00245', category: 'Road Damage', subtype: 'Road Erosion', severity: 'Low', status: 'Resolved', created_at: new Date(Date.now() - 86400000).toISOString(), address: 'Whitefield, Ward 56' },
  ]
}

const categoryData = [
  { name: 'Jan', Road: 22, Drainage: 14, Streetlight: 8 },
  { name: 'Feb', Road: 28, Drainage: 16, Streetlight: 6 },
  { name: 'Mar', Road: 34, Drainage: 20, Streetlight: 9 },
  { name: 'Apr', Road: 30, Drainage: 18, Streetlight: 11 },
  { name: 'May', Road: 40, Drainage: 24, Streetlight: 7 },
  { name: 'Jun', Road: 38, Drainage: 22, Streetlight: 12 },
]

const resolutionData = [
  { name: 'Mon', resolved: 8 }, { name: 'Tue', resolved: 12 }, { name: 'Wed', resolved: 6 },
  { name: 'Thu', resolved: 15 }, { name: 'Fri', resolved: 10 }, { name: 'Sat', resolved: 4 }, { name: 'Sun', resolved: 2 },
]

const pieData = [
  { name: 'Critical', value: 23 },
  { name: 'High', value: 67 },
  { name: 'Medium', value: 102 },
  { name: 'Low', value: 56 },
]

function severityColor(s: string) {
  if (s === 'Critical') return 'var(--danger)'
  if (s === 'High') return '#FF9900'
  if (s === 'Medium') return 'var(--warning)'
  return 'var(--success)'
}

function statusColor(s: string) {
  if (s === 'Resolved') return 'var(--success)'
  if (s === 'Critical') return 'var(--danger)'
  if (s === 'In Progress') return 'var(--teal)'
  if (s === 'Assigned') return 'var(--warning)'
  return 'var(--gray-400)'
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>(mockStats)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    reportsApi.stats()
      .then(res => setStats({ ...mockStats, ...res.data }))
      .catch(() => {/* use mock */})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Reports', value: stats.total, icon: Activity, color: 'stat-card-teal', iconColor: 'var(--teal)' },
    { label: 'Critical Issues', value: stats.critical, icon: AlertTriangle, color: 'stat-card-red', iconColor: 'var(--danger)' },
    { label: 'Verified Issues', value: stats.verified, icon: CheckCircle, color: 'stat-card-green', iconColor: 'var(--success)' },
    { label: 'Pending Maintenance', value: stats.pending, icon: Clock, color: 'stat-card-yellow', iconColor: 'var(--warning)' },
    { label: 'Resolved', value: stats.resolved, icon: TrendingUp, color: 'stat-card-green', iconColor: 'var(--success)' },
  ]

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Here's what's happening with your city infrastructure.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/camera')} className="btn-primary">
            <Zap size={16} /> Live Detection
          </button>
          <button onClick={() => navigate('/upload')} className="btn-secondary">
            <RefreshCw size={16} /> Upload & Analyze
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className={`card ${color}`} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${iconColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={22} color={iconColor} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Bar chart */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>Issues by Category (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#132040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
              <Bar dataKey="Road" fill="#00B4D8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Drainage" fill="#48CAE4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Streetlight" fill="#FFD166" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>By Severity</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#132040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {pieData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray-400)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i] }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resolution trend + recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
        {/* Line chart */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>Weekly Resolutions</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={resolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#132040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
              <Line type="monotone" dataKey="resolved" stroke="var(--success)" strokeWidth={2.5} dot={{ fill: 'var(--success)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent reports */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Recent Reports</h3>
            <button onClick={() => navigate('/my-reports')} style={{ fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              View All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.recent.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.report_id}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MapPin size={11} /> {r.address || r.category}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`badge badge-${r.severity.toLowerCase()}`}>{r.severity}</span>
                  <span style={{ fontSize: 11, color: statusColor(r.status), fontWeight: 600 }}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}
