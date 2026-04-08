import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'

function ErrorBox({ children }) {
  return (
    <div style={{ background:'rgba(27,42,74,0.06)', border:'1px solid rgba(27,42,74,0.2)', borderRadius:'6px', padding:'10px 14px', fontSize:'13px', marginBottom:'14px', lineHeight:1.6, display:'flex', alignItems:'flex-start', gap:'10px' }}>
      <span style={{ color:'#e53e3e', fontSize:'15px', lineHeight:1.3, flexShrink:0, fontWeight:700 }}>✕</span>
      <span style={{ color:'#1B2A4A' }}>{children}</span>
    </div>
  )
}

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { email = '', name = '', isNewUser = true } = location.state || {}

  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)
  const [verified, setVerified] = useState(false)

  const firstName = name ? name.split(' ')[0] : ''

  useEffect(() => {
    if (!email) navigate('/create-account')
    const style = document.createElement('style')
    style.id = 'rp-verify-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      @keyframes checkPop { 0%{transform:scale(0);opacity:0;} 60%{transform:scale(1.2);opacity:1;} 100%{transform:scale(1);opacity:1;} }
      @keyframes fadeSlideUp { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
      @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.3);} 50%{box-shadow:0 0 0 10px rgba(201,168,76,0);} }
      .rp-code-input { width:100%; padding:14px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:28px; font-family:'Bebas Neue',sans-serif; letter-spacing:0.3em; text-align:center; outline:none; box-sizing:border-box; transition:border-color 0.15s,background 0.15s; }
      .rp-code-input:focus { border-color:#C9A84C; background:#fff; }
      .rp-code-input::placeholder { color:#d0d7e0; font-size:18px; letter-spacing:0.2em; }
      .rp-primary { width:100%; padding:13px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s,transform 0.1s; border-radius:6px; }
      .rp-primary:hover:not(:disabled) { background:#C9A84C; }
      .rp-primary:active:not(:disabled) { transform:scale(0.985); }
      .rp-primary:disabled { opacity:0.5; cursor:not-allowed; }
      .step-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0f2f5; }
      .step-row:last-child { border-bottom:none; }
      .step-dot { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px; transition:all 0.4s ease; }
      .step-dot.done { background:#C9A84C; color:#fff; }
      .step-dot.done-anim { background:#C9A84C; color:#fff; animation:checkPop 0.5s ease forwards; }
      .step-dot.pending { background:#f0f2f5; color:#b0b8c4; border:1.5px solid #e2e6ed; }
    `
    if (!document.getElementById('rp-verify-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-verify-styles')?.remove()
  }, [email, navigate])

  const handleVerify = async () => {
    if (!code || code.length < 6) { setError('Please enter the full code from your email'); return }
    setError(null)
    setLoading(true)

    // DEMO bypass — any 6-digit code works
    if (isDemo(email)) {
      setLoading(false)
      setVerified(true)
      setTimeout(() => navigate(isNewUser ? '/build-passport' : '/home'), 2200)
      return
    }

    let result = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' })
    if (result.error) result = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setLoading(false)

    if (result.error) setError('Invalid or expired code. Please check and try again, or resend.')
    else { setVerified(true); setTimeout(() => navigate(isNewUser ? '/build-passport' : '/home'), 2200) }
  }

  const handleResend = async () => {
    setResending(true); setResent(false); setError(null)
    if (isDemo(email)) { setResending(false); setResent(true); return }
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (error) setError(error.message); else setResent(true)
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
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(201,168,76,0.1)', border:'1.5px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', animation: verified ? 'pulse 1s ease infinite' : 'none' }}>
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none"><rect x="1" y="1" width="20" height="16" rx="2" stroke="#C9A84C" strokeWidth="1.5"/><path d="M1 4l10 7 10-7" stroke="#C9A84C" strokeWidth="1.5"/></svg>
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'34px', color:'#1B2A4A', margin:'0 0 8px', letterSpacing:'1.5px', lineHeight:1 }}>
            {verified ? 'EMAIL VERIFIED!' : 'CHECK YOUR INBOX'}
          </h1>
          {!verified && (
            <>
              <p style={{ fontSize:'13px', color:'#9aa5b4', margin:'0 0 4px', fontWeight:300, lineHeight:1.6 }}>
                {firstName ? `Welcome to Race Passport, ${firstName}.` : 'Welcome to Race Passport.'}<br/>We sent a verification code to
              </p>
              <p style={{ fontSize:'13px', color:'#1B2A4A', fontWeight:600, margin:'0 0 4px' }}>{email}</p>
              <p style={{ fontSize:'12px', color:'#9aa5b4', margin:0, fontWeight:300 }}>Enter it below to verify your email and finish creating your account.</p>
              {isDemo(email) && (
                <p style={{ fontSize:'11px', color:'#C9A84C', margin:'8px 0 0', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'1px' }}>DEMO MODE — any 6-digit code works</p>
              )}
            </>
          )}
        </div>
        {!verified && error && <ErrorBox>{error}</ErrorBox>}
        {!verified && resent && <div style={{ background:'#f0faf4', border:'1px solid #bbf0d0', borderRadius:'6px', padding:'10px 14px', color:'#1a7a40', fontSize:'13px', marginBottom:'14px' }}>New code sent — check your inbox.</div>}
        {!verified && (
          <>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'10px', fontWeight:'600', letterSpacing:'1.5px', color:'#9aa5b4', marginBottom:'5px', textTransform:'uppercase', fontFamily:"'Barlow Condensed',sans-serif" }}>Verification Code</label>
              <input className="rp-code-input" type="text" inputMode="numeric" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g,''))} placeholder="· · · · · ·" onKeyDown={e => e.key === 'Enter' && handleVerify()} />
            </div>
            <button className="rp-primary" onClick={handleVerify} disabled={loading || code.length < 6} style={{ marginBottom:'16px' }}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </>
        )}
        <div style={{ border:'1px solid #f0f2f5', borderRadius:'6px', padding:'8px 16px', marginBottom: verified ? 0 : '16px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Your Passport Setup</div>
          <div className="step-row"><div className="step-dot done">✓</div><span style={{ fontSize:'13px', color:'#1B2A4A', fontWeight:500 }}>Account created</span></div>
          <div className="step-row">
            <div className={`step-dot ${verified ? 'done-anim' : 'pending'}`}>{verified ? '✓' : '2'}</div>
            <span style={{ fontSize:'13px', color: verified ? '#1B2A4A' : '#9aa5b4', fontWeight: verified ? 500 : 400 }}>Email verified</span>
          </div>
          <div className="step-row">
            <div className="step-dot pending">3</div>
            <span style={{ fontSize:'13px', color: verified ? '#C9A84C' : '#9aa5b4', fontFamily: verified ? "'Barlow Condensed',sans-serif" : undefined, letterSpacing: verified ? '1px' : undefined, textTransform: verified ? 'uppercase' : undefined, fontSize: verified ? '12px' : '13px' }}>
              {verified ? 'Building your passport... →' : 'Build your passport'}
            </span>
          </div>
        </div>
        {!verified && (
          <p style={{ textAlign:'center', color:'#9aa5b4', fontSize:'12px', margin:'16px 0 0', fontWeight:300 }}>
            Didn't receive it? Check your spam or{' '}
            <span onClick={handleResend} style={{ color:'#C9A84C', cursor: resending ? 'not-allowed' : 'pointer', fontWeight:600 }}>
              {resending ? 'sending...' : 'resend code'}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
