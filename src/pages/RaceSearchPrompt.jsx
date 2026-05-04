import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']

export default function RaceSearchPrompt() {
  const navigate = useNavigate()
  const location = useLocation()
  const firstName = location.state?.firstName || ''
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 80)
    const style = document.createElement('style')
    style.id = 'rp-rsp-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      @keyframes pulse { 0%,100%{opacity:0.35;} 50%{opacity:1;} }
      .rsp-feature { display:flex; align-items:flex-start; gap:14px; padding:16px; border-radius:12px; border:1.5px solid #e2e6ed; background:#fff; transition:border-color 0.2s; }
      .rsp-feature:hover { border-color:rgba(201,168,76,0.4); }
    `
    if (!document.getElementById('rp-rsp-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-rsp-styles')?.remove()
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily:"'Barlow',sans-serif", padding:'40px 20px' }}>

      {/* Ticker background */}
      <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.045)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>

      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:'460px', opacity:visible?1:0, transform:visible?'translateY(0)':'translateY(20px)', transition:'opacity 0.45s ease, transform 0.45s ease' }}>

        {/* Brand mark */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'24px' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'8px' }}>
          <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'36px', background:'#C9A84C', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
        </div>
        <div style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'28px' }}>
          Step 2 — Build Your Passport
        </div>

        {/* Pacer icon */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'20px' }}>
          <div style={{ width:72, height:72, borderRadius:'18px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(27,42,74,0.2)', position:'relative' }}>
            <span style={{ fontSize:'32px', lineHeight:1 }}>⚡</span>
            <div style={{ position:'absolute', inset:-6, borderRadius:'24px', border:'1.5px solid rgba(201,168,76,0.25)', animation:'pulse 2s ease infinite' }} />
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'10px' }}>
            Your AI Race Intelligence
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,8vw,52px)', color:'#1B2A4A', margin:'0 0 12px', letterSpacing:'1.5px', lineHeight:1 }}>
            {firstName ? `${firstName.toUpperCase()}, MEET PACER` : 'MEET PACER'}
          </h1>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.75 }}>
            Pacer is built into Race Passport to analyze your race history, celebrate your achievements, and surface insights about your racing career — automatically.
          </p>
        </div>

        {/* Feature cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px' }}>

          {/* Build your passport */}
          <div className="rsp-feature">
            <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(201,168,76,0.1)', border:'1.5px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:'18px' }}>🏅</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1, marginBottom:'4px' }}>Build Your Race Passport</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#6b7a8d', lineHeight:1.5 }}>
                Search any race by name, year, and distance — Pacer looks it up and fills in location and date. You verify, then it's stamped to your Passport.
              </div>
            </div>
          </div>

          {/* Race intelligence */}
          <div className="rsp-feature">
            <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(27,42,74,0.07)', border:'1.5px solid rgba(27,42,74,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:'18px' }}>📊</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1, marginBottom:'4px' }}>Race Intelligence, Personalized</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#6b7a8d', lineHeight:1.5 }}>
                Pacer reads your results, spots trends across your race history, and gives you specific insights — always positive, always about you.
              </div>
            </div>
          </div>

          {/* Strava — no Optional badge */}
          <div className="rsp-feature" style={{ borderColor:'rgba(252,76,2,0.2)', background:'rgba(252,76,2,0.02)' }}>
            <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(252,76,2,0.08)', border:'1.5px solid rgba(252,76,2,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1, marginBottom:'4px' }}>Connect Strava</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#6b7a8d', lineHeight:1.5 }}>
                Link Strava on the next screen to add race maps, elevation, and pace data to your Passport automatically.
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/race-import', { state:{ firstName } })}
          style={{ width:'100%', padding:'17px', border:'none', borderRadius:'14px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, letterSpacing:'2px', color:'#fff', cursor:'pointer', textTransform:'uppercase', marginBottom:'10px', transition:'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background='#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
          Let's Build My Passport →
        </button>

        <button
          onClick={() => navigate('/build-passport', { state:{ firstName } })}
          style={{ width:'100%', padding:'14px', border:'1.5px solid #e2e6ed', borderRadius:'14px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#1B2A4A'; e.currentTarget.style.color='#1B2A4A' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e6ed'; e.currentTarget.style.color='#9aa5b4' }}>
          Skip — I'll Add Races Later
        </button>

        <p style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#b0b8c4', margin:'16px 0 0', lineHeight:1.6 }}>
          You can always add races anytime from your Passport page.
        </p>

      </div>
    </div>
  )
}
