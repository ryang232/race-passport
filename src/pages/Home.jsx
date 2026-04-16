import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'
import { PHOTO_PLACEHOLDER, loadRacePhoto } from '../lib/photos'

const STRAVA_CONNECTED = false

const STAT_ITEMS = [
  { label:'Total Races',    value:'10'      },
  { label:'Race Miles',     value:'199'     },
  { label:'5K PR',          value:'28:16'   },
  { label:'10K PR',         value:'47:49'   },
  { label:'Half PR',        value:'1:57:40' },
  { label:'Marathon PR',    value:'4:44:47' },
  { label:'70.3 PR',        value:'6:32:08' },
  { label:'Marathons',      value:'2'       },
  { label:'Half Marathons', value:'3'       },
  { label:'Triathlons',     value:'1'       },
  { label:'10K Races',      value:'3'       },
  { label:'5K Races',       value:'2'       },
]

const RYAN_STAMPS = [
  { id:9,  distance:'70.3',  name:'IRONMAN 70.3 Eagleman', location:'Cambridge, MD',   month:'Jun', year:'2025' },
  { id:8,  distance:'13.1',  name:'Austin Half Marathon',  location:'Austin, TX',      month:'Feb', year:'2025' },
  { id:7,  distance:'5K',    name:'Turkey Trot',           location:'Columbia, MD',    month:'Nov', year:'2024' },
  { id:6,  distance:'26.2',  name:'Marine Corps Marathon', location:'Washington, DC',  month:'Oct', year:'2023' },
  { id:5,  distance:'26.2',  name:'LA Marathon',           location:'Los Angeles, CA', month:'Mar', year:'2023' },
  { id:4,  distance:'13.1',  name:'Holiday Half',          location:'Annandale, VA',   month:'Dec', year:'2021' },
  { id:1,  distance:'10K',   name:'Sole of the City',      location:'Baltimore, MD',   month:'Oct', year:'2021' },
]

const MOCK_NEARBY = [
  { id:'d1', name:'Parks Half Marathon',      date:'Sept 21, 2026', location:'Bethesda, MD',   city:'Bethesda',    state:'MD', distance:'13.1',  terrain:'Road',        elevation:'180ft', price:'$95',  weeks:10, registration_url:'https://runsignup.com' },
  { id:'d2', name:'Suds & Soles 5K',          date:'Jun 13, 2026',  location:'Rockville, MD',  city:'Rockville',   state:'MD', distance:'5K',    terrain:'Road',        elevation:'85ft',  price:'$35',  weeks:4,  registration_url:'https://runsignup.com' },
  { id:'d3', name:'Baltimore 10 Miler',       date:'Jun 6, 2026',   location:'Baltimore, MD',  city:'Baltimore',   state:'MD', distance:'10 mi', terrain:'Road',        elevation:'210ft', price:'$65',  weeks:8,  registration_url:'https://runsignup.com' },
  { id:'d4', name:'Annapolis Bay Bridge Run', date:'Oct 12, 2026',  location:'Annapolis, MD',  city:'Annapolis',   state:'MD', distance:'10K',   terrain:'Bridge/Road', elevation:'140ft', price:'$55',  weeks:6,  registration_url:'https://runsignup.com' },
  { id:'d5', name:'DC Half Marathon',         date:'Mar 15, 2027',  location:'Washington, DC', city:'Washington',  state:'DC', distance:'13.1',  terrain:'Road',        elevation:'190ft', price:'$110', weeks:10, registration_url:'https://runsignup.com' },
  { id:'d6', name:'Marine Corps Marathon',    date:'Oct 26, 2026',  location:'Arlington, VA',  city:'Arlington',   state:'VA', distance:'26.2',  terrain:'Road',        elevation:'912ft', price:'$140', weeks:16, registration_url:'https://www.marinecorpsmarathon.com' },
]

const MOCK_UPCOMING = [
  { id:'u1', name:'Cherry Blossom 10 Miler',   date:'Apr 6, 2026',  location:'Washington, DC', city:'Washington', state:'DC', distance:'10 mi', registration_url:'https://www.cherryblossom.org' },
  { id:'u2', name:'Baltimore Running Festival', date:'Oct 18, 2026', location:'Baltimore, MD',  city:'Baltimore',  state:'MD', distance:'26.2',  registration_url:'https://www.thebaltimoremarathon.com' },
]

const TICKER_ITEMS = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M']

// ── Theme toggle button ───────────────────────────────────────────────────────
function ThemeToggle({ t, isDark, toggleTheme }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer' }} onClick={toggleTheme}>
      <button
        style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s', background: isDark ? '#C9A84C' : '#d0d7e0', padding:0, flexShrink:0 }}>
        <div style={{ position:'absolute', top:3, left: isDark ? 'calc(100% - 19px)' : '3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
      </button>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', whiteSpace:'nowrap' }}>Night Mode</span>
    </div>
  )
}

// ── Full-width stats conveyor belt ────────────────────────────────────────────
function StatsTicker({ t }) {
  const items = [...STAT_ITEMS, ...STAT_ITEMS, ...STAT_ITEMS]
  return (
    <div style={{ background:'#1B2A4A', overflow:'hidden', position:'relative', borderTop:`1px solid rgba(201,168,76,0.12)`, borderBottom:`1px solid rgba(201,168,76,0.12)` }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:120, background:'linear-gradient(to right,#1B2A4A,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:120, background:'linear-gradient(to left,#1B2A4A,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:10, right:32, display:'flex', alignItems:'center', gap:'6px', zIndex:3 }}>
        <div style={{ width:14, height:14, borderRadius:'3px', background:'#FC4C02', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.25)', letterSpacing:'1px' }}>Synced via Strava</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', padding:'26px 0', animation:'statsTicker 50s linear infinite', width:'max-content' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
            <div style={{ textAlign:'center', padding:'0 48px' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(44px,5vw,72px)', color:'#fff', lineHeight:1, letterSpacing:'2px', whiteSpace:'nowrap' }}>{item.value}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginTop:'6px', whiteSpace:'nowrap' }}>{item.label}</div>
            </div>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'rgba(201,168,76,0.25)', flexShrink:0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Strava connect — full width ───────────────────────────────────────────────
function StravaConnect({ t }) {
  return (
    <div style={{ background:'#1B2A4A', borderTop:'1px solid rgba(201,168,76,0.12)', borderBottom:'1px solid rgba(201,168,76,0.12)', padding:'24px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
        <div style={{ width:44, height:44, borderRadius:'10px', background:'rgba(252,76,2,0.12)', border:'1px solid rgba(252,76,2,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#fff', letterSpacing:'1px', lineHeight:1, marginBottom:'4px' }}>Connect Strava to unlock your stats</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'rgba(255,255,255,0.4)', letterSpacing:'0.5px' }}>Race miles, PRs by distance, activity history — all pulled automatically.</div>
        </div>
      </div>
      <button style={{ flexShrink:0, background:'#FC4C02', border:'none', borderRadius:'8px', padding:'12px 28px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:700, letterSpacing:'2px', color:'#fff', textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap', transition:'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity='0.85'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
        Connect Strava
      </button>
    </div>
  )
}

// ── Stamp ─────────────────────────────────────────────────────────────────────
function Stamp({ distance, name, location, month, year, size=130, onClick, t }) {
  const colors = getDistanceColor(distance)
  const cleaned = distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 18 : cleaned.length > 2 ? 22 : 32
  return (
    <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', cursor:'pointer', paddingBottom:'4px' }} onClick={onClick}>
      <div style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder}`, background: colors.isMarathonPlus ? 'rgba(201,168,76,0.06)' : '#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', transition:'transform 0.15s, box-shadow 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(27,42,74,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none' }}>
        <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.stampText, lineHeight:1, letterSpacing:'0.04em', position:'relative', zIndex:1, textAlign:'center', padding:'0 10px' }}>{cleaned}</div>
        {name && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8.5px', fontWeight:600, letterSpacing:'1px', color:colors.stampText, textTransform:'uppercase', textAlign:'center', padding:'0 14px', lineHeight:1.3, marginTop:'4px', position:'relative', zIndex:1, opacity:0.55 }}>{name.split(' ').slice(0,3).join(' ')}</div>}
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text, lineHeight:1.4 }}>{location}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, letterSpacing:'0.5px', marginTop:'2px' }}>{month} {year}</div>
      </div>
    </div>
  )
}

function CardStamp({ distance, size=48 }) {
  const colors = getDistanceColor(distance)
  const cleaned = (distance||'').replace(' mi','')
  const fs = cleaned.length > 3 ? 9 : cleaned.length > 2 ? 11 : 14
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${colors.stampBorder}`, background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:`0.75px dashed ${colors.stampDash}` }} />
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.stampText, letterSpacing:'0.5px', position:'relative', zIndex:1 }}>{cleaned}</span>
    </div>
  )
}

// All card clicks always navigate to the detail page
function handleCardClick(race, navigate) {
  navigate(`/race-detail/${race.id}`)
}

function NearbyCard({ race, t }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
  const navigate = useNavigate()
  useEffect(() => { loadRacePhoto(race).then(url => { if (url) setPhoto(url) }) }, [race.id])
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => handleCardClick(race, navigate)}
      style={{ borderRadius:'14px', overflow:'hidden', background:t.surface, boxShadow: hovered ? t.cardShadowHover : t.cardShadow, cursor:'pointer', transition:'transform 0.2s,box-shadow 0.2s', transform: hovered ? 'translateY(-5px)' : 'none', flexShrink:0, width:'clamp(260px,26vw,380px)' }}>
      <div style={{ position:'relative', height:220, overflow:'hidden', background:'#1B2A4A' }}>
        <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s', transform: hovered ? 'scale(1.05)' : 'scale(1)' }} onError={e => e.target.style.display='none'} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 20%,rgba(0,0,0,0.55))' }} />
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.9)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', opacity: hovered ? 1 : 0, transition:'opacity 0.25s', padding:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', width:'100%' }}>
            {[{ label:'Terrain', value:race.terrain },{ label:'Price', value:race.price },{ label:'Elevation', value:race.elevation }].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'4px' }}>{s.label}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#fff', letterSpacing:'0.5px', lineHeight:1 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ width:'100%', height:'1px', background:'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'4px' }}>Est. Training</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#C9A84C', letterSpacing:'1px', lineHeight:1 }}>{race.weeks} Weeks</div>
          </div>
        </div>
        <div style={{ position:'absolute', bottom:12, left:12, opacity: hovered ? 0 : 1, transition:'opacity 0.2s' }}>
          <CardStamp distance={race.distance} size={48} />
        </div>
      </div>
      <div style={{ padding:'14px 16px', borderTop:`1px solid ${t.borderLight}` }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'19px', color:t.text, letterSpacing:'0.5px', marginBottom:'6px', lineHeight:1.2 }}>{race.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted }}>{race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text }}>{race.date}</div>
        </div>
      </div>
    </div>
  )
}

function useCountdown(dateStr) {
  const [countdown, setCountdown] = useState({ days:0, hours:0, mins:0, secs:0, past:false })
  useEffect(() => {
    const parse = () => {
      const target = new Date(dateStr)
      if (isNaN(target)) return
      const diff = target - new Date()
      if (diff <= 0) { setCountdown(c => ({ ...c, past:true })); return }
      setCountdown({ days:Math.floor(diff/86400000), hours:Math.floor((diff%86400000)/3600000), mins:Math.floor((diff%3600000)/60000), secs:Math.floor((diff%60000)/1000), past:false })
    }
    parse(); const t = setInterval(parse, 1000); return () => clearInterval(t)
  }, [dateStr])
  return countdown
}

function UpcomingCard({ race, t }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
  const navigate = useNavigate()
  const countdown = useCountdown(race.date)
  useEffect(() => { loadRacePhoto(race).then(url => { if (url) setPhoto(url) }) }, [race.id])
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => handleCardClick(race, navigate)}
      style={{ borderRadius:'14px', overflow:'hidden', background:t.surface, boxShadow: hovered ? t.cardShadowHover : t.cardShadow, cursor:'pointer', transition:'transform 0.2s,box-shadow 0.2s', transform: hovered ? 'translateY(-5px)' : 'none', flexShrink:0, width:'clamp(260px,26vw,380px)' }}>
      <div style={{ position:'relative', height:200, overflow:'hidden', background:'#1B2A4A' }}>
        <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s', transform: hovered ? 'scale(1.05)' : 'scale(1)' }} onError={e => e.target.style.display='none'} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 20%,rgba(0,0,0,0.55))' }} />
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity: hovered ? 1 : 0, transition:'opacity 0.25s', padding:'20px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'16px' }}>{countdown.past ? 'Race Day!' : 'Countdown to Race Day'}</div>
          {countdown.past ? (
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'40px', color:'#C9A84C', letterSpacing:'2px' }}>GO TIME!</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', width:'100%' }}>
              {[{ val:String(countdown.days).padStart(2,'0'), label:'Days' },{ val:String(countdown.hours).padStart(2,'0'), label:'Hrs' },{ val:String(countdown.mins).padStart(2,'0'), label:'Min' },{ val:String(countdown.secs).padStart(2,'0'), label:'Sec' }].map(u => (
                <div key={u.label} style={{ textAlign:'center', background:'rgba(255,255,255,0.06)', borderRadius:'8px', padding:'10px 4px', border:'1px solid rgba(201,168,76,0.2)' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>{u.val}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', marginTop:'4px' }}>{u.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ position:'absolute', top:12, right:12, background:'rgba(27,42,74,0.88)', borderRadius:'6px', padding:'3px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase', opacity: hovered ? 0 : 1, transition:'opacity 0.2s' }}>Registered</div>
        <div style={{ position:'absolute', bottom:12, left:12, opacity: hovered ? 0 : 1, transition:'opacity 0.2s' }}>
          <CardStamp distance={race.distance} size={46} />
        </div>
      </div>
      <div style={{ padding:'14px 16px', borderTop:`1px solid ${t.borderLight}` }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:t.text, letterSpacing:'0.5px', marginBottom:'6px', lineHeight:1.2 }}>{race.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted }}>{race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text }}>{race.date}</div>
        </div>
      </div>
    </div>
  )
}

function ScrollRow({ children }) {
  const ref = useRef(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(true)
  const [hovering, setHovering] = useState(false)
  const checkScroll = () => { const el = ref.current; if (!el) return; setShowLeft(el.scrollLeft > 10); setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10) }
  useEffect(() => { const el = ref.current; if (el) { el.addEventListener('scroll', checkScroll); checkScroll() }; return () => el?.removeEventListener('scroll', checkScroll) }, [])
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 420, behavior:'smooth' })
  const btnStyle = { position:'absolute', top:'40%', transform:'translateY(-50%)', zIndex:10, width:44, height:44, borderRadius:'50%', background:'#1B2A4A', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(27,42,74,0.25)', transition:'background 0.15s' }
  return (
    <div style={{ position:'relative' }} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      {showLeft && hovering && <button onClick={() => scroll(-1)} style={{ ...btnStyle, left:-22 }} onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
      {showRight && hovering && <button onClick={() => scroll(1)} style={{ ...btnStyle, right:-22 }} onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
      <div ref={ref} style={{ display:'flex', gap:'24px', overflowX:'auto', paddingBottom:'12px', paddingTop:'4px', scrollbarWidth:'none', msOverflowStyle:'none' }}>
        {children}
      </div>
    </div>
  )
}

function ParallaxBackground({ t }) {
  const [offsetX, setOffsetX] = useState(0)
  useEffect(() => {
    const onScroll = () => setOffsetX(window.scrollY * 0.4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'50%', transform:`translateY(-50%) translateX(-${offsetX % 600}px)`, whiteSpace:'nowrap', willChange:'transform' }}>
        {items.map((d, i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,22vw,320px)', color:'transparent', WebkitTextStroke:`1px ${t.isDark ? 'rgba(201,168,76,0.04)' : 'rgba(27,42,74,0.04)'}`, lineHeight:1, padding:'0 40px', userSelect:'none', display:'inline-block' }}>{d}</span>)}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [greeting, setGreeting] = useState('GOOD MORNING')
  const [showImportBanner, setShowImportBanner] = useState(!!location.state?.imported)
  const [importedCount] = useState(location.state?.imported || 0)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 12 && h < 17) setGreeting('GOOD AFTERNOON')
    else if (h >= 17) setGreeting('GOOD EVENING')
    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) { setProfile({ full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}` }); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    loadProfile()
    const style = document.createElement('style')
    style.id = 'rp-home-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes statsTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
      .rp-nav-tab { display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 24px; height:64px; justify-content:center; cursor:pointer; border:none; background:none; transition:color 0.15s; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; border-bottom:2px solid transparent; white-space:nowrap; }
      .rp-dropdown-item { display:block; width:100%; padding:10px 18px; background:none; border:none; text-align:left; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:background 0.1s; }
      div::-webkit-scrollbar { display:none; }
    `
    if (!document.getElementById('rp-home-styles')) document.head.appendChild(style)
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-home-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user])

  const firstName = profile?.full_name?.split(' ')[0] || 'Ryan'
  const initials = (profile?.full_name || 'RG').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }

  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:'/profile',  icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", position:'relative', transition:'background 0.25s' }}>
      <ParallaxBackground t={t} />

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, transition:'background 0.25s, border-color 0.25s' }}>
        <div style={{ width:'100%', padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:t.text, transition:'color 0.25s' }}>RACE PASSPORT</span>
          </div>
          <div style={{ display:'flex', alignItems:'stretch' }}>
            {NAV_TABS.map(tab => (
              <button key={tab.path} className="rp-nav-tab"
                style={{ color: location.pathname === tab.path ? t.text : t.textMuted, borderBottomColor: location.pathname === tab.path ? '#C9A84C' : 'transparent' }}
                onClick={() => navigate(tab.path)}>{tab.icon}{tab.label}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <ThemeToggle t={t} isDark={isDark} toggleTheme={toggleTheme} />
            <div ref={dropdownRef} style={{ position:'relative' }}>
              <div onClick={() => setShowDropdown(!showDropdown)}
                style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
              </div>
              {showDropdown && (
                <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'190px', overflow:'hidden', zIndex:100, transition:'background 0.25s' }}>
                  <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{profile?.full_name || 'Ryan Groene'}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>racepassportapp.com/ryan-groene</div>
                  </div>
                  <button className="rp-dropdown-item" style={{ color:t.text }} onClick={() => { navigate('/passport'); setShowDropdown(false) }}
                    onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}>My Passport</button>
                  <button className="rp-dropdown-item" style={{ color:t.text }} onClick={() => { navigate('/profile'); setShowDropdown(false) }}
                    onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Settings</button>
                  <div style={{ height:'1px', background:t.borderLight }} />
                  <button className="rp-dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut}
                    onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Log Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showImportBanner && (
        <div style={{ position:'relative', zIndex:10, background:'#1B2A4A', borderBottom:'3px solid #C9A84C', padding:'14px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'1px', color:'#fff' }}>{importedCount} races added to your Race Passport!</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <span onClick={() => navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer' }}>View Passport →</span>
            <span onClick={() => setShowImportBanner(false)} style={{ color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'20px', lineHeight:1 }}>✕</span>
          </div>
        </div>
      )}

      {/* GREETING */}
      <div style={{ position:'relative', zIndex:10, background:t.greetingBg, backdropFilter:'blur(2px)', borderBottom:`1px solid ${t.navBorder}`, padding:'40px 40px 34px', transition:'background 0.25s' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,64px)', color:t.text, letterSpacing:'2px', lineHeight:1, marginBottom:'4px', transition:'color 0.25s' }}>{greeting}, {firstName.toUpperCase()}.</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,64px)', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>THE START LINE IS CALLING.</div>
      </div>

      {/* STATS BAR */}
      <div style={{ position:'relative', zIndex:10 }}>
        {STRAVA_CONNECTED ? <StatsTicker t={t} /> : <StravaConnect t={t} />}
      </div>

      {/* PAGE CONTENT */}
      <div style={{ position:'relative', zIndex:10, width:'100%', padding:'36px 40px 80px' }}>

        {/* RACES NEAR YOU */}
        <div style={{ marginBottom:'52px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px' }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px' }}>Races Near You</span>
            <button onClick={() => navigate('/discover')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>Browse All →</button>
          </div>
          <ScrollRow>{MOCK_NEARBY.map(race => <NearbyCard key={race.id} race={race} t={t} />)}</ScrollRow>
        </div>

        {/* YOUR STAMPS */}
        <div style={{ marginBottom:'52px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px' }}>Your Stamps</span>
            <button onClick={() => navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>View Passport →</button>
          </div>
          <ScrollRow>
            {RYAN_STAMPS.map(stamp => (
              <Stamp key={stamp.id} distance={stamp.distance} name={stamp.name} location={stamp.location} month={stamp.month} year={stamp.year} size={130} t={t} onClick={() => navigate(`/race/${stamp.id}`)} />
            ))}
            <div onClick={() => navigate('/discover')} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', cursor:'pointer', paddingBottom:'4px' }}>
              <div style={{ width:130, height:130, borderRadius:'50%', border:`2px dashed ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', background:t.isDark ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.8)', transition:'border-color 0.15s, transform 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.transform='scale(1.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.transform='scale(1)' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 6v20M6 16h20" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textAlign:'center' }}>Get More Stamps</div>
            </div>
          </ScrollRow>
        </div>

        {/* UPCOMING RACES */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px' }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px' }}>Upcoming Races</span>
            <button onClick={() => navigate('/discover')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>View All →</button>
          </div>
          <ScrollRow>{MOCK_UPCOMING.map(race => <UpcomingCard key={race.id} race={race} t={t} />)}</ScrollRow>
        </div>

      </div>
    </div>
  )
}
