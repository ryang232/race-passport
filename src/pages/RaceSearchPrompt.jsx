import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function RaceSearchPrompt() {
  const navigate = useNavigate()
  const location = useLocation()
  const firstName = location.state?.firstName || ''
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slight delay so the card animates in smoothly
    setTimeout(() => setVisible(true), 80)

    const style = document.createElement('style')
    style.id = 'rp-rsp-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
      .rp-primary { width:100%; padding:14px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s,transform 0.1s; border-radius:6px; }
      .rp-primary:hover { background:#C9A84C; }
      .rp-primary:active { transform:scale(0.985); }
      .rp-secondary { width:100%; padding:13px; border:1.5px solid #e2e6ed; background:#fff; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:border-color 0.2s,background 0.2s; border-radius:6px; }
      .rp-secondary:hover { border-color:#1B2A4A; background:#f8f9fb; }
      .source-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:12px; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; }
    `
    if (!document.getElementById('rp-rsp-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-rsp-styles')?.remove()
  }, [])

  const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']

  // Sources we'll search
  const SOURCES = [
    { name:'RunSignup',  color:'#2563EB', desc:'Race registrations & finish times' },
    { name:'Athlinks',   color:'#7c3aed', desc:'Verified race results database' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily:"'Barlow',sans-serif", padding:'40px 0' }}>
      {/* Ticker background */}
      <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.055)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>

      <div style={{ position:'relative', zIndex:10, background:'#fff', borderRadius:'4px', padding:'40px 36px 36px', width:'100%', maxWidth:'420px', margin:'20px', boxShadow:'0 2px 40px rgba(27,42,74,0.10),0 0 0 1px rgba(27,42,74,0.07)', opacity:visible?1:0, transform:visible?'translateY(0)':'translateY(16px)', transition:'opacity 0.4s ease, transform 0.4s ease' }}>

        {/* Brand mark */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'28px' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>

        {/* Icon */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'20px' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(201,168,76,0.08)', border:'1.5px solid rgba(201,168,76,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#C9A84C" strokeWidth="1.5"/>
              <path d="M16.5 16.5L21 21" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 11h6M11 8v6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'34px', color:'#1B2A4A', margin:'0 0 8px', letterSpacing:'1.5px', lineHeight:1 }}>
            {firstName ? `LET'S FIND YOUR RACES, ${firstName.toUpperCase()}` : "LET'S FIND YOUR RACES"}
          </h1>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.7 }}>
            We'll search your race history and automatically populate your Race Passport — no manual entry needed.
          </p>
        </div>

        {/* Sources */}
        <div style={{ background:'#f8f9fb', border:'1px solid #e2e6ed', borderRadius:'8px', padding:'16px', marginBottom:'24px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'12px' }}>We'll search</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {SOURCES.map(s => (
              <div key={s.name} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:32, height:32, borderRadius:'8px', background:`${s.color}15`, border:`1px solid ${s.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'10px', color:s.color, letterSpacing:'0.5px' }}>{s.name.slice(0,2).toUpperCase()}</span>
                </div>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#1B2A4A', letterSpacing:'0.5px' }}>{s.name}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{s.desc}</div>
                </div>
                <div style={{ marginLeft:'auto', flexShrink:0 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'24px' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, marginTop:'2px' }}>
            <path d="M8 1.5L2 4v4c0 3.3 2.5 6.4 6 7.1C11.5 14.4 14 11.3 14 8V4L8 1.5z" stroke="#9aa5b4" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontSize:'11px', color:'#9aa5b4', margin:0, fontFamily:"'Barlow Condensed',sans-serif", lineHeight:1.5 }}>
            We only search using your name and date of birth. No passwords or accounts are accessed. You'll review everything before it's added.
          </p>
        </div>

        {/* CTAs */}
        <button className="rp-primary" onClick={() => navigate('/race-import', { state:{ firstName } })} style={{ marginBottom:'10px' }}>
          Search My Race History →
        </button>
        <button className="rp-secondary" onClick={() => navigate('/build-passport', { state:{ firstName } })}>
          Not Now — Skip This Step
        </button>

        <p style={{ textAlign:'center', fontSize:'11px', color:'#b0b8c4', margin:'16px 0 0', lineHeight:1.6, fontWeight:300 }}>
          You can always import your races later from your Profile.
        </p>
      </div>
    </div>
  )
}
