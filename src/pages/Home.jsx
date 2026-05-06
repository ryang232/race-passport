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

const WORLD_MAJORS = [
  { key:'tokyo',   name:'Tokyo Marathon',               keywords:['tokyo'] },
  { key:'boston',  name:'Boston Marathon',              keywords:['boston'] },
  { key:'london',  name:'London Marathon',              keywords:['london'] },
  { key:'berlin',  name:'Berlin Marathon',              keywords:['berlin'] },
  { key:'chicago', name:'Chicago Marathon',             keywords:['chicago'] },
  { key:'nyc',     name:'New York City Marathon',       keywords:['new york','nyc','tcs new york'] },
]

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
    // Fire even with 0 races for new users — show a generic welcome insight
    const cacheKey = `pacer_dashboard_v2_${profile?.full_name||'user'}_${races?.length||0}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { try { setPacerData(JSON.parse(cached)); return } catch(e) {} }
    setLoading(true)
    fetch('/api/pacer', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'insight', races:races.slice(0,15), profile:{ first_name:(profile?.full_name||'').split(' ')[0], state:profile?.state, favorite_distance:profile?.favorite_distance } })
    }).then(r=>r.json()).then(d => {
      if (d.insight) { setPacerData(d); sessionStorage.setItem(cacheKey, JSON.stringify(d)) }
      setLoading(false)
    }).catch(()=>setLoading(false))
  }, [races?.length])

  // Career score from race scores
  const scoredRaces = races?.filter(r => r.pacer_score) || []
  const careerScore = scoredRaces.length
    ? Math.round(scoredRaces.reduce((s,r) => s + r.pacer_score, 0) / scoredRaces.length)
    : null
  const careerGrade = careerScore ? gradeFromScore(careerScore) : null

  // Circumference for score ring
  const r = 38, circ = 2 * Math.PI * r
  const dash = careerScore ? (careerScore / 100) * circ : 0

  if (!pacerData && loading) return (
    <div style={{ borderRadius:'16px', background:t.isDark?'rgba(201,168,76,0.06)':'#FFFDF5', border:`1px solid ${t.isDark?'rgba(201,168,76,0.15)':'rgba(201,168,76,0.25)'}`, padding:'20px 24px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'16px' }}>
      <div style={{ width:40, height:40, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>⚡</div>
      <div style={{ flex:1 }}>
        <div style={{ height:11, borderRadius:6, background:t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)', marginBottom:10, width:'60%', animation:'pulse 1.5s ease infinite' }} />
        <div style={{ height:10, borderRadius:6, background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.05)', width:'35%', animation:'pulse 1.5s ease infinite' }} />
      </div>
    </div>
  )
  if (!pacerData) return null

  return (
    <div style={{ borderRadius:'16px', background:t.isDark?'rgba(201,168,76,0.06)':'#FFFDF5', border:`1px solid ${t.isDark?'rgba(201,168,76,0.2)':'rgba(201,168,76,0.35)'}`, padding:isMobile?'16px':'20px 24px', marginBottom:'16px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'16px' }}>
        <div style={{ width:40, height:40, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>⚡</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'7px' }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'2.5px', color:'#C9A84C' }}>PACER</span>
            <div style={{ width:3, height:3, borderRadius:'50%', background:'rgba(201,168,76,0.5)' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Your AI Race Intelligence</span>
          </div>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:isMobile?'13px':'14px', color:t.text, margin:'0 0 10px', lineHeight:1.65 }}>{pacerData.insight}</p>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:t.isDark?'rgba(201,168,76,0.1)':'rgba(201,168,76,0.12)', borderRadius:'20px', padding:'5px 12px' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1l1.5 3H10L7.5 6l1 3L5 7.5 1.5 9l1-3L0 4h3.5z" fill="#C9A84C"/></svg>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#C9A84C' }}>{pacerData.next_step}</span>
          </div>
        </div>
        {careerScore && (
          <div style={{ flexShrink:0, textAlign:'center' }}>
            <div style={{ position:'relative', width:88, height:88 }}>
              <svg viewBox="0 0 88 88" width="88" height="88">
                <circle cx="44" cy="44" r={r} fill="none" stroke={t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.08)'} strokeWidth="8"/>
                <circle cx="44" cy="44" r={r} fill="none" stroke="#C9A84C" strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" transform="rotate(-90 44 44)"/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, lineHeight:1 }}>{careerScore}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', lineHeight:1 }}>{careerGrade}</div>
              </div>
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'4px' }}>Career Score</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Race Timeline ─────────────────────────────────────────────────────────────
function RaceTimeline({ races, t, isMobile }) {
  const navigate = useNavigate()
  if (!races?.length) return null
  const sorted = [...races].sort((a,b) => (a.date_sort||a.date||'').localeCompare(b.date_sort||b.date||''))
  return (
    <div style={{ borderRadius:'16px', background:t.surface, border:`1px solid ${t.border}`, padding:isMobile?'16px':'20px 24px', marginBottom:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px' }}>Race Timeline</span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
          {sorted[0]?.year || sorted[0]?.date?.split(' ')[1] || ''} → {sorted[sorted.length-1]?.year || sorted[sorted.length-1]?.date?.split(' ')[1] || ''}
        </span>
      </div>
      <div style={{ overflowX:'auto', paddingBottom:'8px' }}>
        <div style={{ position:'relative', minWidth: Math.max(sorted.length * 100, 400), padding:'50px 16px 20px' }}>
          <div style={{ position:'absolute', bottom:28, left:16, right:16, height:'1.5px', background:t.border }} />
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', position:'relative' }}>
            {sorted.map((race, i) => {
              const c = getDistanceColor(race.distance)
              const label = (race.date||'').split(' ').slice(0,2).join(' ') || race.month+' '+race.year || ''
              const hasPhoto = race.photos?.length > 0
              return (
                <div key={race.id||i} onClick={()=>navigate(`/race/${race.id}`)}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0, cursor:'pointer', flex:'1', position:'relative' }}>
                  <div style={{ position:'absolute', bottom:20, background:t.surface, border:`1px solid ${t.border}`, borderRadius:'6px', padding:'3px 6px', whiteSpace:'nowrap', transform:'translateX(-50%)', left:'50%', marginBottom:'8px', zIndex:2 }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, color:t.text, whiteSpace:'nowrap' }}>{race.name?.split(' ').slice(0,3).join(' ')}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', color:t.textMuted }}>{label}</div>
                  </div>
                  <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', width: hasPhoto?18:14, height: hasPhoto?18:14, borderRadius:'50%', background:c.stampBorder, border:`2px solid ${t.surface}`, boxShadow:`0 0 0 1.5px ${c.stampBorder}`, zIndex:3, overflow:'hidden' }}>
                    {hasPhoto && <img src={race.photos[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
                  </div>
                  <div style={{ height:8 }} />
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:'12px', marginTop:'12px' }}>
            {[['#1E5FA8','Running'],['#C9A84C','Marathon'],['#B83232','Triathlon']].map(([color,label]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', color:t.textMuted }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
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
    <div style={{ borderRadius:'16px', background:t.surface, border:`1px solid ${t.border}`, padding:'16px 20px', marginBottom:'16px' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:t.text, letterSpacing:'1px', marginBottom:'12px' }}>Milestones</div>
      <div style={{ position:'relative', minHeight:130 }}>
        {milestones.slice(0,3).map((m,i) => (
          <div key={i} style={{ background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.03)', border:`0.5px solid ${t.border}`, borderRadius:'10px', padding:'10px 12px', display:'flex', alignItems:'center', gap:'10px', position:'absolute', top: i*8, left: i*4, right: i*4, zIndex:3-i, opacity:1-(i*0.25), transform:`scale(${1-i*0.03})`, transformOrigin:'top center' }}>
            <div style={{ width:32, height:32, borderRadius:'8px', background:`${m.color}18`, border:`1px solid ${m.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'14px' }}>{m.icon}</div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text }}>{m.title}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>
      {milestones.length > 3 && (
        <div style={{ marginTop:'8px', textAlign:'center' }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#C9A84C', cursor:'pointer', letterSpacing:'1px', textTransform:'uppercase' }}>Scroll for more ↓</span>
        </div>
      )}
    </div>
  )
}

// ── World Majors ──────────────────────────────────────────────────────────────
function WorldMajors({ races, t }) {
  const navigate = useNavigate()
  const earned = new Set()
  races?.forEach(r => {
    const name = (r.name||'').toLowerCase()
    WORLD_MAJORS.forEach(m => { if (m.keywords.some(k => name.includes(k))) earned.add(m.key) })
  })
  return (
    <div style={{ borderRadius:'16px', background:t.surface, border:`1px solid ${t.border}`, padding:'16px 20px', marginBottom:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px' }}>World Majors</span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted }}>{earned.size} of 6 completed</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', gap:'8px' }}>
        {WORLD_MAJORS.map(m => {
          const done = earned.has(m.key)
          return (
            <div key={m.key} onClick={()=>navigate('/discover')} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', cursor:'pointer', flex:1 }}>
              <div style={{ width:72, height:72, borderRadius:'50%', border:`2.5px solid ${done?'#C9A84C':t.border}`, background:done?'rgba(201,168,76,0.08)':t.isDark?'rgba(255,255,255,0.03)':'rgba(27,42,74,0.03)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', transition:'transform 0.15s', filter:done?'none':'grayscale(1) opacity(0.4)' }}
                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:`1px dashed ${done?'rgba(201,168,76,0.4)':t.border}` }} />
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'10px', color:done?'#C9A84C':t.textMuted, position:'relative', zIndex:1, textAlign:'center', lineHeight:1.2, padding:'0 4px' }}>26.2</span>
                {done && (
                  <div style={{ position:'absolute', top:-3, right:-3, width:16, height:16, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', zIndex:4 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', color:done?'#C9A84C':t.textMuted, fontWeight:done?600:400, textAlign:'center', lineHeight:1.2 }}>
                {m.name.replace(' Marathon','').replace('New York City','NYC')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Goal card ─────────────────────────────────────────────────────────────────
function GoalCard({ profile, t, navigate }) {
  if (!profile?.goal_distance) return (
    <div style={{ borderRadius:'16px', background:t.surface, border:`1.5px dashed ${t.border}`, padding:'20px', marginBottom:'16px', textAlign:'center' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:t.text, letterSpacing:'1px', marginBottom:'6px' }}>No Goal Set</div>
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
    <div style={{ borderRadius:'16px', background:t.surface, border:`1px solid ${t.border}`, padding:'16px 20px', marginBottom:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px' }}>Your Goal</span>
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
    <div style={{ borderRadius:'16px', background:t.surface, border:`1px solid ${t.border}`, padding:'16px 20px', marginBottom:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px' }}>My Lists</span>
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
function DiscoverSection({ nearbyRaces, nearbyLoading, profile, t, isMobile, navigate }) {
  const [topRaces, setTopRaces]           = useState([])
  const [topLoading, setTopLoading]       = useState(true)
  const [locationAllowed, setLocationAllowed] = useState(!!profile?.state)

  useEffect(() => {
    const loadTop = async () => {
      try {
        const params = new URLSearchParams({ results_per_page:20, sort:'date ASC', start_date:'2026-01-01', end_date:'2027-12-31' })
        const resp = await fetch(`/api/runsignup?${params}`)
        const data = await resp.json()
        const races = (data.races||[]).slice(0,15).map(r => {
          const race = r.race||r
          const ev = (race.events&&race.events[0]) || {}
          return {
            id:       String(race.race_id||race.id||Math.random()),
            name:     race.name,
            date:     race.next_date_utc ? new Date(race.next_date_utc).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : (ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''),
            city:     race.address?.city||'',
            state:    race.address?.state||'',
            distance: ev.distance||'26.2',
            logo_url: race.logo_url||race.event_logo_url||null,
          }
        }).filter(r => r.name)
        setTopRaces(races)
      } catch(e) {}
      setTopLoading(false)
    }
    loadTop()
  }, [])

  const handleAllow = () => {
    navigator.geolocation?.getCurrentPosition(()=>setLocationAllowed(true), ()=>setLocationAllowed(false))
  }

  const SectionLabel = ({ label }) => (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase', marginBottom:'14px' }}>{label}</div>
  )

  const LoadingRow = () => (
    <div style={{ display:'flex', gap:'14px', overflow:'hidden' }}>
      {[1,2,3,4].map(i=><div key={i} style={{ flexShrink:0, width:'clamp(220px,20vw,280px)', height:206, borderRadius:'16px', background:t.surfaceAlt, animation:'pulse 1.5s ease infinite' }}/>)}
    </div>
  )

  const MoreBtn = () => (
    <div onClick={()=>navigate('/discover')} style={{ flexShrink:0, width:70, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#C9A84C', textTransform:'uppercase', letterSpacing:'1px', writingMode:'vertical-lr' }}>More →</span>
    </div>
  )

  return (
    <div style={{ borderRadius:'20px', background:t.surface, border:`1px solid ${t.border}`, padding:'24px 28px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:t.text, letterSpacing:'1px' }}>Find Your Next Race</span>
        <button onClick={()=>navigate('/discover')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'1px' }}>See All →</button>
      </div>

      <div style={{ marginBottom:'28px' }}>
        <SectionLabel label={`Races Near You${profile?.state ? ' in ' + profile.state : ''}`} />
        {!locationAllowed && !profile?.state ? <LocationPrompt t={t} onAllow={handleAllow} />
         : nearbyLoading ? <LoadingRow />
         : nearbyRaces.length > 0 ? (
          <ScrollRow gap={14}>
            {nearbyRaces.slice(0,10).map(race=><LogoRaceCard key={race.id} race={race} t={t}/>)}
            <MoreBtn />
          </ScrollRow>
        ) : <LocationPrompt t={t} onAllow={handleAllow} />}
      </div>

      <div>
        <SectionLabel label="Top Races" />
        {topLoading ? <LoadingRow /> : (
          <ScrollRow gap={14}>
            {topRaces.map(race=><LogoRaceCard key={race.id} race={race} t={t}/>)}
            <MoreBtn />
          </ScrollRow>
        )}
      </div>
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
      setNearbyLoading(true)
      const bad = (n) => { const l=(n||'').toLowerCase(); return /\bexpo\b/.test(l)||/\bvolunteer\b/.test(l)||/\btot trot\b/.test(l) }
      try {
        if (userState) {
          const { data } = await supabase.from('races').select('id,name,location,city,state,distance,date,date_sort,logo_url').eq('state', userState.toUpperCase()).eq('is_past', false).order('date_sort',{ascending:true}).limit(30)
          if (data) setNearbyRaces(data.filter(r=>!bad(r.name)))
        }
      } catch(e) {}
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

      {/* Dashboard content */}
      <div style={{ position:'relative', zIndex:10, width:'100%', padding:isMobile?'20px 16px 80px':'32px 48px 80px' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto' }}>

          {/* ROW 1: Hero (full width) */}
          <div style={{ marginBottom:'24px' }}>
            {upcomingRace
              ? <NextRaceHero race={upcomingRace} t={t} isMobile={isMobile} />
              : <DiscoverSection nearbyRaces={nearbyRaces} nearbyLoading={nearbyLoading} profile={profile} t={t} isMobile={isMobile} navigate={navigate} />
            }
          </div>

          {/* ROW 2: Pacer insight (full width, prominent) */}
          <div style={{ marginBottom:'24px' }}>
            <PacerDashboard races={passportRaces} profile={profile} t={t} isMobile={isMobile} />
          </div>

          {/* ROW 3: Timeline (full width) */}
          <div style={{ marginBottom:'24px' }}>
            <RaceTimeline races={stamps} t={t} isMobile={isMobile} />
          </div>

          {/* ROW 4: 3-column grid — Milestones | World Majors | Goal */}
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:'20px', marginBottom:'24px', alignItems:'start' }}>
            <Milestones races={passportRaces} t={t} />
            <WorldMajors races={passportRaces} t={t} />
            <GoalCard profile={profile} t={t} navigate={navigate} />
          </div>

          {/* ROW 5: Stamps (full width) */}
          <div style={{ marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:t.text, letterSpacing:'1px' }}>Your Stamps</span>
              <button onClick={()=>navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>View Passport →</button>
            </div>
            {stamps.length === 0 ? (
              <div style={{ padding:'40px', textAlign:'center', background:t.surface, borderRadius:'20px', border:`1.5px dashed ${t.border}` }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'16px', color:t.textMuted, marginBottom:'16px' }}>Add your first race to start building your Passport.</div>
                <button onClick={()=>navigate('/race-import')} style={{ padding:'12px 28px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>Add Races →</button>
              </div>
            ) : (
              <ScrollRow>
                {stamps.map(s=>(
                  <Stamp key={s.id} distance={s.distance} name={s.name} location={s.location} month={s.month} year={s.year} size={150} t={t} onClick={()=>navigate(`/race/${s.id}`)} />
                ))}
                <div onClick={()=>navigate('/discover')} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', cursor:'pointer', paddingBottom:'4px' }}>
                  <div style={{ width:150, height:150, borderRadius:'50%', border:`2px dashed ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', background:t.isDark?'rgba(201,168,76,0.05)':'rgba(255,255,255,0.8)', transition:'border-color 0.15s,transform 0.15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.transform='scale(1.05)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.transform='scale(1)'}}>
                    <svg width="40" height="40" viewBox="0 0 32 32" fill="none"><path d="M16 6v20M6 16h20" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textAlign:'center' }}>Get More Stamps</div>
                </div>
              </ScrollRow>
            )}
          </div>

          {/* ROW 6: 2-column — My Lists | Races Near You */}
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:'20px', marginBottom:'24px', alignItems:'start' }}>
            {userId && <MyLists userId={userId} t={t} navigate={navigate} />}
            {upcomingRace && nearbyRaces.length > 0 && (
              <div style={{ borderRadius:'16px', background:t.surface, border:`1px solid ${t.border}`, padding:'20px 22px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px' }}>Races Near You{profile?.state?` in ${profile.state}`:''}</span>
                  <button onClick={()=>navigate('/discover')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>Browse All →</button>
                </div>
                <ScrollRow gap={12}>
                  {nearbyRaces.slice(0,8).map(race=><RaceCard key={race.id} race={race} t={t} compact />)}
                </ScrollRow>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
