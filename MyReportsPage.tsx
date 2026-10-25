import { useEffect, useState } from 'react'
import { reportsApi } from '../lib/api'
import { Search, Filter, Eye, MapPin, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Report {
  id: number
  report_id: string
  category: string
  subtype?: string
  severity: string
  status: string
  address?: string
  created_at: string
  confidence_score?: number
  is_demo?: boolean
}

const STATUS_STEPS = ['Detected', 'Awaiting Review', 'Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved']

const MOCK_REPORTS: Report[] = [
  { id: 1, report_id: 'CF-2024-00248', category: 'Road Damage', subtype: 'Pothole', severity: 'High', status: 'Verified', address: 'MG Road, Ward 12', created_at: new Date().toISOString(), confidence_score: 0.87, is_demo: false },
  { id: 2, report_id: 'CF-2024-00247', category: 'Drainage', subtype: 'Blocked Drain', severity: 'Critical', status: 'In Progress', address: 'Koramangala, Ward 8', created_at: new Date(Date.now() - 3600000).toISOString(), confidence_score: 0.91, is_demo: false },
  { id: 3, report_id: 'CF-2024-00246', category: 'Streetlight', subtype: 'Broken Fixture', severity: 'Medium', status: 'Assigned', address: 'Indiranagar, Ward 34', created_at: new Date(Date.now() - 86400000).toISOString(), confidence_score: 0.74, is_demo: true },
]

const SEV_COLOR: Record<string, string> = { Critical: 'var(--danger)', High: '#FF9900', Medium: 'var(--warning)', Low: 'var(--success)' }
const STATUS_COLOR: Record<string, string> = { Resolved: 'var(--success)', 'In Progress': 'var(--teal)', Assigned: 'var(--warning)', Verified: '#AB47BC', Submitted: '#42A5F5', Detected: 'var(--gray-400)', 'Awaiting Review': 'var(--gray-400)', Rejected: 'var(--danger)' }

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS)
  const [search, setSearch] = useState('')
  const [filterSev, setFilterSev] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    reportsApi.list()
      .then(res => { if (res.data.items?.length) setReports(res.data.items) })
      .catch(() => {})
  }, [])

  const filtered = reports.filter(r =>
    (r.report_id.toLowerCase().includes(search.toLowerCase()) ||
     r.category.toLowerCase().includes(search.toLowerCase()) ||
     (r.address || '').toLowerCase().includes(search.toLowerCase())) &&
    (!filterSev || r.severity === filterSev) &&
    (!filterCat || r.category === filterCat)
  )

  return (
    <div className="animate-fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>My Reports</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Track all your submitted infrastructure reports.</p>
        </div>
        <button onClick={() => navigate('/report')} className="btn-primary">+ New Report</button>
      </div>

      {/* Search & filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ paddingLeft: 38 }} placeholder="Search reports…" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input" style={{ width: 160 }}>
          <option value="">All Categories</option>
          {['Road Damage', 'Drainage', 'Streetlight'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)} className="input" style={{ width: 140 }}>
          <option value="">All Severities</option>
          {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        {['Submitted', 'Verified', 'In Progress', 'Resolved'].map(s => (
          <div key={s} style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: STATUS_COLOR[s] }}>{reports.filter(r => r.status === s).length}</span>
            <span style={{ color: 'var(--gray-400)', marginLeft: 4 }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Filter size={40} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--gray-400)' }}>No reports found matching your filters.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Report ID', 'Category', 'Severity', 'Status', 'Location', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{r.report_id}</div>
                    {r.is_demo && <div style={{ fontSize: 11, color: 'var(--warning)' }}>⚠️ Demo</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13 }}>{r.category}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{r.subtype}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge badge-${r.severity.toLowerCase()}`}>{r.severity}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, color: STATUS_COLOR[r.status] || 'var(--gray-400)', fontWeight: 600 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} /> {r.address || 'No location'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} /> {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => setSelected(r)} style={{ background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 8, padding: '5px 10px', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: 20 }}>×</button>
            <h2 style={{ fontWeight: 800, marginBottom: 6 }}>{selected.report_id}</h2>
            <span className={`badge badge-${selected.severity.toLowerCase()}`} style={{ marginBottom: 20, display: 'inline-block' }}>{selected.severity}</span>

            {/* Status progress */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Status Progress</h4>
              <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
                {STATUS_STEPS.map((step, i) => {
                  const cur = STATUS_STEPS.indexOf(selected.status)
                  const done = i <= cur
                  return (
                    <div key={step} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: done ? 'var(--teal)' : 'rgba(255,255,255,0.1)', margin: '0 auto', position: 'relative', zIndex: 1 }} />
                      <div style={{ fontSize: 9, color: done ? 'var(--teal)' : 'var(--gray-400)', marginTop: 4, lineHeight: 1.2 }}>{step}</div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div style={{ position: 'absolute', top: 5, left: `${(i + 0.5) * (100 / STATUS_STEPS.length)}%`, width: `${100 / STATUS_STEPS.length}%`, height: 2, background: done && i < cur ? 'var(--teal)' : 'rgba(255,255,255,0.1)', zIndex: 0 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Category', selected.category], ['Sub-type', selected.subtype || '—'], ['Confidence', selected.confidence_score ? `${(selected.confidence_score * 100).toFixed(1)}%` : '—'], ['Location', selected.address || '—']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
