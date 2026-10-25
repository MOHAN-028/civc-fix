import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'

const wardData = [
  { ward: 'W-3', reports: 34 }, { ward: 'W-8', reports: 28 }, { ward: 'W-12', reports: 45 },
  { ward: 'W-22', reports: 19 }, { ward: 'W-34', reports: 32 }, { ward: 'W-56', reports: 14 },
]

const trendData = [
  { month: 'May', reported: 38, resolved: 30 }, { month: 'Jun', reported: 42, resolved: 35 },
  { month: 'Jul', reported: 35, resolved: 28 }, { month: 'Aug', reported: 50, resolved: 40 },
  { month: 'Sep', reported: 44, resolved: 38 }, { month: 'Oct', reported: 39, resolved: 34 },
]

const radarData = [
  { subject: 'Response Time', A: 88 }, { subject: 'Verification', A: 94 },
  { subject: 'Resolution', A: 76 }, { subject: 'Coverage', A: 85 },
  { subject: 'Accuracy', A: 91 }, { subject: 'Citizen Satis.', A: 82 },
]

const pieData = [{ name: 'Road', value: 134 }, { name: 'Drainage', value: 78 }, { name: 'Streetlight', value: 36 }]
const COLORS = ['#00B4D8', '#48CAE4', '#FFD166']

const avgResolution = [
  { category: 'Critical', days: 1.2 }, { category: 'High', days: 3.4 },
  { category: 'Medium', days: 7.1 }, { category: 'Low', days: 14.2 },
]

export default function AnalyticsPage() {
  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Analytics</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Infrastructure monitoring performance metrics and trends.</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--warning)', marginTop: 8 }}>
          ⚠️ Charts show sample data — connect database for live analytics
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Avg Response Time', value: '2.4 hrs', sub: 'Time to first review' },
          { label: 'Resolution Rate', value: '87.3%', sub: 'Issues fully resolved' },
          { label: 'AI Accuracy', value: '91.2%', sub: 'Confirmed detections' },
          { label: 'Active Issues', value: '106', sub: 'Pending action' },
          { label: 'This Month', value: '39', sub: 'New reports' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--teal)' }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Report Trends — Reported vs Resolved (6 months)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="rep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="res" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06D6A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#132040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
              <Area type="monotone" dataKey="reported" stroke="#00B4D8" strokeWidth={2} fill="url(#rep)" />
              <Area type="monotone" dataKey="resolved" stroke="#06D6A0" strokeWidth={2} fill="url(#res)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Category Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={72} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#132040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Ward-wise Reports</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={wardData} layout="vertical" barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="ward" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ background: '#132040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
              <Bar dataKey="reports" fill="var(--teal)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Avg Resolution (days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgResolution} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="category" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#132040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
              <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                {avgResolution.map((d, i) => <Cell key={i} fill={['var(--danger)', '#FF9900', 'var(--warning)', 'var(--success)'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Platform Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={70}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <Radar name="Score" dataKey="A" stroke="var(--teal)" fill="var(--teal)" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
