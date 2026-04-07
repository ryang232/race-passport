import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function ErrorBox({ children }) {
  return (
    <div style={{ background: 'rgba(27,42,74,0.06)', border: '1px solid rgba(27,42,74,0.2)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{ color: '#e53e3e', fontSize: '15px', lineHeight: 1.3, flexShrink: 0, fontWeight: 700 }}>✕</span>
      <span style={{ color: '#1B2A4A' }}>{children}</span>
    </div>
  )
}

export default function CreateAccount() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefillEmail = location.state?.email || ''

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-ca-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      .rp-input {
        width: 100%; padding: 12px 14px; border-radius: 6px;
        border: 1.5px solid #e2e6ed; background: #fafbfc; color: #1B2A4A;
        font-size: 15px; font-family: 'Barlow', sans-serif; outline: none;
        box-sizing: border-box; transition: border-color 0.15s, background 0.15s;
      }
      .rp-input:focus { border-color: #C9A84C; background: #fff; }
      .rp-input::placeholder { color: #b0b8c4; }
      .rp-input.prefilled { background: #f4f5f7; color: #9aa5b4; }
      .rp-primary {
        width: 100%; padding: 13px; border: none; background: #1B2A4A; color: #fff;
        font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600;
        letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer;
        transition: background 0.2s, transform 0.1s; border-radius: 6px;
      }
      .rp-primary:hover:not(:disabled) { background: #C9A84C; }
      .rp-primary:active:not(:disabled) { transform: scale(0.985); }
      .rp-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    `
    if (!document.getElementById('rp-ca-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-ca-styles')?.remove()
  }, [])

  const handleSignUp = async () => {
    setError(null)
    if (!firstName.trim()) { setError('First name is required'); return }
    if (!lastName.trim()) { setError('Last name is required'); return }
    if (!email.trim() || !email.includes('@')) { setError('Email is required'); return }
    if (!password) { setError('Password is required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/home`,
      }
    })
    setLoading(false)

    if (signUpError) {
      if (
        signUpError.message.toLowerCase().includes('already registered') ||
        signUpError.message.toLowerCase().includes('already been registered') ||
        signUpError.message.toLowerCase().includes('user already exists') ||
        signUpError.message.toLowerCase().includes('anonymous')
      ) {
        setError(
          <span>
            An account with this email already exists.{' '}
            <Link to="/login" style={{ color: '#C9A84C', fontWeight: 600 }}>Sign in instead</Link>
            {' '}or use the{' '}
            <Link to="/forgot-password" style={{ color: '#C9A84C', fontWeight: 600 }}>Forgot Password</Link>
            {' '}link to reset your password.
          </span>
        )
      } else {
        setError(signUpError.message)
      }
      return
    }

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setError(
        <span>
          An account with this email already exists.{' '}
          <Link to="/login" style={{ color: '#C9A84C', fontWeight: 600 }}>Sign in instead</Link>
          {' '}or use the{' '}
          <Link to="/forgot-password" style={{ color: '#C9A84C', fontWeight: 600 }}>Forgot Password</Link>
          {' '}link to reset your password.
        </span>
      )
      return
    }

    navigate('/verify-email', {
      state: {
        email: email.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isNewUser: true,
      }
    })
  }

  const TICKER = ['26.2', '13.1', '10K', '5K', '70.3', '140.6', '50K', '100M', '26.2', '13.1', '10K', '5K', '70.3', '140.6', '50K', '100M']

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-55%)', left: 0, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', animation: 'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d, i) => (
            <span key={i} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(180px, 24vw, 340px)', color: 'transparent', WebkitTextStroke: '1px rgba(27,42,74,0.055)', lineHeight: 1, padding: '0 40px', userSelect: 'none', flexShrink: 0 }}>{d}</span>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, background: '#fff', borderRadius: '4px', padding: '40px 36px 32px', width: '100%', maxWidth: '400px', margin: '20px', boxShadow: '0 2px 40px rgba(27,42,74,0.10), 0 0 0 1px rgba(27,42,74,0.07)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', letterSpacing: '3.5px', color: '#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '38px', color: '#1B2A4A', margin: '0 0 6px', letterSpacing: '1.5px', lineHeight: 1 }}>CREATE ACCOUNT</h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', letterSpacing: '2.5px', color: '#9aa5b4', margin: 0, textTransform: 'uppercase' }}>Create your Race Passport today</p>
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>First Name</label>
            <input className="rp-input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Last Name</label>
            <input className="rp-input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Email</label>
          <input className={`rp-input${prefillEmail ? ' prefilled' : ''}`} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" readOnly={!!prefillEmail} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Password</label>
          <input className="rp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Confirm Password</label>
          <input className="rp-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSignUp()} />
        </div>

        <button className="rp-primary" onClick={handleSignUp} disabled={loading} style={{ marginBottom: '12px' }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#b0b8c4', margin: '0 0 14px', lineHeight: 1.6, fontWeight: 300 }}>
          By continuing, you agree to our{' '}
          <span style={{ color: '#1B2A4A', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>
          {' '}and{' '}
          <span style={{ color: '#1B2A4A', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>
        </p>

        <p style={{ textAlign: 'center', color: '#9aa5b4', fontSize: '13px', margin: 0, fontWeight: 300 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: '600' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
