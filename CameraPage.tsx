import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Camera,
  CameraOff,
  SwitchCamera,
  AlertTriangle,
  Play,
  Pause,
  Sliders,
  Ruler,
  Layers,
  Crosshair,
  CheckCircle2,
  ExternalLink,
  Volume2,
  VolumeX,
  FileText,
  Activity,
  Cpu,
  RefreshCw,
  Download,
  MapPin,
  Info,
  ShieldAlert,
  HelpCircle,
  Eye,
  Settings2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface DefectMeasurement {
  physical_width: number | null
  physical_length: number | null
  surface_area: number | null
  surface_area_cm2: number | null
  estimated_depth: string
  depth_cm: number | null
  measurement_method: string
  confidence_rating: string
  uncertainty: string
  measurement_status: string
  is_calibrated: boolean
  pixel_dimensions?: {
    width_px: number
    height_px: number
    area_px: number
  }
}

interface TrackedPothole {
  tracking_id: string
  class_name: string
  category: string
  confidence: number
  best_confidence?: number
  hits: number
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string
  bbox: [number, number, number, number]
  polygon?: [number, number][]
  measurements: DefectMeasurement
  action: string
  dept: string
}

interface SessionSummary {
  total_unique_potholes: number
  currently_visible: number
  new_detections: number
  persisted_potholes: number
  severity_breakdown: {
    Critical: number
    High: number
    Medium: number
    Low: number
  }
}

type CalibrationMode = 'uncalibrated' | 'mode_a_reference' | 'mode_b_ground_plane' | 'mode_c_depth_sensor'

export default function CameraPage() {
  const navigate = useNavigate()

  // Video / Canvas References
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // System & Camera State
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [detectionActive, setDetectionActive] = useState<boolean>(true)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState<boolean>(false)

  // Hardware / Model Diagnostic State
  const [modelStatus, setModelStatus] = useState<{
    loaded: boolean
    engine: string
    device: string
    architecture: string
  }>({
    loaded: false,
    engine: 'Checking...',
    device: 'CPU',
    architecture: 'YOLOv8 Pothole Model'
  })

  // Metrics
  const [fps, setFps] = useState<number>(0)
  const [latency, setLatency] = useState<number>(0)
  const [audioAlerts, setAudioAlerts] = useState<boolean>(true)
  const [criticalAlarm, setCriticalAlarm] = useState<boolean>(false)
  const frameCountRef = useRef<number>(0)
  const lastFpsUpdateRef = useRef<number>(performance.now())

  // Detections & Tracking
  const [trackedDefects, setTrackedDefects] = useState<TrackedPothole[]>([])
  const [selectedPotholeId, setSelectedPotholeId] = useState<string | null>(null)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>({
    total_unique_potholes: 0,
    currently_visible: 0,
    new_detections: 0,
    persisted_potholes: 0,
    severity_breakdown: { Critical: 0, High: 0, Medium: 0, Low: 0 }
  })

  // Saving & Export State
  const [savingRecord, setSavingRecord] = useState<boolean>(false)
  const [lastSavedReport, setLastSavedReport] = useState<{ id: number; report_id: string; tracking_id: string } | null>(null)

  // Calibration Parameters
  const [calibrationMode, setCalibrationMode] = useState<CalibrationMode>('mode_b_ground_plane')
  const [cameraHeight, setCameraHeight] = useState<number>(1.2) // meters
  const [cameraTilt, setCameraTilt] = useState<number>(45.0) // degrees
  const [cameraFov, setCameraFov] = useState<number>(65.0) // degrees
  const [referenceSize, setReferenceSize] = useState<number>(20.0) // cm
  const [referencePx, setReferencePx] = useState<number>(100.0) // px
  const [sensitivity, setSensitivity] = useState<'high' | 'medium' | 'low'>('medium')

  // UI Overlays toggles
  const [showPolygons, setShowPolygons] = useState<boolean>(true)
  const [showDimensions, setShowDimensions] = useState<boolean>(true)
  const [showReticle, setShowReticle] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'measurements' | 'session' | 'calibration'>('measurements')

  // Check backend model status on mount
  useEffect(() => {
    api.get('/model/status')
      .then((res) => {
        if (res.data) {
          setModelStatus({
            loaded: res.data.is_loaded,
            engine: res.data.backend_engine,
            device: res.data.device,
            architecture: res.data.architecture
          })
        }
      })
      .catch(() => {
        setModelStatus((prev) => ({ ...prev, engine: 'Backend Offline' }))
      })

    // Query camera devices
    navigator.mediaDevices?.enumerateDevices()
      .then((devices) => {
        const cams = devices.filter((d) => d.kind === 'videoinput')
        setHasMultipleCameras(cams.length > 1)
      })
      .catch(() => {})

    return () => {
      stopCamera()
      if (wsRef.current) wsRef.current.close()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Setup WebSocket connection to backend
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ws/live-detect`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.detections) {
            setTrackedDefects(data.detections)
            if (data.latency_ms) setLatency(Math.round(data.latency_ms))
            if (data.session_summary) setSessionSummary(data.session_summary)

            // Auto-select first pothole if none selected or current is gone
            if (data.detections.length > 0) {
              const currentStillExists = data.detections.some((d: TrackedPothole) => d.tracking_id === selectedPotholeId)
              if (!selectedPotholeId || !currentStillExists) {
                setSelectedPotholeId(data.detections[0].tracking_id)
              }
            } else {
              setSelectedPotholeId(null)
            }

            // Audio alert if critical pothole detected
            const hasCrit = data.detections.some((d: TrackedPothole) => String(d.severity).includes('Critical'))
            setCriticalAlarm(hasCrit)

            // FPS calculation
            frameCountRef.current += 1
            const now = performance.now()
            if (now - lastFpsUpdateRef.current >= 1000) {
              setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)))
              frameCountRef.current = 0
              lastFpsUpdateRef.current = now
            }
          }
        } catch {}
      }

      ws.onclose = () => setWsConnected(false)
      ws.onerror = () => setWsConnected(false)

      wsRef.current = ws
    } catch {
      setWsConnected(false)
    }
  }, [selectedPotholeId])

  // Audio beep on critical hazard
  useEffect(() => {
    if (criticalAlarm && audioAlerts) {
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(880, audioCtx.currentTime)
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.22)
      } catch {}
    }
  }, [criticalAlarm, audioAlerts])

  // ── Camera Stream Controls (NO SIMULATION FALLBACK) ───────────────────────
  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      setIsPaused(false)
      connectWebSocket()
      toast.success('Live camera feed active')
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      let msg = 'Failed to access camera.'
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please click the camera icon in your browser URL bar and allow access.'
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected on this system. Please connect a USB camera.'
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        msg = 'Camera is currently in use by another application (e.g. Zoom, Teams, Meet). Please close other apps and try again.'
      }
      setCameraError(msg)
      setCameraActive(false)
      toast.error(msg)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setTrackedDefects([])
    setSelectedPotholeId(null)
  }

  const switchCamera = async () => {
    stopCamera()
    const nextMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextMode)
    setTimeout(() => startCamera(), 250)
  }

  // ── Frame Transmission Loop ───────────────────────────────────────────────
  useEffect(() => {
    if (!cameraActive || isPaused || !detectionActive) return

    let lastSent = 0
    const frameInterval = 200 // Send ~5 frames per second for deep real-time inference

    const sendFrame = async () => {
      const now = performance.now()
      if (now - lastSent >= frameInterval) {
        lastSent = now

        if (videoRef.current && videoRef.current.readyState >= 2) {
          const capCanvas = captureCanvasRef.current || document.createElement('canvas')
          capCanvas.width = 640
          capCanvas.height = 360
          const ctx = capCanvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 640, 360)
            const frameB64 = capCanvas.toDataURL('image/jpeg', 0.75)

            const calibrationPayload = {
              mode: calibrationMode,
              camera_height_m: cameraHeight,
              camera_tilt_deg: cameraTilt,
              camera_fov_deg: cameraFov,
              reference_object_size_cm: referenceSize,
              reference_object_px: referencePx,
            }

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  frame: frameB64,
                  calibration: calibrationPayload,
                  sensitivity,
                })
              )
            } else {
              // HTTP Polling Fallback
              try {
                const res = await api.post('/camera/process-frame', {
                  frame: frameB64,
                  calibration: calibrationPayload,
                  sensitivity,
                })
                if (res.data?.detections) {
                  setTrackedDefects(res.data.detections)
                  if (res.data.latency_ms) setLatency(Math.round(res.data.latency_ms))
                  if (res.data.session_summary) setSessionSummary(res.data.session_summary)
                }
              } catch {}
            }
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(sendFrame)
    }

    animFrameRef.current = requestAnimationFrame(sendFrame)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [cameraActive, isPaused, detectionActive, calibrationMode, cameraHeight, cameraTilt, cameraFov, referenceSize, referencePx, sensitivity])

  // ── Real-Time Canvas Overlay Renderer ─────────────────────────────────────
  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas || !videoRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Sync canvas resolution to actual displayed video dimensions
    const rect = videoRef.current.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!cameraActive) return

    // Scale factors from original frame (1280x720) to current canvas display size
    const sx = canvas.width / 1280
    const sy = canvas.height / 720

    // Draw reticle crosshair if enabled
    if (showReticle) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 6])
      // Center vertical & horizontal
      ctx.beginPath()
      ctx.moveTo(canvas.width / 2, 0)
      ctx.lineTo(canvas.width / 2, canvas.height)
      ctx.moveTo(0, canvas.height / 2)
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Render detected pothole bounding boxes & segmentation contours
    trackedDefects.forEach((defect) => {
      const isSelected = defect.tracking_id === selectedPotholeId
      const [bx1, by1, bx2, by2] = defect.bbox
      const x1 = bx1 * sx
      const y1 = by1 * sy
      const x2 = bx2 * sx
      const y2 = by2 * sy
      const w = x2 - x1
      const h = y2 - y1

      // Severity Color Palette
      let strokeColor = '#3b82f6' // Blue (Low)
      let fillColor = 'rgba(59, 130, 246, 0.18)'
      if (String(defect.severity).includes('Critical')) {
        strokeColor = '#ef4444' // Red
        fillColor = 'rgba(239, 68, 68, 0.24)'
      } else if (String(defect.severity).includes('High')) {
        strokeColor = '#f97316' // Orange
        fillColor = 'rgba(249, 115, 22, 0.22)'
      } else if (String(defect.severity).includes('Medium')) {
        strokeColor = '#eab308' // Yellow
        fillColor = 'rgba(234, 179, 8, 0.20)'
      }

      if (isSelected) {
        strokeColor = '#06b6d4' // Cyan highlight for selected
        fillColor = 'rgba(6, 182, 212, 0.28)'
      }

      // Draw Polygon Contour
      if (showPolygons && defect.polygon && defect.polygon.length >= 3) {
        ctx.fillStyle = fillColor
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.beginPath()
        defect.polygon.forEach(([px, py], i) => {
          const cx = px * sx
          const cy = py * sy
          if (i === 0) ctx.moveTo(cx, cy)
          else ctx.lineTo(cx, cy)
        })
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }

      // Draw Bounding Box Corner Brackets
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = isSelected ? 3 : 2
      const bracket = Math.min(18, w * 0.25, h * 0.25)
      ctx.beginPath()
      // Top-Left
      ctx.moveTo(x1, y1 + bracket)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x1 + bracket, y1)
      // Top-Right
      ctx.moveTo(x2 - bracket, y1)
      ctx.lineTo(x2, y1)
      ctx.lineTo(x2, y1 + bracket)
      // Bottom-Right
      ctx.moveTo(x2, y2 - bracket)
      ctx.lineTo(x2, y2)
      ctx.lineTo(x2 - bracket, y2)
      // Bottom-Left
      ctx.moveTo(x1 + bracket, y2)
      ctx.lineTo(x1, y2)
      ctx.lineTo(x1, y2 - bracket)
      ctx.stroke()

      // Header Tag: Tracking ID & Confidence
      const tagText = `${defect.tracking_id} · ${(defect.confidence * 100).toFixed(0)}%`
      ctx.font = 'bold 12px Inter, sans-serif'
      const tagW = ctx.measureText(tagText).width + 14
      ctx.fillStyle = strokeColor
      ctx.fillRect(x1, Math.max(0, y1 - 22), tagW, 20)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(tagText, x1 + 7, Math.max(14, y1 - 8))

      // Dimension Sub-Tag (Only if calibrated and showDimensions enabled)
      if (showDimensions) {
        let dimText = 'Uncalibrated'
        if (defect.measurements?.is_calibrated && defect.measurements?.physical_width) {
          dimText = `${defect.measurements.physical_width}×${defect.measurements.physical_length}cm`
          if (defect.measurements.depth_cm) {
            dimText += ` · D:${defect.measurements.depth_cm}cm`
          }
        }
        ctx.font = '11px Inter, sans-serif'
        const dimW = ctx.measureText(dimText).width + 12
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
        ctx.fillRect(x1, y2 + 4, dimW, 18)
        ctx.fillStyle = defect.measurements?.is_calibrated ? '#4ade80' : '#fbbf24'
        ctx.fillText(dimText, x1 + 6, y2 + 17)
      }
    })
  }, [trackedDefects, selectedPotholeId, cameraActive, showPolygons, showDimensions, showReticle])

  // ── Save Detection Evidence Record ────────────────────────────────────────
  const saveDetectionRecord = async () => {
    if (!cameraActive || trackedDefects.length === 0) {
      toast.error('No active pothole detection in view to save')
      return
    }

    const defectToSave = trackedDefects.find((d) => d.tracking_id === selectedPotholeId) || trackedDefects[0]
    setSavingRecord(true)

    try {
      // 1. Capture snapshot from video canvas
      let imageBase64 = ''
      if (videoRef.current) {
        const snapCanvas = document.createElement('canvas')
        snapCanvas.width = videoRef.current.videoWidth || 1280
        snapCanvas.height = videoRef.current.videoHeight || 720
        const sctx = snapCanvas.getContext('2d')
        if (sctx) {
          sctx.drawImage(videoRef.current, 0, 0)
          imageBase64 = snapCanvas.toDataURL('image/jpeg', 0.85)
        }
      }

      // 2. Fetch browser GPS if permission granted
      let gpsLat: number | null = null
      let gpsLng: number | null = null
      let gpsAcc: number | null = null

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500 })
          })
          gpsLat = pos.coords.latitude
          gpsLng = pos.coords.longitude
          gpsAcc = pos.coords.accuracy
        } catch {
          // GPS not granted or timed out
        }
      }

      // 3. Post to backend
      const payload = {
        tracking_id: defectToSave.tracking_id,
        class_name: defectToSave.class_name,
        category: 'Road Damage',
        severity: defectToSave.severity,
        confidence: defectToSave.confidence,
        physical_width: defectToSave.measurements?.physical_width,
        physical_length: defectToSave.measurements?.physical_length,
        surface_area: defectToSave.measurements?.surface_area,
        estimated_depth: defectToSave.measurements?.estimated_depth,
        measurement_method: defectToSave.measurements?.measurement_method,
        measurement_confidence: defectToSave.measurements?.confidence_rating,
        measurement_uncertainty: defectToSave.measurements?.uncertainty,
        segmentation_points: defectToSave.polygon ? JSON.stringify(defectToSave.polygon) : null,
        latitude: gpsLat,
        longitude: gpsLng,
        gps_accuracy: gpsAcc,
        address: gpsLat ? `Lat: ${gpsLat.toFixed(5)}, Lng: ${gpsLng.toFixed(5)}` : 'Manual Location Required',
        ward: 'Central Sector',
        description: `Verified Pothole detection: ${defectToSave.measurements?.physical_width || '?'}cm × ${defectToSave.measurements?.physical_length || '?'}cm. Depth: ${defectToSave.measurements?.estimated_depth || 'Unavailable'}.`,
        image_base64: imageBase64,
      }

      const res = await api.post('/detections', payload)
      if (res.data?.success) {
        setLastSavedReport({
          id: res.data.id,
          report_id: res.data.report_id,
          tracking_id: defectToSave.tracking_id,
        })
        toast.success(`Pothole ${defectToSave.tracking_id} saved as record ${res.data.report_id}!`)
      }
    } catch {
      toast.error('Failed to save detection record')
    } finally {
      setSavingRecord(false)
    }
  }

  // ── Reset Session Tracker ─────────────────────────────────────────────────
  const resetSession = async () => {
    try {
      await api.post('/session/reset')
      setTrackedDefects([])
      setSessionSummary({
        total_unique_potholes: 0,
        currently_visible: 0,
        new_detections: 0,
        persisted_potholes: 0,
        severity_breakdown: { Critical: 0, High: 0, Medium: 0, Low: 0 },
      })
      toast.success('Session tracker reset')
    } catch {
      toast.error('Could not reset session')
    }
  }

  // Selected defect object
  const activeDefect = trackedDefects.find((d) => d.tracking_id === selectedPotholeId) || trackedDefects[0]

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-80px)] text-white">
      {/* ── System Header & Live Telemetry Bar ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity size={22} className={cameraActive ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Real-Time AI Pothole Detection & Physical Measurement
              <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PRO VISION
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Live webcam frame capture · YOLOv8 Computer Vision · Ground-plane metric calibration
            </p>
          </div>
        </div>

        {/* Live Diagnostics Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Model Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs">
            <Cpu size={14} className={modelStatus.loaded ? 'text-emerald-400' : 'text-amber-400'} />
            <span className="text-slate-400 font-mono">MODEL:</span>
            <span className="font-semibold text-slate-200">
              {modelStatus.loaded ? 'YOLOv8-Pothole (Active)' : 'Loading Weights...'}
            </span>
          </div>

          {/* Engine / Device */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs">
            <span className="text-slate-400 font-mono">RUNTIME:</span>
            <span className="font-semibold text-cyan-400">{modelStatus.device}</span>
          </div>

          {/* WebSocket Link */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="font-mono text-slate-300">{wsConnected ? 'WS STREAMING' : 'HTTP POLLING'}</span>
          </div>

          {/* Telemetry (FPS / Latency) */}
          {cameraActive && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono">
              <span className="text-emerald-400 font-bold">{fps} FPS</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400">{latency} ms</span>
            </div>
          )}

          {/* Audio Alert Toggle */}
          <button
            onClick={() => setAudioAlerts(!audioAlerts)}
            className={`p-2 rounded-lg border transition-colors ${
              audioAlerts
                ? 'bg-slate-800 border-slate-700 text-cyan-400 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
            }`}
            title={audioAlerts ? 'Mute Critical Hazard Beep' : 'Enable Critical Hazard Beep'}
          >
            {audioAlerts ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* ── Main Workstation Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Live Camera Panel (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col">
            {/* Viewport Frame */}
            <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              {/* Actual HTML5 Video Stream */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {/* Real-Time Detection HUD Overlay Canvas */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Hidden Canvas for Frame Capture */}
              <canvas ref={captureCanvasRef} className="hidden" />

              {/* State A: Camera Stopped or Permission Denied (NO SIMULATION) */}
              {!cameraActive && (
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-md z-20">
                  {cameraError ? (
                    <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 mb-5 flex flex-col items-center gap-2">
                      <ShieldAlert size={36} className="text-red-400" />
                      <h3 className="font-bold text-base text-red-100">Camera Access Error</h3>
                      <p className="text-xs text-red-300 leading-relaxed">{cameraError}</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4">
                      <Camera size={44} />
                    </div>
                  )}

                  <h2 className="text-lg font-bold text-slate-100 mb-1">
                    {cameraError ? 'Camera Unavailable' : 'Live Camera Inactive'}
                  </h2>
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                    Connect an RGB webcam or external camera. Frame processing runs directly through the real YOLOv8 pothole detection model.
                  </p>

                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play size={18} />
                    Start Live Camera Stream
                  </button>

                  <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-400" /> WebRTC Compliant
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-400" /> 0% Simulated Data
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-400" /> GPU / NPU Ready
                    </span>
                  </div>
                </div>
              )}

              {/* Status Pill: Detection State when Camera is Active */}
              {cameraActive && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-xs font-mono flex items-center gap-2 shadow-md">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 font-bold">REC</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-200">
                      {isPaused ? 'DETECTION PAUSED' : `${trackedDefects.length} POTHOLE(S) IN VIEW`}
                    </span>
                  </div>

                  {trackedDefects.length === 0 && !isPaused && (
                    <div className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs text-slate-400 flex items-center gap-1.5 shadow-md">
                      <Info size={13} className="text-cyan-400" />
                      <span>No potholes detected in the current frame</span>
                    </div>
                  )}
                </div>
              )}

              {/* Calibration Mode Watermark */}
              {cameraActive && (
                <div className="absolute top-4 right-4 z-20">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium backdrop-blur-md border shadow-md ${
                      calibrationMode !== 'uncalibrated'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {calibrationMode === 'mode_b_ground_plane'
                      ? `CALIBRATED · Homography (H=${cameraHeight}m)`
                      : calibrationMode === 'mode_a_reference'
                      ? `CALIBRATED · Target (${referenceSize}cm)`
                      : calibrationMode === 'mode_c_depth_sensor'
                      ? 'CALIBRATED · Metric Depth'
                      : 'UNCALIBRATED · Size in Px Only'}
                  </span>
                </div>
              )}
            </div>

            {/* ── On-Screen Control Toolbar ───────────────────────────────── */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
                  >
                    <CameraOff size={15} />
                    Stop Camera
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  >
                    <Camera size={15} />
                    Start Camera
                  </button>
                )}

                {cameraActive && (
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                  >
                    {isPaused ? <Play size={15} /> : <Pause size={15} />}
                    {isPaused ? 'Resume Detection' : 'Pause Detection'}
                  </button>
                )}

                {hasMultipleCameras && cameraActive && (
                  <button
                    onClick={switchCamera}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors"
                    title="Switch Camera Sensor"
                  >
                    <SwitchCamera size={15} />
                    Flip
                  </button>
                )}
              </div>

              {/* View Overlay Toggles */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setShowPolygons(!showPolygons)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    showPolygons
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  <Layers size={13} className="inline mr-1" />
                  Masks
                </button>

                <button
                  onClick={() => setShowDimensions(!showDimensions)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    showDimensions
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  <Ruler size={13} className="inline mr-1" />
                  Dimensions
                </button>

                <button
                  onClick={() => setShowReticle(!showReticle)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    showReticle
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  <Crosshair size={13} className="inline mr-1" />
                  Reticle
                </button>

                {/* Save Detection Button */}
                <button
                  onClick={saveDetectionRecord}
                  disabled={savingRecord || trackedDefects.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-md shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <FileText size={14} />
                  {savingRecord ? 'Recording...' : 'Save Detection'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Detected Potholes Selector Pill Row */}
          {trackedDefects.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider shrink-0">
                Potholes in View:
              </span>
              {trackedDefects.map((d) => (
                <button
                  key={d.tracking_id}
                  onClick={() => setSelectedPotholeId(d.tracking_id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 border transition-all ${
                    d.tracking_id === selectedPotholeId
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/25 scale-[1.03]'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{d.tracking_id}</span>
                  <span className="text-[10px] opacity-75 font-normal">({(d.confidence * 100).toFixed(0)}%)</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      String(d.severity).includes('Critical')
                        ? 'bg-red-400'
                        : String(d.severity).includes('High')
                        ? 'bg-orange-400'
                        : 'bg-yellow-400'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Measurement, Session & Calibration Panels (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('measurements')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'measurements'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ruler size={14} />
              Measurements
            </button>
            <button
              onClick={() => setActiveTab('session')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'session'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity size={14} />
              Session
            </button>
            <button
              onClick={() => setActiveTab('calibration')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'calibration'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings2 size={14} />
              Calibration
            </button>
          </div>

          {/* TAB 1: Real Pothole Physical Measurements Panel */}
          {activeTab === 'measurements' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    {activeDefect ? activeDefect.tracking_id : 'NO SELECTION'}
                  </span>
                  {activeDefect && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        String(activeDefect.severity).includes('Critical')
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : String(activeDefect.severity).includes('High')
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      }`}
                    >
                      {activeDefect.severity}
                    </span>
                  )}
                </div>
                {activeDefect && (
                  <span className="text-xs font-mono text-cyan-400">
                    {(activeDefect.confidence * 100).toFixed(1)}% CONF
                  </span>
                )}
              </div>

              {activeDefect ? (
                <>
                  {/* Calibration Status Alert / Warning */}
                  {!activeDefect.measurements?.is_calibrated ? (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex gap-2.5 items-start">
                      <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Physical Measurements Unavailable</p>
                        <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                          Webcam cannot determine real metric size without calibration. Switch to Mode B or Mode A in the Calibration tab to compute physical centimetres.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex gap-2.5 items-start">
                      <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Calibrated Physical Dimensions</p>
                        <p className="text-[11px] text-emerald-300/80 mt-0.5">
                          {activeDefect.measurements.measurement_method} ({activeDefect.measurements.uncertainty})
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Physical Dimensions Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Width */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Physical Width</span>
                      <div className="text-xl font-bold text-white mt-1">
                        {activeDefect.measurements?.physical_width !== null && activeDefect.measurements?.physical_width !== undefined
                          ? `${activeDefect.measurements.physical_width} cm`
                          : `${activeDefect.measurements?.pixel_dimensions?.width_px || '-'} px`}
                      </div>
                      <span className="text-[10px] text-slate-500">Horizontal extent</span>
                    </div>

                    {/* Length */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Physical Length</span>
                      <div className="text-xl font-bold text-white mt-1">
                        {activeDefect.measurements?.physical_length !== null && activeDefect.measurements?.physical_length !== undefined
                          ? `${activeDefect.measurements.physical_length} cm`
                          : `${activeDefect.measurements?.pixel_dimensions?.height_px || '-'} px`}
                      </div>
                      <span className="text-[10px] text-slate-500">Longitudinal extent</span>
                    </div>

                    {/* Depth */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Cavity Depth</span>
                      <div className="text-xl font-bold text-white mt-1">
                        {activeDefect.measurements?.depth_cm !== null && activeDefect.measurements?.depth_cm !== undefined
                          ? `${activeDefect.measurements.depth_cm} cm`
                          : 'N/A'}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {activeDefect.measurements?.estimated_depth || 'Requires 3D/depth sensor'}
                      </span>
                    </div>

                    {/* Damaged Surface Area */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Damaged Surface Area</span>
                      <div className="text-xl font-bold text-white mt-1">
                        {activeDefect.measurements?.surface_area !== null && activeDefect.measurements?.surface_area !== undefined
                          ? `${activeDefect.measurements.surface_area} m²`
                          : `${activeDefect.measurements?.pixel_dimensions?.area_px || '-'} px²`}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {activeDefect.measurements?.surface_area_cm2
                          ? `${activeDefect.measurements.surface_area_cm2} cm²`
                          : 'Polygon surface'}
                      </span>
                    </div>
                  </div>

                  {/* Bounding Box Pixel Coordinates */}
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-400 flex justify-between items-center">
                    <span>Frame Coordinates:</span>
                    <span className="text-slate-200">
                      [{activeDefect.bbox.join(', ')}]
                    </span>
                  </div>

                  {/* Action Suggestion */}
                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200">
                    <p className="font-semibold text-blue-300">Recommended Civil Action:</p>
                    <p className="text-[11px] text-blue-200/80 mt-1">{activeDefect.action}</p>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Ruler size={32} className="opacity-40" />
                  <p>Point camera toward a road surface or pothole to display live measurements.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Live Inspection Session Summary & Deduplication */}
          {activeTab === 'session' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  Live Session Summary
                </h3>
                <button
                  onClick={resetSession}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
                  title="Reset Unique Counter"
                >
                  <RefreshCw size={12} />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Total Unique Potholes</span>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">
                    {sessionSummary.total_unique_potholes}
                  </div>
                  <span className="text-[10px] text-slate-500">Session deduplicated</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Currently Visible</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {sessionSummary.currently_visible}
                  </div>
                  <span className="text-[10px] text-slate-500">In live frame</span>
                </div>
              </div>

              {/* Severity Breakdown Progress Bars */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-slate-300">Severity Breakdown:</span>

                {/* Critical */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="text-red-400 font-medium">Critical (&gt;8cm / &gt;0.18m²)</span>
                    <span>{sessionSummary.severity_breakdown.Critical}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{
                        width: `${
                          sessionSummary.total_unique_potholes
                            ? (sessionSummary.severity_breakdown.Critical / sessionSummary.total_unique_potholes) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* High */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="text-orange-400 font-medium">High (&gt;5cm / &gt;0.08m²)</span>
                    <span>{sessionSummary.severity_breakdown.High}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{
                        width: `${
                          sessionSummary.total_unique_potholes
                            ? (sessionSummary.severity_breakdown.High / sessionSummary.total_unique_potholes) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Medium */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="text-yellow-400 font-medium">Medium (&gt;2.5cm / &gt;0.03m²)</span>
                    <span>{sessionSummary.severity_breakdown.Medium}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{
                        width: `${
                          sessionSummary.total_unique_potholes
                            ? (sessionSummary.severity_breakdown.Medium / sessionSummary.total_unique_potholes) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Low */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="text-blue-400 font-medium">Low (&lt;2.5cm)</span>
                    <span>{sessionSummary.severity_breakdown.Low}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${
                          sessionSummary.total_unique_potholes
                            ? (sessionSummary.severity_breakdown.Low / sessionSummary.total_unique_potholes) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">Export Stored Data:</span>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="/api/export/csv"
                    download="pothole_detections_export.csv"
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                  >
                    <Download size={14} />
                    Export CSV
                  </a>
                  <a
                    href="/api/export/json"
                    download="pothole_detections_export.json"
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                  >
                    <Download size={14} />
                    Export JSON
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Camera Calibration Settings Panel */}
          {activeTab === 'calibration' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sliders size={16} className="text-cyan-400" />
                  Camera & Sensor Calibration
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure optical parameters to enable physical centimetre dimensions.
                </p>
              </div>

              {/* Mode Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300">Measurement Mode:</label>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      id: 'mode_b_ground_plane',
                      name: 'Mode B: Ground Plane Homography',
                      desc: 'Calibrated camera pose (height & tilt angle) on vehicle/tripod.',
                    },
                    {
                      id: 'mode_a_reference',
                      name: 'Mode A: Reference Target in Scene',
                      desc: 'Uses a known physical marker/card in the camera field of view.',
                    },
                    {
                      id: 'mode_c_depth_sensor',
                      name: 'Mode C: Metric Depth Sensor',
                      desc: 'RGB-D or stereo camera providing 3D depth stream.',
                    },
                    {
                      id: 'uncalibrated',
                      name: 'Uncalibrated (Pixels Only)',
                      desc: 'No physical dimensions. Strictly displays pixel bounding boxes.',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setCalibrationMode(m.id as CalibrationMode)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        calibrationMode === m.id
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{m.name}</span>
                        {calibrationMode === m.id && (
                          <CheckCircle2 size={15} className="text-cyan-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode B Parameters */}
              {calibrationMode === 'mode_b_ground_plane' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                  <span className="text-xs font-bold text-cyan-400">Ground Plane Parameters:</span>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Camera Mount Height:</span>
                      <span className="font-mono text-cyan-400">{cameraHeight} m</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={cameraHeight}
                      onChange={(e) => setCameraHeight(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Camera Downward Tilt Angle:</span>
                      <span className="font-mono text-cyan-400">{cameraTilt}°</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="75"
                      step="1"
                      value={cameraTilt}
                      onChange={(e) => setCameraTilt(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Mode A Parameters */}
              {calibrationMode === 'mode_a_reference' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                  <span className="text-xs font-bold text-cyan-400">Reference Target Parameters:</span>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Target Dimension (cm):</label>
                    <input
                      type="number"
                      value={referenceSize}
                      onChange={(e) => setReferenceSize(parseFloat(e.target.value) || 20.0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Measured Pixel Span (px):</label>
                    <input
                      type="number"
                      value={referencePx}
                      onChange={(e) => setReferencePx(parseFloat(e.target.value) || 100.0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Sensitivity Setting */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Model Sensitivity Threshold:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSensitivity(s)}
                      className={`py-1.5 rounded-lg text-xs font-semibold uppercase border transition-all ${
                        sensitivity === s
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Last Saved Record Notification Toast */}
          {lastSavedReport && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold">Record Saved: {lastSavedReport.report_id}</p>
                <p className="text-[11px] text-emerald-300/80">Track ID: {lastSavedReport.tracking_id}</p>
              </div>
              <button
                onClick={() => navigate('/my-reports')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1"
              >
                <span>View</span>
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
