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

// Race PR stats — from passport data (hardcoded for now, Strava supplements)
const RACE_STAT_ITEMS = [
  { label:'Total Races',    value:'10'      },
  { label:'Race Miles',     value:'199'     },
  { label:'5K PR',          value:'28:16'   },
  { label:'10K PR',         value:'47:49'   },
  { label:'Half PR',        value:'1:57:40' },
  { label:'Marathon PR',    value:'4:44:47' },
  { label:'70.3 PR',        value:'6:32:08' },
  { label:'Marathons',      value:'2'       },
  { label:'Half Marathons', value:'3'       },
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

// Read any races the user registered for via the "Did you sign up?" flow
function getSessionUpcoming() {
  try { return JSON.parse(sessionStorage.getItem('rp_upcoming') || '[]') } catch(e) { return [] }
}

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
function StatsTicker({ t, items }) {
  const displayItems = [...(items||[]), ...(items||[]), ...(items||[])]
  return (
    <div style={{ background:'#1B2A4A', overflow:'hidden', position:'relative', borderTop:`1px solid rgba(201,168,76,0.12)`, borderBottom:`1px solid rgba(201,168,76,0.12)` }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:60, background:'linear-gradient(to right,#1B2A4A,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:60, background:'linear-gradient(to left,#1B2A4A,transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:8, left:16, display:'flex', alignItems:'center', gap:'6px', zIndex:3 }}>
        <div style={{ width:14, height:14, borderRadius:'3px', background:'#FC4C02', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.25)', letterSpacing:'1px' }}>Synced via Strava</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', padding:'20px 0', animation:'statsTicker 50s linear infinite', width:'max-content' }}>
        {displayItems.map((item, i) => (
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

// ── Strava connect — full width ───────────────────────────────────────────────
function StravaConnect({ t, onConnect }) {
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
      <button onClick={onConnect} style={{ flexShrink:0, background:'#FC4C02', border:'none', borderRadius:'8px', padding:'12px 28px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:700, letterSpacing:'2px', color:'#fff', textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap', transition:'opacity 0.15s' }}
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
  const colors  = getDistanceColor(distance)
  const cleaned = (distance||'').replace(' mi','').replace(' miles','')
  const fs = size <= 36
    ? (cleaned.length > 4 ? 7 : cleaned.length > 2 ? 9 : 12)
    : (cleaned.length > 4 ? 10 : cleaned.length > 2 ? 13 : 17)
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${colors.stampBorder}`, background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', inset: size<=36?2:3, borderRadius:'50%', border:`0.75px dashed ${colors.stampDash}` }} />
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.stampText, letterSpacing:'0.3px', position:'relative', zIndex:1, textAlign:'center', lineHeight:1 }}>{cleaned}</span>
    </div>
  )
}

// All card clicks always navigate to the detail page
function handleCardClick(race, navigate) {
  navigate(`/race-detail/${race.id}`)
}

function NearbyCard({ race, t, compact, fitScore }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const [isLogo, setIsLogo] = useState(false)
  const navigate = useNavigate()
  const cardRef = useRef(null)

  useEffect(() => {
    setPhotoLoaded(false)
    setPhoto(PHOTO_PLACEHOLDER)
    setIsLogo(false)
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const logoUrl = race.logo_url || race.hero_image
      if (logoUrl) {
        setPhoto(logoUrl)
        setIsLogo(true)
        setPhotoLoaded(true)
      } else {
        loadRacePhoto(race).then(url => { if (url) { setPhoto(url); setPhotoLoaded(true) } })
      }
    }, { rootMargin:'100px' })
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [race.id])

  const imgH = compact ? 130 : 220

  return (
    <div ref={cardRef} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => handleCardClick(race, navigate)}
      style={{ borderRadius:'14px', overflow:'hidden', background:t.surface, boxShadow: hovered ? t.cardShadowHover : t.cardShadow, cursor:'pointer', transition:'transform 0.2s,box-shadow 0.2s', transform: hovered ? 'translateY(-5px)' : 'none', flexShrink:0, width: compact ? 'clamp(200px,60vw,280px)' : 'clamp(260px,26vw,380px)' }}>
      <div style={{ position:'relative', height:imgH, overflow:'hidden', background:'#1B2A4A' }}>
        {isLogo ? (
          /* Logo: centered on dark background with drop shadow */
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'12px', background:'#1B2A4A' }}>
            <img src={photo} alt={race.name} style={{ maxWidth:'85%', maxHeight:'85%', objectFit:'contain', opacity: photoLoaded ? 1 : 0, transition:'opacity 0.3s', filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} onLoad={() => setPhotoLoaded(true)} onError={() => { setIsLogo(false); setPhotoLoaded(false) }} />
          </div>
        ) : (
          /* City photo: full cover */
          <>
            <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s, opacity 0.4s', transform: hovered ? 'scale(1.05)' : 'scale(1)', opacity: photoLoaded ? 1 : 0 }} onLoad={() => setPhotoLoaded(true)} onError={e => e.target.style.display='none'} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 20%,rgba(0,0,0,0.55))' }} />
          </>
        )}
        {!compact && (
          <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', opacity: hovered ? 1 : 0, transition:'opacity 0.25s', padding:'16px', zIndex:5 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', width:'100%' }}>
              {[
                { label:'Distance', value: race.distance || '—' },
                { label:'Price',    value: race.price ? `$${race.price}` : 'See Site' },
                { label:'Date',     value: race.date || '—' },
                { label:'Location', value: race.city || race.location || '—' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'3px' }}>{s.label}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#fff', letterSpacing:'0.5px', lineHeight:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ position:'absolute', bottom:8, left:8 }}>
          <CardStamp distance={race.distance} size={compact ? 36 : 48} />
        </div>
      </div>
      <div style={{ padding: compact ? '10px 12px' : '14px 16px', borderTop:`1px solid ${t.borderLight}` }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: compact ? '15px' : '19px', color:t.text, letterSpacing:'0.5px', marginBottom:'4px', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize: compact ? '11px' : '13px', color:t.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.city || race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize: compact ? '11px' : '14px', fontWeight:600, color:t.text, flexShrink:0 }}>{race.date}</div>
        </div>
        {fitScore && (
          <div style={{ marginTop:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'10px', padding:'2px 7px' }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', color:'#C9A84C', letterSpacing:'0.5px' }}>{fitScore.score}%</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'0.5px', color:'#C9A84C' }}>FIT</span>
            </div>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fitScore.reason}</span>
          </div>
        )}
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

function UpcomingCard({ race, t, compact }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const [isLogo, setIsLogo] = useState(false)
  const navigate = useNavigate()
  const countdown = useCountdown(race.date_sort || race.date)
  const cardRef = useRef(null)

  useEffect(() => {
    setPhotoLoaded(false)
    setPhoto(PHOTO_PLACEHOLDER)
    setIsLogo(false)
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const logoUrl = race.logo_url || race.hero_image
      if (logoUrl) {
        setPhoto(logoUrl); setIsLogo(true); setPhotoLoaded(true)
      } else {
        loadRacePhoto(race).then(url => { if (url) { setPhoto(url); setPhotoLoaded(true) } })
      }
    }, { rootMargin:'100px' })
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [race.id])

  const imgH = compact ? 120 : 200

  return (
    <div ref={cardRef} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => handleCardClick(race, navigate)}
      style={{ borderRadius:'14px', overflow:'hidden', background:t.surface, boxShadow: hovered ? t.cardShadowHover : t.cardShadow, cursor:'pointer', transition:'transform 0.2s,box-shadow 0.2s', transform: hovered ? 'translateY(-5px)' : 'none', flexShrink:0, width: compact ? 'clamp(200px,60vw,280px)' : 'clamp(260px,26vw,380px)' }}>
      <div style={{ position:'relative', height:imgH, overflow:'hidden', background:'#1B2A4A' }}>
        {isLogo ? (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'12px', background:'#1B2A4A' }}>
            <img src={photo} alt={race.name} style={{ maxWidth:'85%', maxHeight:'85%', objectFit:'contain', opacity: photoLoaded ? 1 : 0, transition:'opacity 0.3s', filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} onLoad={() => setPhotoLoaded(true)} onError={() => { setIsLogo(false); setPhotoLoaded(false) }} />
          </div>
        ) : (
          <>
            <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s, opacity 0.4s', transform: hovered ? 'scale(1.05)' : 'scale(1)', opacity: photoLoaded ? 1 : 0 }} onLoad={() => setPhotoLoaded(true)} onError={e => e.target.style.display='none'} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 20%,rgba(0,0,0,0.55))' }} />
          </>
        )}
        {!compact && (
          <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity: hovered ? 1 : 0, transition:'opacity 0.25s', padding:'20px', zIndex:5 }}>
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
        )}
        {compact && !countdown.past && (
          <div style={{ position:'absolute', bottom:6, left:8, background:'rgba(0,0,0,0.6)', borderRadius:'6px', padding:'2px 8px' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, color:'#C9A84C', letterSpacing:'1px' }}>{countdown.days}d {countdown.hours}h</span>
          </div>
        )}
        <div style={{ position:'absolute', top:8, right:8, background:'rgba(27,42,74,0.88)', borderRadius:'6px', padding:'2px 8px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>Registered</div>
        <div style={{ position:'absolute', bottom: compact ? 'auto' : 12, top: compact ? 8 : 'auto', left:8 }}>
          <CardStamp distance={race.distance} size={compact ? 32 : 46} />
        </div>
      </div>
      <div style={{ padding: compact ? '8px 12px' : '14px 16px', borderTop:`1px solid ${t.borderLight}` }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: compact ? '14px' : '18px', color:t.text, letterSpacing:'0.5px', marginBottom:'3px', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize: compact ? '11px' : '13px', color:t.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.city || race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize: compact ? '11px' : '14px', fontWeight:600, color:t.text, flexShrink:0 }}>{race.date}</div>
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

function LoadMoreButton({ count, onClick, t }) {
  return (
    <button onClick={onClick}
      style={{ marginTop:'12px', padding:'8px 20px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.color='#C9A84C' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.color=t.textMuted }}>
      + {count} More Races
    </button>
  )
}

function NearbyRacesContent({ races, showAll, setShowAll, t, isMobile }) {
  const logoRaces    = races.filter(r => r.logo_url)
  const nonLogoRaces = races.filter(r => !r.logo_url)
  const visible      = showAll ? races : (logoRaces.length > 0 ? logoRaces : races.slice(0, 8))
  return (
    <>
      <ScrollRow>{visible.map(race => <NearbyCard key={race.id} race={race} t={t} compact={isMobile} />)}</ScrollRow>
      {!showAll && nonLogoRaces.length > 0 && logoRaces.length > 0 && (
        <LoadMoreButton count={nonLogoRaces.length} onClick={() => setShowAll(true)} t={t} />
      )}
    </>
  )
}

function SuggestedRacesContent({ races, showAll, setShowAll, t, isMobile, fitScores }) {
  const logoRaces    = races.filter(r => r.logo_url)
  const nonLogoRaces = races.filter(r => !r.logo_url)
  const visible      = showAll ? races : (logoRaces.length > 0 ? logoRaces : races.slice(0, 6))
  return (
    <>
      <ScrollRow>{visible.map(race => {
        const fit = fitScores?.[String(race.id)]
        return <NearbyCard key={race.id} race={race} t={t} compact={isMobile} fitScore={fit} />
      })}</ScrollRow>
      {!showAll && nonLogoRaces.length > 0 && logoRaces.length > 0 && (
        <LoadMoreButton count={nonLogoRaces.length} onClick={() => setShowAll(true)} t={t} />
      )}
    </>
  )
}

// ── Pacer Insight Card ────────────────────────────────────────────────────────
function PacerCard({ insight, loading, t, isMobile }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!loading && insight) setTimeout(() => setVisible(true), 100)
  }, [loading, insight])

  if (loading) return (
    <div style={{ marginBottom:'32px', borderRadius:'16px', background: t.isDark ? 'rgba(201,168,76,0.06)' : '#FFFDF5', border:`1px solid ${t.isDark ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.25)'}`, padding: isMobile ? '16px' : '20px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
      <div style={{ width:40, height:40, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>
        🏃
      </div>
      <div style={{ flex:1 }}>
        <div style={{ height:11, borderRadius:6, background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,42,74,0.07)', marginBottom:10, width:'65%', animation:'pulse 1.5s ease infinite' }} />
        <div style={{ height:10, borderRadius:6, background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(27,42,74,0.05)', width:'40%', animation:'pulse 1.5s ease infinite' }} />
      </div>
    </div>
  )

  if (!insight) return null

  return (
    <div style={{ marginBottom:'32px', borderRadius:'16px', background: t.isDark ? 'rgba(201,168,76,0.06)' : '#FFFDF5', border:`1px solid ${t.isDark ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.35)'}`, padding: isMobile ? '16px' : '20px 24px', display:'flex', alignItems:'flex-start', gap:'16px', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
      <div style={{ width:40, height:40, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'1px', fontSize:'20px', lineHeight:1 }}>
        🏃
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'7px' }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'2.5px', color:'#C9A84C' }}>PACER</span>
          <div style={{ width:3, height:3, borderRadius:'50%', background:'rgba(201,168,76,0.5)' }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Your AI Race Coach</span>
        </div>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontSize: isMobile ? '13px' : '14px', color:t.text, margin:'0 0 10px', lineHeight:1.65, fontWeight:400 }}>
          {insight.insight}
        </p>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background: t.isDark ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.12)', borderRadius:'20px', padding:'5px 12px' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1l1.5 3H10L7.5 6l1 3L5 7.5 1.5 9l1-3L0 4h3.5z" fill="#C9A84C"/></svg>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#C9A84C', letterSpacing:'0.5px' }}>{insight.next_step}</span>
        </div>
      </div>
    </div>
  )
}

// ── Readiness / Forecast Strip ────────────────────────────────────────────────
function ReadinessStrip({ readiness, loading, t, isMobile }) {
  if (loading) return (
    <div style={{ marginBottom:'32px', borderRadius:'12px', background: t.isDark ? 'rgba(27,42,74,0.4)' : 'rgba(27,42,74,0.04)', border:`1px solid ${t.border}`, padding:'14px 20px', display:'flex', alignItems:'center', gap:'16px' }}>
      <div style={{ height:10, borderRadius:5, background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,42,74,0.08)', width:'60%', animation:'pulse 1.5s ease infinite' }} />
    </div>
  )
  if (!readiness) return null
  const items = [
    { label:'Best Distance', value: readiness.best_distance },
    { label:'Est. Time',     value: readiness.time_range },
    { label:'Race Window',   value: readiness.race_window },
  ]
  return (
    <div style={{ marginBottom:'32px', borderRadius:'12px', background: t.isDark ? 'rgba(27,42,74,0.4)' : 'rgba(27,42,74,0.04)', border:`1px solid ${t.border}`, padding: isMobile ? '12px 16px' : '14px 24px', display:'flex', alignItems:'center', gap: isMobile ? '8px' : '0', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginRight:'20px', flexShrink:0 }}>
        <span style={{ fontSize:'14px' }}>🏃</span>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', letterSpacing:'2px', color:'#C9A84C' }}>PACER FORECAST</span>
      </div>
      {items.map((item, i) => (
        <div key={item.label} style={{ display:'flex', alignItems:'center', gap:'0' }}>
          {i > 0 && <div style={{ width:1, height:24, background:t.border, margin:'0 16px', flexShrink:0 }} />}
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>{item.label}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text, letterSpacing:'0.5px', lineHeight:1.2 }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Passport AI — gap detection strip ────────────────────────────────────────
function PassportAIStrip({ races, stravaConnected, t, isMobile, onNavigate }) {
  const message = useMemo(() => {
    if (!races || races.length === 0) return null
    // Find races with missing times
    const missingTime = races.filter(r => !r.time).length
    // Find gap > 1 year in race history
    const sorted = [...races].sort((a,b) => (b.date_sort||'').localeCompare(a.date_sort||''))
    let maxGap = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].date_sort && sorted[i+1].date_sort) {
        const gap = (new Date(sorted[i].date_sort) - new Date(sorted[i+1].date_sort)) / (1000*60*60*24*365)
        if (gap > maxGap) maxGap = gap
      }
    }
    if (stravaConnected) return { text: `Pacer scanned your Strava — check for any races you haven't added yet.`, action: 'Review Strava →', path: '/race-import' }
    if (missingTime > 0) return { text: `${missingTime} race${missingTime>1?'s':''} in your Passport ${missingTime>1?'are':'is'} missing finish times.`, action: 'Add Times →', path: '/passport' }
    if (maxGap > 1.2) return { text: `There's a gap in your race history. Did you race between ${sorted[sorted.length-1].date?.split(' ')[1]||'then'} and now?`, action: 'Import Races →', path: '/race-import' }
    return null
  }, [races, stravaConnected])

  if (!message) return null

  return (
    <div style={{ marginBottom:'24px', borderRadius:'10px', background: t.isDark ? 'rgba(201,168,76,0.05)' : 'rgba(201,168,76,0.06)', border:`1px solid ${t.isDark ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.2)'}`, padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
        <span style={{ fontSize:'16px', flexShrink:0 }}>🏃</span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.text, lineHeight:1.4 }}>
          <strong style={{ color:'#C9A84C' }}>Pacer: </strong>{message.text}
        </span>
      </div>
      <button onClick={() => onNavigate(message.path)}
        style={{ flexShrink:0, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', whiteSpace:'nowrap' }}>
        {message.action}
      </button>
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
  const [profile, setProfile]             = useState(null)
  const [passportRaces, setPassportRaces] = useState([])
  const [showDropdown, setShowDropdown]   = useState(false)
  const [greeting, setGreeting]           = useState('GOOD MORNING')
  const [showImportBanner, setShowImportBanner] = useState(!!location.state?.imported)
  const [importedCount]                   = useState(location.state?.imported || 0)
  const [nearbyRaces, setNearbyRaces]     = useState([])
  const [suggestedRaces, setSuggestedRaces] = useState([])
  const [showAllNearby, setShowAllNearby]   = useState(false)
  const [showAllSuggested, setShowAllSuggested] = useState(false)
  const [upcomingLogos, setUpcomingLogos]   = useState({})
  const [nearbyLoading, setNearbyLoading] = useState(true)
  const [pacerInsight, setPacerInsight]   = useState(null)
  const [pacerLoading, setPacerLoading]   = useState(false)
  const [readiness, setReadiness]         = useState(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [fitScores, setFitScores]         = useState({}) // race.id -> {score, reason}
  const dropdownRef = useRef(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 12 && h < 17) setGreeting('GOOD AFTERNOON')
    else if (h >= 17) setGreeting('GOOD EVENING')

    const loadPacerInsight = async (races, prof) => {
      if (!races || races.length === 0) return

      // Session cache — persist insight for the whole browser session
      // so navigating away and back doesn't regenerate it
      const cacheKey = `pacer_insight_v2_${prof?.full_name||'user'}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try { setPacerInsight(JSON.parse(cached)); return } catch(e) {}
      }

      setPacerLoading(true)
      try {
        const resp = await fetch('/api/pacer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'insight',
            races: races.slice(0, 15),
            profile: {
              first_name: (prof?.full_name || '').split(' ')[0],
              state: prof?.state,
              favorite_distance: prof?.favorite_distance,
              experience: prof?.experience_level,
            },
          }),
        })
        const data = await resp.json()
        if (data.insight) {
          setPacerInsight(data)
          sessionStorage.setItem(cacheKey, JSON.stringify(data))
        }
      } catch(e) { console.error('Pacer error:', e) }
      setPacerLoading(false)
    }

    const loadReadiness = async (races, prof) => {
      if (!races || races.length === 0) return
      const cacheKey = `pacer_readiness_v2_${prof?.full_name||'user'}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) { try { setReadiness(JSON.parse(cached)); return } catch(e) {} }
      setReadinessLoading(true)
      try {
        const resp = await fetch('/api/pacer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'readiness',
            races: races.slice(0, 15),
            profile: {
              first_name: (prof?.full_name||'').split(' ')[0],
              state: prof?.state,
              favorite_distance: prof?.favorite_distance,
            },
          }),
        })
        const data = await resp.json()
        if (data.best_distance) {
          setReadiness(data)
          sessionStorage.setItem(cacheKey, JSON.stringify(data))
        }
      } catch(e) {}
      setReadinessLoading(false)
    }

    const loadFitScores = async (races, prof, suggestedList) => {
      if (!races?.length || !suggestedList?.length) return
      try {
        const resp = await fetch('/api/pacer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fit_scores',
            races: races.slice(0, 10),
            profile: { state: prof?.state, favorite_distance: prof?.favorite_distance },
            races_to_score: suggestedList.slice(0, 8).map(r => ({
              id: String(r.id), name: r.name, distance: r.distance,
              city: r.city, state: r.state, date: r.date,
            })),
          }),
        })
        const data = await resp.json()
        if (data.scores?.length) {
          const map = {}
          data.scores.forEach(s => { map[s.id] = { score: s.score, reason: s.reason } })
          setFitScores(map)
        }
      } catch(e) {}
    }

    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) {
        const demoProfile = { full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}`, state:'MD', favorite_distance:'13.1' }
        const demoRaces = RYAN_STAMPS.map(s => ({ ...s, date:`${s.month} ${s.year}`, date_sort:`${s.year}-01-01` }))
        setProfile(demoProfile)
        setPassportRaces(demoRaces)
        loadNearbyAndSuggested('MD', '13.1')
        loadPacerInsight(demoRaces, demoProfile)
        loadReadiness(demoRaces, demoProfile)
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        loadNearbyAndSuggested(data?.state, data?.favorite_distance)
      }
      // Load passport races
      const { data: praces } = await supabase
        .from('passport_races')
        .select('*')
        .eq('user_id', user.id)
        .order('date_sort', { ascending: false })
      if (praces) {
        setPassportRaces(praces)
        loadPacerInsight(praces, data)
        loadReadiness(praces, data)
      }
    }

    const loadNearbyAndSuggested = async (userState, favDistance) => {
      setNearbyLoading(true)
      try {
        if (userState) {
          // Fetch logo races first, fall back to all races if not enough
          const { data: nearbyWithLogo } = await supabase
            .from('races')
            .select('id,name,location,city,state,lat,lng,distance,date,date_sort,price,terrain,elevation,registration_url,logo_url')
            .eq('state', userState.toUpperCase())
            .eq('is_past', false)
            .not('logo_url', 'is', null)
            .order('date_sort', { ascending: true })
            .limit(12)
          const { data: nearbyAll } = await supabase
            .from('races')
            .select('id,name,location,city,state,lat,lng,distance,date,date_sort,price,terrain,elevation,registration_url,logo_url')
            .eq('state', userState.toUpperCase())
            .eq('is_past', false)
            .order('date_sort', { ascending: true })
            .limit(20)
          // Merge: logo races first, then fill with non-logo races
          if (nearbyAll) {
            const logoIds = new Set((nearbyWithLogo||[]).map(r => r.id))
            const nonLogo = nearbyAll.filter(r => !logoIds.has(r.id))
            setNearbyRaces([...(nearbyWithLogo||[]), ...nonLogo])
          }

          if (favDistance) {
            const distMap = {
              '5K':'5K', '10K':'10K', '10 Mile':'10 mi',
              'Half Marathon':'13.1', 'Marathon':'26.2',
              'Ultra':'ULTRA', 'Triathlon':'70.3',
            }
            const targetDist = distMap[favDistance] || favDistance
            const { data: suggestedWithLogo } = await supabase
              .from('races')
              .select('id,name,location,city,state,lat,lng,distance,date,date_sort,price,terrain,elevation,registration_url,logo_url')
              .eq('is_past', false)
              .ilike('distance', targetDist)
              .neq('state', userState?.toUpperCase() || '')
              .not('logo_url', 'is', null)
              .order('date_sort', { ascending: true })
              .limit(12)
            const { data: suggestedAll } = await supabase
              .from('races')
              .select('id,name,location,city,state,lat,lng,distance,date,date_sort,price,terrain,elevation,registration_url,logo_url')
              .eq('is_past', false)
              .ilike('distance', targetDist)
              .neq('state', userState?.toUpperCase() || '')
              .order('date_sort', { ascending: true })
              .limit(20)
            const withLogo = suggestedWithLogo || []
            const all = suggestedAll || []
            if (withLogo.length || all.length) {
              const logoIds = new Set(withLogo.map(r => r.id))
              const nonLogo = all.filter(r => !logoIds.has(r.id))
              setSuggestedRaces([...withLogo, ...nonLogo])
            } else {
              // Fallback: any distance in any state
              const { data: fallback } = await supabase
                .from('races')
                .select('id,name,location,city,state,lat,lng,distance,date,date_sort,price,terrain,elevation,registration_url,logo_url')
                .eq('is_past', false)
                .ilike('distance', targetDist)
                .not('logo_url', 'is', null)
                .order('date_sort', { ascending: true })
                .limit(12)
              if (fallback) setSuggestedRaces(fallback)
            }
          }
        }
      } catch(e) { console.error('Failed to load nearby races:', e) }
      setNearbyLoading(false)
    }

    loadProfile()

    // Look up logo_url for upcoming races from the races table
    const upcoming = getSessionUpcoming()
    const mockIds = MOCK_UPCOMING.map(m => m.id)
    const allUpcomingIds = [...upcoming.map(r => String(r.id)), ...mockIds].filter(Boolean)
    if (allUpcomingIds.length > 0) {
      supabase.from('races').select('id,logo_url').in('id', allUpcomingIds)
        .then(({ data }) => {
          if (data) {
            const map = {}
            data.forEach(r => { if (r.logo_url) map[r.id] = r.logo_url })
            setUpcomingLogos(map)
          }
        })
    }

    const style = document.createElement('style')
    style.id = 'rp-home-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100%{opacity:0.5;}50%{opacity:1;} }
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

  const { connected: stravaConnected, stats: stravaStats, monthMiles, todayMiles, connectStrava } = useStrava(profile, user?.id)

  // Build PR stats from real passport races
  const raceStatItems = useMemo(() => {
    if (!passportRaces.length) return RACE_STAT_ITEMS
    const PR_DISTANCES = {
      '5K':   { label:'5K PR',       dists:['5K','5k'] },
      '10K':  { label:'10K PR',      dists:['10K','10k'] },
      '13.1': { label:'Half PR',     dists:['13.1','Half Marathon','half marathon'] },
      '26.2': { label:'Marathon PR', dists:['26.2','Marathon','marathon'] },
      '70.3': { label:'70.3 PR',     dists:['70.3'] },
      '140.6':{ label:'140.6 PR',    dists:['140.6'] },
    }
    const prs = []
    Object.values(PR_DISTANCES).forEach(({ label, dists }) => {
      const matches = passportRaces.filter(r => dists.some(d => (r.distance||'').toLowerCase() === d.toLowerCase()) && r.time)
      if (matches.length) {
        // Find best (shortest) time
        const best = matches.reduce((a, b) => {
          const toSecs = t => { if (!t) return Infinity; const p = t.split(':').map(Number); return p.length===3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+(p[1]||0) }
          return toSecs(a.time) <= toSecs(b.time) ? a : b
        })
        prs.push({ label, value: best.time })
      }
    })
    const totalRaces = passportRaces.length
    return [
      { label:'Total Races', value: `${totalRaces}` },
      ...prs,
    ]
  }, [passportRaces])

  // Build stat items — Strava activity stats + race PRs
  const statItems = stravaConnected && stravaStats
    ? stravaStatsToItems(stravaStats, monthMiles, todayMiles, raceStatItems)
    : raceStatItems

  // Build stamps from passport races (most recent first, max 20)
  const stamps = useMemo(() => {
    if (!passportRaces.length) return RYAN_STAMPS
    return passportRaces.slice(0, 20).map(r => {
      const dateParts = (r.date || '').split(' ')
      return {
        id:       r.id,
        distance: r.distance,
        name:     r.name,
        location: r.location || `${r.city || ''}${r.city && r.state ? ', ' : ''}${r.state || ''}`,
        month:    dateParts[0] || '',
        year:     dateParts[1] || dateParts[0] || '',
      }
    })
  }, [passportRaces])

  const stravaJustConnected = location.state?.stravaConnected

  // Load fit scores once both suggested races and passport races are available
  useEffect(() => {
    if (suggestedRaces.length > 0 && passportRaces.length > 0 && profile) {
      const prof = { state: profile.state, favorite_distance: profile.favorite_distance }
      // Use an inline async to avoid exposing loadFitScores outside the main effect
      const run = async () => {
        try {
          const resp = await fetch('/api/pacer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'fit_scores',
              races: passportRaces.slice(0, 10),
              profile: prof,
              races_to_score: suggestedRaces.slice(0, 8).map(r => ({
                id: String(r.id), name: r.name, distance: r.distance,
                city: r.city, state: r.state, date: r.date,
              })),
            }),
          })
          const data = await resp.json()
          if (data.scores?.length) {
            const map = {}
            data.scores.forEach(s => { map[s.id] = { score: s.score, reason: s.reason } })
            setFitScores(map)
          }
        } catch(e) {}
      }
      run()
    }
  }, [suggestedRaces.length, passportRaces.length])

  // When returning from Strava OAuth, poll Supabase until tokens are saved
  // The StravaCallback saves tokens then immediately redirects, so there can
  // be a brief window where the profile fetch returns stale data
  useEffect(() => {
    if (!stravaJustConnected || !user || isDemo(user?.email)) return
    let attempts = 0
    const poll = async () => {
      attempts++
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data?.strava_connected && data?.strava_access_token) {
        setProfile(data)
      } else if (attempts < 8) {
        setTimeout(poll, 800) // retry every 800ms, up to ~6 seconds
      }
    }
    poll()
  }, [stravaJustConnected, user])

  const firstName = profile?.full_name?.split(' ')[0] || 'Ryan'
  const initials  = (profile?.full_name || 'RG').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }
  const isMobile = useIsMobile()
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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

      {/* MOBILE NAV — Strava-style */}
      {isMobile ? (
        <>
          {/* Top bar: Logo + Hamburger */}
          <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px' }}>

              {/* RP Logo — real PNG */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <img
                  src={isDark ? '/icon-dark-1024.png' : '/icon-light-1024.png'}
                  alt="Race Passport"
                  style={{ width:36, height:36, borderRadius:'10px', objectFit:'cover', flexShrink:0 }}
                />
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'2.5px', color:t.text, lineHeight:1 }}>RACE PASSPORT</div>
              </div>

              {/* Hamburger */}
              <button onClick={() => { setShowMobileMenu(!showMobileMenu); setShowDropdown(false) }}
                style={{ width:40, height:40, borderRadius:'8px', background:'transparent', border:`1.5px solid ${t.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px', cursor:'pointer', padding:'8px', flexShrink:0 }}>
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', transition:'all 0.2s', transformOrigin:'center', transform: showMobileMenu ? 'rotate(45deg) translateY(7px)' : 'none' }} />
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', opacity: showMobileMenu ? 0 : 1, transition:'opacity 0.15s' }} />
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', transition:'all 0.2s', transformOrigin:'center', transform: showMobileMenu ? 'rotate(-45deg) translateY(-7px)' : 'none' }} />
              </button>
            </div>

            {/* Greeting row — like Strava's "Following" bar */}
            {!showMobileMenu && (
              <div style={{ padding:'10px 16px 12px', borderTop:`1px solid ${t.navBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1.5px', lineHeight:1 }}>{greeting}, {firstName.toUpperCase()}.</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1.5px', lineHeight:1, marginTop:'2px' }}>THE START LINE IS CALLING.</div>
                </div>
                {/* Avatar */}
                <div onClick={() => setShowDropdown(!showDropdown)}
                  style={{ width:34, height:34, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, flexShrink:0 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
                </div>
              </div>
            )}

            {/* Pancake menu — full page dropdown */}
            {showMobileMenu && (
              <div style={{ background:t.surface, borderTop:`1px solid ${t.border}` }}>
                {NAV_TABS.map(tab => (
                  <button key={tab.path} onClick={() => { navigate(tab.path); setShowMobileMenu(false) }}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:'16px', padding:'16px 20px', background: location.pathname === tab.path ? t.surfaceAlt : 'transparent', border:'none', borderLeft: location.pathname === tab.path ? '3px solid #C9A84C' : '3px solid transparent', cursor:'pointer', transition:'all 0.15s' }}>
                    <span style={{ color: location.pathname === tab.path ? '#C9A84C' : t.textMuted }}>{tab.icon}</span>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'16px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color: location.pathname === tab.path ? t.text : t.textMuted }}>{tab.label}</span>
                    {location.pathname === tab.path && (
                      <svg style={{ marginLeft:'auto' }} width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </button>
                ))}
                {/* Dark mode + profile in menu */}
                <div style={{ padding:'14px 20px', borderTop:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'1px', color:t.text }}>Dark Mode</span>
                  <button onClick={toggleTheme}
                    style={{ width:42, height:24, borderRadius:'12px', border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                    <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 21px)':'3px', width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
                <button onClick={handleSignOut}
                  style={{ width:'100%', padding:'16px 20px', background:'transparent', border:'none', borderTop:`1px solid ${t.border}`, textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, letterSpacing:'1px', color:'#c53030', cursor:'pointer' }}>
                  Log Out
                </button>
              </div>
            )}

            {/* Avatar dropdown */}
            {showDropdown && !showMobileMenu && (
              <div style={{ position:'absolute', right:16, top:'calc(100% + 4px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', minWidth:'200px', overflow:'hidden', zIndex:100 }}>
                <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{profile?.full_name || 'Ryan Groene'}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>racepassportapp.com</div>
                </div>
                <button className="rp-dropdown-item" style={{ color:t.text }} onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
                <button className="rp-dropdown-item" style={{ color:t.text }} onClick={() => { navigate('/profile'); setShowDropdown(false) }}>Settings</button>
                <button className="rp-dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut}>Log Out</button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* DESKTOP NAV */
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
              <div ref={dropdownRef} style={{ position:'relative' }}>
                <div onClick={() => setShowDropdown(!showDropdown)}
                  style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
                  onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
                </div>
                {showDropdown && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'200px', overflow:'hidden', zIndex:100, transition:'background 0.25s' }}>
                    <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{profile?.full_name || 'Ryan Groene'}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>racepassportapp.com/ryan-groene</div>
                    </div>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={() => { navigate('/passport'); setShowDropdown(false) }}
                      onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}>My Passport</button>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={() => { navigate('/profile'); setShowDropdown(false) }}
                      onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Settings</button>
                    <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text }}>Dark Mode</span>
                      <button onClick={toggleTheme}
                        style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s', background:isDark?'#C9A84C':'#d0d7e0', padding:0, flexShrink:0 }}>
                        <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
                      </button>
                    </div>
                    <div style={{ height:'1px', background:t.borderLight }} />
                    <button className="rp-dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut}
                      onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Log Out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportBanner && (
        <div style={{ position:'relative', zIndex:10, background:'#1B2A4A', borderBottom:'3px solid #C9A84C', padding: isMobile ? '12px 16px' : '14px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
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

      {/* DESKTOP GREETING + SPONSOR SLOT — hidden on mobile (shown above stats bar instead) */}
      {!isMobile && (
        <div style={{ position:'relative', zIndex:10, background:t.greetingBg, backdropFilter:'blur(2px)', borderBottom:`1px solid ${t.navBorder}`, padding:'40px 40px 34px', transition:'background 0.25s' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'24px' }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,64px)', color:t.text, letterSpacing:'2px', lineHeight:1, marginBottom:'4px', transition:'color 0.25s' }}>{greeting}, {firstName.toUpperCase()}.</div>
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

      {/* STATS BAR */}
      <div style={{ position:'relative', zIndex:10 }}>
        {stravaConnected
          ? <StatsTicker t={t} items={statItems} />
          : <StravaConnect t={t} onConnect={async () => {
              // Get user ID directly from Supabase — most reliable method
              let uid = user?.id || profile?.id
              if (!uid) {
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  uid = session?.user?.id
                } catch(e) {}
              }
              sessionStorage.setItem('strava_return_to', '/home')
              if (uid) sessionStorage.setItem('strava_user_id', uid)
              const r = await fetch(`/api/strava?action=auth_url${uid ? `&user_id=${uid}` : ''}`)
              const d = await r.json()
              if (d.url) window.location.href = d.url
            }} />}
      </div>

      {/* PAGE CONTENT */}
      <div style={{ position:'relative', zIndex:10, width:'100%', padding: isMobile ? '24px 16px 80px' : '36px 40px 80px' }}>

        {/* STRAVA UNREVIEWED BANNER */}
        {stravaConnected && (() => {
          // Check for upcoming races with unreviewed activities
          const sessionRaces = getSessionUpcoming()
          const upcoming = [...sessionRaces, ...MOCK_UPCOMING.filter(m => !sessionRaces.find(s => s.id === m.id))]
          if (upcoming.length === 0) return null
          const nextRace = upcoming[0]
          const hasUnreviewed = sessionStorage.getItem(`unreviewed_${nextRace.id}`) === 'true'
          if (!hasUnreviewed) return null
          return (
            <div style={{ marginBottom:'20px', borderRadius:'12px', background:'rgba(252,76,2,0.06)', border:'1px solid rgba(252,76,2,0.2)', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.text, lineHeight:1.4 }}>
                  <strong style={{ color:'#FC4C02' }}>New Strava activities</strong> — are any part of your <strong>{nextRace.name}</strong> training?
                </span>
              </div>
              <button onClick={() => { sessionStorage.removeItem(`unreviewed_${nextRace.id}`); navigate(`/race/${nextRace.id}/training`) }}
                style={{ flexShrink:0, padding:'7px 14px', border:'none', borderRadius:'8px', background:'#FC4C02', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'1px', color:'#fff', cursor:'pointer', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                Review →
              </button>
            </div>
          )
        })()}

        {/* PACER INSIGHT */}
        <PacerCard insight={pacerInsight} loading={pacerLoading} t={t} isMobile={isMobile} />

        {/* RACES NEAR YOU */}
        <div style={{ marginBottom:'52px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px' }}>
            <div>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px' }}>
                Races Near You{profile?.state ? ` in ${profile.state}` : ''}
              </span>
            </div>
            <button onClick={() => navigate('/discover')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>Browse All →</button>
          </div>
          {nearbyLoading ? (
            <div style={{ display:'flex', gap:'16px', overflow:'hidden' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ flexShrink:0, width: isMobile ? 'clamp(200px,60vw,280px)' : 'clamp(260px,22vw,320px)', borderRadius:'16px', overflow:'hidden', background:t.surface, height: isMobile ? '190px' : '300px', animation:'pulse 1.5s ease infinite' }}>
                  <div style={{ height: isMobile ? '130px' : '200px', background:t.surfaceAlt }} />
                </div>
              ))}
            </div>
          ) : nearbyRaces.length > 0 ? (
            <NearbyRacesContent races={nearbyRaces} showAll={showAllNearby} setShowAll={setShowAllNearby} t={t} isMobile={isMobile} />
          ) : (
            <div style={{ padding:'32px', textAlign:'center', background:t.surface, borderRadius:'16px', border:`1.5px dashed ${t.border}` }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.border, letterSpacing:'1px', marginBottom:'8px' }}>No races found nearby</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'16px' }}>Add your location in Profile to see races near you.</div>
              <button onClick={() => navigate('/profile')}
                style={{ padding:'8px 20px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
                Update Location →
              </button>
            </div>
          )}
        </div>

        {/* SUGGESTED FOR YOU */}
        {suggestedRaces.length > 0 && (
          <div style={{ marginBottom:'52px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px' }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'4px' }}>Pacer Picks · Based on your race history</div>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px' }}>Suggested For You</span>
              </div>
              <button onClick={() => navigate('/discover', { state:{ autoSearch:{ distFilter: profile?.favorite_distance === 'Half Marathon' ? '13.1' : profile?.favorite_distance || 'ALL' } } })}
                style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>
                See More →
              </button>
            </div>
            <SuggestedRacesContent races={suggestedRaces} showAll={showAllSuggested} setShowAll={setShowAllSuggested} t={t} isMobile={isMobile} fitScores={fitScores} />
          </div>
        )}

        {/* READINESS STRIP */}
        <ReadinessStrip readiness={readiness} loading={readinessLoading} t={t} isMobile={isMobile} />

        {/* YOUR STAMPS */}
        <div style={{ marginBottom:'52px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px' }}>Your Stamps</span>
            <button onClick={() => navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', border:'none', background:'none', padding:0 }}>View Passport →</button>
          </div>
          {/* Passport AI strip — above stamps */}
          <PassportAIStrip races={passportRaces} stravaConnected={stravaConnected} t={t} isMobile={isMobile} onNavigate={navigate} />
          <ScrollRow>
            {stamps.map(stamp => (
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
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px' }}>Your Upcoming Races</span>
          </div>
          {(() => {
            // Merge session-stored registrations with mock, deduplicate by id, sort by date
            const sessionRaces = getSessionUpcoming()
            const allUpcoming = [...sessionRaces, ...MOCK_UPCOMING.filter(m => !sessionRaces.find(s => s.id === m.id))]
            if (allUpcoming.length === 0) return (
              <div style={{ padding:'32px', textAlign:'center', background:t.surface, borderRadius:'16px', border:`1.5px dashed ${t.border}` }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.border, letterSpacing:'1px', marginBottom:'8px' }}>No upcoming races yet</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'16px' }}>Find a race and register to see your countdown here.</div>
                <button onClick={() => navigate('/discover')}
                  style={{ padding:'8px 20px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#C9A84C'}
                  onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
                  Find Races →
                </button>
              </div>
            )
            return <ScrollRow>{allUpcoming.map(race => <UpcomingCard key={race.id} race={{ ...race, logo_url: upcomingLogos[String(race.id)] || race.logo_url }} t={t} compact={isMobile} />)}</ScrollRow>
          })()}
        </div>

      </div>
    </div>
  )
}
