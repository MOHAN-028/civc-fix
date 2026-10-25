import { useEffect, useState } from 'react'
import { CheckCircle, Wrench, MapPin, Clock } from 'lucide-react'
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
  description?: string
  assigned_dept?: string
  created_at: string
}

const MOCK: Report[] = [
  { id: 2, report_id: 'CF-2024-00247', category: 'Drainage', subtype: 'Blocked Drain', severity: 'Critical', status: 'Assigned', address: 'Koramangala, Ward 8', description: 'Drain completely blocked causing street flooding', assigned_dept: 'Drainage & Sewerage', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, report_id: 'CF-2024-00246', category: 'Streetlight', subtype: 'Broken Fixture', severity: 'Medium', status: 'In Progress', address: 'Indiranagar, Ward 34', description: 'Street light fixture broken. Pole intact.', assigned_dept: 'Electrical & Lighting', created_at: new Date(Date.now() - 86400000).toISOString() },
]

const SEV_COLOR: Record<string, string> = { Critical: 'var(--danger)', High: '#FF9900', Medium: 'var(--warning)', Low: 'var(--success)' }

export default function MaintenancePage() {
  const [jobs, setJobs] = useState<Report[]>(MOCK)
  const [filterStatus, setFilterStatus] = useState('Assigned')

  useEffect(() => {
    reportsApi.list({ status: 'Assigned,In Progress' })
      .then(res => { if (res.data.items?.length) setJobs(res.data.items) })
      .catch(() => {})
  }, [])

  const updateJob = async (id: number, status: string) => {
    try {
      await reportsApi.update(id, { status })
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j))
      toast.success(`Marked as ${status}`)
    } catch { toast.error('Failed to update') }
  }

  const filtered = jobs.filter(j => !filterStatus || j.status === filterStatus)

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Maintenance Dashboard</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>View assigned jobs and update repair progress.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['Assigned', 'In Progress', 'Resolved'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s === filterStatus ? '' : s)}
            className={filterStatus === s ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: 13 }}>
            {s} ({jobs.filter(j => j.status === s).length})
          </button>
        ))}
        {filterStatus && <button onClick={() => setFilterStatus('')} className="btn-secondary" style={{ fontSize: 13 }}>All</button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(j => (
          <div key={j.id} className="card" style={{ borderLeft: `3px solid ${SEV_COLOR[j.severity] || 'var(--teal)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{j.report_id}</span>
                  <span className={`badge badge-${j.severity.toLowerCase()}`}>{j.severity}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--gray-400)' }}>{j.category} — {j.subtype}</div>
              </div>
              <div style={{ fontSize: 13, color: j.status === 'Resolved' ? 'var(--success)' : j.status === 'In Progress' ? 'var(--teal)' : 'var(--warning)', fontWeight: 700 }}>{j.status}</div>
            </div>

            {j.description && <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 12, lineHeight: 1.5 }}>{j.description}</p>}

            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>
              {j.address && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {j.address}</span>}
              {j.assigned_dept && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Wrench size={13} /> {j.assigned_dept}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {new Date(j.created_at).toLocaleDateString('en-IN')}</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {j.status === 'Assigned' && (
                <button onClick={() => updateJob(j.id, 'In Progress')} className="btn-primary" style={{ fontSize: 13 }}>
                  <Wrench size={14} /> Start Work
                </button>
              )}
              {j.status === 'In Progress' && (
                <button onClick={() => updateJob(j.id, 'Resolved')} className="btn-primary" style={{ fontSize: 13, background: 'linear-gradient(135deg, #06D6A0, #04a17a)' }}>
                  <CheckCircle size={14} /> Mark Resolved
                </button>
              )}
              {j.status === 'Resolved' && (
                <div style={{ color: 'var(--success)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> Completed
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--gray-400)' }}>No jobs in this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}
