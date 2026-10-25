import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CameraPage from './pages/CameraPage'
import UploadPage from './pages/UploadPage'
import DetectionResultsPage from './pages/DetectionResultsPage'
import ReportIssuePage from './pages/ReportIssuePage'
import MapPage from './pages/MapPage'
import MyReportsPage from './pages/MyReportsPage'
import MunicipalPage from './pages/MunicipalPage'
import MaintenancePage from './pages/MaintenancePage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
})

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuthStore()
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#132040', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          }}
        />
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/camera" element={<CameraPage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/results" element={<DetectionResultsPage />} />
                    <Route path="/report" element={<ReportIssuePage />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/my-reports" element={<MyReportsPage />} />
                    <Route path="/municipal" element={<ProtectedRoute roles={['officer', 'admin']}><MunicipalPage /></ProtectedRoute>} />
                    <Route path="/maintenance" element={<ProtectedRoute roles={['maintenance', 'admin']}><MaintenancePage /></ProtectedRoute>} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
