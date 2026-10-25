import { useState, useEffect } from 'react'
import { CheckCircle, X, User, Building2, Search, AlertTriangle } from 'lucide-react'
import { reportsApi } from '../lib/api'
import toast from 'react-hot-toast'

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
  description?: string
}

const MOCK: Report[] = [
  { id: 1, report_id: 'CF-2024-00248', category: 'Road Damage', subtype: 'Pothole', severity: 'High', status: 'Submitted', address: 'MG Road', created_at: new Date().toISOString(), confidence_score: 0.87, description: 'Large pothole causing traffic hazard' },
  { id: 2, report_id: 'CF-2024-00247', category: 'Drainage', subtype: 'Blocked Drain', severity: 'Critical', status: 'Awaiting Review', address: 'Koramangala', created_at: new Date(Date.now() - 3600000).toISOString(), confidence_score: 0.91, is_demo: false },
  { id: 3, report_id: 'CF-2024-00246', category: 'Streetlight', subtype: 'Broken Fixture', severity: 'Medium', status: 'Verified', address: 'Indiranagar', created_at: new Date(Date.now() - 86400000).toISOString(), is_demo: true },
]

const SEV_COLOR: Record<string, string> = { Critical: 'var(--danger)', High: '#FF9900', Medium: 'var(--warning)', Low: 'var(--success)' }
const DEPARTMENTS = ['Roads & Infrastructure', 'Drainage & Sewerage', 'Electrical & Lighting', 'Public Works']
const STATUSES = ['Awaiting Review', 'Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected']

export default function MunicipalPage() {
  const [reports, setReports] = useState<Report[]>(MOCK)
  const [filterStatus, setFilterStatus] = useState('Submitted')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [assignDept, setAssignDept] = useState('')

  useEffect(() => {
    reportsApi.list({ status: filterStatus || undefined })
      .then(res => { if (res.data.items?.length) setReports(res.data.items) })
      .catch(() => {})
  }, [filterStatus])

  const update = async (id: number) => {
    try {
      const data: Record<string, string> = {}
      if (newStatus) data.status = newStatus
      if (assignDept) data.assigned_dept = assignDept
      await reportsApi.update(id, data)
      setReports(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
      setSelected(null)
      toast.success('Report updated')
    } catch { toast.error('Update failed') }
  }

  const filtered = reports.filter(r =>
    (!filterStatus || r.status === filterStatus) &&
    (r.report_id.toLowerCase().includes(search.toLowerCase()) ||
     r.category.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Municipal Management</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Review, verify, and assign civic infrastructure reports.</p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {['Awaiting Review', 'Verified', 'In Progress', 'Resolved'].map(s => (
          <div key={s} className="card" style={{ padding: '14px 16px', cursor: 'pointer', borderColor: filterStatus === s ? 'var(--teal)' : undefined }}
            onClick={() => setFilterStatus(s === filterStatus ? '' : s)}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal)' }}>{reports.filter(r => r.status === s).length}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ paddingLeft: 38 }} placeholder="Search…" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input" style={{ width: 180 }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Report ID', 'Category', 'Severity', 'Status', 'Location', 'AI Confidence', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.report_id}</div>
                  {r.is_demo && <div style={{ fontSize: 11, color: 'var(--warning)' }}>⚠️ Demo</div>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{r.category}<div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{r.subtype}</div></td>
                <td style={{ padding: '12px 16px' }}><span className={`badge badge-${r.severity.toLowerCase()}`}>{r.severity}</span></td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>{r.status}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--gray-400)' }}>{r.address || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{r.confidence_score ? `${(r.confidence_score * 100).toFixed(0)}%` : '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => { setSelected(r); setNewStatus(r.status); setAssignDept('') }}
                    className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Management modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800 }}>Manage {selected.report_id}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Update Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Assign Department</label>
              <select value={assignDept} onChange={e => setAssignDept(e.target.value)} className="input">
                <option value="">Select department…</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => update(selected.id)} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                <CheckCircle size={16} /> Apply Changes
              </button>
              <button onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
