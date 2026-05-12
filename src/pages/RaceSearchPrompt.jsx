import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']

export default function RaceSearchPrompt() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user }   = useAuth()
  const firstName  = location.state?.firstName || ''

  const [visible, setVisible]       = useState(false)
  const [poolConsent, setPoolConsent] = useState(true)
  const [saving, setSaving]         = useState(false)

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
      .rsp-toggle { position:relative; width:44px; height:24px; flex-shrink:0; }
      .rsp-toggle input { opacity:0; width:0; height:0; }
      .rsp-toggle-track { position:absolute; inset:0; border-radius:12px; background:#e2e6ed; cursor:pointer; transition:background 0.2s; }
      .rsp-toggle input:checked + .rsp-toggle-track { background:#1B2A4A; }
      .rsp-toggle-thumb { position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; transition:transform 0.2s; pointer-events:none; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
      .rsp-toggle input:checked ~ .rsp-toggle-thumb { transform:translateX(20px); }
    `
    if (!document.getElementById('rp-rsp-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-rsp-styles')?.remove()
  }, [])

  const handleContinue = async () => {
    setSaving(true)
    try {
      if (user && !isDemo(user?.email)) {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (uid) {
          await supabase.from('profiles')
            .update({ pacer_pool_consent: poolConsent })
            .eq('id', uid)
        }
      }
    } catch(e) { /* non-blocking */ }
    setSaving(false)
    navigate('/race-import', { state: { firstName, poolConsent } })
  }

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
            Pacer is your AI race coach inside Race Passport. It searches the web to confirm your races, learns what makes each one special, and builds a personalized intelligence layer around your entire racing career.
          </p>
        </div>

        {/* Feature cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>

          {/* Web search confirmation */}
          <div className="rsp-feature">
            <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(201,168,76,0.1)', border:'1.5px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:'18px' }}>🔍</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1, marginBottom:'4px' }}>Real Race Confirmation</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#6b7a8d', lineHeight:1.5 }}>
                Type a race name, pick your distance and year — Pacer searches the web to confirm the official date, location, and course details. No guessing.
              </div>
            </div>
          </div>

          {/* Personality layer */}
          <div className="rsp-feature">
            <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(27,42,74,0.07)', border:'1.5px solid rgba(27,42,74,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:'18px' }}>🏅</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1, marginBottom:'4px' }}>Race Personality & Insights</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#6b7a8d', lineHeight:1.5 }}>
                Pacer searches race forums, reviews, and runner communities to tell you what makes each race special — the course, the crowd, the vibe. Every stamp tells a story.
              </div>
            </div>
          </div>

          {/* Results lookup */}
          <div className="rsp-feature">
            <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(22,163,74,0.07)', border:'1.5px solid rgba(22,163,74,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:'18px' }}>📊</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1, marginBottom:'4px' }}>Automatic Result Lookup</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#6b7a8d', lineHeight:1.5 }}>
                Pacer uses your name and date of birth to search for your official finish time. When it finds it, everything fills in automatically.
              </div>
            </div>
          </div>

          {/* Strava */}
          <div className="rsp-feature" style={{ borderColor:'rgba(252,76,2,0.2)', background:'rgba(252,76,2,0.02)' }}>
            <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(252,76,2,0.08)', border:'1.5px solid rgba(252,76,2,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1, marginBottom:'4px' }}>Strava Activity Match</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#6b7a8d', lineHeight:1.5 }}>
                Connect Strava on the next screen — Pacer will automatically find your matching activity and pull in your route map, splits, and elevation.
              </div>
            </div>
          </div>
        </div>

        {/* Community pool opt-in */}
        <div style={{ padding:'16px', borderRadius:'12px', border:'1.5px solid rgba(201,168,76,0.25)', background:'rgba(201,168,76,0.04)', marginBottom:'24px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1, marginBottom:'5px' }}>
                Help Make Pacer Smarter
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#6b7a8d', lineHeight:1.6 }}>
                Allow your anonymous finish times to contribute to community grading. When enough Race Passport runners have run the same race, Pacer can tell you how you ranked among them — by age group, distance, and year. No personal info is shared.
              </div>
            </div>
            {/* Toggle */}
            <label className="rsp-toggle" style={{ marginTop:'2px' }}>
              <input
                type="checkbox"
                checked={poolConsent}
                onChange={e => setPoolConsent(e.target.checked)}
              />
              <div className="rsp-toggle-track" />
              <div className="rsp-toggle-thumb" />
            </label>
          </div>
          {poolConsent && (
            <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#16a34a', flexShrink:0 }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#16a34a', textTransform:'uppercase' }}>
                Contributing to community grades — thank you
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={saving}
          style={{ width:'100%', padding:'17px', border:'none', borderRadius:'14px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, letterSpacing:'2px', color:'#fff', cursor:'pointer', textTransform:'uppercase', marginBottom:'10px', transition:'background 0.2s', opacity:saving?0.7:1 }}
          onMouseEnter={e => { if(!saving) e.currentTarget.style.background='#C9A84C' }}
          onMouseLeave={e => { if(!saving) e.currentTarget.style.background='#1B2A4A' }}>
          {saving ? 'One sec...' : "Let's Build My Passport →"}
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
