import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'
import { PHOTO_PLACEHOLDER, loadRacePhoto } from '../lib/photos'
import { useStrava, stravaStatsToItems } from '../lib/useStrava'
import { useIsMobile } from '../lib/useIsMobile'

// ── Constants ─────────────────────────────────────────────────────────────────
const TICKER_ITEMS = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M']

const RYAN_STAMPS = [
  { id:9,  distance:'70.3',  name:'IRONMAN 70.3 Eagleman', location:'Cambridge, MD',   month:'Jun', year:'2025', date:'Jun 2025', date_sort:'2025-06-08' },
  { id:8,  distance:'13.1',  name:'Austin Half Marathon',  location:'Austin, TX',      month:'Feb', year:'2025', date:'Feb 2025', date_sort:'2025-02-16' },
  { id:7,  distance:'5K',    name:'Turkey Trot',           location:'Columbia, MD',    month:'Nov', year:'2024', date:'Nov 2024', date_sort:'2024-11-28' },
  { id:6,  distance:'26.2',  name:'Marine Corps Marathon', location:'Washington, DC',  month:'Oct', year:'2023', date:'Oct 2023', date_sort:'2023-10-22' },
  { id:5,  distance:'26.2',  name:'LA Marathon',           location:'Los Angeles, CA', month:'Mar', year:'2023', date:'Mar 2023', date_sort:'2023-03-19' },
  { id:4,  distance:'13.1',  name:'Holiday Half',          location:'Annandale, VA',   month:'Dec', year:'2021', date:'Dec 2021', date_sort:'2021-12-05' },
  { id:1,  distance:'10K',   name:'Sole of the City',      location:'Baltimore, MD',   month:'Oct', year:'2021', date:'Oct 2021', date_sort:'2021-10-02' },
]

const RACE_STAT_ITEMS = [
  { label:'Total Races', value:'10' }, { label:'Race Miles', value:'199' },
  { label:'Half PR', value:'1:57:40' }, { label:'Marathon PR', value:'4:44:47' },
  { label:'70.3 PR', value:'6:32:08' },
]

// WORLD_MAJORS defined in WorldMajors section below with full lottery data

function gradeFromScore(s) {
  if (s >= 100) return 'A+'
  if (s >= 97)  return 'A+'
  if (s >= 93)  return 'A'
  if (s >= 90)  return 'A-'
  if (s >= 87)  return 'B+'
  if (s >= 83)  return 'B'
  if (s >= 80)  return 'B-'
  if (s >= 77)  return 'C+'
  if (s >= 73)  return 'C'
  if (s >= 70)  return 'C-'
  if (s >= 67)  return 'D+'
  if (s >= 63)  return 'D'
  if (s >= 60)  return 'D-'
  return 'F'
}

// ── Helper components ─────────────────────────────────────────────────────────
function useCountdown(dateStr) {
  const [cd, setCd] = useState({ days:0, hours:0, mins:0, secs:0, past:false })
  useEffect(() => {
    const calc = () => {
      const diff = new Date(dateStr) - new Date()
      if (isNaN(diff) || diff <= 0) { setCd(c => ({ ...c, past:true })); return }
      setCd({ days:Math.floor(diff/86400000), hours:Math.floor((diff%86400000)/3600000), mins:Math.floor((diff%3600000)/60000), secs:Math.floor((diff%60000)/1000), past:false })
    }
    calc(); const ti = setInterval(calc, 1000); return () => clearInterval(ti)
  }, [dateStr])
  return cd
}

function CardStamp({ distance, size=48 }) {
  const c = getDistanceColor(distance)
  const cleaned = (distance||'').replace(' mi','').replace(' miles','')
  const fs = size<=36 ? (cleaned.length>4?7:cleaned.length>2?9:12) : (cleaned.length>4?10:cleaned.length>2?13:17)
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${c.stampBorder}`, background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', inset:size<=36?2:3, borderRadius:'50%', border:`0.75px dashed ${c.stampDash}` }} />
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:c.stampText, letterSpacing:'0.3px', position:'relative', zIndex:1, textAlign:'center', lineHeight:1 }}>{cleaned}</span>
    </div>
  )
}

function Stamp({ distance, name, location, month, year, size=130, onClick, t }) {
  const c = getDistanceColor(distance)
  const cleaned = distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length>4?18:cleaned.length>2?22:32
  return (
    <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', cursor:'pointer', paddingBottom:'4px' }} onClick={onClick}>
      <div style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid ${c.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', transition:'transform 0.15s,box-shadow 0.15s' }}
        onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05)';e.currentTarget.style.boxShadow='0 8px 24px rgba(27,42,74,0.2)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none'}}>
        <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:`1px dashed ${c.stampDash}` }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:c.stampText, lineHeight:1, letterSpacing:'0.04em', position:'relative', zIndex:1, textAlign:'center', padding:'0 10px' }}>{cleaned}</div>
        {name && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8.5px', fontWeight:600, letterSpacing:'1px', color:c.stampText, textTransform:'uppercase', textAlign:'center', padding:'0 14px', lineHeight:1.3, marginTop:'4px', position:'relative', zIndex:1, opacity:0.55 }}>{name.split(' ').slice(0,3).join(' ')}</div>}
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text, lineHeight:1.4 }}>{location}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, letterSpacing:'0.5px', marginTop:'2px' }}>{month} {year}</div>
      </div>
    </div>
  )
}

function ScrollRow({ children, gap=24 }) {
  const ref = useRef(null)
  const [showL, setShowL] = useState(false)
  const [showR, setShowR] = useState(true)
  const [hov, setHov] = useState(false)
  const check = () => { const el=ref.current; if(!el) return; setShowL(el.scrollLeft>10); setShowR(el.scrollLeft<el.scrollWidth-el.clientWidth-10) }
  useEffect(() => { const el=ref.current; if(el){el.addEventListener('scroll',check);check()} ; return ()=>el?.removeEventListener('scroll',check) }, [])
  const scroll = d => ref.current?.scrollBy({ left:d*400, behavior:'smooth' })
  const btn = s => ({ position:'absolute', [s]:-22, top:'40%', transform:'translateY(-50%)', zIndex:10, width:44, height:44, borderRadius:'50%', background:'#1B2A4A', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(27,42,74,0.25)', transition:'background 0.15s' })
  return (
    <div style={{ position:'relative' }} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {showL&&hov&&<button onClick={()=>scroll(-1)} style={btn('left')} onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
      {showR&&hov&&<button onClick={()=>scroll(1)} style={btn('right')} onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
      <div ref={ref} style={{ display:'flex', gap, overflowX:'auto', paddingBottom:'12px', paddingTop:'4px', scrollbarWidth:'none', msOverflowStyle:'none' }}>{children}</div>
    </div>
  )
}

function StatsTicker({ t, items }) {
  const all = [...(items||[]),...(items||[]),...(items||[])]
  return (
    <div style={{ background:'#1B2A4A', overflow:'hidden', position:'relative', borderTop:'1px solid rgba(201,168,76,0.12)', borderBottom:'1px solid rgba(201,168,76,0.12)' }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:60, background:'linear-gradient(to right,#1B2A4A,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:60, background:'linear-gradient(to left,#1B2A4A,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:8, left:16, display:'flex', alignItems:'center', gap:'6px', zIndex:3 }}>
        <div style={{ width:14, height:14, borderRadius:'3px', background:'#FC4C02', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.25)', letterSpacing:'1px' }}>Synced via Strava</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', padding:'20px 0', animation:'statsTicker 50s linear infinite', width:'max-content' }}>
        {all.map((item,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
            <div style={{ textAlign:'center', padding:'0 28px' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,72px)', color:'#fff', lineHeight:1, letterSpacing:'2px', whiteSpace:'nowrap' }}>{item.value}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase', marginTop:'4px', whiteSpace:'nowrap' }}>{item.label}</div>
            </div>
            <div style={{ width:4, height:4, borderRadius:'50%', background:'rgba(201,168,76,0.25)', flexShrink:0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function StravaConnect({ t, onConnect }) {
  return (
    <div style={{ background:'#1B2A4A', borderTop:'1px solid rgba(201,168,76,0.12)', borderBottom:'1px solid rgba(201,168,76,0.12)', padding:'20px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(252,76,2,0.12)', border:'1px solid rgba(252,76,2,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#fff', letterSpacing:'1px', lineHeight:1, marginBottom:'3px' }}>Connect Strava to unlock your stats</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>Race miles, PRs by distance, activity history — all pulled automatically.</div>
        </div>
      </div>
      <button onClick={onConnect} style={{ flexShrink:0, background:'#FC4C02', border:'none', borderRadius:'8px', padding:'11px 24px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:700, letterSpacing:'2px', color:'#fff', textTransform:'uppercase', cursor:'pointer', transition:'opacity 0.15s' }}
        onMouseEnter={e=>e.currentTarget.style.opacity='0.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
        Connect Strava
      </button>
    </div>
  )
}

function ParallaxBackground({ t }) {
  const [ox, setOx] = useState(0)
  useEffect(() => {
    const fn = () => setOx(window.scrollY*0.4)
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'50%', transform:`translateY(-50%) translateX(-${ox%600}px)`, whiteSpace:'nowrap', willChange:'transform' }}>
        {[...TICKER_ITEMS,...TICKER_ITEMS,...TICKER_ITEMS].map((d,i)=><span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,22vw,320px)', color:'transparent', WebkitTextStroke:`1px ${t.isDark?'rgba(201,168,76,0.04)':'rgba(27,42,74,0.04)'}`, lineHeight:1, padding:'0 40px', userSelect:'none', display:'inline-block' }}>{d}</span>)}
      </div>
    </div>
  )
}

// ── Race card for Nearby/Discovery ────────────────────────────────────────────
function RaceCard({ race, t, compact }) {
  const [hov, setHov] = useState(false)
  const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
  const [loaded, setLoaded] = useState(false)
  const [isLogo, setIsLogo] = useState(false)
  const navigate = useNavigate()
  const ref = useRef(null)
  useEffect(() => {
    setLoaded(false); setPhoto(PHOTO_PLACEHOLDER); setIsLogo(false)
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; obs.disconnect()
      const logo = race.logo_url || race.hero_image
      if (logo) { setPhoto(logo); setIsLogo(true); setLoaded(true) }
      else loadRacePhoto(race).then(u => { if(u){setPhoto(u);setLoaded(true)} })
    }, { rootMargin:'100px' })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [race.id])
  const h = compact ? 120 : 200
  return (
    <div ref={ref} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={()=>navigate(`/race-detail/${race.id}`)}
      style={{ borderRadius:'14px', overflow:'hidden', background:t.surface, cursor:'pointer', transition:'transform 0.2s', transform:hov?'translateY(-4px)':'none', flexShrink:0, width:compact?'clamp(200px,60vw,260px)':'clamp(240px,24vw,340px)' }}>
      <div style={{ position:'relative', height:h, overflow:'hidden', background:'#1B2A4A' }}>
        {isLogo ? (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'12px', background:'#1B2A4A' }}>
            <img src={photo} alt={race.name} style={{ maxWidth:'85%', maxHeight:'85%', objectFit:'contain', opacity:loaded?1:0, transition:'opacity 0.3s' }} onLoad={()=>setLoaded(true)} />
          </div>
        ) : (
          <>
            <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s,opacity 0.4s', transform:hov?'scale(1.05)':'scale(1)', opacity:loaded?1:0 }} onLoad={()=>setLoaded(true)} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 20%,rgba(0,0,0,0.55))' }} />
          </>
        )}
        <div style={{ position:'absolute', bottom:8, left:8 }}><CardStamp distance={race.distance} size={compact?34:44} /></div>
      </div>
      <div style={{ padding:compact?'10px 12px':'12px 14px', borderTop:`1px solid ${t.borderLight}` }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:compact?'15px':'18px', color:t.text, letterSpacing:'0.5px', marginBottom:'3px', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:compact?'11px':'12px', color:t.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.city||race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:compact?'11px':'12px', fontWeight:600, color:t.text, flexShrink:0 }}>{race.date}</div>
        </div>
      </div>
    </div>
  )
}

// ── Next Race Hero ────────────────────────────────────────────────────────────
function NextRaceHero({ race, t, isMobile }) {
  const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
  const [loaded, setLoaded] = useState(false)
  const cd = useCountdown(race.date_sort || race.date)
  const navigate = useNavigate()
  useEffect(() => {
    loadRacePhoto(race).then(u => { if(u){setPhoto(u);setLoaded(true)} })
  }, [race.id])
  return (
    <div onClick={()=>navigate(`/race/${race.id}`)} style={{ borderRadius:'16px', overflow:'hidden', position:'relative', cursor:'pointer', marginBottom:'16px', minHeight:isMobile?'200px':'240px' }}>
      <img src={photo} alt={race.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:loaded?1:0, transition:'opacity 0.5s' }} onLoad={()=>setLoaded(true)} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(27,42,74,0.92) 0%,rgba(27,42,74,0.7) 100%)' }} />
      <div style={{ position:'relative', padding:isMobile?'20px':'28px', display:'flex', flexDirection:'column', height:'100%', minHeight:isMobile?'200px':'240px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'auto' }}>
          <div style={{ background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'6px', padding:'3px 10px' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>Next Race</span>
          </div>
          <CardStamp distance={race.distance} size={44} />
        </div>
        <div style={{ marginTop:'auto' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isMobile?'28px':'40px', color:'#fff', letterSpacing:'1px', lineHeight:1, marginBottom:'4px' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'16px' }}>
            {[race.location, race.date].filter(Boolean).join(' · ')}
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {cd.past ? (
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#C9A84C', letterSpacing:'2px' }}>RACE DAY!</div>
            ) : (
              [{ val:String(cd.days).padStart(2,'0'), label:'Days' },{ val:String(cd.hours).padStart(2,'0'), label:'Hrs' },{ val:String(cd.mins).padStart(2,'0'), label:'Min' },{ val:String(cd.secs).padStart(2,'0'), label:'Sec' }].map(u => (
                <div key={u.label} style={{ background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'8px', padding:'8px 12px', textAlign:'center', minWidth:54 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isMobile?'24px':'32px', color:'#C9A84C', lineHeight:1 }}>{u.val}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', marginTop:'2px' }}>{u.label}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pacer Dashboard card ──────────────────────────────────────────────────────
function PacerDashboard({ races, profile, t, isMobile }) {
  const [pacerData, setPacerData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profile) return
    const safeRaces = Array.isArray(races) ? races : []
    const firstName = (profile?.full_name||'').split(' ')[0]
    const cacheKey = `pacer_v4_${firstName||'user'}_${safeRaces.length}`

    // Clear any stale/broken caches from previous versions
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && (k.startsWith('pacer_insight_') || k.startsWith('pacer_dashboard_'))) {
        sessionStorage.removeItem(k); i--
      }
    }

    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed?.insight) { setPacerData(parsed); return }
      } catch(e) { sessionStorage.removeItem(cacheKey) }
    }

    setLoading(true)
    fetch('/api/pacer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'insight',
        races: safeRaces.slice(0, 15),
        profile: {
          first_name: firstName,
          state: profile?.state,
          favorite_distance: profile?.favorite_distance,
        }
      })
    })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then(d => {
      console.log('[Pacer] insight response:', d)
      if (d?.insight) {
        setPacerData(d)
        sessionStorage.setItem(cacheKey, JSON.stringify(d))
      } else {
        // Use fallback so something always shows
        setPacerData({
          insight: `${safeRaces.length > 0 ? safeRaces.length + ' races in your Passport' : 'Your race journey starts here'} — Pacer is ready to coach you every step of the way!`,
          next_step: safeRaces.length > 0 ? 'Keep adding races to unlock deeper insights.' : 'Import your race history to get started.'
        })
      }
      setLoading(false)
    })
    .catch(err => {
      console.error('[Pacer] fetch error:', err)
      setPacerData({
        insight: `${safeRaces.length > 0 ? safeRaces.length + ' races and counting' : 'Every champion starts somewhere'} — your Race Passport is building something special.`,
        next_step: 'Discover your next race on the Discover page.'
      })
      setLoading(false)
    })
  }, [profile?.full_name, races?.length])

  // Career score from race scores
  const scoredRaces = races?.filter(r => r.pacer_score) || []
  const careerScore = scoredRaces.length
    ? Math.round(scoredRaces.reduce((s,r) => s + r.pacer_score, 0) / scoredRaces.length)
    : null
  const careerGrade = careerScore ? gradeFromScore(careerScore) : null

  // Circumference for score ring
  const r = 38, circ = 2 * Math.PI * r
  const dash = careerScore ? (careerScore / 100) * circ : 0

  if (!pacerData && (loading || !profile)) return (
    <div style={{ borderRadius:'16px', background:t.isDark?'rgba(201,168,76,0.07)':'#FFFDF5', borderLeft:'3px solid rgba(201,168,76,0.4)', padding:'24px 28px', display:'flex', alignItems:'center', gap:'20px' }}>
      <div style={{ width:44, height:44, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'22px' }}>⚡</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3px', color:'#C9A84C', marginBottom:'10px' }}>PACER · YOUR AI RACE INTELLIGENCE</div>
        <div style={{ height:14, borderRadius:6, background:t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)', marginBottom:10, width:'70%', animation:'pulse 1.5s ease infinite' }} />
        <div style={{ height:12, borderRadius:6, background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.05)', width:'45%', animation:'pulse 1.5s ease infinite' }} />
      </div>
    </div>
  )
  if (!pacerData) return null

  // Derive runner type from race history even without pacer_score
  const safeRaces2 = Array.isArray(races) ? races : []
  const distCounts = {}
  safeRaces2.forEach(r => { distCounts[r.distance] = (distCounts[r.distance]||0)+1 })
  const topDist = Object.entries(distCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null
  const hasTri = safeRaces2.some(r => ['70.3','140.6','Triathlon'].includes(r.distance))
  const hasMarathon = safeRaces2.some(r => ['26.2','Marathon'].includes(r.distance))
  const hasUltra = safeRaces2.some(r => r.distance?.includes('50') || r.distance?.includes('100') || r.distance?.toLowerCase().includes('ultra'))
  const runnerType = hasTri ? 'Triathlete' : hasUltra ? 'Ultra Runner' : hasMarathon ? 'Marathoner' : topDist?.includes('13') ? 'Half Marathoner' : topDist ? 'Road Runner' : null

  // Derive a simple activity score from race volume + diversity if no stored scores
  const derivedScore = safeRaces2.length > 0 && !careerScore
    ? Math.min(99, 60 + Math.min(20, safeRaces2.length * 4) + Math.min(10, Object.keys(distCounts).length * 2) + (hasTri ? 6 : 0) + (hasMarathon ? 3 : 0))
    : careerScore
  const displayScore = derivedScore
  const displayGrade = displayScore ? gradeFromScore(displayScore) : null
  const displayDash = displayScore ? (displayScore / 100) * circ : 0

  return (
    <div style={{ borderRadius:'16px', background:t.isDark?'rgba(201,168,76,0.07)':'#FFFDF5', borderLeft:'3px solid #C9A84C', padding:'24px 28px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'20px' }}>
        <div style={{ width:44, height:44, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'22px' }}>⚡</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', letterSpacing:'3px', color:'#C9A84C' }}>PACER</span>
            <div style={{ width:4, height:4, borderRadius:'50%', background:'rgba(201,168,76,0.5)' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Your AI Race Intelligence</span>
          </div>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:t.text, margin:'0 0 14px', lineHeight:1.7, fontWeight:400 }}>{pacerData.insight}</p>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:t.isDark?'rgba(201,168,76,0.12)':'rgba(201,168,76,0.14)', borderRadius:'20px', padding:'6px 14px' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1l1.5 3H10L7.5 6l1 3L5 7.5 1.5 9l1-3L0 4h3.5z" fill="#C9A84C"/></svg>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#C9A84C' }}>{pacerData.next_step}</span>
            </div>
            {runnerType && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:t.isDark?'rgba(255,255,255,0.05)':'rgba(27,42,74,0.06)', borderRadius:'20px', padding:'6px 14px' }}>
                <span style={{ fontSize:'12px' }}>🏃</span>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:t.text }}>{runnerType}</span>
              </div>
            )}
          </div>
        </div>
        {/* Career Score Ring — shows for all athletes with any races */}
        {safeRaces2.length > 0 && displayScore && (
          <div style={{ flexShrink:0, textAlign:'center' }}>
            <div style={{ position:'relative', width:96, height:96 }}>
              <svg viewBox="0 0 96 96" width="96" height="96">
                <circle cx="48" cy="48" r="40" fill="none" stroke={t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.1)'} strokeWidth="8"/>
                <circle cx="48" cy="48" r="40" fill="none" stroke="#C9A84C" strokeWidth="8"
                  strokeDasharray={`${(displayScore/100)*251.3} 251.3`}
                  strokeLinecap="round" transform="rotate(-90 48 48)"/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, lineHeight:1 }}>{displayScore}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#C9A84C', lineHeight:1 }}>{displayGrade}</div>
              </div>
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'6px' }}>Career Score</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Race Timeline ─────────────────────────────────────────────────────────────
function RaceTimeline({ races, t, isMobile }) {
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  if (!races?.length) return null
  const sorted = [...races].sort((a,b) => (a.date_sort||a.date||'').localeCompare(b.date_sort||b.date||''))
  const DOT_SPACING = 220
  const totalW = Math.max(sorted.length * DOT_SPACING + 200, 600)
  return (
    <div style={{ borderRadius:'16px', background:'#1B2A4A', padding:isMobile?'20px 16px':'28px 32px', position:'relative', overflow:'hidden' }}>
      {/* Ghost text */}
      <div style={{ position:'absolute', top:'50%', right:-20, transform:'translateY(-50%)', fontFamily:"'Bebas Neue',sans-serif", fontSize:'120px', color:'rgba(201,168,76,0.04)', letterSpacing:'4px', userSelect:'none', lineHeight:1, pointerEvents:'none' }}>TIMELINE</div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', position:'relative', zIndex:1 }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:'4px' }}>Your Journey</div>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'40px', color:'#fff', letterSpacing:'1px', lineHeight:1 }}>Race Timeline</span>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>
            {sorted[0]?.month||sorted[0]?.date?.split(' ')[0]||''} {sorted[0]?.year||sorted[0]?.date?.split(' ')[1]||''} → {sorted[sorted.length-1]?.month||sorted[sorted.length-1]?.date?.split(' ')[0]||''} {sorted[sorted.length-1]?.year||sorted[sorted.length-1]?.date?.split(' ')[1]||''}
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#C9A84C', letterSpacing:'1px' }}>{sorted.length} {sorted.length===1?'Race':'Races'}</div>
        </div>
      </div>
      {/* Scrollable timeline */}
      <div ref={scrollRef} style={{ overflowX:'auto', paddingBottom:'4px', cursor:'grab', position:'relative', zIndex:1 }}
        onMouseDown={e=>{const el=scrollRef.current;if(!el)return;let x=e.clientX,sl=el.scrollLeft;const move=ev=>{el.scrollLeft=sl-(ev.clientX-x)};const up=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up)};document.addEventListener('mousemove',move);document.addEventListener('mouseup',up)}}>
        <div style={{ position:'relative', width:totalW, height:180, minWidth:'100%' }}>
          {/* Month markers */}
          {sorted.map((race,i) => {
            const x = 100 + i * DOT_SPACING
            const label = race.date ? race.date.split(' ').slice(0,2).join(' ') : `${race.month||''} ${race.year||''}`
            return (
              <div key={`month-${i}`} style={{ position:'absolute', bottom:8, left:x, transform:'translateX(-50%)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'rgba(255,255,255,0.35)', whiteSpace:'nowrap', letterSpacing:'0.5px' }}>
                {label}
              </div>
            )
          })}
          {/* Timeline line */}
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:6, background:'rgba(201,168,76,0.15)', borderRadius:'3px', transform:'translateY(-50%)' }}>
            <div style={{ height:'100%', background:'linear-gradient(to right,rgba(201,168,76,0.4),#C9A84C)', borderRadius:'3px', width: sorted.length > 1 ? `${((sorted.length-1)*DOT_SPACING+100)/totalW*100}%` : '30%', marginLeft:'100px' }} />
          </div>
          {/* Race dots */}
          {sorted.map((race,i) => {
            const c = getDistanceColor(race.distance)
            const x = 100 + i * DOT_SPACING
            const hasPhoto = race.photos?.length > 0
            const label = race.name || ''
            return (
              <div key={race.id||i} style={{ position:'absolute', top:'50%', left:x, transform:'translate(-50%,-50%)', zIndex:3 }}>
                {/* Label above */}
                <div style={{ position:'absolute', bottom:'calc(100% + 16px)', left:'50%', transform:'translateX(-50%)', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'6px 12px', whiteSpace:'nowrap', backdropFilter:'blur(4px)' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#fff', letterSpacing:'0.5px', lineHeight:1.1, marginBottom:'2px' }}>{label.length > 20 ? label.slice(0,20)+'…' : label}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(201,168,76,0.7)', fontWeight:600 }}>{c.stampBorder === '#C9A84C' ? 'Marathon' : c.stampBorder === '#B83232' ? 'Triathlon' : 'Running'} · {race.time||''}</div>
                </div>
                {/* Connector line from label to dot */}
                <div style={{ position:'absolute', bottom:'calc(100% + 4px)', left:'50%', transform:'translateX(-50%)', width:2, height:12, background:'rgba(201,168,76,0.3)' }} />
                {/* The dot */}
                <div onClick={()=>navigate(`/race/${race.id}`)}
                  style={{ width:hasPhoto?52:40, height:hasPhoto?52:40, borderRadius:'50%', background:c.stampBorder, border:`3px solid rgba(255,255,255,0.25)`, boxShadow:`0 0 0 2px ${c.stampBorder}, 0 0 20px ${c.stampBorder}60`, cursor:'pointer', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', transition:'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.3)';e.currentTarget.style.boxShadow=`0 0 0 3px ${c.stampBorder}, 0 0 30px ${c.stampBorder}80`}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow=`0 0 0 2px ${c.stampBorder}, 0 0 20px ${c.stampBorder}60`}}>
                  {hasPhoto
                    ? <img src={race.photos[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:8, color:'#fff', textAlign:'center', lineHeight:1 }}>{(race.distance||'').replace(' mi','').slice(0,4)}</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* Legend */}
      <div style={{ display:'flex', gap:'16px', marginTop:'16px', position:'relative', zIndex:1 }}>
        {[['#1E5FA8','Running'],['#C9A84C','Marathon / Ultra'],['#B83232','Triathlon']].map(([color,label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.4)', letterSpacing:'0.5px' }}>{label}</span>
          </div>
        ))}
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.25)', marginLeft:'auto' }}>← drag to scroll →</span>
      </div>
    </div>
  )
}

// ── Milestones ────────────────────────────────────────────────────────────────
function Milestones({ races, t }) {
  const milestones = useMemo(() => {
    if (!races?.length) return []
    const ms = []
    const sorted = [...races].sort((a,b) => (a.date_sort||'').localeCompare(b.date_sort||''))
    if (sorted[0]) ms.push({ icon:'🎯', title:'First Race!', sub:`${sorted[0].name} · ${sorted[0].date}`, color:'#C9A84C' })
    const distFirst = {}
    sorted.forEach(r => { if (!distFirst[r.distance]) { distFirst[r.distance] = r; if (r !== sorted[0]) ms.push({ icon:'🏅', title:`First ${r.distance}!`, sub:`${r.name} · ${r.date}`, color:'#1E5FA8' }) } })
    const prs = sorted.filter(r => r.is_pr)
    prs.forEach(r => ms.push({ icon:'⚡', title:`New ${r.distance} PR!`, sub:`${r.time} · ${r.date}`, color:'#C9A84C' }))
    const counts = [5,10,25,50,100]
    counts.forEach(n => { if (sorted.length >= n) ms.push({ icon:'🔥', title:`${n} Race Club!`, sub:`Reached ${n} total races`, color:'#B83232' }) })
    return ms.reverse().slice(0,8)
  }, [races])

  if (!milestones.length) return null
  return (
    <div style={{ borderRadius:'16px', background:t.isDark?'rgba(201,168,76,0.08)':'#FFF8E7', padding:'20px' }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'3px' }}>Your Journey</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.isDark?'#fff':t.text, letterSpacing:'1px', marginBottom:'12px' }}>Milestones</div>
      <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'280px', overflowY:'auto', scrollbarWidth:'none' }}>
        {milestones.map((m,i) => (
          <div key={i} style={{ background:t.isDark?'rgba(27,42,74,0.5)':'rgba(255,255,255,0.85)', border:`1px solid ${t.isDark?'rgba(255,255,255,0.06)':'rgba(201,168,76,0.2)'}`, borderRadius:'10px', padding:'10px 12px', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:34, height:34, borderRadius:'8px', background:`${m.color}20`, border:`1px solid ${m.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'16px' }}>{m.icon}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.isDark?'#fff':t.text, letterSpacing:'0.5px', lineHeight:1.1 }}>{m.title}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.isDark?'rgba(255,255,255,0.45)':t.textMuted, marginTop:'1px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── World Majors ──────────────────────────────────────────────────────────────
const SUPABASE_ASSETS = 'https://xwngrbzvqhioklfvaizm.supabase.co/storage/v1/object/public/assets/majors'
const MAJOR_LOGOS = {
  tokyo:   `${SUPABASE_ASSETS}/tokyo.png`,
  boston:  `${SUPABASE_ASSETS}/boston.png`,
  london:  `${SUPABASE_ASSETS}/london.png`,
  berlin:  `${SUPABASE_ASSETS}/berlin.png`,
  chicago: `${SUPABASE_ASSETS}/chicago.png`,
  nyc:     `${SUPABASE_ASSETS}/nyc.png`,
}

// All dates in local time — update annually
const WORLD_MAJORS = [
  {
    key:'boston', name:'Boston Marathon', url:'https://www.baa.org/',
    keywords:['boston'],
    raceDate: new Date('2027-04-19'),
    entry: {
      type: 'qualifying',  // no lottery
      label: 'No Lottery — Qualifying Time Required',
      detail: 'The 2027 qualifying window opened Sep 13, 2025',
      qualifyUrl: 'https://www.baa.org/races/boston-marathon/qualify',
      statusColor: '#4ade80', // green — window open
      statusLabel: 'Qualifying Window Open',
    },
  },
  {
    key:'nyc', name:'New York City Marathon', url:'https://www.nyrr.org/tcsnycmarathon',
    keywords:['new york','nyc','tcs new york'],
    raceDate: new Date('2026-11-01'),
    entry: {
      type: 'lottery',
      label: 'Lottery Closed',
      detail: 'Feb 4–25, 2026 · Results announced Mar 4, 2026',
      statusColor: '#9aa5b4', // grey — closed, results already out
      statusLabel: 'Results Announced',
    },
  },
  {
    key:'tokyo', name:'Tokyo Marathon', url:'https://www.marathon.tokyo/en/',
    keywords:['tokyo'],
    raceDate: new Date('2027-03-07'),
    entry: {
      type: 'lottery',
      label: 'Lottery Opening Soon',
      detail: 'General entry expected Aug 14–28, 2026*',
      disclaimer: '* Date unconfirmed — based on prior year patterns',
      lotteryOpenDate: new Date('2026-08-14'),
      statusColor: '#f59e0b', // amber — opening soon
      statusLabel: 'Opening Soon (Expected)',
    },
  },
  {
    key:'london', name:'London Marathon', url:'https://www.londonmarathonevents.co.uk/london-marathon',
    keywords:['london'],
    raceDate: new Date('2027-04-25'),
    entry: {
      type: 'lottery',
      label: 'Lottery Closed',
      detail: 'Apr 24–May 1, 2026 · Results expected early July 2026',
      statusColor: '#9aa5b4', // grey — closed, results pending
      statusLabel: 'Results Pending',
    },
  },
  {
    key:'berlin', name:'Berlin Marathon', url:'https://www.bmw-berlin-marathon.com/en/',
    keywords:['berlin'],
    raceDate: new Date('2026-09-27'),
    entry: {
      type: 'lottery',
      label: 'Lottery Closed',
      detail: 'Sep 25–Nov 6, 2025 · Results announced Nov 27, 2025',
      statusColor: '#9aa5b4',
      statusLabel: 'Results Announced',
    },
  },
  {
    key:'chicago', name:'Chicago Marathon', url:'https://www.chicagomarathon.com/',
    keywords:['chicago'],
    raceDate: new Date('2026-10-11'),
    entry: {
      type: 'lottery',
      label: 'Lottery Closed',
      detail: 'Oct 21–Nov 18, 2025 · Results announced Dec 11, 2025',
      statusColor: '#9aa5b4',
      statusLabel: 'Results Announced',
    },
  },
]

function useMajorCountdown(targetDate) {
  const [cd, setCd] = useState({ days:0, hours:0, mins:0, secs:0, past:false })
  useEffect(() => {
    const calc = () => {
      const diff = targetDate - new Date()
      if (diff <= 0) { setCd({ days:0, hours:0, mins:0, secs:0, past:true }); return }
      setCd({ days:Math.floor(diff/86400000), hours:Math.floor((diff%86400000)/3600000), mins:Math.floor((diff%3600000)/60000), secs:Math.floor((diff%60000)/1000), past:false })
    }
    calc(); const ti = setInterval(calc, 1000); return () => clearInterval(ti)
  }, [targetDate])
  return cd
}

function CountdownUnit({ value, label }) {
  return (
    <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:'8px', padding:'8px 4px', textAlign:'center', minWidth:0 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#C9A84C', lineHeight:1, letterSpacing:'1px' }}>
        {String(value).padStart(2,'0')}
      </div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginTop:'2px' }}>
        {label}
      </div>
    </div>
  )
}

function MajorCard({ m, done, t }) {
  const [hov, setHov] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const raceCountdown = useMajorCountdown(m.raceDate)
  const lotteryCountdown = m.entry.lotteryOpenDate ? useMajorCountdown(m.entry.lotteryOpenDate) : null
  const logo = MAJOR_LOGOS[m.key]
  const accentColor = done ? '#C9A84C' : 'rgba(255,255,255,0.1)'
  const cardBg = done ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.03)'

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={()=>window.open(m.url,'_blank')}
      style={{ borderRadius:'14px', background:cardBg, border:`1.5px solid ${hov?(done?'#C9A84C':'rgba(255,255,255,0.2)'):accentColor}`, padding:'18px 16px', cursor:'pointer', transition:'all 0.2s', position:'relative', transform:hov?'translateY(-3px)':'none' }}>

      {/* Earned checkmark */}
      {done && (
        <div style={{ position:'absolute', top:10, right:10, width:20, height:20, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#1B2A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}

      {/* Logo */}
      <div style={{ height:64, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'12px' }}>
        {!imgErr ? (
          <img src={logo} alt={m.name}
            style={{ maxHeight:60, maxWidth:'90%', objectFit:'contain', opacity:done?1:0.6, filter:done?'none':'grayscale(0.3)' }}
            onError={()=>setImgErr(true)} />
        ) : (
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:done?'#C9A84C':'rgba(255,255,255,0.4)', textAlign:'center', letterSpacing:'1px' }}>
            {m.name.replace('New York City','NYC')}
          </div>
        )}
      </div>

      {/* Race name + date */}
      <div style={{ textAlign:'center', marginBottom:'14px' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:done?'#C9A84C':'rgba(255,255,255,0.7)', letterSpacing:'0.5px', lineHeight:1.1 }}>
          {m.name.replace('New York City','NYC')}
        </div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
          {m.raceDate.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
        </div>
      </div>

      {/* Race countdown blocks */}
      {!raceCountdown.past ? (
        <div style={{ marginBottom:'12px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', textAlign:'center', marginBottom:'6px' }}>
            Countdown to Race Day
          </div>
          <div style={{ display:'flex', gap:'4px' }}>
            <CountdownUnit value={raceCountdown.days}  label="Days" />
            <CountdownUnit value={raceCountdown.hours} label="Hrs" />
            <CountdownUnit value={raceCountdown.mins}  label="Min" />
            <CountdownUnit value={raceCountdown.secs}  label="Sec" />
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', marginBottom:'12px', padding:'8px', background:'rgba(201,168,76,0.08)', borderRadius:'8px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#C9A84C', letterSpacing:'1px' }}>Race Complete 🏅</div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', marginBottom:'10px' }} />

      {/* Lottery / Entry status */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'4px' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:m.entry.statusColor, flexShrink:0 }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, color:m.entry.statusColor, letterSpacing:'0.5px' }}>
            {m.entry.statusLabel}
          </span>
        </div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.35)', lineHeight:1.5 }}>
          {m.entry.detail}
        </div>

        {/* Tokyo lottery countdown */}
        {lotteryCountdown && !lotteryCountdown.past && (
          <div style={{ marginTop:'8px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'7px', padding:'6px 8px' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(245,158,11,0.7)', textTransform:'uppercase', marginBottom:'4px' }}>Expected Lottery Opens In</div>
            <div style={{ display:'flex', gap:'6px', alignItems:'baseline' }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#f59e0b', letterSpacing:'1px' }}>{lotteryCountdown.days}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(245,158,11,0.6)' }}>days</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#f59e0b', letterSpacing:'1px' }}>{lotteryCountdown.hours}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(245,158,11,0.6)' }}>hrs</span>
            </div>
          </div>
        )}

        {/* Boston qualifying link */}
        {m.entry.qualifyUrl && (
          <div style={{ marginTop:'8px' }}>
            <span onClick={e=>{e.stopPropagation();window.open(m.entry.qualifyUrl,'_blank')}}
              style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#C9A84C', cursor:'pointer', textDecoration:'underline' }}>
              View Qualifying Standards →
            </span>
          </div>
        )}

        {/* Tokyo disclaimer */}
        {m.entry.disclaimer && (
          <div style={{ marginTop:'4px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', color:'rgba(255,255,255,0.2)', lineHeight:1.4, fontStyle:'italic' }}>
            {m.entry.disclaimer}
          </div>
        )}
      </div>
    </div>
  )
}

function WorldMajors({ races, t }) {
  const earned = new Set()
  races?.forEach(r => {
    const name = (r.name||'').toLowerCase()
    WORLD_MAJORS.forEach(m => { if (m.keywords.some(k => name.includes(k))) earned.add(m.key) })
  })
  const completedCount = earned.size

  return (
    <div style={{ borderRadius:'16px', background:'#1B2A4A', padding:'22px 24px', position:'relative', overflow:'hidden' }}>
      {/* Ghost text */}
      <div style={{ position:'absolute', bottom:-10, right:-10, fontFamily:"'Bebas Neue',sans-serif", fontSize:'80px', color:'rgba(201,168,76,0.04)', letterSpacing:'4px', userSelect:'none', lineHeight:1, pointerEvents:'none' }}>MAJORS</div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'18px', position:'relative', zIndex:1 }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:'3px' }}>Abbott World Majors</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:'#fff', letterSpacing:'1px', lineHeight:1 }}>World Majors</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'44px', color:'#C9A84C', letterSpacing:'1px', lineHeight:1 }}>
            {completedCount}<span style={{ fontSize:'24px', color:'rgba(255,255,255,0.25)' }}>/6</span>
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.3)', letterSpacing:'1.5px', textTransform:'uppercase' }}>Completed</div>
        </div>
      </div>
      {/* 3×2 grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', position:'relative', zIndex:1 }}>
        {WORLD_MAJORS.map(m => (
          <MajorCard key={m.key} m={m} done={earned.has(m.key)} t={t} />
        ))}
      </div>
    </div>
  )
}

// ── Goal card ─────────────────────────────────────────────────────────────────
function GoalCard({ profile, t, navigate }) {
  if (!profile?.goal_distance) return (
    <div style={{ borderRadius:'16px', background:t.isDark?'rgba(255,255,255,0.04)':'#F4F5F8', padding:'20px', textAlign:'center' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px', marginBottom:'6px' }}>No Goal Set</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, marginBottom:'12px' }}>Set a goal race or distance and Pacer will find races to match.</div>
      <button onClick={()=>navigate('/goal-races')} style={{ padding:'8px 20px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}
        onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>
        Set a Goal →
      </button>
    </div>
  )
  const c = getDistanceColor(profile.goal_distance)
  const label = profile.goal_distance
  return (
    <div style={{ borderRadius:'16px', background:t.isDark?'rgba(255,255,255,0.04)':'#F4F5F8', padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'2px' }}>Training</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>Your Goal</div>
        </div>
        <button onClick={()=>navigate('/goal-races')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'1px' }}>Change →</button>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px', background:`${c.stampBorder}08`, border:`1px solid ${c.stampBorder}25`, borderRadius:'10px' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', border:`2px solid ${c.stampBorder}`, background:`${c.stampBorder}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
          <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:`1px dashed ${c.stampBorder}55` }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:label.length>4?10:label.length>2?13:17, color:c.stampBorder, position:'relative', zIndex:1 }}>{label}</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'3px' }}>Active Goal</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:t.text, letterSpacing:'0.5px', lineHeight:1.1, marginBottom:'2px' }}>
            {profile.goal_race_name || profile.goal_distance}
          </div>
          {(profile.goal_target_month || profile.goal_target_year) && (
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
              {[profile.goal_target_month, profile.goal_target_year].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── My Lists ──────────────────────────────────────────────────────────────────
function MyLists({ userId, t, navigate }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!userId) return
    supabase.from('race_lists').select('id,name,created_at').eq('user_id', userId).order('created_at', { ascending:false })
      .then(({ data }) => { setLists(data||[]); setLoading(false) })
  }, [userId])

  const createList = async () => {
    if (!newName.trim()) return
    const { data } = await supabase.from('race_lists').insert({ user_id:userId, name:newName.trim() }).select().single()
    if (data) { setLists(p => [data,...p]); setNewName(''); setCreating(false) }
  }

  return (
    <div style={{ borderRadius:'16px', background:t.isDark?'rgba(255,255,255,0.04)':'#F4F5F8', padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px' }}>My Lists</span>
        <button onClick={()=>setCreating(p=>!p)} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'1px' }}>
          + New List
        </button>
      </div>

      {creating && (
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="List name..." onKeyDown={e=>e.key==='Enter'&&createList()}
            autoFocus
            style={{ flex:1, padding:'9px 12px', borderRadius:'8px', border:`1.5px solid ${t.border}`, background:t.isDark?'rgba(255,255,255,0.04)':'#fafbfc', color:t.text, fontFamily:"'Barlow',sans-serif", fontSize:'14px', outline:'none' }}
            onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=t.border} />
          <button onClick={createList} style={{ padding:'9px 16px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#fff', cursor:'pointer', textTransform:'uppercase', letterSpacing:'1px' }}>
            Create
          </button>
          <button onClick={()=>{setCreating(false);setNewName('')}} style={{ padding:'9px 12px', border:`1px solid ${t.border}`, borderRadius:'8px', background:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, cursor:'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ height:40, borderRadius:'8px', background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.04)', animation:'pulse 1.5s ease infinite' }} />
      ) : lists.length === 0 ? (
        <div style={{ padding:'20px', textAlign:'center', border:`1.5px dashed ${t.border}`, borderRadius:'10px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'8px' }}>No lists yet. Create one to save races from Discover.</div>
          <button onClick={()=>navigate('/discover')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'1px' }}>Browse Races →</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {lists.map(list => (
            <div key={list.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', border:`1px solid ${t.border}`, borderRadius:'10px', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.background=t.isDark?'rgba(201,168,76,0.05)':'rgba(201,168,76,0.04)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.background='transparent'}}>
              <div style={{ width:32, height:32, borderRadius:'8px', background:'rgba(27,42,74,0.08)', border:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2h10v10H2V2z" stroke={t.textMuted} strokeWidth="1.2" strokeLinejoin="round"/><path d="M4 5h6M4 7h6M4 9h4" stroke={t.textMuted} strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text }}>{list.name}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
                  {new Date(list.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Location prompt for Races Near You ────────────────────────────────────────
function LocationPrompt({ t, onAllow }) {
  return (
    <div style={{ padding:'20px 24px', background:t.isDark?'rgba(27,42,74,0.3)':'rgba(27,42,74,0.04)', borderRadius:'12px', border:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:'16px' }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A5 5 0 0 1 13 6.5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 5-5z" stroke="#C9A84C" strokeWidth="1.3"/><circle cx="8" cy="6.5" r="1.5" stroke="#C9A84C" strokeWidth="1.3"/></svg>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text, marginBottom:'2px' }}>Find races near you</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted }}>Share your location to see nearby races sorted by distance.</div>
      </div>
      <button onClick={onAllow} style={{ flexShrink:0, padding:'8px 18px', border:'none', borderRadius:'8px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:700, letterSpacing:'1.5px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase', transition:'opacity 0.15s' }}
        onMouseEnter={e=>e.currentTarget.style.opacity='0.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
        Allow
      </button>
    </div>
  )
}

// ── Logo race card for discover ────────────────────────────────────────────────
function LogoRaceCard({ race, t }) {
  const [hov, setHov] = useState(false)
  const navigate = useNavigate()
  const c = getDistanceColor(race.distance||'26.2')
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={()=>navigate(`/race-detail/${race.id}`)}
      style={{ flexShrink:0, width:'clamp(220px,20vw,280px)', borderRadius:'16px', overflow:'hidden', background:t.surface, border:`1.5px solid ${hov?c.stampBorder:t.border}`, cursor:'pointer', transition:'all 0.2s', transform:hov?'translateY(-4px)':'none' }}>
      <div style={{ height:160, background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        {race.logo_url ? (
          <img src={race.logo_url} alt={race.name} style={{ maxWidth:'78%', maxHeight:'78%', objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
        ) : (
          <div style={{ opacity:0.3 }}><CardStamp distance={race.distance||'26.2'} size={64} /></div>
        )}
        <div style={{ position:'absolute', bottom:8, left:8 }}><CardStamp distance={race.distance||'26.2'} size={34} /></div>
      </div>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:t.text, letterSpacing:'0.5px', marginBottom:'3px', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{[race.city,race.state].filter(Boolean).join(', ')}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:t.text, flexShrink:0, marginLeft:'6px' }}>{race.date}</div>
        </div>
      </div>
    </div>
  )
}

// ── Discover card (no upcoming race state) ────────────────────────────────────
// Quality filter: known distance, real logo, upcoming within 6 months, no junk
const KNOWN_DISTANCES = new Set(['5K','5k','10K','10k','10 mi','10 Mile','Half Marathon','13.1','Marathon','26.2','50K','Ultra','70.3','140.6','Triathlon'])
const BAD_KEYWORDS = /expo|volunteer|tot trot|training|swim only|bike only|run club|webinar|virtual|online|clinic|seminar|fun walk|packet pickup/i
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000

function isQualityRace(race) {
  if (!race.name) return false
  if (BAD_KEYWORDS.test(race.name)) return false
  if (!race.logo_url) return false  // must have real logo
  if (!race.city && !race.state) return false
  if (!race.rawDate) return false
  const d = new Date(race.rawDate)
  const now = new Date()
  if (d < now) return false  // past
  if (d - now > SIX_MONTHS_MS) return false  // more than 6 months out
  // Must have a single clear distance
  const dist = (race.distance || '').trim()
  if (!dist) return false
  if (dist.toLowerCase().includes('/') || dist.toLowerCase().includes('multiple') || dist.toLowerCase().includes('various')) return false
  return true
}

function DiscoverSection({ nearbyRaces, nearbyLoading, profile, t, isMobile, navigate }) {
  return (
    <div style={{ borderRadius:'16px', background:t.surface, padding:'24px', overflow:'hidden', width:'100%', minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'3px' }}>Race Discovery</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>
            Upcoming Races{profile?.state ? ` Near You in ${profile.state}` : ' Near You'}
          </div>
        </div>
        <button onClick={()=>navigate('/discover')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'1px', flexShrink:0 }}>See All →</button>
      </div>

      {nearbyLoading ? (
        <div style={{ display:'flex', gap:'14px', overflow:'hidden' }}>
          {[1,2,3].map(i=><div key={i} style={{ flexShrink:0, width:240, height:200, borderRadius:'14px', background:t.surfaceAlt, animation:'pulse 1.5s ease infinite' }}/>)}
        </div>
      ) : nearbyRaces.length === 0 ? (
        <div style={{ padding:'32px', textAlign:'center', border:`1.5px dashed ${t.border}`, borderRadius:'12px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.textMuted, letterSpacing:'1px', marginBottom:'8px' }}>No Races Found</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'16px' }}>Add your state in Profile to see races near you.</div>
          <button onClick={()=>navigate('/discover')} style={{ padding:'8px 20px', border:'none', borderRadius:'8px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:700, letterSpacing:'1px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase' }}>Browse Discover →</button>
        </div>
      ) : (
        <ScrollRow gap={14}>
          {nearbyRaces.slice(0,10).map(race => <LogoRaceCard key={race.id} race={race} t={t} />)}
          <div onClick={()=>navigate('/discover')} style={{ flexShrink:0, width:60, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#C9A84C', textTransform:'uppercase', letterSpacing:'1px', writingMode:'vertical-lr' }}>More →</span>
          </div>
        </ScrollRow>
      )}
    </div>
  )
}

// ── Main Home ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const isMobile = useIsMobile()

  const [profile, setProfile]               = useState(null)
  const [passportRaces, setPassportRaces]   = useState([])
  const [showDropdown, setShowDropdown]     = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [greeting, setGreeting]             = useState('GOOD MORNING')
  const [showImportBanner, setShowImportBanner] = useState(!!location.state?.imported)
  const [importedCount]                     = useState(location.state?.imported || 0)
  const [nearbyRaces, setNearbyRaces]       = useState([])
  const [nearbyLoading, setNearbyLoading]   = useState(true)
  const [upcomingRace, setUpcomingRace]     = useState(null)
  const dropdownRef = useRef(null)

  const stravaJustConnected = location.state?.stravaConnected

  useEffect(() => {
    const h = new Date().getHours()
    if (h>=12&&h<17) setGreeting('GOOD AFTERNOON')
    else if (h>=17)  setGreeting('GOOD EVENING')

    const loadNearby = async (userState) => {
      if (!userState) { setNearbyLoading(false); return }
      setNearbyLoading(true)
      try {
        // Fetch more than we need since we'll quality-filter aggressively
        const params = new URLSearchParams({ state: userState.toUpperCase(), results_per_page: 50, sort: 'date ASC' })
        const resp = await fetch(`/api/runsignup?${params}`)
        const data = await resp.json()
        const now = new Date()
        const sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
        const BAD = /expo|volunteer|tot trot|training|swim only|bike only|run club|webinar|virtual|online|clinic|seminar|fun walk|packet pickup/i

        const races = (data.races || [])
          .map(r => {
            const race = r.race || r
            const ev = (race.events || [])[0] || {}
            const rawDate = race.next_date_utc || ev.start_time || race.next_date || ''
            const dist = (ev.distance || race.distance || '').trim()
            const logo = race.logo_url || race.event_logo_url || ev.logo_url || null
            return {
              id:       String(race.race_id || race.id),
              name:     race.name || '',
              rawDate,
              date:     rawDate ? new Date(rawDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '',
              city:     race.address?.city || '',
              state:    race.address?.state || userState,
              distance: dist,
              logo_url: logo,
            }
          })
          .filter(r => {
            if (!r.name || BAD.test(r.name)) return false
            if (!r.logo_url) return false  // real logo required
            if (!r.rawDate) return false
            const d = new Date(r.rawDate)
            if (d < now || d > sixMonths) return false
            if (!r.city && !r.state) return false
            // Distance must be a single known value
            const dist = r.distance.toLowerCase()
            if (!dist || dist.includes('/') || dist.includes('multiple') || dist.includes('various')) return false
            return true
          })
          .slice(0, 10)  // max 10 quality races

        setNearbyRaces(races)
      } catch(e) {
        console.error('[Nearby] RunSignup fetch failed:', e)
      }
      setNearbyLoading(false)
    }

    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) {
        const demoProfile = { full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}`, state:'MD', favorite_distance:'13.1' }
        setProfile(demoProfile)
        setPassportRaces(RYAN_STAMPS)
        // Demo upcoming race
        setUpcomingRace({ ...RYAN_STAMPS[0], id:9, date:'Sep 21, 2026', date_sort:'2026-09-21', location:'Bethesda, MD' })
        loadNearby('MD')
        return
      }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      loadNearby(prof?.state)
      const { data: praces } = await supabase.from('passport_races').select('*').eq('user_id', user.id).order('date_sort',{ascending:false})
      if (praces) {
        setPassportRaces(praces)
        // Find upcoming race (future date_sort)
        const today = new Date().toISOString().split('T')[0]
        const next = praces.find(r => r.date_sort && r.date_sort >= today)
        setUpcomingRace(next || null)
      }
    }
    loadProfile()

    const style = document.createElement('style')
    style.id = 'rp-home-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      *{box-sizing:border-box;}
      @keyframes spin{to{transform:rotate(360deg);}}
      @keyframes pulse{0%,100%{opacity:0.5;}50%{opacity:1;}}
      @keyframes statsTicker{0%{transform:translateX(0);}100%{transform:translateX(-33.333%);}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      .rp-nav-tab{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 24px;height:64px;justify-content:center;cursor:pointer;border:none;background:none;transition:color 0.15s;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid transparent;white-space:nowrap;}
      .rp-dropdown-item{display:block;width:100%;padding:10px 18px;background:none;border:none;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;transition:background 0.1s;}
      div::-webkit-scrollbar{display:none;}
    `
    if (!document.getElementById('rp-home-styles')) document.head.appendChild(style)
    const handleClick = e => { if (dropdownRef.current&&!dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-home-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user])

  useEffect(() => {
    if (!stravaJustConnected||!user||isDemo(user?.email)) return
    let n=0; const poll=async()=>{ n++; const{data}=await supabase.from('profiles').select('*').eq('id',user.id).single(); if(data?.strava_connected&&data?.strava_access_token) setProfile(data); else if(n<8) setTimeout(poll,800) }; poll()
  }, [stravaJustConnected, user])

  const { connected: stravaConnected, stats: stravaStats, monthMiles, todayMiles } = useStrava(profile, user?.id)

  const raceStatItems = useMemo(() => {
    if (!passportRaces.length) return RACE_STAT_ITEMS
    const PR_DISTANCES = {
      '5K':{ label:'5K PR', dists:['5K','5k'] }, '10K':{ label:'10K PR', dists:['10K','10k'] },
      '13.1':{ label:'Half PR', dists:['13.1','Half Marathon','half marathon'] },
      '26.2':{ label:'Marathon PR', dists:['26.2','Marathon','marathon'] },
      '70.3':{ label:'70.3 PR', dists:['70.3'] }, '140.6':{ label:'140.6 PR', dists:['140.6'] },
    }
    const prs = []
    Object.values(PR_DISTANCES).forEach(({ label, dists }) => {
      const matches = passportRaces.filter(r => dists.some(d=>(r.distance||'').toLowerCase()===d.toLowerCase())&&r.time)
      if (matches.length) {
        const toSecs = s => { if(!s) return Infinity; const p=s.split(':').map(Number); return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+(p[1]||0) }
        const best = matches.reduce((a,b)=>toSecs(a.time)<=toSecs(b.time)?a:b)
        prs.push({ label, value:best.time })
      }
    })
    return [{ label:'Total Races', value:`${passportRaces.length}` }, ...prs]
  }, [passportRaces])

  const statItems = stravaConnected && stravaStats ? stravaStatsToItems(stravaStats, monthMiles, todayMiles, raceStatItems) : raceStatItems

  const stamps = useMemo(() => {
    if (!passportRaces.length) return RYAN_STAMPS
    return passportRaces.slice(0,20).map(r => {
      const dp = (r.date||'').split(' ')
      return { id:r.id, distance:r.distance, name:r.name, location:r.location||`${r.city||''}${r.city&&r.state?', ':''}${r.state||''}`, month:dp[0]||'', year:dp[1]||dp[0]||'' }
    })
  }, [passportRaces])

  const firstName = profile?.full_name?.split(' ')[0] || ''
  const initials  = (profile?.full_name||'RP').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }
  const userId = user?.id

  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'The Wall', path:'/wall',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2c0 4-5 6-5 10a5 5 0 0 0 10 0c0-4-5-6-5-10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 14a1.5 1.5 0 0 1-1.5-1.5c0-1 1.5-2 1.5-2s1.5 1 1.5 2A1.5 1.5 0 0 1 10 14z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:'/profile',  icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", position:'relative', transition:'background 0.25s', overflowX:'hidden', maxWidth:'100vw', boxSizing:'border-box' }}>
      <ParallaxBackground t={t} />

      {/* MOBILE NAV */}
      {isMobile ? (
        <>
          <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <img src={isDark?'/icon-dark-1024.png':'/icon-light-1024.png'} alt="Race Passport" style={{ width:36, height:36, borderRadius:'10px', objectFit:'cover', flexShrink:0 }} />
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</div>
              </div>
              <button onClick={()=>{setShowMobileMenu(!showMobileMenu);setShowDropdown(false)}}
                style={{ width:40, height:40, borderRadius:'8px', background:'transparent', border:`1.5px solid ${t.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px', cursor:'pointer', padding:'8px', flexShrink:0 }}>
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', transition:'all 0.2s', transform:showMobileMenu?'rotate(45deg) translateY(7px)':'none' }} />
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', opacity:showMobileMenu?0:1, transition:'opacity 0.15s' }} />
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', transition:'all 0.2s', transform:showMobileMenu?'rotate(-45deg) translateY(-7px)':'none' }} />
              </button>
            </div>
            {!showMobileMenu && (
              <div style={{ padding:'10px 16px 12px', borderTop:`1px solid ${t.navBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1.5px', lineHeight:1 }}>{greeting}{firstName?`, ${firstName.toUpperCase()}`:''}.</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1.5px', lineHeight:1, marginTop:'2px' }}>THE START LINE IS CALLING.</div>
                </div>
                <div onClick={()=>setShowDropdown(!showDropdown)} style={{ width:34, height:34, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, flexShrink:0 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
                </div>
              </div>
            )}
            {showMobileMenu && (
              <div style={{ background:t.surface, borderTop:`1px solid ${t.border}` }}>
                {NAV_TABS.map(tab=>(
                  <button key={tab.path} onClick={()=>{navigate(tab.path);setShowMobileMenu(false)}}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:'16px', padding:'16px 20px', background:location.pathname===tab.path?t.surfaceAlt:'transparent', border:'none', borderLeft:location.pathname===tab.path?'3px solid #C9A84C':'3px solid transparent', cursor:'pointer', transition:'all 0.15s' }}>
                    <span style={{ color:location.pathname===tab.path?'#C9A84C':t.textMuted }}>{tab.icon}</span>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'16px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:location.pathname===tab.path?t.text:t.textMuted }}>{tab.label}</span>
                  </button>
                ))}
                <div style={{ padding:'14px 20px', borderTop:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'1px', color:t.text }}>Dark Mode</span>
                  <button onClick={toggleTheme} style={{ width:42, height:24, borderRadius:'12px', border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                    <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 21px)':'3px', width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                  </button>
                </div>
                <button onClick={handleSignOut} style={{ width:'100%', padding:'16px 20px', background:'transparent', border:'none', borderTop:`1px solid ${t.border}`, textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, letterSpacing:'1px', color:'#c53030', cursor:'pointer' }}>Log Out</button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* DESKTOP NAV */
        <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, transition:'background 0.25s' }}>
          <div style={{ width:'100%', padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</span>
            </div>
            <div style={{ display:'flex', alignItems:'stretch' }}>
              {NAV_TABS.map(tab=>(
                <button key={tab.path} className="rp-nav-tab" style={{ color:location.pathname===tab.path?t.text:t.textMuted, borderBottomColor:location.pathname===tab.path?'#C9A84C':'transparent' }} onClick={()=>navigate(tab.path)}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div ref={dropdownRef} style={{ position:'relative' }}>
                <div onClick={()=>setShowDropdown(!showDropdown)} style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.borderColor=t.border}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
                </div>
                {showDropdown && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'200px', overflow:'hidden', zIndex:100 }}>
                    <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{profile?.full_name||''}</div>
                    </div>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={()=>{navigate('/passport');setShowDropdown(false)}} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>My Passport</button>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={()=>{navigate('/profile');setShowDropdown(false)}} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Settings</button>
                    <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text }}>Dark Mode</span>
                      <button onClick={toggleTheme} style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                        <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                      </button>
                    </div>
                    <div style={{ height:'1px', background:t.borderLight }} />
                    <button className="rp-dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Log Out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import banner */}
      {showImportBanner && (
        <div style={{ position:'relative', zIndex:10, background:'#1B2A4A', borderBottom:'3px solid #C9A84C', padding:isMobile?'12px 16px':'14px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'1px', color:'#fff' }}>{importedCount} races added to your Race Passport!</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <span onClick={()=>navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer' }}>View Passport →</span>
            <span onClick={()=>setShowImportBanner(false)} style={{ color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'20px', lineHeight:1 }}>✕</span>
          </div>
        </div>
      )}

      {/* Desktop greeting */}
      {!isMobile && (
        <div style={{ position:'relative', zIndex:10, background:t.greetingBg, backdropFilter:'blur(2px)', borderBottom:`1px solid ${t.navBorder}`, padding:'40px 40px 34px', transition:'background 0.25s' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'24px' }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,64px)', color:t.text, letterSpacing:'2px', lineHeight:1, marginBottom:'4px' }}>{greeting}{firstName?`, ${firstName.toUpperCase()}`:''}.</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,64px)', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>THE START LINE IS CALLING.</div>
            </div>
            <div style={{ flexShrink:0, alignSelf:'center', opacity:0.35, border:`1px dashed ${t.border}`, borderRadius:'10px', padding:'10px 18px', display:'flex', alignItems:'center', gap:'8px', minWidth:'160px' }}>
              <div style={{ width:28, height:28, borderRadius:'6px', background:t.border }} />
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase' }}>Sponsored by</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:t.textMuted, letterSpacing:'1px' }}>Partner Name</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ position:'relative', zIndex:10 }}>
        {stravaConnected
          ? <StatsTicker t={t} items={statItems} />
          : <StravaConnect t={t} onConnect={async()=>{
              let uid=user?.id
              if(!uid){try{const{data:{session}}=await supabase.auth.getSession();uid=session?.user?.id}catch(e){}}
              sessionStorage.setItem('strava_return_to','/home')
              if(uid) sessionStorage.setItem('strava_user_id',uid)
              const r=await fetch(`/api/strava?action=auth_url${uid?`&user_id=${uid}`:''}`)
              const d=await r.json()
              if(d.url) window.location.href=d.url
            }} />}
      </div>

      {/* Dashboard — asymmetric layout: 70% main / 30% sidebar */}
      <div style={{ position:'relative', zIndex:10, width:'100%', padding:isMobile?'16px 12px 100px':'32px 28px 80px', boxSizing:'border-box' }}>
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'minmax(0,1.65fr) minmax(0,0.85fr)', gap:'20px', alignItems:'start' }}>

          {/* ─── LEFT MAIN COLUMN ────────────────────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', minWidth:0 }}>

            {/* 1. Pacer insight — hero coaching card */}
            <PacerDashboard races={passportRaces} profile={profile} t={t} isMobile={isMobile} />

            {/* 2. Race discovery / Next race hero */}
            <div style={{ minWidth:0, overflow:'hidden', borderRadius:'20px' }}>
              {upcomingRace
                ? <NextRaceHero race={upcomingRace} t={t} isMobile={isMobile} />
                : <DiscoverSection nearbyRaces={nearbyRaces} nearbyLoading={nearbyLoading} profile={profile} t={t} isMobile={isMobile} navigate={navigate} />
              }
            </div>

            {/* 3. Timeline */}
            <RaceTimeline races={stamps} t={t} isMobile={isMobile} />

            {/* 4. World Majors */}
            <WorldMajors races={passportRaces} t={t} />

          </div>

          {/* ─── RIGHT SIDEBAR ────────────────────────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px', minWidth:0 }}>

            {/* Stamps */}
            <div style={{ borderRadius:'16px', background:t.surface, padding:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'2px' }}>Passport</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>Your Stamps</div>
                </div>
                <button onClick={()=>navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>View All →</button>
              </div>
              {stamps.length === 0 ? (
                <div style={{ padding:'24px', textAlign:'center', border:`1px dashed ${t.border}`, borderRadius:'12px' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'12px' }}>Add your first race to start building your Passport.</div>
                  <button onClick={()=>navigate('/race-import')} style={{ padding:'8px 18px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>Add Races →</button>
                </div>
              ) : (
                <div style={{ overflowX:'auto', scrollbarWidth:'none' }}>
                  <div style={{ display:'flex', gap:'20px', paddingBottom:'8px', paddingTop:'4px', minWidth:'min-content' }}>
                    {stamps.slice(0,8).map(s=>(
                      <Stamp key={s.id} distance={s.distance} name={s.name} location={s.location} month={s.month} year={s.year} size={90} t={t} onClick={()=>navigate(`/race/${s.id}`)} />
                    ))}
                    <div onClick={()=>navigate('/passport')} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', cursor:'pointer', justifyContent:'flex-start', paddingTop:'4px' }}>
                      <div style={{ width:90, height:90, borderRadius:'50%', border:`1.5px dashed ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.transform='scale(1.06)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.transform='scale(1)'}}>
                        <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#C9A84C', textAlign:'center' }}>More</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Goal */}
            <GoalCard profile={profile} t={t} navigate={navigate} />

            {/* Milestones */}
            <Milestones races={passportRaces} t={t} />

            {/* My Lists */}
            {userId && <MyLists userId={userId} t={t} navigate={navigate} />}

          </div>

        </div>
      </div>
    </div>
  )
}
