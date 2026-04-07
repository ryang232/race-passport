import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STAMP_DATA = [
  { dist: '26.2', name: 'NYC Marathon', loc: 'New York, NY', year: '2024', gold: false },
  { dist: '140.6', name: 'IRONMAN World Championship', loc: 'Kona, HI', year: '2023', gold: true },
  { dist: '13.1', name: 'Cherry Blossom Half', loc: 'Washington, DC', year: '2025', gold: true },
  { dist: '70.3', name: 'IRONMAN 70.3 Augusta', loc: 'Augusta, GA', year: '2024', gold: false },
  { dist: '10K', name: 'Broad Street Run', loc: 'Philadelphia, PA', year: '2023', gold: false },
  { dist: '50K', name: 'Seneca Creek Ultra', loc: 'Gaithersburg, MD', year: '2022', gold: true },
  { dist: '26.2', name: 'Marine Corps Marathon', loc: 'Arlington, VA', year: '2024', gold: false },
  { dist: '5K', name: 'Turkey Trot', loc: 'Chicago, IL', year: '2023', gold: false },
  { dist: '13.1', name: "Rock 'n' Roll Half", loc: 'Nashville, TN', year: '2023', gold: false },
  { dist: '100M', name: 'Western States', loc: 'Auburn, CA', year: '2022', gold: true },
]

function Stamp({ dist, name, loc, year, gold, size = 130 }) {
  const navy = '#1B2A4A'
  const gold_c = '#C9A84C'
  const color = gold ? gold_c : navy
  const fontSize = dist.length > 4 ? 16 : dist.length > 2 ? 20 : 26

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', flexShrink: 0,
      background: gold ? 'rgba(201,168,76,0.04)' : '#fff',
    }}>
      <div style={{
        position: 'absolute', inset: 6, borderRadius: '50%',
        border: '0.75px dashed ' + (gold ? 'rgba(201,168,76,0.3)' : 'rgba(27,42,74,0.18)'),
      }} />
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize, color, lineHeight: 1, letterSpacing: '0.04em' }}>{dist}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color, textAlign: 'center', padding: '0 12px', lineHeight: 1.3, marginTop: 3 }}>{name}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold_c, marginTop: 2 }}>{loc}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, letterSpacing: '0.18em', color: 'rgba(27,42,74,0.3)', marginTop: 1 }}>{year}</div>
    </div>
  )
}

function StampRow({ reverse = false, offset = 0 }) {
  const items = [...STAMP_DATA, ...STAMP_DATA, ...STAMP_DATA]
  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <div style={{
        display: 'flex', gap: 20,
        width: 'max-content',
        animation: `${reverse ? 'stampLeft' : 'stampRight'} 40s linear infinite`,
        animationDelay: `${offset}s`,
      }}>
        {items.map((s, i) => (
          <Stamp key={i} {...s} size={110} />
        ))}
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Inject fonts + keyframes
    const style = document.createElement('style')
    style.id = 'rp-login-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      @keyframes stampRight {
        from { transform: translateX(-33.333%); }
        to { transform: translateX(0); }
      }
      @keyframes stampLeft {
        from { transform: translateX(0); }
        to { transform: translateX(-33.333%); }
      }
      .rp-input {
        width: 100%; padding: 12px 14px;
        border-radius: 6px;
        border: 1.5px solid #e2e6ed;
        background: #fafbfc;
        color: #1B2A4A; font-size: 15px;
        font-family: 'Barlow', sans-serif;
        outline: none; box-sizing: border-box;
        transition: border-color 0.15s, background 0.15s;
      }
      .rp-input:focus { border-color: #C9A84C; background: #fff; }
      .rp-input::placeholder { color: #b0b8c4; }
      .rp-primary {
        width: 100%; padding: 13px;
        border: none; background: #1B2A4A;
        color: #fff;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 13px; font-weight: 600;
        letter-spacing: 0.25em; text-transform: uppercase;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      }
      .rp-primary:hover:not(:disabled) { background: #C9A84C; }
      .rp-primary:active:not(:disabled) { transform: scale(0.985); }
      .rp-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .rp-social {
        width: 100%; padding: 11px 14px;
        border: 1.5px solid #e2e6ed;
        background: #fff; color: #1B2A4A;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 12px; font-weight: 600;
        letter-spacing: 0.2em; text-transform: uppercase;
        display: flex; align-items: center; justify-content: center; gap: 9px;
        opacity: 0.45; cursor: not-allowed;
      }
      .rp-divider {
        display: flex; align-items: center; gap: 10px; margin: 12px 0;
      }
      .rp-divider::before, .rp-divider::after {
        content: ''; flex: 1; height: 1px; background: #e2e6ed;
      }
      .rp-divider span {
        font-size: 10px; color: #b0b8c4;
        font-family: 'Barlow Condensed', sans-serif; letter-spacing: 1.5px;
      }
    `
    if (!document.getElementById('rp-login-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-login-styles')?.remove()
  }, [])

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/home')
  }

  const TICKER_ITEMS = ['26.2', '13.1', '10K', '5K', '70.3', '140.6', '26.2', '13.1', '10K', '5K', '70.3', '50K', '100M']

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Barlow', sans-serif",
    }}>

      {/* Top stamp row */}
      <div style={{ position: 'absolute', top: 24, left: 0, right: 0, opacity: 0.55 }}>
        <StampRow reverse={false} offset={0} />
      </div>

      {/* Giant horizontal ticker — ghost outlined numbers */}
      <div style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-58%)',
        left: 0,
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <div style={{
          display: 'flex',
          animation: 'tickerScroll 18s linear infinite',
          width: 'max-content',
        }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((d, i) => (
            <span key={i} style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(160px, 22vw, 320px)',
              color: 'transparent',
              WebkitTextStroke: '1px rgba(27,42,74,0.06)',
              lineHeight: 1,
              padding: '0 32px',
              userSelect: 'none',
              flexShrink: 0,
            }}>{d}</span>
          ))}
        </div>
      </div>

      {/* Bottom stamp row */}
      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, opacity: 0.55 }}>
        <StampRow reverse={true} offset={-12} />
      </div>

      {/* Login card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: '#fff',
        borderRadius: '4px',
        padding: '40px 36px 32px',
        width: '100%',
        maxWidth: '380px',
        margin: '160px 20px',
        boxShadow: '0 2px 40px rgba(27,42,74,0.10), 0 0 0 1px rgba(27,42,74,0.07)',
      }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', letterSpacing: '3.5px', color: '#1B2A4A' }}>
              RACE PASSPORT
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '38px', color: '#1B2A4A',
            margin: '0 0 6px', letterSpacing: '1.5px', lineHeight: 1,
          }}>WELCOME BACK</h1>
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '10px', letterSpacing: '2.5px',
            color: '#9aa5b4', margin: 0, textTransform: 'uppercase',
          }}>Sign in to your passport</p>
        </div>

        {error && (
          <div style={{
            background: '#fff5f5', border: '1px solid #fed7d7',
            borderRadius: '6px', padding: '10px 14px',
            color: '#c53030', fontSize: '13px', marginBottom: '14px',
          }}>{error}</div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Email</label>
          <input className="rp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        </div>

        <div style={{ marginBottom: '6px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Password</label>
          <input className="rp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <div style={{ textAlign: 'right', marginBottom: '18px' }}>
          <span style={{ fontSize: '11px', color: '#C9A84C', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Forgot password?
          </span>
        </div>

        <button className="rp-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="rp-divider"><span>OR</span></div>

        <div className="rp-social" style={{ marginBottom: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </div>

        <div className="rp-social">
          <svg width="14" height="16" viewBox="0 0 18 18" fill="#1B2A4A">
            <path d="M12.525 0c.068.93-.27 1.858-.787 2.54-.52.69-1.37 1.22-2.21 1.16-.09-.88.32-1.8.79-2.44C10.84.58 11.74.07 12.525 0zM15.7 12.05c-.42.93-.62 1.35-1.16 2.17-.75 1.14-1.81 2.56-3.12 2.57-1.17.01-1.47-.74-3.06-.73-1.59.01-1.92.75-3.09.74-1.31-.01-2.31-1.29-3.06-2.43C.57 11.72.04 8.94.95 7.21c.64-1.2 1.79-1.9 3.02-1.9 1.12 0 1.83.73 2.76.73.9 0 1.45-.73 2.75-.73 1.1 0 2.13.58 2.77 1.58-2.44 1.33-2.04 4.8.45 5.16z"/>
          </svg>
          Continue with Apple
        </div>

        <p style={{ textAlign: 'center', color: '#9aa5b4', fontSize: '13px', marginTop: '20px', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
          Don't have a passport?{' '}
          <Link to="/create-account" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: '600' }}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  )
}
