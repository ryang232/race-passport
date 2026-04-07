import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import CreateAccount from './pages/CreateAccount'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import BuildPassport from './pages/BuildPassport'
import Home from './pages/Home'
import Discover from './pages/Discover'
import RaceDetail from './pages/RaceDetail'
import Passport from './pages/Passport'
import PublicProfile from './pages/PublicProfile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/build-passport" element={<BuildPassport />} />
          <Route path="/home" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/race/:id" element={<RaceDetail />} />
          <Route path="/passport" element={<Passport />} />
          <Route path="/:username" element={<PublicProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
