import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DISTANCES = ['5K', '10K', '13.1', '26.2', '50K', '50M', '100K', '100M', '140.6', '70.3', 'MARATHON', 'ULTRA', '5K', '10K', '13.1', '26.2', '50K', '100M']

function ScrollingColumn({ distances, duration, reverse = false, offset = 0 }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      animation: `${reverse ? 'scrollUp' : 'scrollDown'} ${duration}s linear infinite`,
      animationDelay: `${offset}s`,
    }}>
      {[...distances, ...distances, ...distances].map((d, i) => (
        <div key={i} style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(28px, 4vw, 58px)',
          color: '#1B2A4A',
          opacity: 0.06,
          lineHeight: 1.3,
          padding: '4px 0',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}>{d}</div>
      ))}
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes scrollDown {
        0% { transform: translateY(0); }
        100% { transform: translateY(-33.33%); }
      }
      @keyframes scrollUp {
        0% { transform: translateY(-33.33%); }
        100% { transform: translateY(0); }
      }
      .rp-input {
        width: 100%;
        padding: 13px 16px;
        border-radius: 8px;
        border: 1.5px solid #dde2ea;
        background: #fff;
        color: #1B2A4A;
        font-size: 15px;
        font-family: 'Barlow', sans-serif;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .rp-input:focus { border-color: #C9A84C; }
      .rp-input::placeholder { color: #aab0bc; }
      .rp-btn-primary {
        width: 100%;
        padding: 14px;
        border-radius: 8px;
        border: none;
        background: #C9A84C;
        color: #1B2A4A;
        font-size: 14px;
        font-weight: 700;
        font-family: 'Bebas Neue', sans-serif;
        letter-spacing: 2.5px;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      }
      .rp-btn-primary:hover { background: #b8963e; }
      .rp-btn-primary:active { transform: scale(0.98); }
      .rp-btn-primary:disabled { background: #e0cfa0; cursor: not-allowed; }
      .rp-btn-social {
        width: 100%;
        padding: 13px;
        border-radius: 8px;
        border: 1.5px solid #dde2ea;
        background: #fff;
        color: #1B2A4A;
        font-size: 13px;
        font-weight: 600;
        font-family: 'Barlow Condensed', sans-serif;
        letter-spacing: 1.5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: border-color 0.2s, background 0.2s;
      }
      .rp-btn-social:hover:not(:disabled) { border-color: #1B2A4A; background: #f8f9fb; }
      .divider {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 16px 0;
      }
      .divider::before, .divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #dde2ea;
      }
      .divider span {
        font-size: 11px;
        color: #aab0bc;
        font-family: 'Barlow', sans-serif;
        letter-spacing: 1px;
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/home')
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` }
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  const columns = [
    ['5K','26.2','100M','13.1','50K','70.3','MARATHON'],
    ['10K','50M','140.6','ULTRA','26.2','100K','5K'],
    ['13.1','100K','50K','10K','MARATHON','50M','26.2'],
    ['ULTRA','70.3','5K','100M','13.1','26.2','50K'],
    ['26.2','MARATHON','10K','50M','140.6','5K','100K'],
    ['50K','5K','13.1','ULTRA','70.3','26.2','10K'],
    ['100M','13.1','26.2','50K','5K','MARATHON','140.6'],
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f6f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Barlow', sans-serif",
    }}>
      {/* Scrolling background columns */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'space-around',
        overflow: 'hidden',
        padding: '0 8px',
      }}>
        {columns.map((col, i) => (
          <ScrollingColumn
            key={i}
            distances={col}
            duration={20 + i * 4}
            reverse={i % 2 === 1}
            offset={-(i * 3)}
          />
        ))}
      </div>

      {/* Login card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: '#fff',
        borderRadius: '16px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '400px',
        margin: '24px',
        boxShadow: '0 8px 48px rgba(27,42,74,0.13)',
      }}>
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '12px',
              letterSpacing: '3.5px',
              color: '#1B2A4A',
            }}>RACE PASSPORT</span>
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '40px',
            color: '#1B2A4A',
            margin: 0,
            letterSpacing: '2px',
            lineHeight: 1,
          }}>WELCOME BACK</h1>
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '11px',
            letterSpacing: '2.5px',
            color: '#8899AA',
            margin: '8px 0 0',
            textTransform: 'uppercase',
          }}>Sign in to your passport</p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#dc2626',
            fontSize: '13px',
            marginBottom: '16px',
          }}>{error}</div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#8899AA', marginBottom: '6px', textTransform: 'uppercase' }}>Email</label>
          <input className="rp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        </div>

        <div style={{ marginBottom: '6px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#8899AA', marginBottom: '6px', textTransform: 'uppercase' }}>Password</label>
          <input className="rp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <Link to="/forgot-password" style={{ fontSize: '11px', color: '#C9A84C', textDecoration: 'none', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1px', textTransform: 'uppercase' }}>
            Forgot password?
          </Link>
        </div>

        <button className="rp-btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>

        <div className="divider"><span>OR</span></div>

        <button className="rp-btn-social" onClick={handleGoogle} disabled={googleLoading} style={{ marginBottom: '10px' }}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? 'REDIRECTING...' : 'CONTINUE WITH GOOGLE'}
        </button>

        <button className="rp-btn-social" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="#1B2A4A">
            <path d="M12.525 0c.068.93-.27 1.858-.787 2.54-.52.69-1.37 1.22-2.21 1.16-.09-.88.32-1.8.79-2.44C10.84.58 11.74.07 12.525 0zM15.7 12.05c-.42.93-.62 1.35-1.16 2.17-.75 1.14-1.81 2.56-3.12 2.57-1.17.01-1.47-.74-3.06-.73-1.59.01-1.92.75-3.09.74-1.31-.01-2.31-1.29-3.06-2.43C.57 11.72.04 8.94.95 7.21c.64-1.2 1.79-1.9 3.02-1.9 1.12 0 1.83.73 2.76.73.9 0 1.45-.73 2.75-.73 1.1 0 2.13.58 2.77 1.58-2.44 1.33-2.04 4.8.45 5.16z"/>
          </svg>
          CONTINUE WITH APPLE
        </button>

        <p style={{ textAlign: 'center', color: '#8899AA', fontSize: '13px', marginTop: '24px' }}>
          Don't have a passport?{' '}
          <Link to="/create-account" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: '600' }}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  )
}
