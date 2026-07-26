import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LandingPage from './pages/landing/LandingPage'
import Login from './pages/login/Login'
import Register from './pages/register/Register'
import ForgotPassword from './pages/forgot-password/ForgotPassword'
import ResetPassword from './pages/reset-password/ResetPassword'
import VerifyEmail from './pages/verify-email/VerifyEmail'
import UpdatePassword from './pages/update-password/UpdatePassword'
import OnboardingRole from './pages/onboarding/OnboardingRole'
import Profile from './pages/profile/Profile'
import Projects from './pages/projects/Projects'
import ProjectDetails from './pages/projects/ProjectDetails'
import CampaignDetails from './pages/projects/CampaignDetails'
import Search from './pages/search/Search'
import Inbox from './pages/inbox/Inbox'
import Chat from './pages/chat/Chat'
import './index.css'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router future={{ v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public / Auth pages — no navbar */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route
              path="/onboarding-role"
              element={
                <ProtectedRoute>
                  <OnboardingRole />
                </ProtectedRoute>
              }
            />

            {/* App pages — shared navbar via layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />
              <Route path="/campaigns/:campaignId" element={<CampaignDetails />} />
              <Route path="/search" element={<Search />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:collaborationId" element={<Chat />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
