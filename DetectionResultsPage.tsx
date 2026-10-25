import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { FileText, MapPin, AlertTriangle, CheckCircle, Send, Info, Ruler } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

interface DefectMeasurement {
  physical_width?: number
  physical_length?: number
  surface_area?: number
  surface_area_cm2?: number
  estimated_depth?: string
  depth_cm?: number
  measurement_method?: string
  confidence_rating?: string
  uncertainty?: string
  is_calibrated?: boolean
}

interface Detection {
  class_name: string
  tracking_id?: string
  confidence: number
  severity: string
  bbox: [number, number, number, number]
  measurements?: DefectMeasurement
  description?: string
  recommended_action?: string
}

interface DetectionResult {
  status?: string
  processing_time_ms?: number
  latency_ms?: number
  detections: Detection[]
  image_width?: number
  image_height?: number
  model_status?: {
    loaded?: boolean
    engine?: string
    device?: string
  }
}

const SEVERITY_COLOR: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#3b82f6'
}

export default function DetectionResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 })
  const [submitting, setSubmitting] = useState(false)

  const state = location.state as { detectionResult?: DetectionResult; imageUrl?: string } | null
  const result: DetectionResult | null = state?.detectionResult || null
  const imageUrl = state?.imageUrl || null

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImgSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight })
    }
  }, [imageUrl])

  const submitReport = async () => {
    if (!result?.detections?.length) {
      toast.error('No detections to report')
      return
    }

    setSubmitting(true)
    try {
      const top = result.detections[0]
      const fd = new FormData()
      fd.append('category', 'Road Damage')
      fd.append('subtype', top.class_name || 'Pothole')
      fd.append('severity', top.severity || 'Medium')
      fd.append('confidence_score', String(top.confidence))
      fd.append('description', top.description || `Verified Pothole detection: ${top.class_name}`)
      fd.append('recommended_action', top.recommended_action || 'Bituminous cavity backfill required.')
      
      await api.post('/reports', fd)
      toast.success('Report submitted successfully!')
      navigate('/my-reports')
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  if (!result || !result.detections?.length) {
    return (
      <div className="animate-fade-in-up" style={{ textAlign: 'center', padding: 80 }}>
        <Info size={56} color="var(--gray-400)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>No Detections Found</h2>
        <p style={{ color: 'var(--gray-400)', marginBottom: 24 }}>
          No potholes detected in the uploaded frame, or no image has been processed yet.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => navigate('/camera')} className="btn-primary">Open Live Camera</button>
          <button onClick={() => navigate('/upload')} className="btn-secondary">Upload Photo</button>
        </div>
      </div>
    )
  }

  const processingTime = result.processing_time_ms || result.latency_ms || 18

  return (
    <div className="animate-fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Detection & Measurement Results</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>
            {result.detections.length} pothole{result.detections.length !== 1 ? 's' : ''} detected · {processingTime}ms inference latency
          </p>
        </div>
        <button onClick={submitReport} className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : <><Send size={16} /> Submit Official Report</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* Image with bounding boxes */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {imageUrl ? (
            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Analyzed"
                onLoad={e => {
                  const t = e.target as HTMLImageElement
                  setImgSize({ w: t.naturalWidth, h: t.naturalHeight })
                }}
                style={{ width: '100%', display: 'block', borderRadius: 0 }}
              />
              {/* Bounding boxes */}
              {imgRef.current && result.detections.map((det, i) => {
                const [x1, y1, x2, y2] = det.bbox
                const rw = imgRef.current!.clientWidth
                const rh = imgRef.current!.clientHeight
                const scaleX = rw / (result.image_width || imgSize.w)
                const scaleY = rh / (result.image_height || imgSize.h)
                const color = SEVERITY_COLOR[det.severity] || '#06b6d4'
                return (
                  <div key={i} className="detection-box" style={{
                    position: 'absolute',
                    left: x1 * scaleX, top: y1 * scaleY,
                    width: (x2 - x1) * scaleX, height: (y2 - y1) * scaleY,
                    border: `2px solid ${color}`,
                    borderRadius: 4
                  }}>
                    <div style={{
                      background: color,
                      color: '#ffffff',
                      padding: '2px 6px',
                      fontSize: 11,
                      fontWeight: 700,
                      position: 'absolute',
                      top: -20,
                      left: 0,
                      whiteSpace: 'nowrap'
                    }}>
                      {det.tracking_id || 'PTH'} · {(det.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <FileText size={48} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--gray-400)' }}>No image preview available</p>
            </div>
          )}
        </div>

        {/* Detection list & measurements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.detections.map((det, i) => (
            <div key={i} className="card" style={{ borderLeft: `3px solid ${SEVERITY_COLOR[det.severity] || '#06b6d4'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: 15 }}>{det.class_name} {det.tracking_id ? `(${det.tracking_id})` : ''}</h4>
                  <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Road Infrastructure</p>
                </div>
                <span className={`badge badge-${det.severity.toLowerCase()}`}>{det.severity}</span>
              </div>

              {/* Physical Dimensions */}
              {det.measurements?.is_calibrated ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 }}>
                  <Metric label="Width" value={`${det.measurements.physical_width} cm`} />
                  <Metric label="Length" value={`${det.measurements.physical_length} cm`} />
                  <Metric label="Depth" value={det.measurements.estimated_depth || 'Unavailable'} />
                  <Metric label="Surface Area" value={`${det.measurements.surface_area} m²`} />
                </div>
              ) : (
                <div style={{ padding: '8px 10px', background: 'rgba(234,179,8,0.08)', borderRadius: 8, marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: '#eab308', fontWeight: 600 }}>Uncalibrated Capture</p>
                  <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                    Physical centimetre dimensions require camera calibration or depth sensor.
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <Metric label="Model Confidence" value={`${(det.confidence * 100).toFixed(1)}%`} />
                <Metric label="Detection Index" value={`#${i + 1}`} />
              </div>

              {det.description && (
                <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 8, lineHeight: 1.5 }}>{det.description}</p>
              )}

              <div style={{ background: 'rgba(0,180,216,0.08)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, marginBottom: 2 }}>Recommended Action</p>
                <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                  {det.recommended_action || 'Bituminous cavity backfill and patch repair.'}
                </p>
              </div>
            </div>
          ))}

          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Inference Diagnostics</h4>
            <Metric label="Architecture" value="YOLOv8 Fine-Tuned Pothole Model" />
            <div style={{ height: 6 }} />
            <Metric label="Latency" value={`${processingTime} ms`} />
            <div style={{ height: 6 }} />
            <Metric label="Detections" value={String(result.detections.length)} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/camera')} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
              Back to Camera
            </button>
            <button onClick={submitReport} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
              <CheckCircle size={16} /> Submit Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  )
}
