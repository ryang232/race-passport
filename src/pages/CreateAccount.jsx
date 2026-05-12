import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function ErrorBox({ children }) {
  return (
    <div style={{ background:'rgba(27,42,74,0.06)', border:'1px solid rgba(27,42,74,0.2)', borderRadius:'6px', padding:'10px 14px', fontSize:'13px', marginBottom:'14px', lineHeight:1.6, display:'flex', alignItems:'flex-start', gap:'10px' }}>
      <span style={{ color:'#e53e3e', fontSize:'15px', lineHeight:1.3, flexShrink:0, fontWeight:700 }}>✕</span>
      <span style={{ color:'#1B2A4A' }}>{children}</span>
    </div>
  )
}

function DobPicker({ value, onChange }) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length:100 }, (_,i) => currentYear - 18 - i)
  const [month, setMonth] = useState('')
  const [day, setDay]     = useState('')
  const [year, setYear]   = useState('')

  useEffect(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-')
      if (parts.length === 3) {
        setYear(parts[0])
        setMonth(String(parseInt(parts[1])))
        setDay(String(parseInt(parts[2])))
      }
    }
  }, [value])

  const daysInMonth = month && year ? new Date(parseInt(year), parseInt(month), 0).getDate() : 31
  const days = Array.from({ length:daysInMonth }, (_,i) => i+1)
  const fire = (m,d,y) => {
    if (m&&d&&y) onChange(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
  }

  const sel = {
    padding:'11px 12px', borderRadius:'6px', border:'1.5px solid #e2e6ed',
    background:'#fafbfc', color:'#1B2A4A', fontSize:'13px',
    fontFamily:"'Barlow',sans-serif", outline:'none', appearance:'none',
    cursor:'pointer', width:'100%', transition:'border-color 0.15s'
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 1.4fr', gap:'6px' }}>
      <select value={month} style={sel}
        onChange={e => { setMonth(e.target.value); fire(e.target.value,day,year) }}
        onFocus={e => e.target.style.borderColor='#C9A84C'}
        onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Month</option>
        {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
      </select>
      <select value={day} style={sel}
        onChange={e => { setDay(e.target.value); fire(month,e.target.value,year) }}
        onFocus={e => e.target.style.borderColor='#C9A84C'}
        onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Day</option>
        {days.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={year} style={sel}
        onChange={e => { setYear(e.target.value); fire(month,day,e.target.value) }}
        onFocus={e => e.target.style.borderColor='#C9A84C'}
        onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Year</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

export default function CreateAccount() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const prefillEmail = location.state?.email || ''

  const [firstName, setFirstName]             = useState('')
  const [lastName, setLastName]               = useState('')
  const [email, setEmail]                     = useState(prefillEmail)
  const [dob, setDob]                         = useState('')
  const [bibName, setBibName]                 = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState(null)
  const [loading, setLoading]                 = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-ca-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      .rp-input { width:100%; padding:12px 14px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:14px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; transition:border-color 0.15s,background 0.15s; }
      .rp-input:focus { border-color:#C9A84C; background:#fff; }
      .rp-input::placeholder { color:#b0b8c4; }
      .rp-input.prefilled { background:#f4f5f7; color:#9aa5b4; }
      .rp-primary { width:100%; padding:13px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s,transform 0.1s; border-radius:6px; }
      .rp-primary:hover:not(:disabled) { background:#C9A84C; }
      .rp-primary:active:not(:disabled) { transform:scale(0.985); }
      .rp-primary:disabled { opacity:0.5; cursor:not-allowed; }
      .rp-label { display:block; font-size:10px; font-weight:600; letter-spacing:1.5px; color:#9aa5b4; margin-bottom:5px; text-transform:uppercase; font-family:'Barlow Condensed',sans-serif; }
    `
    if (!document.getElementById('rp-ca-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-ca-styles')?.remove()
  }, [])

  const requestLocation = () => new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => resolve(null),
      { timeout:8000 }
    )
  })

  const handleSignUp = async () => {
    setError(null)
    if (!firstName.trim())  { setError('First name is required'); return }
    if (!lastName.trim())   { setError('Last name is required'); return }
    if (!email.trim() || !email.includes('@')) { setError('Email is required'); return }
    if (!dob)               { setError('Date of birth is required'); return }
    if (!password)          { setError('Password is required'); return }
    if (password.length < 6){ setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    const locPromise = requestLocation()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name:  `${firstName.trim()} ${lastName.trim()}`,
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/home`,
      }
    })

    if (signUpError) {
      setLoading(false)
      const msg = signUpError.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('already been registered')) {
        setError(
          <span>
            An account with this email already exists.{' '}
            <Link to="/login" style={{ color:'#C9A84C', fontWeight:600 }}>Sign in instead →</Link>
            {' '}or use the{' '}
            <Link to="/forgot-password" style={{ color:'#C9A84C', fontWeight:600 }}>Forgot Password</Link>
            {' '}link.
          </span>
        )
      } else {
        setError(signUpError.message)
      }
      return
    }

    // Supabase returns identities:[] when email already exists but doesn't error
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setLoading(false)
      setError(
        <span>
          An account with this email already exists.{' '}
          <Link to="/login" style={{ color:'#C9A84C', fontWeight:600 }}>Sign in instead →</Link>
        </span>
      )
      return
    }

    if (data?.user) {
      const updates = {
        date_of_birth: dob || null,
        dob:           dob || null,
        race_name:     bibName.trim() || null,
        full_name:     `${firstName.trim()} ${lastName.trim()}`,
        first_name:    firstName.trim(),
        last_name:     lastName.trim(),
      }
      const loc = await locPromise
      if (loc) { updates.signup_lat = loc.lat; updates.signup_lng = loc.lng }
      await supabase.from('profiles').update(updates).eq('id', data.user.id)
    }

    setLoading(false)

    if (data?.session) {
      // Email confirmation disabled — go straight through
      navigate('/race-search-prompt', { state:{ firstName: firstName.trim() } })
    } else {
      // Email confirmation required — go to verify
      navigate('/verify-email', {
        state: {
          email: email.trim(),
          firstName: firstName.trim(),
          isNewUser: true,
          nextStep: 'race-search-prompt',
        }
      })
    }
  }

  const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily:"'Barlow',sans-serif", padding:'40px 0' }}>

      {/* Ticker background */}
      <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.055)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>

      <div style={{ position:'relative', zIndex:10, background:'#fff', borderRadius:'4px', padding:'36px 36px 32px', width:'100%', maxWidth:'420px', margin:'20px', boxShadow:'0 2px 40px rgba(27,42,74,0.10),0 0 0 1px rgba(27,42,74,0.07)' }}>

        {/* Back button */}
        <button onClick={() => navigate('/signup', { state:{ email } })}
          style={{ display:'flex', alignItems:'center', gap:'5px', background:'none', border:'none', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'20px', padding:0 }}
          onMouseEnter={e => e.currentTarget.style.color='#1B2A4A'}
          onMouseLeave={e => e.currentTarget.style.color='#9aa5b4'}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'12px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'8px' }}>
            <div style={{ height:'3px', width:'36px', background:'#C9A84C', borderRadius:'2px' }} />
            <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
            <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'14px' }}>
            Step 1 — Create Your Account
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:'#1B2A4A', margin:0, letterSpacing:'1.5px', lineHeight:1 }}>CREATE ACCOUNT</h1>
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        {/* Name row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          <div>
            <label className="rp-label">First Name <span style={{ color:'#C9A84C' }}>*</span></label>
            <input className="rp-input" type="text" value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="First name" />
          </div>
          <div>
            <label className="rp-label">Last Name <span style={{ color:'#C9A84C' }}>*</span></label>
            <input className="rp-input" type="text" value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Last name" />
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom:'10px' }}>
          <label className="rp-label">Email <span style={{ color:'#C9A84C' }}>*</span></label>
          <input className={`rp-input${prefillEmail?' prefilled':''}`} type="email"
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            readOnly={!!prefillEmail} />
        </div>

        {/* DOB */}
        <div style={{ marginBottom:'10px' }}>
          <label className="rp-label">Date of Birth <span style={{ color:'#C9A84C' }}>*</span></label>
          <DobPicker value={dob} onChange={setDob} />
        </div>

        {/* Bib name */}
        <div style={{ marginBottom:'10px' }}>
          <label className="rp-label">Bib Name <span style={{ fontWeight:400, color:'#b0b8c4', textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
          <input className="rp-input" type="text" value={bibName}
            onChange={e => setBibName(e.target.value)}
            placeholder="Name on your race bib — e.g. Ryan" />
        </div>

        {/* Password */}
        <div style={{ marginBottom:'10px' }}>
          <label className="rp-label">Password <span style={{ color:'#C9A84C' }}>*</span></label>
          <input className="rp-input" type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min 6 characters" />
        </div>
        <div style={{ marginBottom:'20px' }}>
          <label className="rp-label">Confirm Password <span style={{ color:'#C9A84C' }}>*</span></label>
          <input className="rp-input" type="password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            onKeyDown={e => e.key==='Enter' && handleSignUp()} />
        </div>

        <button className="rp-primary" onClick={handleSignUp} disabled={loading}
          style={{ marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          {loading
            ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/> Creating account...</>
            : 'Create Account →'
          }
        </button>

        <p style={{ textAlign:'center', fontSize:'11px', color:'#b0b8c4', margin:'0 0 14px', lineHeight:1.6, fontWeight:300 }}>
          By continuing, you agree to our{' '}
          <span style={{ color:'#1B2A4A', cursor:'pointer', textDecoration:'underline' }}>Terms of Service</span>{' '}and{' '}
          <span style={{ color:'#1B2A4A', cursor:'pointer', textDecoration:'underline' }}>Privacy Policy</span>
        </p>
        <p style={{ textAlign:'center', color:'#9aa5b4', fontSize:'13px', margin:0, fontWeight:300 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'#C9A84C', textDecoration:'none', fontWeight:'600' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
