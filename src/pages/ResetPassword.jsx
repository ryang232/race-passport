import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function ErrorBox({ children }) {
  return (
    <div style={{ background:'rgba(27,42,74,0.06)', border:'1px solid rgba(27,42,74,0.2)', borderRadius:'6px', padding:'10px 14px', fontSize:'13px', marginBottom:'14px', lineHeight:1.6, display:'flex', alignItems:'flex-start', gap:'10px' }}>
      <span style={{ color:'#e53e3e', fontSize:'15px', lineHeight:1.3, flexShrink:0, fontWeight:700 }}>✕</span>
      <span style={{ color:'#1B2A4A' }}>{children}</span>
    </div>
  )
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const isDemo = location.state?.demo === true

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(isDemo)

  useEffect(() => {
    if (!isDemo) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
      })
      return () => subscription.unsubscribe()
    }
    const style = document.createElement('style')
    style.id = 'rp-rp-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      .rp-input { width:100%; padding:12px 14px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:15px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; transition:border-color 0.15s,background 0.15s; }
      .rp-input:focus { border-color:#C9A84C; background:#fff; }
      .rp-input::placeholder { color:#b0b8c4; }
      .rp-primary { width:100%; padding:13px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s,transform 0.1s; border-radius:6px; }
      .rp-primary:hover:not(:disabled) { background:#C9A84C; }
      .rp-primary:disabled { opacity:0.5; cursor:not-allowed; }
    `
    if (!document.getElementById('rp-rp-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-rp-styles')?.remove()
  }, [isDemo])

  const handleReset = async () => {
    setError(null)
    if (!password) { setError('Please enter a new password'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    // DEMO bypass — just show success
    if (isDemo) { setDone(true); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily:"'Barlow',sans-serif" }}>
      <div style={{ position:'absolute', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.055)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>
      <div style={{ position:'relative', zIndex:10, background:'#fff', borderRadius:'4px', padding:'40px 36px 32px', width:'100%', maxWidth:'380px', margin:'20px', boxShadow:'0 2px 40px rgba(27,42,74,0.10),0 0 0 1px rgba(27,42,74,0.07)' }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'34px', color:'#1B2A4A', margin:'0 0 6px', letterSpacing:'1.5px', lineHeight:1 }}>
            {done ? 'PASSWORD UPDATED' : 'CHOOSE A NEW PASSWORD'}
          </h1>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:0, textTransform:'uppercase' }}>
            {done ? "You're all set" : 'Enter your new password below'}
          </p>
          {isDemo && !done && (
            <p style={{ fontSize:'11px', color:'#C9A84C', margin:'8px 0 0', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'1px' }}>DEMO MODE — password won't actually change</p>
          )}
        </div>
        {!done ? (
          <>
            {error && <ErrorBox>{error}</ErrorBox>}
            <div style={{ marginBottom:'12px' }}>
              <label style={{ display:'block', fontSize:'10px', fontWeight:'600', letterSpacing:'1.5px', color:'#9aa5b4', marginBottom:'5px', textTransform:'uppercase', fontFamily:"'Barlow Condensed',sans-serif" }}>New Password</label>
              <input className="rp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div style={{ marginBottom:'24px' }}>
              <label style={{ display:'block', fontSize:'10px', fontWeight:'600', letterSpacing:'1.5px', color:'#9aa5b4', marginBottom:'5px', textTransform:'uppercase', fontFamily:"'Barlow Condensed',sans-serif" }}>Confirm New Password</label>
              <input className="rp-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleReset()} />
            </div>
            <button className="rp-primary" onClick={handleReset} disabled={loading || (!isDemo && !sessionReady)}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </>
        ) : (
          <>
            <div style={{ background:'#f0faf4', border:'1px solid #bbf0d0', borderRadius:'6px', padding:'16px', marginBottom:'20px', textAlign:'center' }}>
              <p style={{ fontSize:'14px', color:'#1a7a40', fontWeight:500, margin:'0 0 6px' }}>Password updated!</p>
              <p style={{ fontSize:'13px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6 }}>You can now sign in with your new password.</p>
            </div>
            <button className="rp-primary" onClick={() => navigate('/login')}>Go to Sign In →</button>
          </>
        )}
      </div>
    </div>
  )
}
