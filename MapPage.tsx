import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import { Filter, MapPin, AlertTriangle, Ruler, Calendar, Info } from 'lucide-react'

// Fix Leaflet marker icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createColoredIcon = (color: string) => L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 8px ${color}88"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const SEVERITY_COLOR: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#3b82f6',
}

interface Report {
  id: number
  report_id: string
  tracking_id?: string
  category: string
  subtype?: string
  severity: string
  status: string
  physical_width?: number
  physical_length?: number
  surface_area?: number
  estimated_depth?: string
  measurement_method?: string
  latitude?: number
  longitude?: number
  address?: string
  ward?: string
  created_at: string
}

export default function MapPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [filters, setFilters] = useState({ severity: '', status: '' })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    api.get('/detections')
      .then((res) => {
        if (res.data.items) {
          setReports(res.data.items)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = reports.filter((r) =>
    (!filters.severity || r.severity === filters.severity) &&
    (!filters.status || r.status === filters.status)
  )

  const withCoords = filtered.filter((r) => r.latitude && r.longitude)
  const center: [number, number] = withCoords.length
    ? [withCoords[0].latitude!, withCoords[0].longitude!]
    : [12.9716, 77.5946]

  return (
    <div className="animate-fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Pothole & Damage Spatial Map</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>
            Geospatial distribution of real verified potholes and physical measurements.
          </p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
          <Filter size={16} /> Filters {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
              className="input"
              style={{ width: 150 }}
            >
              <option value="">All Severities</option>
              {['Critical', 'High', 'Medium', 'Low'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="input"
              style={{ width: 160 }}
            >
              <option value="">All Statuses</option>
              {['Awaiting Review', 'Verified', 'Assigned', 'In Progress', 'Resolved'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', height: 600, position: 'relative' }}>
        {withCoords.length === 0 && !loading && (
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '12px 16px',
            maxWidth: 360,
            fontSize: 13,
            color: 'var(--gray-400)'
          }}>
            <p style={{ fontWeight: 700, color: '#ffffff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info size={16} color="var(--teal)" /> No GPS Coordinates Stored Yet
            </p>
            <p style={{ fontSize: 12 }}>
              Save potholes via the Live Camera with browser location enabled to plot their coordinates here.
            </p>
          </div>
        )}

        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((rep) => {
            const color = SEVERITY_COLOR[rep.severity] || '#06b6d4'
            return (
              <Marker
                key={rep.id}
                position={[rep.latitude!, rep.longitude!]}
                icon={createColoredIcon(color)}
              >
                <Popup>
                  <div style={{ minWidth: 200, padding: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{rep.report_id}</span>
                      <span style={{
                        background: `${color}25`,
                        color: color,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4
                      }}>
                        {rep.severity}
                      </span>
                    </div>

                    <p style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                      {rep.subtype || rep.category} {rep.tracking_id ? `(${rep.tracking_id})` : ''}
                    </p>

                    {rep.physical_width && rep.physical_length ? (
                      <div style={{ fontSize: 11, color: '#38bdf8', marginBottom: 6 }}>
                        Size: {rep.physical_width}cm × {rep.physical_length}cm
                        {rep.estimated_depth && <div>Depth: {rep.estimated_depth}</div>}
                        {rep.surface_area && <div>Area: {rep.surface_area} m²</div>}
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6 }}>Uncalibrated Capture</p>
                    )}

                    <div style={{ fontSize: 11, color: 'var(--gray-400)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6 }}>
                      <div>{rep.address || 'Location Verified'}</div>
                      <div>Status: <strong>{rep.status}</strong></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
