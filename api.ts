import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; role?: string; ward?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

// ── Reports ───────────────────────────────────────────────────────────
export const reportsApi = {
  list: (params?: Record<string, unknown>) => api.get('/reports', { params }),
  get: (id: number) => api.get(`/reports/${id}`),
  create: (data: FormData) => api.post('/reports', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/reports/${id}`, data),
  delete: (id: number) => api.delete(`/reports/${id}`),
  stats: () => api.get('/reports/stats'),
}

// ── AI Detection ─────────────────────────────────────────────────────
export const detectApi = {
  analyzeImage: (formData: FormData) =>
    api.post('/detect/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  analyzeVideo: (formData: FormData) =>
    api.post('/detect/video', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

// ── Live Camera & Evidence ──────────────────────────────────────────
export const cameraApi = {
  processFrame: (data: { frame: string; calibration?: Record<string, unknown>; categories?: string[]; sensitivity?: string }) =>
    api.post('/camera/process-frame', data),
  saveEvidence: (data: Record<string, unknown>) =>
    api.post('/camera/save-evidence', data),
}

