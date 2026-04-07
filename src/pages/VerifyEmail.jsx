import { useNavigate } from 'react-router-dom'

export default function VerifyEmail() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Barlow, sans-serif', padding: '40px 24px' }}>

      {/* Background ticker */}
      <div style={{ position: 'fixed', top: '50%', left: 0, transform: 'translateY(-50%)', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {['26.2', '13.1', '10K', '5K', '70.3', '140.6', '26.2', '13.1', '10K'].map((item, i) => (
          <span key={i} style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(100px, 15vw, 180px)', color: 'transparent', WebkitTextStroke: '1px rgba(27,42,74,0.06)', lineHeight: 1, padding: '0 16px', userSelect: 'none' }}>{item}</span>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '40px' }}>
          <div style={{ width: '9px', height: '9px', background: '#C9A84C', borderRadius: '50%' }} />
          <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '22px', letterSpacing: '0.18em', color: '#1B2A4A' }}>Race Passport</span>
        </div>

        {/* Envelope icon */}
        <div style={{ width: '80px', height: '80px', background: 'rgba(201,168,76,0.1)', border: '2px solid rgba(201,168,76,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="#C9A84C" strokeWidth="1.5"/>
            <path d="M2 7l10 7 10-7" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Heading */}
        <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', letterSpacing: '0.04em', color: '#1B2A4A', lineHeight: 1, marginBottom: '14px' }}>Check Your Inbox</h1>

        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '14px', fontWeight: 300, color: 'rgba(27,42,74,0.55)', lineHeight: 1.8, marginBottom: '32px' }}>
          We sent a verification link to<br />
          <strong style={{ color: '#1B2A4A', fontWeight: 500 }}>ryan@racepassportapp.com</strong><br /><br />
          Click the link in your email to activate your passport and continue.
        </p>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(27,42,74,0.08)', marginBottom: '28px' }} />

        {/* Checklist */}
        <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)', marginBottom: '16px' }}>Your passport setup</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', textAlign: 'left' }}>
          {[
            { label: 'Account created', done: true },
            { label: 'Email verified', done: false },
          ].map(({ label, done }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: done ? '#C9A84C' : 'rgba(27,42,74,0.08)', border: done ? 'none' : '1px solid rgba(27,42,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '13px', fontWeight: done ? 500 : 400, color: done ? '#1B2A4A' : 'rgba(27,42,74,0.45)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Open email button */}
        <button
          onClick={() => navigate('/build-passport')}
          style={{ width: '100%', padding: '15px', background: '#C9A84C', color: '#ffffff', border: 'none', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '13px', fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '2px', marginBottom: '14px' }}
          onMouseEnter={e => e.currentTarget.style.background = '#b8963e'}
          onMouseLeave={e => e.currentTarget.style.background = '#C9A84C'}>
          Open Email App
        </button>

        {/* Resend */}
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '12px', fontWeight: 300, color: 'rgba(27,42,74,0.4)', lineHeight: 1.6 }}>
          Didn't receive it? Check your spam or{' '}
          <span style={{ color: '#C9A84C', fontWeight: 500, cursor: 'pointer' }}>resend verification email</span>
        </p>

      </div>
    </div>
  )
}
