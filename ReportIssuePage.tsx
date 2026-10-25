import { useState, useEffect } from 'react'
import { MapPin, Loader, CheckCircle } from 'lucide-react'
import { reportsApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function ReportIssuePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    category: 'Road Damage',
    subtype: '',
    severity: 'Medium',
    description: '',
    address: '',
    ward: '',
    latitude: '',
    longitude: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const categoryOptions: Record<string, string[]> = {
    'Road Damage': ['Pothole', 'Road Crack', 'Surface Damage', 'Road Erosion', 'Broken Edge', 'Debris/Obstruction', 'Water-filled Pothole'],
    'Drainage': ['Blocked Drain', 'Overflowing Drain', 'Missing Manhole Cover', 'Waterlogged Street', 'Broken Drain Channel', 'Stagnant Water', 'Drainage Flooding'],
    'Streetlight': ['Damaged Pole', 'Broken Fixture', 'Light Not Working', 'Fallen Streetlight', 'Exposed Wiring', 'Dark Street'],
  }

  const getLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(prev => ({ ...prev, latitude: String(pos.coords.latitude.toFixed(6)), longitude: String(pos.coords.longitude.toFixed(6)) }))
        setLocating(false)
        toast.success('Location captured!')
      },
      () => { toast.error('Location access denied'); setLocating(false) }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (file) fd.append('image', file)
      await reportsApi.create(fd)
      setSubmitted(true)
      toast.success('Report submitted successfully!')
    } catch {
      toast.error('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Report Submitted!</h2>
        <p style={{ color: 'var(--gray-400)', marginBottom: 28 }}>Your report has been received and will be reviewed by municipal authorities.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => navigate('/my-reports')} className="btn-primary">View My Reports</button>
          <button onClick={() => { setSubmitted(false) }} className="btn-secondary">Submit Another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Report an Issue</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Submit a civic infrastructure problem for municipal attention.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Problem Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Category *</label>
                  <select value={form.category} onChange={update('category')} className="input" required>
                    {Object.keys(categoryOptions).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Sub-type</label>
                  <select value={form.subtype} onChange={update('subtype')} className="input">
                    <option value="">Select sub-type</option>
                    {(categoryOptions[form.category] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Severity *</label>
                  <select value={form.severity} onChange={update('severity')} className="input" required>
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Ward / Area</label>
                  <input value={form.ward} onChange={update('ward')} className="input" placeholder="e.g. Ward 12" />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={update('description') as React.ChangeEventHandler<HTMLTextAreaElement>}
                  className="input" rows={4} placeholder="Describe the problem in detail..."
                  style={{ resize: 'vertical' }} />
              </div>
            </div>

            {/* Location */}
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Location</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input value={form.address} onChange={update('address')} className="input" placeholder="Street address or landmark" style={{ flex: 1 }} />
                <button type="button" onClick={getLocation} className="btn-secondary" disabled={locating} style={{ whiteSpace: 'nowrap' }}>
                  {locating ? <Loader size={16} className="spinner" /> : <MapPin size={16} />}
                  {locating ? 'Getting...' : 'Get GPS'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray-400)', display: 'block', marginBottom: 4 }}>Latitude</label>
                  <input value={form.latitude} onChange={update('latitude')} className="input" placeholder="12.9716" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray-400)', display: 'block', marginBottom: 4 }}>Longitude</label>
                  <input value={form.longitude} onChange={update('longitude')} className="input" placeholder="77.5946" />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '14px', fontSize: 15 }} disabled={submitting}>
              {submitting ? <><Loader size={16} className="spinner" /> Submitting...</> : 'Submit Report'}
            </button>
          </div>

          {/* Photo upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Attach Photo</h3>
              <div
                onClick={() => document.getElementById('report-img')?.click()}
                style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer' }}
              >
                <input id="report-img" type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setFile(f)
                    const reader = new FileReader()
                    reader.onload = ev => setPreview(ev.target?.result as string)
                    reader.readAsDataURL(f)
                  }} />
                {preview ? (
                  <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: 8 }} />
                ) : (
                  <>
                    <MapPin size={32} color="var(--teal)" style={{ margin: '0 auto 10px', opacity: 0.7 }} />
                    <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Click to add a photo</p>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Severity Guide</h3>
              {[
                { level: 'Critical', color: 'var(--danger)', examples: 'Missing manhole cover, fallen pole blocking road' },
                { level: 'High', color: '#FF9900', examples: 'Large pothole, severe drainage overflow' },
                { level: 'Medium', color: 'var(--warning)', examples: 'Moderate crack, partial blockage, suspected fault' },
                { level: 'Low', color: 'var(--success)', examples: 'Minor crack, small maintenance item' },
              ].map(s => (
                <div key={s.level} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.level}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{s.examples}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
