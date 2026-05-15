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
import RaceReadinessCard from '../components/RaceReadinessCard'

// ── Constants ─────────────────────────────────────────────────────────────────
const TICKER_ITEMS = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M']
const MAX_W = '960px'

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

// ── World Majors data ─────────────────────────────────────────────────────────
const WORLD_MAJORS = [
  { key:'boston',  name:'Boston Marathon',        location:'Boston, MA',   date:'Apr 19, 2027', keywords:['boston'],
    entry:{ statusColor:'#16a34a', statusLabel:'Qualifying Window Open', type:'qualifying' }},
  { key:'nyc',     name:'New York City Marathon', location:'New York, NY', date:'Nov 1, 2026',  keywords:['new york','nyc','tcs new york'],
    entry:{ statusColor:'#9aa5b4', statusLabel:'Lottery Closed', type:'lottery' }},
  { key:'tokyo',   name:'Tokyo Marathon',         location:'Tokyo, JPN',   date:'Mar 7, 2027',  keywords:['tokyo'],
    entry:{ statusColor:'#f59e0b', statusLabel:'Opening Soon', type:'lottery' }},
  { key:'london',  name:'London Marathon',        location:'London, UK',   date:'Apr 25, 2027', keywords:['london'],
    entry:{ statusColor:'#9aa5b4', statusLabel:'Results Pending', type:'lottery' }},
  { key:'berlin',  name:'Berlin Marathon',        location:'Berlin, GER',  date:'Sep 27, 2026', keywords:['berlin'],
    entry:{ statusColor:'#9aa5b4', statusLabel:'Results Announced', type:'lottery' }},
  { key:'chicago', name:'Chicago Marathon',       location:'Chicago, IL',  date:'Oct 11, 2026', keywords:['chicago'],
    entry:{ statusColor:'#9aa5b4', statusLabel:'Results Announced', type:'lottery' }},
]

function gradeFromScore(s) {
  if (s >= 97) return 'A+'; if (s >= 93) return 'A'; if (s >= 90) return 'A-'
  if (s >= 87) return 'B+'; if (s >= 83) return 'B'; if (s >= 80) return 'B-'
  if (s >= 77) return 'C+'; if (s >= 73) return 'C'; if (s >= 70) return 'C-'
  if (s >= 67) return 'D+'; if (s >= 63) return 'D'; if (s >= 60) return 'D-'
  return 'F'
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, title }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'3px', color:'#C9A84C', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'#1B2A4A', letterSpacing:1, lineHeight:1 }}>{title}</div>
    </div>
  )
}

// ── Countdown hook ────────────────────────────────────────────────────────────
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

// ── Stamp component ───────────────────────────────────────────────────────────
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

function Stamp({ distance, name, location, month, year, size=110, onClick }) {
  // Fix color coding — check name first for IRONMAN/triathlon
  const isTri = name && (name.toLowerCase().includes('ironman') || name.toLowerCase().includes('70.3') || name.toLowerCase().includes('140.6') || name.toLowerCase().includes('triathlon'))
  const effectiveDist = isTri ? '70.3' : distance
  const c = getDistanceColor(effectiveDist)
  const cleaned = (distance||'').replace(' mi','').replace(' miles','')
  // Better font sizing
  const fs = cleaned.length > 4 ? 20 : cleaned.length > 2 ? 26 : 36
  const nameParts = (name||'').split(' ')
  // Show up to 3 words of race name inside stamp
  const stampName = nameParts.slice(0,3).join(' ')
  return (
    <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:10, cursor:'pointer' }} onClick={onClick}>
      <div style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid ${c.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', transition:'transform 0.15s,box-shadow 0.15s' }}
        onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.06)';e.currentTarget.style.boxShadow='0 8px 24px rgba(27,42,74,0.18)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none'}}>
        <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:`1px dashed ${c.stampDash}` }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:c.stampText, lineHeight:1, letterSpacing:'0.04em', position:'relative', zIndex:1, textAlign:'center', padding:'0 12px' }}>{cleaned}</div>
        {stampName && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'0.8px', color:c.stampText, textTransform:'uppercase', textAlign:'center', padding:'0 12px', lineHeight:1.3, marginTop:3, position:'relative', zIndex:1, opacity:0.5 }}>{stampName}</div>}
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'0.5px', color:'#1B2A4A', lineHeight:1.3 }}>{location}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#9aa5b4', marginTop:2 }}>{month} {year}</div>
      </div>
    </div>
  )
}

// ── Parallax background ───────────────────────────────────────────────────────
function ParallaxBackground() {
  const [ox, setOx] = useState(0)
  useEffect(() => {
    const fn = () => setOx(window.scrollY * 0.3)
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'50%', transform:`translateY(-50%) translateX(-${ox%600}px)`, whiteSpace:'nowrap', willChange:'transform' }}>
        {[...TICKER_ITEMS,...TICKER_ITEMS,...TICKER_ITEMS].map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,22vw,320px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.035)', lineHeight:1, padding:'0 40px', userSelect:'none', display:'inline-block' }}>{d}</span>)}
      </div>
    </div>
  )
}

// ── Stats ticker ──────────────────────────────────────────────────────────────
function StatsTicker({ items }) {
  const all = [...(items||[]),...(items||[]),...(items||[])]
  return (
    <div style={{ background:'#1B2A4A', borderRadius:14, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:40, background:'linear-gradient(to right,#1B2A4A,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:40, background:'linear-gradient(to left,#1B2A4A,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ display:'flex', alignItems:'center', padding:'14px 0', animation:'statsTicker 50s linear infinite', width:'max-content' }}>
        {all.map((item,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
            <div style={{ textAlign:'center', padding:'0 22px' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(20px,3vw,40px)', color:'#fff', lineHeight:1, letterSpacing:'2px', whiteSpace:'nowrap' }}>{item.value}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase', marginTop:3, whiteSpace:'nowrap' }}>{item.label}</div>
            </div>
            <div style={{ width:3, height:3, borderRadius:'50%', background:'rgba(201,168,76,0.25)', flexShrink:0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Strava connect card ───────────────────────────────────────────────────────
function StravaConnectCard({ onConnect }) {
  return (
    <div style={{ background:'#1B2A4A', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:'9px', background:'rgba(252,76,2,0.15)', border:'1px solid rgba(252,76,2,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:'#fff', letterSpacing:1, lineHeight:1, marginBottom:2 }}>Connect Strava to unlock your stats</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)' }}>Race miles, PRs, activity history — pulled automatically.</div>
        </div>
      </div>
      <button onClick={onConnect} style={{ flexShrink:0, background:'#FC4C02', border:'none', borderRadius:8, padding:'10px 20px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:'2px', color:'#fff', textTransform:'uppercase', cursor:'pointer', transition:'opacity 0.15s', whiteSpace:'nowrap' }}
        onMouseEnter={e=>e.currentTarget.style.opacity='0.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
        Connect
      </button>
    </div>
  )
}

// ── Race Grades section ───────────────────────────────────────────────────────
function RaceGrades({ races, navigate }) {
  const gradedRaces = races.filter(r => r.pacer_grade)
  if (!gradedRaces.length) return null

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
      {gradedRaces.slice(0,6).map(rc => {
        const isTri = rc.name && (rc.name.toLowerCase().includes('ironman') || rc.name.toLowerCase().includes('70.3') || rc.name.toLowerCase().includes('140.6'))
        const effectiveDist = isTri ? '70.3' : (rc.distance||'26.2')
        const c = getDistanceColor(effectiveDist)
        const partial = rc.pacer_score_partial !== false
        const gColor = rc.pacer_grade?.startsWith('A') ? '#16a34a' : rc.pacer_grade?.startsWith('B') ? '#C9A84C' : '#9aa5b4'
        return (
          <div key={rc.id} onClick={() => navigate('/race/' + rc.id)}
            style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'all 0.18s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(27,42,74,0.1)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#e8eaed';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
            {/* Top — distance color band */}
            <div style={{ height:6, background:c.stampBorder }} />
            <div style={{ padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:'#1B2A4A', letterSpacing:0.5, lineHeight:1.2, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rc.name}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#9aa5b4' }}>{rc.location || rc.city} · {rc.date}</div>
                </div>
                <div style={{ flexShrink:0, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:gColor, lineHeight:1 }}>{partial?'~':''}{rc.pacer_grade}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:'#9aa5b4', letterSpacing:1, textTransform:'uppercase' }}>{partial?'partial':'grade'}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, height:3, background:'#f0f2f5', borderRadius:2 }}>
                  <div style={{ height:3, width:`${rc.pacer_score||0}%`, background:gColor, borderRadius:2 }} />
                </div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:'#9aa5b4', flexShrink:0 }}>{rc.distance}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Next Race Hero ────────────────────────────────────────────────────────────
function NextRaceHero({ race, isMobile }) {
  const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
  const [loaded, setLoaded] = useState(false)
  const cd = useCountdown(race.date_sort || race.date)
  const navigate = useNavigate()
  useEffect(() => { loadRacePhoto(race).then(u => { if(u){setPhoto(u);setLoaded(true)} }) }, [race.id])
  return (
    <div onClick={()=>navigate(`/race/${race.id}`)} style={{ borderRadius:16, overflow:'hidden', position:'relative', cursor:'pointer', minHeight:isMobile?200:240 }}>
      <img src={photo} alt={race.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:loaded?1:0, transition:'opacity 0.5s' }} onLoad={()=>setLoaded(true)} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(27,42,74,0.92) 0%,rgba(27,42,74,0.7) 100%)' }} />
      <div style={{ position:'relative', padding:isMobile?20:28, display:'flex', flexDirection:'column', minHeight:isMobile?200:240 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'auto' }}>
          <div style={{ background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:6, padding:'3px 10px' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>Next Race</span>
          </div>
          <CardStamp distance={race.distance} size={44} />
        </div>
        <div style={{ marginTop:'auto' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isMobile?28:40, color:'#fff', letterSpacing:1, lineHeight:1, marginBottom:4 }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:16 }}>{[race.location,race.date].filter(Boolean).join(' · ')}</div>
          <div style={{ display:'flex', gap:8 }}>
            {cd.past
              ? <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'#C9A84C', letterSpacing:2 }}>RACE DAY!</div>
              : [{ val:String(cd.days).padStart(2,'0'), label:'Days' },{ val:String(cd.hours).padStart(2,'0'), label:'Hrs' },{ val:String(cd.mins).padStart(2,'0'), label:'Min' },{ val:String(cd.secs).padStart(2,'0'), label:'Sec' }].map(u => (
                <div key={u.label} style={{ background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:8, padding:'8px 12px', textAlign:'center', minWidth:54 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isMobile?22:30, color:'#C9A84C', lineHeight:1 }}>{u.val}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', marginTop:2 }}>{u.label}</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pacer Dashboard (insight card) ────────────────────────────────────────────
function PacerDashboard({ races, profile }) {
  const [pacerData, setPacerData] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) return
    const safeRaces = Array.isArray(races) ? races : []
    const firstName = (profile?.full_name||'').split(' ')[0]
    const cacheKey = 'pacer_v4_' + (firstName||'user') + '_' + safeRaces.length
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { try { const p = JSON.parse(cached); if (p?.insight) { setPacerData(p); return } } catch(e) {} }
    setLoading(true)
    fetch('/api/pacer', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'insight', races:safeRaces.slice(0,15), profile:{ first_name:firstName, state:profile?.state, favorite_distance:profile?.favorite_distance } })
    })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => {
      if (d?.insight) { setPacerData(d); sessionStorage.setItem(cacheKey, JSON.stringify(d)) }
      else setPacerData({ insight: safeRaces.length > 0 ? `${safeRaces.length} races and counting — your Race Passport is building something special.` : 'Every champion starts somewhere — import your first race to get started.' })
      setLoading(false)
    })
    .catch(() => { setPacerData({ insight:'Your Race Passport is building something special.' }); setLoading(false) })
  }, [profile?.full_name, races?.length])

  if (!pacerData && (loading || !profile)) return (
    <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, padding:'20px 24px', display:'flex', alignItems:'center', gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:'9px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>⚡</div>
      <div style={{ flex:1 }}>
        <div style={{ height:14, borderRadius:6, background:'rgba(27,42,74,0.07)', marginBottom:8, width:'70%', animation:'pulse 1.5s ease infinite' }} />
        <div style={{ height:11, borderRadius:6, background:'rgba(27,42,74,0.05)', width:'45%', animation:'pulse 1.5s ease infinite' }} />
      </div>
    </div>
  )
  if (!pacerData) return null

  return (
    <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderLeft:'4px solid #C9A84C', borderRadius:14, padding:'18px 22px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:32, height:32, borderRadius:'8px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>⚡</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, letterSpacing:'3px', color:'#C9A84C', lineHeight:1 }}>PACER</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Your AI Race Intelligence</div>
        </div>
      </div>
      <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:15, color:'#1B2A4A', margin:0, lineHeight:1.75, fontWeight:400 }}>{pacerData.insight}</p>
    </div>
  )
}

// ── Race Timeline ─────────────────────────────────────────────────────────────
function RaceTimeline({ races, isMobile }) {
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  if (!races?.length) return null
  const sorted = [...races].sort((a,b) => (a.date_sort||a.date||'').localeCompare(b.date_sort||b.date||''))
  const DOT = 60
  const SPACING = 240
  const totalW = Math.max(sorted.length * SPACING + 200, 600)

  return (
    <div style={{ background:'#1B2A4A', borderRadius:16, padding:isMobile?'20px 16px':'28px 32px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'50%', right:-20, transform:'translateY(-50%)', fontFamily:"'Bebas Neue',sans-serif", fontSize:120, color:'rgba(201,168,76,0.04)', letterSpacing:4, userSelect:'none', lineHeight:1, pointerEvents:'none' }}>TIMELINE</div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, position:'relative', zIndex:1 }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:4 }}>Race Timeline</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(22px,3.5vw,36px)', color:'#fff', letterSpacing:1, lineHeight:1 }}>
            {(() => {
              const firstY = sorted[0]?.date_sort?.split('-')[0] || ''
              const lastY = sorted[sorted.length-1]?.date_sort?.split('-')[0] || ''
              const span = firstY && lastY && firstY !== lastY ? (parseInt(lastY)-parseInt(firstY)) + ' years' : ''
              const distMap = {'5K':3.1,'5k':3.1,'10K':6.2,'10k':6.2,'13.1':13.1,'26.2':26.2,'70.3':70.3,'140.6':140.6,'50K':31,'100M':100}
              const miles = Math.round(sorted.reduce((s,r)=>s+(distMap[r.distance]||0),0))
              if (span && miles > 0) return `${span}. ${miles} miles.`
              return `${sorted.length} ${sorted.length===1?'race':'races'}. All right here.`
            })()}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'#C9A84C', letterSpacing:1 }}>{sorted.length} {sorted.length===1?'Race':'Races'}</div>
        </div>
      </div>

      <div ref={scrollRef} style={{ overflowX:'auto', paddingBottom:4, cursor:'grab', position:'relative', zIndex:1 }}
        onMouseDown={e=>{const el=scrollRef.current;if(!el)return;let x=e.clientX,sl=el.scrollLeft;const move=ev=>el.scrollLeft=sl-(ev.clientX-x);const up=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up)};document.addEventListener('mousemove',move);document.addEventListener('mouseup',up)}}>
        <div style={{ position:'relative', width:totalW, height:200, minWidth:'100%' }}>
          {/* Date labels */}
          {sorted.map((race,i) => (
            <div key={`d-${i}`} style={{ position:'absolute', bottom:8, left:100+i*SPACING, transform:'translateX(-50%)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap' }}>
              {race.date ? race.date.split(' ').slice(0,2).join(' ') : `${race.month||''} ${race.year||''}`}
            </div>
          ))}
          {/* Line */}
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:6, background:'rgba(201,168,76,0.15)', borderRadius:3, transform:'translateY(-50%)' }}>
            <div style={{ height:'100%', background:'linear-gradient(to right,rgba(201,168,76,0.4),#C9A84C)', borderRadius:3, width:sorted.length>1?`${((sorted.length-1)*SPACING+100)/totalW*100}%`:'30%', marginLeft:100 }} />
          </div>
          {/* Dots */}
          {sorted.map((race,i) => {
            // Fix color — check name for IRONMAN/triathlon first
            const nameLower = (race.name||'').toLowerCase()
            const isTri = nameLower.includes('ironman') || nameLower.includes('70.3') || nameLower.includes('140.6') || nameLower.includes('triathlon')
            const effectiveDist = isTri ? '70.3' : race.distance
            const c = getDistanceColor(effectiveDist)
            const x = 100 + i * SPACING
            const hasPhoto = race.photos?.length > 0
            const distLabel = (race.distance||'').replace(' mi','').replace(' miles','')
            return (
              <div key={race.id||i} style={{ position:'absolute', top:'50%', left:x, transform:'translate(-50%,-50%)', zIndex:3 }}>
                {/* Label above */}
                <div style={{ position:'absolute', bottom:`calc(100% + 14px)`, left:'50%', transform:'translateX(-50%)', background:'rgba(27,42,74,0.8)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:8, padding:'6px 12px', whiteSpace:'nowrap', backdropFilter:'blur(4px)' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:'#fff', letterSpacing:0.5, lineHeight:1.1, marginBottom:2 }}>{(race.name||'').length>22?(race.name||'').slice(0,22)+'…':race.name}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:'rgba(201,168,76,0.7)', fontWeight:600 }}>{race.location || [race.city,race.state].filter(Boolean).join(', ') || ''}</div>
                </div>
                {/* Connector */}
                <div style={{ position:'absolute', bottom:'calc(100% + 4px)', left:'50%', transform:'translateX(-50%)', width:2, height:10, background:'rgba(201,168,76,0.3)' }} />
                {/* Dot */}
                <div onClick={()=>navigate(`/race/${race.id}`)}
                  style={{ width:DOT, height:DOT, borderRadius:'50%', background:c.stampBorder, border:'3px solid rgba(255,255,255,0.2)', boxShadow:`0 0 0 2px ${c.stampBorder}, 0 0 20px ${c.stampBorder}60`, cursor:'pointer', overflow:'hidden', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', transition:'transform 0.2s,box-shadow 0.2s', gap:1 }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.25)';e.currentTarget.style.boxShadow=`0 0 0 3px ${c.stampBorder}, 0 0 28px ${c.stampBorder}80`}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow=`0 0 0 2px ${c.stampBorder}, 0 0 20px ${c.stampBorder}60`}}>
                  {hasPhoto
                    ? <img src={race.photos[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <>
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:distLabel.length>4?9:distLabel.length>2?12:16, color:'#fff', textAlign:'center', lineHeight:1 }}>{distLabel}</span>
                      </>
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:16, position:'relative', zIndex:1, flexWrap:'wrap' }}>
        {[['#1E5FA8','Running'],['#C9A84C','Marathon'],['#B83232','Triathlon'],['#9C7C4A','Ultra']].map(([color,label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'rgba(255,255,255,0.35)', letterSpacing:0.5 }}>{label}</span>
          </div>
        ))}
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'rgba(255,255,255,0.2)', marginLeft:'auto' }}>← drag to scroll →</span>
        <button onClick={()=>navigate('/race-import')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', padding:0 }}>+ Add Race →</button>
      </div>
    </div>
  )
}

// ── Milestones — horizontal flip ──────────────────────────────────────────────
function Milestones({ races }) {
  const scrollRef = useRef(null)
  const milestones = useMemo(() => {
    if (!races?.length) return []
    const ms = []
    const sorted = [...races].sort((a,b)=>(a.date_sort||'').localeCompare(b.date_sort||''))
    if (sorted[0]) ms.push({ icon:'🎯', title:'First Race!', sub:`${sorted[0].name}`, meta:sorted[0].date, color:'#C9A84C' })
    const distFirst = {}
    sorted.forEach(r => { if (!distFirst[r.distance]) { distFirst[r.distance]=r; if(r!==sorted[0]) ms.push({ icon:'🏅', title:`First ${r.distance}!`, sub:r.name, meta:r.date, color:'#1E5FA8' }) } })
    sorted.filter(r=>r.is_pr).forEach(r => ms.push({ icon:'⚡', title:`New ${r.distance} PR!`, sub:r.time, meta:r.date, color:'#C9A84C' }))
    ;[5,10,25,50,100].forEach(n => { if (sorted.length>=n) ms.push({ icon:'🔥', title:`${n} Race Club!`, sub:`Reached ${n} total races`, meta:'', color:'#B83232' }) })
    return ms.reverse().slice(0,10)
  }, [races])

  if (!milestones.length) return null

  const scroll = d => scrollRef.current?.scrollBy({ left: d * 220, behavior:'smooth' })

  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <button onClick={()=>scroll(-1)} style={{ width:30, height:30, borderRadius:'50%', background:'#1B2A4A', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button onClick={()=>scroll(1)} style={{ width:30, height:30, borderRadius:'50%', background:'#1B2A4A', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div ref={scrollRef} style={{ display:'flex', gap:12, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
        {milestones.map((m,i) => (
          <div key={i} style={{ flexShrink:0, width:200, background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${m.color}15`, border:`1px solid ${m.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{m.icon}</div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, color:'#1B2A4A', letterSpacing:0.5, lineHeight:1.1, marginBottom:3 }}>{m.title}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:'#6b7a8d', lineHeight:1.4, marginBottom:2 }}>{m.sub}</div>
              {m.meta && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#9aa5b4' }}>{m.meta}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Departures Board (World Majors) ───────────────────────────────────────────
function DeparturesBoard({ races }) {
  const earned = new Set()
  races?.forEach(r => {
    const name = (r.name||'').toLowerCase()
    WORLD_MAJORS.forEach(m => { if (m.keywords.some(k=>name.includes(k))) earned.add(m.key) })
  })

  return (
    <div style={{ background:'#0d1829', borderRadius:16, overflow:'hidden', border:'2px solid #1B2A4A' }}>
      {/* Board header */}
      <div style={{ background:'#111f35', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C', animation:'pulse 2s ease infinite' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:'3px', color:'#C9A84C' }}>ABBOTT WORLD MARATHON MAJORS</span>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:'rgba(255,255,255,0.2)', letterSpacing:2 }}>
          {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase()}
        </div>
      </div>
      {/* Column headers */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 1fr 1.3fr', gap:0, padding:'8px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        {['RACE','LOCATION','DATE','STATUS'].map(h => (
          <div key={h} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase' }}>{h}</div>
        ))}
      </div>
      {/* Rows */}
      {WORLD_MAJORS.map((m, i) => {
        const done = earned.has(m.key)
        const isLast = i === WORLD_MAJORS.length - 1
        return (
          <div key={m.key} onClick={()=>window.open(`https://www.google.com/search?q=${encodeURIComponent(m.name)}`, '_blank')}
            style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 1fr 1.3fr', gap:0, padding:'13px 20px', borderBottom:isLast?'none':'1px solid rgba(255,255,255,0.04)', cursor:'pointer', background:done?'rgba(201,168,76,0.05)':'transparent', transition:'background 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.background=done?'rgba(201,168,76,0.1)':'rgba(255,255,255,0.03)'}
            onMouseLeave={e=>e.currentTarget.style.background=done?'rgba(201,168,76,0.05)':'transparent'}>
            {/* Race name */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {done && <div style={{ width:16, height:16, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#1B2A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>}
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:done?'#C9A84C':'#fff', letterSpacing:0.5 }}>{m.name.replace('New York City','NYC')}</span>
            </div>
            {/* Location */}
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'rgba(255,255,255,0.45)', display:'flex', alignItems:'center' }}>{m.location}</div>
            {/* Date */}
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'rgba(255,255,255,0.45)', display:'flex', alignItems:'center' }}>{m.date}</div>
            {/* Status */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:done?'#C9A84C':m.entry.statusColor, flexShrink:0 }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, color:done?'#C9A84C':m.entry.statusColor, letterSpacing:0.5 }}>
                {done ? 'COMPLETED ✓' : m.entry.statusLabel}
              </span>
            </div>
          </div>
        )
      })}
      {/* Footer */}
      <div style={{ padding:'10px 20px', borderTop:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:'rgba(255,255,255,0.15)', letterSpacing:1 }}>
          {earned.size}/6 COMPLETED
        </div>
        <div style={{ display:'flex', gap:12 }}>
          {[['#16a34a','Action needed'],['#f59e0b','Opening soon'],['#9aa5b4','Closed'],['#C9A84C','Completed']].map(([c,l])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:c }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:0.5 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Discover section ──────────────────────────────────────────────────────────
function DiscoverSection({ nearbyRaces, nearbyLoading, navigate }) {
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, padding:'20px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <div style={{ width:34, height:34, borderRadius:'8px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🗺️</div>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:1 }}>What's Next</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#1B2A4A', letterSpacing:0.5, lineHeight:1 }}>Ready for Your Next Race?</div>
        </div>
      </div>
      <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'#9aa5b4', marginBottom:16, lineHeight:1.65, margin:'0 0 16px' }}>
        Browse thousands of upcoming races on the Discover map.
      </p>
      <button onClick={()=>navigate('/discover')}
        style={{ width:'100%', padding:12, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', background:'#1B2A4A', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', transition:'background 0.2s' }}
        onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'}
        onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>
        Open Discover Map →
      </button>
    </div>
  )
}

// ── Goal card ─────────────────────────────────────────────────────────────────
function GoalCard({ profile, navigate }) {
  if (!profile?.goal_distance && !profile?.goal_race_name) return (
    <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, padding:'20px 24px', textAlign:'center' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:'#1B2A4A', letterSpacing:1, marginBottom:6 }}>No Goal Set</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:'#9aa5b4', marginBottom:14 }}>Set a goal race and Pacer will track your readiness toward it.</div>
      <button onClick={()=>navigate('/goal-races')} style={{ padding:'9px 22px', border:'none', borderRadius:8, background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}
        onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>
        Set a Goal →
      </button>
    </div>
  )
  const label = profile.goal_distance || ''
  const c = getDistanceColor(label)
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, padding:'20px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:2 }}>Training</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#1B2A4A', letterSpacing:1, lineHeight:1 }}>Your Goal</div>
        </div>
        <button onClick={()=>navigate('/goal-races')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:1 }}>Change →</button>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:12, background:`${c.stampBorder}08`, border:`1px solid ${c.stampBorder}25`, borderRadius:10 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', border:`2px solid ${c.stampBorder}`, background:`${c.stampBorder}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
          <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:`1px dashed ${c.stampBorder}55` }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:label.length>4?10:label.length>2?13:17, color:c.stampBorder, position:'relative', zIndex:1 }}>{label}</span>
        </div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, color:'#1B2A4A', letterSpacing:0.5, lineHeight:1.1, marginBottom:2 }}>
            {profile.goal_race_name || profile.goal_distance}
          </div>
          {(profile.goal_target_month || profile.goal_target_year) && (
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#9aa5b4' }}>
              {[profile.goal_target_month, profile.goal_target_year].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── My Lists ──────────────────────────────────────────────────────────────────
function MyLists({ userId, navigate }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!userId) return
    supabase.from('race_lists').select('id,name,created_at').eq('user_id',userId).order('created_at',{ascending:false})
      .then(({data})=>{setLists(data||[]);setLoading(false)})
  }, [userId])

  const createList = async () => {
    if (!newName.trim()) return
    const {data} = await supabase.from('race_lists').insert({user_id:userId,name:newName.trim()}).select().single()
    if (data) { setLists(p=>[data,...p]); setNewName(''); setCreating(false) }
  }

  return (
    <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, padding:'20px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#1B2A4A', letterSpacing:1 }}>My Lists</div>
        <button onClick={()=>setCreating(p=>!p)} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:1 }}>+ New</button>
      </div>
      {creating && (
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="List name..." autoFocus
            onKeyDown={e=>e.key==='Enter'&&createList()}
            style={{ flex:1, padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e6ed', background:'#fafbfc', color:'#1B2A4A', fontFamily:"'Barlow',sans-serif", fontSize:14, outline:'none' }}
            onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#e2e6ed'} />
          <button onClick={createList} style={{ padding:'9px 16px', border:'none', borderRadius:8, background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, color:'#fff', cursor:'pointer', textTransform:'uppercase', letterSpacing:1 }}>Create</button>
        </div>
      )}
      {loading ? (
        <div style={{ height:40, borderRadius:8, background:'rgba(27,42,74,0.04)', animation:'pulse 1.5s ease infinite' }} />
      ) : lists.length === 0 ? (
        <div style={{ padding:'16px', textAlign:'center', border:'1.5px dashed #e2e6ed', borderRadius:10 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'#9aa5b4', marginBottom:8 }}>No lists yet — create one to save races from Discover.</div>
          <button onClick={()=>navigate('/discover')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:1 }}>Browse Races →</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {lists.map(list => (
            <div key={list.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', border:'1px solid #e8eaed', borderRadius:10, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.background='rgba(201,168,76,0.03)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#e8eaed';e.currentTarget.style.background='transparent'}}>
              <div style={{ width:30, height:30, borderRadius:8, background:'rgba(27,42,74,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2h10v10H2V2z" stroke="#9aa5b4" strokeWidth="1.2" strokeLinejoin="round"/><path d="M4 5h6M4 7h6M4 9h4" stroke="#9aa5b4" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:600, color:'#1B2A4A' }}>{list.name}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#9aa5b4' }}>{new Date(list.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
              </div>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="#9aa5b4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── The Wall featured ─────────────────────────────────────────────────────────
function WallFeatured({ navigate }) {
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, padding:'20px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:2 }}>Featured Story</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#1B2A4A', letterSpacing:1, lineHeight:1 }}>The Wall</div>
        </div>
        <button onClick={()=>navigate('/wall')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:1, color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>See All →</button>
      </div>
      <div onClick={()=>navigate('/wall')}
        style={{ border:'1px solid #e8eaed', borderRadius:12, padding:14, cursor:'pointer', transition:'all 0.2s' }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.background='rgba(201,168,76,0.03)'}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='#e8eaed';e.currentTarget.style.background='transparent'}}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, color:'#C9A84C' }}>RG</span>
          </div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, color:'#1B2A4A', lineHeight:1 }}>Ryan Groene</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:'#9aa5b4' }}>IRONMAN 70.3 Eagleman · Jun 2025</div>
          </div>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:'#1B2A4A', letterSpacing:0.5, lineHeight:1.3, marginBottom:10 }}>
          My dad lost nearly 100 pounds and finished a 5K. That's my why.
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#e24b4a"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#9aa5b4' }}>847</span>
          </div>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:'#9aa5b4', marginLeft:'auto' }}>3 min read</span>
        </div>
      </div>
    </div>
  )
}

// ── Partners ──────────────────────────────────────────────────────────────────
function Partners() {
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:14, padding:'20px 24px' }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'3px', color:'#C9A84C', textTransform:'uppercase', marginBottom:4 }}>Race Passport</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#1B2A4A', letterSpacing:1 }}>Partners</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
        {['Gear Partner','Nutrition Partner','Training Partner','Recovery Partner'].map(p => (
          <div key={p} style={{ border:'1.5px dashed #e2e6ed', borderRadius:10, padding:'14px', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6, cursor:'pointer', transition:'all 0.2s', minHeight:64 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(201,168,76,0.4)';e.currentTarget.style.background='rgba(201,168,76,0.03)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e6ed';e.currentTarget.style.background='transparent'}}>
            <div style={{ width:24, height:24, borderRadius:6, border:'1px solid #e2e6ed', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="#9aa5b4" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', textAlign:'center' }}>{p}</div>
          </div>
        ))}
      </div>
      <button onClick={()=>window.open('mailto:partners@racepassportapp.com','_blank')}
        style={{ width:'100%', padding:'10px', border:'1.5px solid #e2e6ed', borderRadius:8, background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'1.5px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.color='#C9A84C'}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e6ed';e.currentTarget.style.color='#1B2A4A'}}>
        Become a Partner →
      </button>
    </div>
  )
}

// ── Main Home ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const isMobile   = useIsMobile()

  const [profile, setProfile]             = useState(null)
  const [passportRaces, setPassportRaces] = useState([])
  const [showDropdown, setShowDropdown]   = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [greeting, setGreeting]           = useState('GOOD MORNING')
  const [showImportBanner, setShowImportBanner] = useState(!!location.state?.imported)
  const [importedCount] = useState(location.state?.imported || 0)
  const [nearbyRaces, setNearbyRaces]     = useState([])
  const [nearbyLoading, setNearbyLoading] = useState(true)
  const [upcomingRace, setUpcomingRace]   = useState(null)
  const dropdownRef = useRef(null)
  const stravaJustConnected = location.state?.stravaConnected

  useEffect(() => {
    const h = new Date().getHours()
    if (h>=12&&h<17) setGreeting('GOOD AFTERNOON')
    else if (h>=17)  setGreeting('GOOD EVENING')

    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) {
        setProfile({ full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}`, state:'MD' })
        setPassportRaces(RYAN_STAMPS)
        setUpcomingRace({ ...RYAN_STAMPS[0], id:9, date:'Sep 21, 2026', date_sort:'2026-09-21', location:'Bethesda, MD' })
        setNearbyLoading(false)
        return
      }
      const { data:prof } = await supabase.from('profiles').select('*').eq('id',user.id).single()
      setProfile(prof)
      const { data:praces } = await supabase.from('passport_races').select('*').eq('user_id',user.id).order('date_sort',{ascending:false})
      if (praces) {
        setPassportRaces(praces)
        const today = new Date().toISOString().split('T')[0]
        setUpcomingRace(praces.find(rc=>rc.date_sort&&rc.date_sort>=today)||null)
        // Background auto-scoring
        const unscored = praces.filter(rc=>rc.time&&rc.pacer_score==null)
        if (unscored.length>0) {
          const autoScore = async () => {
            const updated = []
            for (const rc of unscored) {
              try {
                const isPartial = !rc.strava_activity_id
                const resp = await fetch('/api/pacer',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'race_score', is_partial:isPartial, race:{id:rc.id,name:rc.name,distance:rc.distance,time:rc.time,is_pr:rc.is_pr||false}, all_races:praces }) })
                if (!resp.ok) continue
                const sd = await resp.json()
                if (sd?.score&&sd?.grade) {
                  await supabase.from('passport_races').update({pacer_score:Number(sd.score),pacer_grade:sd.grade,pacer_score_partial:isPartial}).eq('id',rc.id)
                  updated.push({id:rc.id,pacer_score:Number(sd.score),pacer_grade:sd.grade,pacer_score_partial:isPartial})
                }
              } catch(e) {}
            }
            if (updated.length>0) setPassportRaces(prev=>prev.map(rc=>{const u=updated.find(x=>x.id===rc.id);return u?{...rc,...u}:rc}))
          }
          autoScore()
        }
      }
      setNearbyLoading(false)
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
    const handleClick = e => { if(dropdownRef.current&&!dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown',handleClick)
    return () => { document.getElementById('rp-home-styles')?.remove(); document.removeEventListener('mousedown',handleClick) }
  }, [user])

  useEffect(() => {
    if (!stravaJustConnected||!user||isDemo(user?.email)) return
    let n=0; const poll=async()=>{ n++; const{data}=await supabase.from('profiles').select('*').eq('id',user.id).single(); if(data?.strava_connected&&data?.strava_access_token) setProfile(data); else if(n<8) setTimeout(poll,800) }; poll()
  }, [stravaJustConnected, user])

  const { connected:stravaConnected, stats:stravaStats, monthMiles, todayMiles } = useStrava(profile, user?.id)

  const raceStatItems = useMemo(() => {
    if (!passportRaces.length) return RACE_STAT_ITEMS
    const PR_DISTANCES = {
      '5K':{ label:'5K PR', dists:['5K','5k'] }, '10K':{ label:'10K PR', dists:['10K','10k'] },
      '13.1':{ label:'Half PR', dists:['13.1','Half Marathon','half marathon'] },
      '26.2':{ label:'Marathon PR', dists:['26.2','Marathon','marathon'] },
      '70.3':{ label:'70.3 PR', dists:['70.3'] }, '140.6':{ label:'140.6 PR', dists:['140.6'] },
    }
    const prs = []
    const toSecs = s => { if(!s) return Infinity; const p=s.split(':').map(Number); return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+(p[1]||0) }
    Object.values(PR_DISTANCES).forEach(({label,dists}) => {
      const matches = passportRaces.filter(r=>dists.some(d=>(r.distance||'').toLowerCase()===d.toLowerCase())&&r.time)
      if (matches.length) { const best=matches.reduce((a,b)=>toSecs(a.time)<=toSecs(b.time)?a:b); prs.push({label,value:best.time}) }
    })
    return [{ label:'Total Races', value:`${passportRaces.length}` }, ...prs]
  }, [passportRaces])

  const statItems = stravaConnected && stravaStats ? stravaStatsToItems(stravaStats, monthMiles, todayMiles, raceStatItems) : raceStatItems

  const stamps = useMemo(() => {
    if (!passportRaces.length) return RYAN_STAMPS
    return passportRaces.slice(0,20).map(r => {
      const dp = (r.date||'').split(' ')
      return { id:r.id, distance:r.distance, name:r.name, location:r.location||[r.city,r.state].filter(Boolean).join(', '), month:dp[0]||'', year:dp[1]||dp[0]||'' }
    })
  }, [passportRaces])

  const firstName   = profile?.full_name?.split(' ')[0] || ''
  const initials    = (profile?.full_name||'RP').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }
  const userId = user?.id

  // Career score
  const scoredRaces = passportRaces.filter(r=>r.pacer_score)
  const careerScore = scoredRaces.length
    ? Math.round(scoredRaces.reduce((s,r)=>s+r.pacer_score,0)/scoredRaces.length)
    : passportRaces.length>0
      ? Math.min(98,60+Math.min(20,passportRaces.length*3)+Math.min(10,Object.keys(passportRaces.reduce((m,r)=>{m[r.distance]=1;return m},{})).length*2))
      : null
  const careerGrade = careerScore ? gradeFromScore(careerScore) : null

  // Race Readiness from profile cache
  const rrScore = profile?.race_readiness_score || null
  const rrGrade = profile?.race_readiness_grade || null

  const handleConnectStrava = async () => {
    let uid = user?.id
    if (!uid) { try { const{data:{session}}=await supabase.auth.getSession(); uid=session?.user?.id } catch(e) {} }
    sessionStorage.setItem('strava_return_to','/home')
    if (uid) sessionStorage.setItem('strava_user_id',uid)
    const r = await fetch(`/api/strava?action=auth_url${uid?`&user_id=${uid}`:''}`)
    const d = await r.json()
    if (d.url) window.location.href = d.url
  }

  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'The Wall', path:'/wall',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2c0 4-5 6-5 10a5 5 0 0 0 10 0c0-4-5-6-5-10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:'/profile',  icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#f4f5f8', fontFamily:"'Barlow',sans-serif", position:'relative', overflowX:'hidden' }}>
      <ParallaxBackground />

      {/* ── NAV ── */}
      {isMobile ? (
        <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <img src={isDark?'/icon-dark-1024.png':'/icon-light-1024.png'} alt="Race Passport" style={{ width:36, height:36, borderRadius:10, objectFit:'cover', flexShrink:0 }} />
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</div>
            </div>
            <button onClick={()=>{setShowMobileMenu(!showMobileMenu);setShowDropdown(false)}}
              style={{ width:40, height:40, borderRadius:8, background:'transparent', border:`1.5px solid ${t.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer', padding:8, flexShrink:0 }}>
              <div style={{ width:18, height:2, background:t.text, borderRadius:1, transition:'all 0.2s', transform:showMobileMenu?'rotate(45deg) translateY(7px)':'none' }} />
              <div style={{ width:18, height:2, background:t.text, borderRadius:1, opacity:showMobileMenu?0:1, transition:'opacity 0.15s' }} />
              <div style={{ width:18, height:2, background:t.text, borderRadius:1, transition:'all 0.2s', transform:showMobileMenu?'rotate(-45deg) translateY(-7px)':'none' }} />
            </button>
          </div>
          {!showMobileMenu && (
            <div style={{ padding:'10px 16px 12px', borderTop:`1px solid ${t.navBorder}` }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:t.text, letterSpacing:'1.5px', lineHeight:1 }}>{greeting}{firstName?`, ${firstName.toUpperCase()}`:''}.</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:'#C9A84C', letterSpacing:'1.5px', lineHeight:1, marginTop:2 }}>GO RUN THE WORLD.</div>
            </div>
          )}
          {showMobileMenu && (
            <div style={{ background:t.surface, borderTop:`1px solid ${t.border}` }}>
              {NAV_TABS.map(tab=>(
                <button key={tab.path} onClick={()=>{navigate(tab.path);setShowMobileMenu(false)}}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:16, padding:'16px 20px', background:location.pathname===tab.path?t.surfaceAlt:'transparent', border:'none', borderLeft:location.pathname===tab.path?'3px solid #C9A84C':'3px solid transparent', cursor:'pointer', transition:'all 0.15s' }}>
                  <span style={{ color:location.pathname===tab.path?'#C9A84C':t.textMuted }}>{tab.icon}</span>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:location.pathname===tab.path?t.text:t.textMuted }}>{tab.label}</span>
                </button>
              ))}
              <div style={{ padding:'14px 20px', borderTop:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:600, letterSpacing:1, color:t.text }}>Dark Mode</span>
                <button onClick={toggleTheme} style={{ width:42, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                  <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 21px)':'3px', width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                </button>
              </div>
              <button onClick={handleSignOut} style={{ width:'100%', padding:'16px 20px', background:'transparent', border:'none', borderTop:`1px solid ${t.border}`, textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:600, letterSpacing:1, color:'#c53030', cursor:'pointer' }}>Log Out</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow }}>
          <div style={{ width:'100%', padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 0' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</span>
            </div>
            <div style={{ display:'flex', alignItems:'stretch' }}>
              {NAV_TABS.map(tab=>(
                <button key={tab.path} className="rp-nav-tab" style={{ color:location.pathname===tab.path?t.text:t.textMuted, borderBottomColor:location.pathname===tab.path?'#C9A84C':'transparent' }} onClick={()=>navigate(tab.path)}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div ref={dropdownRef} style={{ position:'relative' }}>
                <div onClick={()=>setShowDropdown(!showDropdown)} style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.borderColor=t.border}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:'#C9A84C', letterSpacing:1 }}>{initials}</span>
                </div>
                {showDropdown && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, boxShadow:t.cardShadowHover, minWidth:200, overflow:'hidden', zIndex:100 }}>
                    <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:t.text }}>{profile?.full_name||''}</div>
                    </div>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={()=>{navigate('/passport');setShowDropdown(false)}} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>My Passport</button>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={()=>{navigate('/profile');setShowDropdown(false)}} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Settings</button>
                    <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, letterSpacing:1, color:t.text }}>Dark Mode</span>
                      <button onClick={toggleTheme} style={{ width:38, height:22, borderRadius:11, border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                        <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                      </button>
                    </div>
                    <div style={{ height:1, background:t.borderLight }} />
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
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:600, letterSpacing:1, color:'#fff' }}>{importedCount} races added to your Race Passport!</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <span onClick={()=>navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer' }}>View Passport →</span>
            <span onClick={()=>setShowImportBanner(false)} style={{ color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:20, lineHeight:1 }}>✕</span>
          </div>
        </div>
      )}

      {/* ── GREETING ── */}
      {!isMobile && (
        <div style={{ position:'relative', zIndex:10, background:'#fff', borderBottom:'1px solid #e8eaed', padding:'36px 40px 32px' }}>
          <div style={{ maxWidth:MAX_W, margin:'0 auto', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:32 }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,60px)', color:'#1B2A4A', letterSpacing:2, lineHeight:1, marginBottom:4 }}>
                {greeting}{firstName?`, ${firstName.toUpperCase()}`:''}.</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,60px)', color:'#C9A84C', letterSpacing:2, lineHeight:1 }}>
                GO RUN THE WORLD.</div>
            </div>
            {/* Score rings */}
            {passportRaces.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:24, flexShrink:0 }}>
                {/* Career Grade — Gold */}
                {careerScore && (
                  <div style={{ textAlign:'center' }}>
                    <div style={{ position:'relative', width:90, height:90 }}>
                      <svg viewBox="0 0 90 90" width="90" height="90">
                        <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="7"/>
                        <circle cx="45" cy="45" r="38" fill="none" stroke="#C9A84C" strokeWidth="7"
                          strokeDasharray={`${(careerScore/100*238.8).toFixed(1)} 238.8`} strokeLinecap="round" transform="rotate(-90 45 45)"/>
                      </svg>
                      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:'#1B2A4A', lineHeight:1 }}>{careerScore}</div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:'#C9A84C', lineHeight:1 }}>{careerGrade}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginTop:5 }}>Career Grade</div>
                  </div>
                )}
                {/* Race Readiness — Navy */}
                {rrScore && (
                  <div style={{ textAlign:'center' }}>
                    <div style={{ position:'relative', width:90, height:90 }}>
                      <svg viewBox="0 0 90 90" width="90" height="90">
                        <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(27,42,74,0.1)" strokeWidth="7"/>
                        <circle cx="45" cy="45" r="38" fill="none" stroke="#1B2A4A" strokeWidth="7"
                          strokeDasharray={`${(rrScore/100*238.8).toFixed(1)} 238.8`} strokeLinecap="round" transform="rotate(-90 45 45)"/>
                      </svg>
                      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:'#1B2A4A', lineHeight:1 }}>{rrScore}</div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:'#1B2A4A', lineHeight:1 }}>{rrGrade}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginTop:5 }}>Race Readiness</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ position:'relative', zIndex:10, maxWidth:MAX_W, margin:'0 auto', padding:isMobile?'16px 12px 100px':'32px 24px 80px', display:'flex', flexDirection:'column', gap:32 }}>

        {/* ══ PACER INTELLIGENCE ══ */}
        <section>
          <SectionHeader label="Pacer · AI Race Intelligence" title="Pacer Insights" />
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Stats bar / Strava connect */}
            {stravaConnected
              ? <StatsTicker items={statItems} />
              : <StravaConnectCard onConnect={handleConnectStrava} />
            }
            {/* Race Readiness */}
            <RaceReadinessCard
              profile={profile}
              passportRaces={passportRaces}
              stravaProfile={profile}
              stravaConnected={stravaConnected}
              t={t}
              isMobile={isMobile}
              onConnectStrava={handleConnectStrava}
            />
            {/* Pacer insight */}
            <PacerDashboard races={passportRaces} profile={profile} />
            {/* Race Grades */}
            {passportRaces.some(r=>r.pacer_grade) && (
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:10 }}>Your Race Grades</div>
                <RaceGrades races={passportRaces} navigate={navigate} />
              </div>
            )}
          </div>
        </section>

        {/* ══ YOUR RACE HISTORY ══ */}
        <section>
          <SectionHeader label="Your Passport" title="Race History" />
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Stamps */}
            <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:16, padding:'20px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#1B2A4A', letterSpacing:1 }}>Your Stamps</div>
                <button onClick={()=>navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:1, color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>View All →</button>
              </div>
              {stamps.length === 0 ? (
                <div style={{ padding:24, textAlign:'center', border:'1px dashed #e2e6ed', borderRadius:12 }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'#9aa5b4', marginBottom:12 }}>Add your first race to start building your Passport.</div>
                  <button onClick={()=>navigate('/race-import')} style={{ padding:'8px 18px', border:'none', borderRadius:8, background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:1, color:'#fff', cursor:'pointer', textTransform:'uppercase' }}>Add Races →</button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:24, overflowX:'auto', paddingBottom:8, paddingTop:4, scrollbarWidth:'none' }}>
                  {stamps.slice(0,12).map(s => (
                    <Stamp key={s.id} distance={s.distance} name={s.name} location={s.location} month={s.month} year={s.year} size={isMobile?95:110} onClick={()=>navigate(`/race/${s.id}`)} />
                  ))}
                  <div onClick={()=>navigate('/passport')} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer', justifyContent:'flex-start', paddingTop:4 }}>
                    <div style={{ width:isMobile?95:110, height:isMobile?95:110, borderRadius:'50%', border:'1.5px dashed #e2e6ed', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.transform='scale(1.05)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e6ed';e.currentTarget.style.transform='scale(1)'}}>
                      <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, color:'#C9A84C', textAlign:'center' }}>More</div>
                  </div>
                </div>
              )}
            </div>
            {/* Timeline */}
            <RaceTimeline races={stamps} isMobile={isMobile} />
            {/* Milestones */}
            {passportRaces.length > 0 && (
              <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:16, padding:'20px 24px' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#1B2A4A', letterSpacing:1, marginBottom:16 }}>Milestones</div>
                <Milestones races={passportRaces} />
              </div>
            )}
          </div>
        </section>

        {/* ══ THE RACING WORLD ══ */}
        <section>
          <SectionHeader label="Race Passport" title="The Racing World" />
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Departures Board */}
            <DeparturesBoard races={passportRaces} />
            {/* Next Race or Discover */}
            {upcomingRace
              ? <NextRaceHero race={upcomingRace} isMobile={isMobile} />
              : <DiscoverSection nearbyRaces={nearbyRaces} nearbyLoading={nearbyLoading} navigate={navigate} />
            }
          </div>
        </section>

        {/* ══ YOUR PASSPORT ══ */}
        <section>
          <SectionHeader label="Settings & Tools" title="Your Passport" />
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <GoalCard profile={profile} navigate={navigate} />
            {userId && <MyLists userId={userId} navigate={navigate} />}
          </div>
        </section>

        {/* ══ COMMUNITY ══ */}
        <section>
          <SectionHeader label="Race Passport" title="Community" />
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <WallFeatured navigate={navigate} />
            <Partners />
          </div>
        </section>

      </div>
    </div>
  )
}
