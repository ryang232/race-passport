import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// Stamp component
function Stamp({ distance, size = 56 }) {
  const isGold = (() => {
    const d = distance.toLowerCase().replace(/\s/g,'')
    if (['26.2','marathon','50k','50m','100k','100m','70.3','140.6'].includes(d)) return true
    const n = parseFloat(d); return !isNaN(n) && n >= 26.2
  })()
  const color = isGold ? '#C9A84C' : '#1B2A4A'
  const bg = isGold ? 'rgba(201,168,76,0.06)' : '#fff'
  const cleaned = distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 10 : cleaned.length > 2 ? 13 : 17
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${color}`, background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:`0.75px dashed ${isGold ? 'rgba(201,168,76,0.3)' : 'rgba(27,42,74,0.18)'}` }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color, lineHeight:1, letterSpacing:'0.04em', position:'relative', zIndex:1, textAlign:'center', padding:'0 3px' }}>{cleaned}</div>
    </div>
  )
}

// Mock data
const MOCK_STAMPS = [
  { id:1, distance:'140.6', name:'IRONMAN World', year:'2023' },
  { id:2, distance:'26.2', name:'NYC Marathon', year:'2024' },
  { id:3, distance:'70.3', name:'IRONMAN 70.3', year:'2024' },
  { id:4, distance:'13.1', name:'Cherry Blossom', year:'2025' },
  { id:5, distance:'10K', name:'Broad St Run', year:'2023' },
  { id:6, distance:'5K', name:'Turkey Trot', year:'2023' },
  { id:7, distance:'26.2', name:'Marine Corps', year:'2023' },
  { id:8, distance:'50K', name:'Seneca Creek', year:'2022' },
]

const MOCK_UPCOMING = [
  { id:1, name:'Marine Corps Marathon', date:'Oct 26', location:'Washington, DC', distance:'26.2', city:'Washington DC', photo:'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=600&q=80&fit=crop' },
  { id:2, name:'IRONMAN 70.3 Atlantic City', date:'Sept 14', location:'Atlantic City, NJ', distance:'70.3', city:'Atlantic City', photo:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop' },
  { id:3, name:'Cherry Blossom 10 Miler', date:'Apr 6', location:'Washington, DC', distance:'10 mi', city:'Washington DC', photo:'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=600&q=80&fit=crop' },
]

const MOCK_NEARBY = [
  { id:1, name:'Parks Half Marathon', date:'Sept 21', location:'Bethesda, MD', distance:'13.1' },
  { id:2, name:'Suds & Soles 5K', date:'Jun 13', location:'Rockville, MD', distance:'5K' },
  { id:3, name:'Baltimore 10 Miler', date:'Jun 6', location:'Baltimore, MD', distance:'10 mi' },
]

const STATS_ROTATION = [
  { label:'Races', value:'14' },
]

const MILES_ROTATION = [
  { label:'Miles Today', value:'6.2' },
  { label:'Miles This Week', value:'28.4' },
  { label:'Miles This Month', value:'112' },
  { label:'Miles This Year', value:'847' },
  { label:'Race Miles', value:'341' },
  { label:'Miles All Time', value:'2,841' },
]

const PR_ROTATION = [
  { label:'5K PR', value:'22:14' },
  { label:'10K PR', value:'46:38' },
  { label:'10 Mile PR', value:'1:18:22' },
  { label:'Half PR', value:'1:52:04' },
  { label:'Marathon PR', value:'4:02:11' },
]

function FlipStat({ items, interval = 3000 }) {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)
  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i+1) % items.length); setFade(true) }, 300)
    }, interval)
    return () => clearInterval(t)
  }, [items, interval])
  return (
    <div style={{ textAlign:'center', transition:'opacity 0.3s', opacity: fade ? 1 : 0 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>{items[idx].value}</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginTop:'4px' }}>{items[idx].label}</div>
    </div>
  )
}

function UpcomingCard({ race }) {
  return (
    <div style={{ borderRadius:'10px', overflow:'hidden', border:'1.5px solid #e2e6ed', background:'#fff', flexShrink:0, width:'220px', cursor:'pointer', transition:'transform 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
      <div style={{ position:'relative', height:110, background:'#1B2A4A', overflow:'hidden' }}>
        <img src={race.photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.4))' }} />
        <div style={{ position:'absolute', top:8, right:8, background:'rgba(201,168,76,0.9)', borderRadius:'4px', padding:'2px 8px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#1B2A4A', textTransform:'uppercase' }}>Registered</div>
      </div>
      <div style={{ padding:'10px 12px' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{race.date} · {race.location}</div>
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
  const [greeting, setGreeting] = useState('Good Morning')
  const [importedCount, setImportedCount] = useState(location.state?.imported || 0)
  const [showImportBanner, setShowImportBanner] = useState(!!location.state?.imported)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 12 && h < 17) setGreeting('Good Afternoon')
    else if (h >= 17) setGreeting('Good Evening')
    else setGreeting('Good Morning')

    const loadProfile = async () => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    loadProfile()

    const style = document.createElement('style')
    style.id = 'rp-home-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      .nav-tab { display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 16px; cursor:pointer; border:none; background:none; transition:color 0.15s; color:#9aa5b4; flex:1; }
      .nav-tab.active { color:#C9A84C; }
      .nav-tab svg { transition:color 0.15s; }
      .nearby-row { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:#fff; border-radius:8px; border:1px solid #e2e6ed; margin-bottom:8px; cursor:pointer; transition:border-color 0.15s; }
      .nearby-row:hover { border-color:#1B2A4A; }
      .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
      .section-title { font-family:'Bebas Neue',sans-serif; font-size:20px; color:#1B2A4A; letter-spacing:1px; }
      .view-all { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; color:#C9A84C; text-transform:uppercase; cursor:pointer; border:none; background:none; padding:0; }
      .dropdown-item { display:block; width:100%; padding:10px 16px; background:none; border:none; text-align:left; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:1px; color:#1B2A4A; cursor:pointer; transition:background 0.1s; }
      .dropdown-item:hover { background:#f4f5f7; }
    `
    if (!document.getElementById('rp-home-styles')) document.head.appendChild(style)

    // Close dropdown on outside click
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.getElementById('rp-home-styles')?.remove()
      document.removeEventListener('mousedown', handleClick)
    }
  }, [user])

  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.first_name || 'Racer'
  const initials = firstName[0] + (profile?.full_name?.split(' ')[1]?.[0] || '')

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div style={{ minHeight:'100vh', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif", paddingBottom:'80px' }}>

      {/* Import success banner */}
      {showImportBanner && (
        <div style={{ background:'#1B2A4A', borderBottom:'3px solid #C9A84C', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#fff' }}>
              {importedCount} races added to your Race Passport!
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <span onClick={() => navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer' }}>View Passport →</span>
            <span onClick={() => setShowImportBanner(false)} style={{ color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'16px' }}>✕</span>
          </div>
        </div>
      )}

      {/* Top nav */}
      <div style={{ background:'#fff', padding:'20px 20px 16px', borderBottom:'1px solid #e2e6ed', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', letterSpacing:'2px', color:'#1B2A4A' }}>RACE PASSPORT</span>
            </div>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'13px', color:'#9aa5b4', margin:0, fontWeight:300, lineHeight:1.4 }}>
              {greeting},{' '}
              <span style={{ color:'#1B2A4A', fontWeight:500 }}>the start line is calling, {firstName}.</span>
            </p>
          </div>

          {/* Profile dropdown */}
          <div ref={dropdownRef} style={{ position:'relative' }}>
            <div onClick={() => setShowDropdown(!showDropdown)}
              style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid #e2e6ed', flexShrink:0 }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1px' }}>{initials.toUpperCase()}</span>
            </div>
            {showDropdown && (
              <div style={{ position:'absolute', right:0, top:'48px', background:'#fff', border:'1px solid #e2e6ed', borderRadius:'8px', boxShadow:'0 8px 24px rgba(27,42,74,0.12)', minWidth:'160px', overflow:'hidden', zIndex:100 }}>
                <button className="dropdown-item" onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
                <button className="dropdown-item" onClick={() => { navigate('/build-passport'); setShowDropdown(false) }}>Settings</button>
                <div style={{ height:'1px', background:'#f0f2f5', margin:'4px 0' }} />
                <button className="dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut}>Log Out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:'640px', margin:'0 auto', padding:'20px 16px' }}>

        {/* Stats bar */}
        <div style={{ background:'#1B2A4A', borderRadius:'12px', padding:'20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0', marginBottom:'24px', border:'1px solid rgba(201,168,76,0.2)' }}>
          {/* Races */}
          <div style={{ textAlign:'center', borderRight:'1px solid rgba(255,255,255,0.08)', paddingRight:'12px' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>14</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginTop:'4px' }}>Races</div>
          </div>
          {/* Miles - flips */}
          <div style={{ borderRight:'1px solid rgba(255,255,255,0.08)', padding:'0 12px' }}>
            <FlipStat items={MILES_ROTATION} interval={3500} />
          </div>
          {/* PRs - flips */}
          <div style={{ borderRight:'1px solid rgba(255,255,255,0.08)', padding:'0 12px' }}>
            <FlipStat items={PR_ROTATION} interval={4000} />
          </div>
          {/* Upcoming */}
          <div style={{ textAlign:'center', paddingLeft:'12px', cursor:'pointer' }} onClick={() => navigate('/discover')}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>3</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginTop:'4px' }}>Upcoming</div>
          </div>
        </div>

        {/* Upcoming races */}
        <div style={{ marginBottom:'28px' }}>
          <div className="section-header">
            <span className="section-title">Upcoming Races</span>
            <button className="view-all" onClick={() => navigate('/discover')}>View All →</button>
          </div>
          <div style={{ display:'flex', gap:'12px', overflowX:'auto', paddingBottom:'8px' }}>
            {MOCK_UPCOMING.map(race => <UpcomingCard key={race.id} race={race} />)}
          </div>
        </div>

        {/* Stamps */}
        <div style={{ marginBottom:'28px' }}>
          <div className="section-header">
            <span className="section-title">Your Stamps</span>
            <button className="view-all" onClick={() => navigate('/passport')}>View Passport →</button>
          </div>
          <div style={{ display:'flex', gap:'12px', overflowX:'auto', paddingBottom:'8px', alignItems:'center' }}>
            {MOCK_STAMPS.map(stamp => (
              <div key={stamp.id} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                <Stamp distance={stamp.distance} size={64} />
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', letterSpacing:'0.5px', color:'#9aa5b4', textAlign:'center', maxWidth:'60px', lineHeight:1.2 }}>{stamp.name}</div>
              </div>
            ))}
            {/* Get more stamps */}
            <div onClick={() => navigate('/discover')} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', border:'2px dashed #e2e6ed', display:'flex', alignItems:'center', justifyContent:'center', background:'#fafbfc', transition:'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.borderColor='#e2e6ed'}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', letterSpacing:'0.5px', color:'#C9A84C', textAlign:'center', maxWidth:'60px', lineHeight:1.2 }}>Get More</div>
            </div>
          </div>
        </div>

        {/* Race Discovery */}
        <div style={{ marginBottom:'28px' }}>
          <div className="section-header">
            <span className="section-title">Races Near You</span>
            <button className="view-all" onClick={() => navigate('/discover')}>Browse All →</button>
          </div>
          {MOCK_NEARBY.map(race => (
            <div key={race.id} className="nearby-row" onClick={() => navigate(`/race/${race.id}`)}>
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:44, height:44, borderRadius:'8px', background:'#f0f2f5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'13px', color:'#1B2A4A', letterSpacing:'0.5px' }}>{race.distance}</span>
                </div>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A', letterSpacing:'0.5px', marginBottom:'2px' }}>{race.name}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4', letterSpacing:'0.5px' }}>{race.date} · {race.location}</div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                <path d="M6 3l5 5-5 5" stroke="#b0b8c4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom nav */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#fff', borderTop:'1px solid #e2e6ed', display:'flex', zIndex:20, padding:'4px 0 env(safe-area-inset-bottom)' }}>
        {[
          { label:'Home', path:'/home', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
          { label:'Discover', path:'/discover', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
          { label:'Passport', path:'/passport', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4"/></svg> },
          { label:'Profile', path:'/build-passport', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
        ].map(tab => {
          const active = location.pathname === tab.path
          return (
            <button key={tab.path} className={`nav-tab ${active ? 'active' : ''}`} onClick={() => navigate(tab.path)}>
              <span style={{ color: active ? '#C9A84C' : '#9aa5b4' }}>{tab.icon}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' }}>{tab.label}</span>
            </button>
          )
        })}
      </div>

    </div>
  )
}
