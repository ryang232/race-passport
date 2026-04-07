import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CreateAccount() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
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
    `
    if (!document.getElementById('rp-ca-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-ca-styles')?.remove()
  }, [])

  const handleSignUp = async () => {
    setError(null)
    if (!fullName.trim()) { setError('Please enter your full name'); return }
    if (!email.trim()) { setError('Email is required'); return }
    if (!email.includes('@')) { setError('Please enter a valid email address'); return }
    if (!password) { setError('Password is required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/home`,
      }
    })
    setLoading(false)

    if (error) {
      // Replace Supabase's generic anonymous sign-in error with a friendlier message
      if (error.message.toLowerCase().includes('anonymous')) {
        setError('Email is required')
      } else {
        setError(error.message)
      }
      return
    }

    // Navigate to verify email, passing name + email as state
    navigate('/verify-email', {
      state: {
        email: email.trim(),
        name: fullName.trim(),
        isNewUser: true,
      }
    })
  }

  const TICKER = ['26.2', '13.1', '10K', '5K', '70.3', '140.6', '50K', '100M', '26.2', '13.1', '10K', '5K', '70.3', '140.6', '50K', '100M']

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Barlow', sans-serif",
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-55%)',
        left: 0,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', animation: 'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d, i) => (
            <span key={i} style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(180px, 24vw, 340px)',
              color: 'transparent',
              WebkitTextStroke: '1px rgba(27,42,74,0.055)',
              lineHeight: 1,
              padding: '0 40px',
              userSelect: 'none',
              flexShrink: 0,
            }}>{d}</span>
          ))}
        </div>
      </div>

      <div style={{
        position: 'relative', zIndex: 10,
        background: '#fff', borderRadius: '4px',
        padding: '40px 36px 32px',
        width: '100%', maxWidth: '380px', margin: '20px',
        boxShadow: '0 2px 40px rgba(27,42,74,0.10), 0 0 0 1px rgba(27,42,74,0.07)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', letterSpacing: '3.5px', color: '#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '38px', color: '#1B2A4A', margin: '0 0 6px', letterSpacing: '1.5px', lineHeight: 1 }}>CREATE ACCOUNT</h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', letterSpacing: '2.5px', color: '#9aa5b4', margin: 0, textTransform: 'uppercase' }}>Start your passport today</p>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', padding: '10px 14px', color: '#c53030', fontSize: '13px', marginBottom: '14px' }}>{error}</div>
        )}

        {[
          { label: 'Full Name', value: fullName, setter: setFullName, type: 'text', placeholder: 'Jane Doe' },
          { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'your@email.com' },
          { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: 'Min 6 characters' },
          { label: 'Confirm Password', value: confirmPassword, setter: setConfirmPassword, type: 'password', placeholder: '••••••••' },
        ].map(({ label, value, setter, type, placeholder }, i, arr) => (
          <div key={label} style={{ marginBottom: i === arr.length - 1 ? '20px' : '10px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', color: '#9aa5b4', marginBottom: '5px', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</label>
            <input
              className="rp-input" type={type} value={value}
              onChange={e => setter(e.target.value)} placeholder={placeholder}
              onKeyDown={i === arr.length - 1 ? e => e.key === 'Enter' && handleSignUp() : undefined}
            />
          </div>
        ))}

        <button className="rp-primary" onClick={handleSignUp} disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', color: '#9aa5b4', fontSize: '13px', marginTop: '20px', fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: '600' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
