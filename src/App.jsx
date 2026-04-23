import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"                    element={<Landing />} />
            <Route path="/login"               element={<Login />} />
            <Route path="/signup"              element={<SignUp />} />
            <Route path="/create-account"      element={<CreateAccount />} />
            <Route path="/verify-email"        element={<VerifyEmail />} />
            <Route path="/forgot-password"     element={<ForgotPassword />} />
            <Route path="/reset-password"      element={<ResetPassword />} />
            <Route path="/race-search-prompt"  element={<RaceSearchPrompt />} />
            <Route path="/build-passport"      element={<BuildPassport />} />
            <Route path="/race-import"         element={<RaceImport />} />
            <Route path="/goal-races"          element={<GoalRaces />} />
            <Route path="/strava-callback"     element={<StravaCallback />} />
            <Route path="/home"                element={<Home />} />
            <Route path="/wall"                element={<Wall />} />
            <Route path="/discover"            element={<Discover />} />
            <Route path="/race/:id"            element={<RacePage />} />
            <Route path="/race-detail/:id"     element={<RaceDetail />} />
            <Route path="/passport"            element={<Passport />} />
            <Route path="/profile"             element={<Profile />} />
            <Route path="/:username"           element={<PublicProfile />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
