import { useCallback, useState } from 'react'
import { Upload, Image, Video, FileText, X, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { detectApi } from '../lib/api'
import toast from 'react-hot-toast'

type UploadType = 'image' | 'video'

export default function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadType, setUploadType] = useState<UploadType>('image')
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const maxSizeMB = uploadType === 'image' ? 10 : 50

  const handleFile = (f: File) => {
    const isImage = f.type.startsWith('image/')
    const isVideo = f.type.startsWith('video/')
    if (!isImage && !isVideo) { toast.error('Please upload an image or video file'); return }
    if (f.size > maxSizeMB * 1024 * 1024) { toast.error(`File too large. Max ${maxSizeMB}MB`); return }
    setFile(f)
    setUploadType(isVideo ? 'video' : 'image')
    if (isImage) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const analyze = async () => {
    if (!file) return
    setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const endpoint = uploadType === 'video' ? detectApi.analyzeVideo : detectApi.analyzeImage
      const res = await endpoint(fd)
      navigate('/results', { state: { detectionResult: res.data, imageUrl: preview } })
    } catch {
      toast.error('Analysis failed. Ensure the backend is running.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Upload & Analyze</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Upload photos or videos for AI-powered infrastructure detection.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        <div>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {(['image', 'video'] as UploadType[]).map(t => (
              <button key={t} onClick={() => { setUploadType(t); setFile(null); setPreview(null) }}
                className={uploadType === t ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, justifyContent: 'center' }}>
                {t === 'image' ? <Image size={16} /> : <Video size={16} />}
                {t === 'image' ? 'Photo Upload' : 'Video Upload'}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--teal)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 16, padding: 48, textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(0,180,216,0.05)' : 'transparent',
              transition: 'all 0.2s', marginBottom: 16
            }}
          >
            <input id="file-input" type="file"
              accept={uploadType === 'image' ? 'image/*' : 'video/*'}
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <div>
                <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{file.name}</p>
                <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <Upload size={48} color="var(--teal)" style={{ margin: '0 auto 16px', opacity: 0.7 }} />
                <p style={{ fontWeight: 700, marginBottom: 8 }}>
                  {dragging ? 'Drop it here!' : `Drag & drop or click to upload`}
                </p>
                <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>
                  {uploadType === 'image' ? 'JPEG, PNG, WebP — max 10MB' : 'MP4, MOV, AVI — max 50MB'}
                </p>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }} />
              <button onClick={() => { setFile(null); setPreview(null) }}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {file && (
            <button onClick={analyze} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '14px' }} disabled={analyzing}>
              {analyzing
                ? <><div className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> Analyzing with AI...</>
                : <><Zap size={18} /> Analyze {uploadType === 'image' ? 'Image' : 'Video'} with AI</>
              }
            </button>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>What Gets Detected</h3>
            {[
              { icon: '🛣️', cat: 'Road Damage', items: ['Potholes', 'Cracks', 'Erosion', 'Debris'] },
              { icon: '🚧', cat: 'Drainage', items: ['Blockages', 'Missing covers', 'Flooding', 'Overflow'] },
              { icon: '💡', cat: 'Streetlights', items: ['Damaged poles', 'Broken fixtures', 'Exposed wiring'] },
            ].map(c => (
              <div key={c.cat} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{c.icon} {c.cat}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {c.items.map(i => (
                    <span key={i} style={{ fontSize: 11, background: 'rgba(0,180,216,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(0,180,216,0.2)' }}>{i}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: 'rgba(255,209,102,0.05)', borderColor: 'rgba(255,209,102,0.2)' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={16} /> Demo Mode Notice
            </h3>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', lineHeight: 1.6 }}>
              Without a trained YOLO model, the backend runs in <strong style={{ color: 'var(--warning)' }}>DEMO MODE</strong>. Results are clearly labeled as simulated and are NOT real AI predictions. Connect a trained model for production use.
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Upload Tips</h3>
            {['Good natural or artificial lighting', 'Stable, non-blurry capture', 'Frame the full defect area', 'Min 640×480px resolution', 'Include context (surroundings)'].map(t => (
              <div key={t} style={{ fontSize: 12, color: 'var(--gray-400)', display: 'flex', gap: 6, marginBottom: 6 }}>
                <span style={{ color: 'var(--teal)' }}>✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
