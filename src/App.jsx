import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import CreateAccount from './pages/CreateAccount'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import RaceSearchPrompt from './pages/RaceSearchPrompt'
import BuildPassport from './pages/BuildPassport'
import RaceImport from './pages/RaceImport'
import GoalRaces from './pages/GoalRaces'
import Home from './pages/Home'
import Discover from './pages/Discover'
import RacePage from './pages/RacePage'
import RaceDetail from './pages/RaceDetail'
import Passport from './pages/Passport'
import Profile from './pages/Profile'
import PublicProfile from './pages/PublicProfile'
import StravaCallback from './pages/StravaCallback'
import Wall from './pages/Wall'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import TrainingBlock from './pages/TrainingBlock'
import AuthCallback from './pages/AuthCallback'

// ── RunSignup OAuth callback handler ─────────────────────────────────────────
function RunSignupCallback() {
  const navigate = useNavigate()
  const { search } = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(search)
    const code  = params.get('code')
    const error = params.get('error')

    if (error || !code) {
      navigate('/race-import', { replace: true })
      return
    }

    const verifier = sessionStorage.getItem('runsignup_code_verifier') || ''
    fetch(`/api/runsignup-oauth?action=exchange&code=${encodeURIComponent(code)}&code_verifier=${encodeURIComponent(verifier)}`)
      .then(r => r.json())
      .then(data => {
        if (data.access_token) {
          sessionStorage.setItem('runsignup_access_token', data.access_token)
          if (data.refresh_token) sessionStorage.setItem('runsignup_refresh_token', data.refresh_token)
          sessionStorage.removeItem('runsignup_code_verifier')
        }
        const returnTo = sessionStorage.getItem('runsignup_return_to') || '/race-import'
        navigate(returnTo, { replace: true })
      })
      .catch(() => navigate('/race-import', { replace: true }))
  }, [])

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', flexDirection:'column', gap:'16px' }}>
      <div style={{ display:'flex', gap:'8px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C', animation:`pulse 1.1s ease-in-out ${i*0.37}s infinite` }} />
        ))}
      </div>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase' }}>Connecting RunSignup...</span>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3;}50%{opacity:1;} } @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600&display=swap');`}</style>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"                        element={<Landing />} />
            <Route path="/auth/callback"           element={<AuthCallback />} />
            <Route path="/login"                   element={<Login />} />
            <Route path="/signup"                  element={<SignUp />} />
            <Route path="/create-account"          element={<CreateAccount />} />
            <Route path="/verify-email"            element={<VerifyEmail />} />
            <Route path="/forgot-password"         element={<ForgotPassword />} />
            <Route path="/reset-password"          element={<ResetPassword />} />
            <Route path="/race-search-prompt"      element={<RaceSearchPrompt />} />
            <Route path="/build-passport"          element={<BuildPassport />} />
            <Route path="/race-import"             element={<RaceImport />} />
            <Route path="/goal-races"              element={<GoalRaces />} />
            <Route path="/strava-callback"         element={<StravaCallback />} />
            <Route path="/runsignup-callback"      element={<RunSignupCallback />} />
            <Route path="/home"                    element={<Home />} />
            <Route path="/wall"                    element={<Wall />} />
            <Route path="/terms"                   element={<Terms />} />
            <Route path="/privacy"                 element={<Privacy />} />
            <Route path="/discover"                element={<Discover />} />
            <Route path="/race/:id"                element={<RacePage />} />
            <Route path="/race/:id/training"       element={<TrainingBlock />} />
            <Route path="/race-detail/:id"         element={<RaceDetail />} />
            <Route path="/passport"                element={<Passport />} />
            <Route path="/profile"                 element={<Profile />} />
            <Route path="/:username"               element={<PublicProfile />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
