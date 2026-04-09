import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { fetchUnsplashPhoto } from '../lib/unsplash'

const STATS_COLS = [
  { key:'races', items:[
    { label:'Total Races', value:'14' },
    { label:'5K Races', value:'6' },
    { label:'10K Races', value:'3' },
    { label:'13.1 Races', value:'2' },
    { label:'26.2 Races', value:'2' },
    { label:'70.3 Races', value:'1' },
  ]},
  { key:'miles', items:[
    { label:'Miles Today', value:'6.2' },
    { label:'Miles This Week', value:'28.4' },
    { label:'Miles This Month', value:'112' },
    { label:'Miles This Year', value:'847' },
    { label:'Race Miles', value:'341' },
    { label:'Miles All Time', value:'2,841' },
  ]},
  { key:'prs', items:[
    { label:'5K PR', value:'22:14' },
    { label:'10K PR', value:'46:38' },
    { label:'10 Mile PR', value:'1:18:22' },
    { label:'Half PR', value:'1:52:04' },
    { label:'Marathon PR', value:'4:02:11' },
  ]},
]

const MOCK_NEARBY = [
  { id:1, name:'Parks Half Marathon', date:'Sept 21, 2026', location:'Bethesda, MD', distance:'13.1', query:'half marathon running race road crowd runners', terrain:'Road', elevation:'180ft', price:'$95', weeks:10 },
  { id:2, name:'Suds & Soles 5K', date:'Jun 13, 2026', location:'Rockville, MD', distance:'5K', query:'5K running race community street finish line', terrain:'Road', elevation:'85ft', price:'$35', weeks:4 },
  { id:3, name:'Baltimore 10 Miler', date:'Jun 6, 2026', location:'Baltimore, MD', distance:'10 mi', query:'Baltimore Inner Harbor waterfront Maryland cityscape', terrain:'Road', elevation:'210ft', price:'$65', weeks:8 },
  { id:4, name:'Annapolis Run Across the Bay', date:'Oct 12, 2026', location:'Annapolis, MD', distance:'10K', query:'Chesapeake Bay Bridge Maryland aerial water scenic', terrain:'Bridge/Road', elevation:'140ft', price:'$55', weeks:6 },
  { id:5, name:'DC Half Marathon', date:'Mar 15, 2026', location:'Washington, DC', distance:'13.1', query:'Washington DC Capitol monument running race road', terrain:'Road', elevation:'190ft', price:'$110', weeks:10 },
  { id:6, name:'Frederick Festival 5K', date:'May 2, 2026', location:'Frederick, MD', distance:'5K', query:'Frederick Maryland historic brick downtown street', terrain:'Road', elevation:'95ft', price:'$30', weeks:4 },
]

const MOCK_STAMPS = [
  { id:1, distance:'26.2', name:'Marine Corps Marathon', location:'Arlington, VA', month:'Oct', year:'2024' },
  { id:2, distance:'10K', name:'Broad Street Run', location:'Philadelphia, PA', month:'May', year:'2023' },
  { id:3, distance:'5K', name:'Turkey Trot', location:'Chicago, IL', month:'Nov', year:'2023' },
  { id:4, distance:'50K', name:'Seneca Creek Trail Ultra', location:'Gaithersburg, MD', month:'Mar', year:'2022' },
  { id:5, distance:'13.1', name:"Rock 'N' Roll Half", location:'Nashville, TN', month:'Apr', year:'2023' },
  { id:6, distance:'70.3', name:'IRONMAN 70.3', location:'Atlantic City, NJ', month:'Sept', year:'2024' },
  { id:7, distance:'5K', name:'Hot Cider Hustle', location:'Washington, DC', month:'Nov', year:'2022' },
]

const MOCK_UPCOMING = [
  { id:101, name:'Marine Corps Marathon', date:'Oct 29, 2026', location:'Washington, DC', distance:'26.2', query:'Washington DC marathon runners National Mall crowd street race' },
  { id:102, name:'IRONMAN 70.3 Atlantic City', date:'Sept 13, 2026', location:'Atlantic City, NJ', distance:'70.3', query:'triathlon ocean swim wetsuit athletes open water race start' },
  { id:103, name:'Cherry Blossom 10 Miler', date:'Apr 8, 2026', location:'Washington, DC', distance:'10 mi', query:'cherry blossom Washington DC Tidal Basin spring pink trees' },
]

const TICKER_ITEMS = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M']

function isGold(dist) {
  const d = dist.toLowerCase().replace(/\s/g,'')
  if (['26.2','marathon','50k','50m','100k','100m','70.3','140.6'].includes(d)) return true
  const n = parseFloat(d); return !isNaN(n) && n >= 26.2
}

function StatCol({ col }) {
  const [idx, setIdx] = useState(0)
  const items = col.items
  const prev = (e) => { e.stopPropagation(); setIdx(i => (i-1+items.length)%items.length) }
  const next = (e) => { e.stopPropagation(); setIdx(i => (i+1)%items.length) }
  const item = items[idx]
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4px 8px' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,3.5vw,48px)', color:'#fff', lineHeight:1, letterSpacing:'1px', textAlign:'center' }}>{item.value}</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', marginTop:'6px', marginBottom:'10px', textAlign:'center' }}>{item.label}</div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <button onClick={prev} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', padding:'2px 6px', fontSize:'18px', lineHeight:1, transition:'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color='#C9A84C'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.3)'}>‹</button>
        <div style={{ display:'flex', gap:'4px' }}>
          {items.map((_,i) => <div key={i} style={{ width:4, height:4, borderRadius:'50%', background: i===idx ? '#C9A84C' : 'rgba(255,255,255,0.2)', transition:'background 0.2s' }} />)}
        </div>
        <button onClick={next} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', padding:'2px 6px', fontSize:'18px', lineHeight:1, transition:'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color='#C9A84C'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.3)'}>›</button>
      </div>
    </div>
  )
}

function Stamp({ distance, name, location, month, year, size=130, onClick }) {
  const gold = isGold(distance)
  const color = gold ? '#C9A84C' : '#1B2A4A'
  const bg = gold ? 'rgba(201,168,76,0.06)' : '#fff'
  const cleaned = distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 18 : cleaned.length > 2 ? 22 : 32
  return (
    <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', cursor:'pointer', paddingBottom:'4px' }} onClick={onClick}>
      <div style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid ${color}`, background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', transition:'transform 0.15s, box-shadow 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow=`0 8px 24px ${gold ? 'rgba(201,168,76,0.25)' : 'rgba(27,42,74,0.15)'}` }}
        onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none' }}>
        <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:`1px dashed ${gold ? 'rgba(201,168,76,0.3)' : 'rgba(27,42,74,0.15)'}` }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color, lineHeight:1, letterSpacing:'0.04em', position:'relative', zIndex:1, textAlign:'center', padding:'0 10px' }}>{cleaned}</div>
        {name && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8.5px', fontWeight:600, letterSpacing:'1px', color, textTransform:'uppercase', textAlign:'center', padding:'0 14px', lineHeight:1.3, marginTop:'4px', position:'relative', zIndex:1, opacity:0.65 }}>{name}</div>}
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#1B2A4A', lineHeight:1.4 }}>{location}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', letterSpacing:'0.5px', marginTop:'2px' }}>{month} {year}</div>
      </div>
    </div>
  )
}

function NearbyCard({ race }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(null)
  const navigate = useNavigate()
  useEffect(() => { fetchUnsplashPhoto(race.query, 'running').then(url => setPhoto(url)) }, [race.query])
  const gold = isGold(race.distance)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/race/${race.id}`)}
      style={{ borderRadius:'14px', overflow:'hidden', background:'#fff', boxShadow: hovered ? '0 12px 32px rgba(27,42,74,0.18)' : '0 2px 12px rgba(27,42,74,0.08)', cursor:'pointer', transition:'transform 0.2s,box-shadow 0.2s', transform: hovered ? 'translateY(-5px)' : 'none', flexShrink:0, width:'clamp(260px,26vw,380px)' }}>
      <div style={{ position:'relative', height:220, overflow:'hidden', background:'#1B2A4A' }}>
        {photo ? <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s', transform: hovered ? 'scale(1.05)' : 'scale(1)' }} />
          : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1B2A4A,#2a3f6a)', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:32, height:32, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} /></div>}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 20%,rgba(0,0,0,0.55))' }} />
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.88)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', opacity: hovered ? 1 : 0, transition:'opacity 0.25s ease', padding:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', width:'100%' }}>
            {[{ label:'Terrain', value:race.terrain }, { label:'Price', value:race.price }, { label:'Elevation', value:race.elevation }].map(stat => (
              <div key={stat.label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'4px' }}>{stat.label}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#fff', letterSpacing:'0.5px', lineHeight:1 }}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div style={{ width:'100%', height:'1px', background:'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'4px' }}>Est. Training Time</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#C9A84C', letterSpacing:'1px', lineHeight:1 }}>{race.weeks} Weeks</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', color:'rgba(255,255,255,0.4)', marginTop:'3px', letterSpacing:'0.5px' }}>based on your experience + history</div>
          </div>
        </div>
        <div style={{ position:'absolute', bottom:12, left:12, opacity: hovered ? 0 : 1, transition:'opacity 0.2s' }}>
          <div style={{ width:52, height:52, borderRadius:'50%', border:`2px solid ${gold ? '#C9A84C' : '#fff'}`, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:`0.75px dashed ${gold ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.4)'}` }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: race.distance.length > 3 ? 9 : 13, color: gold ? '#C9A84C' : '#fff', letterSpacing:'0.5px', position:'relative', zIndex:1 }}>{race.distance.replace(' mi','')}</span>
          </div>
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'19px', color:'#1B2A4A', letterSpacing:'0.5px', marginBottom:'4px', lineHeight:1.2 }}>{race.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4' }}>{race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#1B2A4A' }}>{race.date}</div>
        </div>
      </div>
    </div>
  )
}

function UpcomingCard({ race }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(null)
  const navigate = useNavigate()
  useEffect(() => {
    const fallbackMap = { '26.2':'marathon', '70.3':'triathlon', '140.6':'triathlon' }
    fetchUnsplashPhoto(race.query, fallbackMap[race.distance] || 'running').then(url => setPhoto(url))
  }, [race.query, race.distance])
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/race/${race.id}`)}
      style={{ borderRadius:'14px', overflow:'hidden', background:'#fff', boxShadow: hovered ? '0 12px 32px rgba(27,42,74,0.18)' : '0 2px 12px rgba(27,42,74,0.08)', cursor:'pointer', transition:'transform 0.2s,box-shadow 0.2s', transform: hovered ? 'translateY(-5px)' : 'none', flexShrink:0, width:'clamp(260px,26vw,380px)' }}>
      <div style={{ position:'relative', height:200, overflow:'hidden', background:'#1B2A4A' }}>
        {photo ? <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s', transform: hovered ? 'scale(1.05)' : 'scale(1)' }} />
          : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1B2A4A,#2a3f6a)', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:32, height:32, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} /></div>}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 20%,rgba(0,0,0,0.55))' }} />
        <div style={{ position:'absolute', top:12, right:12, background:'rgba(201,168,76,0.92)', borderRadius:'6px', padding:'3px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', color:'#1B2A4A', textTransform:'uppercase' }}>Registered</div>
        <div style={{ position:'absolute', bottom:12, left:12 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', border:`2px solid ${isGold(race.distance) ? '#C9A84C' : '#fff'}`, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:`0.75px dashed ${isGold(race.distance) ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.4)'}` }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: race.distance.length > 3 ? 9 : 12, color: isGold(race.distance) ? '#C9A84C' : '#fff', letterSpacing:'0.5px', position:'relative', zIndex:1 }}>{race.distance.replace(' mi','')}</span>
          </div>
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', letterSpacing:'0.5px', marginBottom:'4px', lineHeight:1.2 }}>{race.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4' }}>{race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#1B2A4A' }}>{race.date}</div>
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
  const checkScroll = () => {
    const el = ref.current; if (!el) return
    setShowLeft(el.scrollLeft > 10)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }
  useEffect(() => {
    const el = ref.current
    if (el) { el.addEventListener('scroll', checkScroll); checkScroll() }
    return () => el?.removeEventListener('scroll', checkScroll)
  }, [])
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

// Scroll-parallax background — moves with user scroll, not auto-animate
function ParallaxBackground() {
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
        {items.map((d, i) => (
          <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,22vw,320px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.04)', lineHeight:1, padding:'0 40px', userSelect:'none', display:'inline-block' }}>{d}</span>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
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
    else setGreeting('GOOD MORNING')
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
      .nav-tab { display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 24px; height:64px; justify-content:center; cursor:pointer; border:none; background:none; color:#9aa5b4; transition:color 0.15s; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; position:relative; border-bottom:2px solid transparent; white-space:nowrap; }
      .nav-tab.active { color:#1B2A4A; border-bottom-color:#C9A84C; }
      .nav-tab:hover { color:#1B2A4A; }
      .dropdown-item { display:block; width:100%; padding:10px 18px; background:none; border:none; text-align:left; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:1px; color:#1B2A4A; cursor:pointer; transition:background 0.1s; white-space:nowrap; }
      .dropdown-item:hover { background:#f4f5f7; }
      .section-title { font-family:'Bebas Neue',sans-serif; font-size:26px; color:#1B2A4A; letter-spacing:1px; }
      .view-all-btn { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; color:#C9A84C; text-transform:uppercase; cursor:pointer; border:none; background:none; padding:0; }
      div::-webkit-scrollbar { display:none; }
    `
    if (!document.getElementById('rp-home-styles')) document.head.appendChild(style)
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-home-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user])

  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.first_name || 'Runner'
  const initials = (profile?.full_name || 'RG').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }

  const NAV_TABS = [
    { label:'Home', path:'/home', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile', path:'/build-passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif", position:'relative' }}>

      <ParallaxBackground />

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(8px)', borderBottom:'1px solid #e8eaed', boxShadow:'0 1px 8px rgba(27,42,74,0.06)' }}>
        <div style={{ width:'100%', padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <div style={{ display:'flex', alignItems:'stretch' }}>
            {NAV_TABS.map(tab => (
              <button key={tab.path} className={`nav-tab ${location.pathname === tab.path ? 'active' : ''}`} onClick={() => navigate(tab.path)}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
          <div ref={dropdownRef} style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <div onClick={() => setShowDropdown(!showDropdown)}
              style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid #e2e6ed', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
              onMouseLeave={e => e.currentTarget.style.borderColor='#e2e6ed'}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
            </div>
            {showDropdown && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'#fff', border:'1px solid #e2e6ed', borderRadius:'10px', boxShadow:'0 8px 32px rgba(27,42,74,0.14)', minWidth:'190px', overflow:'hidden', zIndex:100 }}>
                <div style={{ padding:'14px 18px 10px', borderBottom:'1px solid #f0f2f5' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A' }}>{profile?.full_name || 'Ryan Groene'}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>racepassportapp.com/ryan-groene</div>
                </div>
                <button className="dropdown-item" onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
                <button className="dropdown-item" onClick={() => { navigate('/build-passport'); setShowDropdown(false) }}>Settings</button>
                <div style={{ height:'1px', background:'#f0f2f5' }} />
                <button className="dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut}>Log Out</button>
              </div>
            )}
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

      {/* GREETING — slightly transparent so bg shows through */}
      <div style={{ position:'relative', zIndex:10, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(2px)', borderBottom:'1px solid #e8eaed', padding:'40px 40px 34px' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,64px)', color:'#1B2A4A', letterSpacing:'2px', lineHeight:1, marginBottom:'4px' }}>
          {greeting}, {firstName.toUpperCase()}.
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,64px)', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>
          THE START LINE IS CALLING.
        </div>
      </div>

      <div style={{ position:'relative', zIndex:10, width:'100%', padding:'36px 40px 80px' }}>

        {/* STATS */}
        <div style={{ background:'#1B2A4A', borderRadius:'16px', marginBottom:'48px', border:'1px solid rgba(201,168,76,0.15)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1px 1fr 1px 1fr 1px 1fr', padding:'28px 0', alignItems:'center' }}>
            <StatCol col={STATS_COLS[0]} />
            <div style={{ background:'rgba(255,255,255,0.08)', height:'70%', alignSelf:'center' }} />
            <StatCol col={STATS_COLS[1]} />
            <div style={{ background:'rgba(255,255,255,0.08)', height:'70%', alignSelf:'center' }} />
            <StatCol col={STATS_COLS[2]} />
            <div style={{ background:'rgba(255,255,255,0.08)', height:'70%', alignSelf:'center' }} />
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4px 16px', gap:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:28, height:28, borderRadius:'6px', background:'#FC4C02', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                </div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#fff', whiteSpace:'nowrap' }}>Connect Strava</div>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.4)', letterSpacing:'0.5px', textAlign:'center', lineHeight:1.5 }}>
                Sync real miles, PRs &amp; activity data automatically
              </div>
              <button style={{ background:'#FC4C02', border:'none', borderRadius:'6px', padding:'8px 20px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase', cursor:'pointer', transition:'opacity 0.15s', whiteSpace:'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                Connect Strava
              </button>
            </div>
          </div>
        </div>

        {/* RACES NEAR YOU */}
        <div style={{ marginBottom:'52px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px' }}>
            <span className="section-title">Races Near You</span>
            <button className="view-all-btn" onClick={() => navigate('/discover')}>Browse All →</button>
          </div>
          <ScrollRow>{MOCK_NEARBY.map(race => <NearbyCard key={race.id} race={race} />)}</ScrollRow>
        </div>

        {/* STAMPS */}
        <div style={{ marginBottom:'52px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
            <span className="section-title">Your Stamps</span>
            <button className="view-all-btn" onClick={() => navigate('/passport')}>View Passport →</button>
          </div>
          <ScrollRow>
            {MOCK_STAMPS.map(stamp => (
              <Stamp key={stamp.id} distance={stamp.distance} name={stamp.name} location={stamp.location} month={stamp.month} year={stamp.year} size={130}
                onClick={() => navigate(`/race/${stamp.id}`)} />
            ))}
            <div onClick={() => navigate('/discover')} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', cursor:'pointer', paddingBottom:'4px' }}>
              <div style={{ width:130, height:130, borderRadius:'50%', border:'2px dashed #d0d7e0', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.8)', transition:'border-color 0.15s, transform 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.transform='scale(1.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#d0d7e0'; e.currentTarget.style.transform='scale(1)' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 6v20M6 16h20" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C' }}>Get More Stamps</div>
              </div>
            </div>
          </ScrollRow>
        </div>

        {/* UPCOMING */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px' }}>
            <span className="section-title">Upcoming Races</span>
            <button className="view-all-btn" onClick={() => navigate('/discover')}>View All →</button>
          </div>
          <ScrollRow>{MOCK_UPCOMING.map(race => <UpcomingCard key={race.id} race={race} />)}</ScrollRow>
        </div>

      </div>
    </div>
  )
}
