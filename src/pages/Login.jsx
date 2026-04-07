import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const COLUMNS = [
  ['5K','26.2','100M','13.1','50K','70.3','MARATHON','ULTRA','10K','140.6'],
  ['10K','50M','140.6','ULTRA','26.2','100K','5K','13.1','MARATHON','50K'],
  ['13.1','100K','50K','10K','MARATHON','50M','26.2','5K','70.3','ULTRA'],
  ['ULTRA','70.3','5K','100M','13.1','26.2','50K','MARATHON','10K','140.6'],
  ['26.2','MARATHON','10K','50M','140.6','5K','100K','ULTRA','13.1','70.3'],
  ['50K','5K','13.1','ULTRA','70.3','26.2','10K','100M','MARATHON','50M'],
  ['100M','13.1','26.2','50K','5K','MARATHON','140.6','10K','70.3','ULTRA'],
]

function ScrollingColumn({ items, duration, reverse, offset }) {
  const all = [...items, ...items, ...items]
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      animation: `${reverse ? 'rpScrollUp' : 'rpScrollDown'} ${duration}s linear infinite`,
      animationDelay: `${offset}s`,
      willChange: 'transform',
    }}>
      {all.map((d, i) => (
        <div key={i} style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(24px, 3.5vw, 52px)',
          color: '#1B2A4A',
          opacity: 0.055,
          lineHeight: 1.35,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          padding: '3px 0',
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

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-login-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
      @keyframes rpScrollDown {
        from { transform: translateY(0); }
        to { transform: translateY(-33.333%); }
      }
      @keyframes rpScrollUp {
        from { transform: translateY(-33.333%); }
        to { transform: translateY(0); }
      }
      .rp-input {
        width: 100%;
        padding: 12px 14px;
        border-radius: 8px;
        border: 1.5px solid #e2e6ed;
        background: #fafbfc;
        color: #1B2A4A;
        font-size: 15px;
        font-family: 'Barlow', sans-serif;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s, background 0.15s;
      }
      .rp-input:focus {
        border-color: #C9A84C;
        background: #fff;
      }
      .rp-input::placeholder { color: #b0b8c4; }
      .rp-primary {
        width: 100%;
        padding: 13px;
        border-radius: 8px;
        border: none;
        background: #C9A84C;
        color: #1B2A4A;
        font-family: 'Bebas Neue', sans-serif;
        font-size: 15px;
        letter-spacing: 2.5px;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
      }
      .rp-primary:hover:not(:disabled) { background: #b8963e; }
      .rp-primary:active:not(:disabled) { transform: scale(0.985); }
      .rp-primary:disabled { background: #ddd0a4; cursor: not-allowed; }
      .rp-social {
        width: 100%;
        padding: 12px;
        border-radius: 8px;
        border: 1.5px solid #e2e6ed;
        background: #fff;
        color: #1B2A4A;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 1.5px;
        cursor: not-allowed;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        opacity: 0.5;
      }
      .rp-divider {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 14px 0;
      }
      .rp-divider::before, .rp-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #e2e6ed;
      }
      .rp-divider span {
        font-size: 10px;
        color: #b0b8c4;
        font-family: 'Barlow Condensed', sans-serif;
        letter-spacing: 1.5px;
      }
    `
    if (!document.getElementById('rp-login-styles')) {
      document.head.appendChild(style)
    }
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f5f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        overflow: 'hidden',
        padding: '0 12px',
      }}>
        {COLUMNS.map((col, i) => (
          <ScrollingColumn
            key={i}
            items={col}
            duration={22 + i * 3.5}
            reverse={i % 2 === 1}
            offset={-(i * 2.5)}
          />
        ))}
      </div>

      {/* Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: '#ffffff',
        borderRadius: '18px',
        padding: '44px 38px 36px',
        width: '100%',
        maxWidth: '390px',
        margin: '20px',
        boxShadow: '0 4px 32px rgba(27,42,74,0.11), 0 1px 4px rgba(27,42,74,0.06)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            marginBottom: '16px',
            padding: '5px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(201,168,76,0.25)',
            background: 'rgba(201,168,76,0.06)',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '11px',
              letterSpacing: '3px',
              color: '#C9A84C',
            }}>RACE PASSPORT</span>
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '38px',
            color: '#1B2A4A',
            margin: '0 0 6px',
            letterSpacing: '1.5px',
            lineHeight: 1,
          }}>WELCOME BACK</h1>
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '11px',
            letterSpacing: '2px',
            color: '#9aa5b4',
            margin: 0,
            textTransform: 'uppercase',
          }}>Sign in to your passport</p>
        </div>

        {error && (
          <div style={{
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#c53030',
            fontSize: '13px',
            marginBottom: '16px',
            fontFamily: "'Barlow', sans-serif",
          }}>{error}</div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '6px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Email</label>
          <input className="rp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '6px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Password</label>
          <input className="rp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <div style={{ textAlign: 'right', marginBottom: '22px' }}>
          <span style={{ fontSize: '11px', color: '#C9A84C', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Forgot password?
          </span>
        </div>

        <button className="rp-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>

        <div className="rp-divider"><span>OR</span></div>

        {/* Google placeholder */}
        <div className="rp-social" style={{ marginBottom: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          CONTINUE WITH GOOGLE
        </div>

        {/* Apple placeholder */}
        <div className="rp-social">
          <svg width="15" height="16" viewBox="0 0 18 18" fill="#1B2A4A">
            <path d="M12.525 0c.068.93-.27 1.858-.787 2.54-.52.69-1.37 1.22-2.21 1.16-.09-.88.32-1.8.79-2.44C10.84.58 11.74.07 12.525 0zM15.7 12.05c-.42.93-.62 1.35-1.16 2.17-.75 1.14-1.81 2.56-3.12 2.57-1.17.01-1.47-.74-3.06-.73-1.59.01-1.92.75-3.09.74-1.31-.01-2.31-1.29-3.06-2.43C.57 11.72.04 8.94.95 7.21c.64-1.2 1.79-1.9 3.02-1.9 1.12 0 1.83.73 2.76.73.9 0 1.45-.73 2.75-.73 1.1 0 2.13.58 2.77 1.58-2.44 1.33-2.04 4.8.45 5.16z"/>
          </svg>
          CONTINUE WITH APPLE
        </div>

        <p style={{ textAlign: 'center', color: '#9aa5b4', fontSize: '13px', marginTop: '24px', fontFamily: "'Barlow', sans-serif" }}>
          Don't have a passport?{' '}
          <Link to="/create-account" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: '600' }}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  )
}
