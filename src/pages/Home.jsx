import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { fetchUnsplashPhoto, getFallback } from '../lib/unsplash'

const MOCK_UPCOMING = [
  { id:1, name:'Marine Corps Marathon', date:'Oct 29, 2026', location:'Washington, DC', distance:'26.2', query:'marathon runners city road race' },
  { id:2, name:'IRONMAN 70.3 Atlantic City', date:'Sept 13, 2026', location:'Atlantic City, NJ', distance:'70.3', query:'triathlon swim race athlete' },
  { id:3, name:'Cherry Blossom 10 Miler', date:'Apr 8, 2026', location:'Washington, DC', distance:'10 mi', query:'cherry blossom running spring race' },
]

const MOCK_STAMPS = [
  { id:1, distance:'26.2', name:'Marine Corps', year:'2023' },
  { id:2, distance:'13.1', name:'Cherry Blossom', year:'2024' },
  { id:3, distance:'70.3', name:'IRONMAN 70.3', year:'2024' },
  { id:4, distance:'10K', name:'Bay Bridge Run', year:'2024' },
  { id:5, distance:'5K', name:'Hot Cider Hustle', year:'2022' },
  { id:6, distance:'26.2', name:'NYC Marathon', year:'2022' },
  { id:7, distance:'10 mi', name:'Broad St Run', year:'2023' },
]

const MOCK_NEARBY = [
  { id:1, name:'Parks Half Marathon', date:'Sept 21', location:'Bethesda, MD', distance:'13.1' },
  { id:2, name:'Suds & Soles 5K', date:'Jun 13', location:'Rockville, MD', distance:'5K' },
  { id:3, name:'Baltimore 10 Miler', date:'Jun 6', location:'Baltimore, MD', distance:'10 mi' },
]

const MILES_ITEMS = [
  { label:'Miles Today', value:'6.2' },
  { label:'Miles This Week', value:'28.4' },
  { label:'Miles This Month', value:'112' },
  { label:'Miles This Year', value:'847' },
  { label:'Race Miles', value:'341' },
  { label:'Miles All Time', value:'2,841' },
]

const PR_ITEMS = [
  { label:'5K PR', value:'22:14' },
  { label:'10K PR', value:'46:38' },
  { label:'10 Mile PR', value:'1:18:22' },
  { label:'Half PR', value:'1:52:04' },
  { label:'Marathon PR', value:'4:02:11' },
]

function FlipStat({ items, interval = 3500 }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i+1) % items.length); setVisible(true) }, 280)
    }, interval)
    return () => clearInterval(t)
  }, [items, interval])
  return (
    <div style={{ textAlign:'center', transition:'opacity 0.28s', opacity: visible ? 1 : 0 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(26px,3.5vw,44px)', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>{items[idx].value}</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', marginTop:'6px' }}>{items[idx].label}</div>
    </div>
  )
}

function isGoldDistance(dist) {
  const d = dist.toLowerCase().replace(/\s/g,'')
  if (['26.2','marathon','50k','50m','100k','100m','70.3','140.6'].includes(d)) return true
  const n = parseFloat(d); return !isNaN(n) && n >= 26.2
}

function Stamp({ distance, size = 60 }) {
  const gold = isGoldDistance(distance)
  const color = gold ? '#C9A84C' : '#1B2A4A'
  const bg = gold ? 'rgba(201,168,76,0.07)' : '#fff'
  const cleaned = distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 10 : cleaned.length > 2 ? 13 : 17
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${color}`, background:bg, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', inset:5, borderRadius:'50%', border:`0.75px dashed ${gold ? 'rgba(201,168,76,0.3)' : 'rgba(27,42,74,0.15)'}` }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color, lineHeight:1, letterSpacing:'0.04em', position:'relative', zIndex:1, textAlign:'center', padding:'0 4px' }}>{cleaned}</div>
    </div>
  )
}

function RaceCard({ race }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(getFallback('running'))

  useEffect(() => {
    fetchUnsplashPhoto(race.query, 'running').then(url => setPhoto(url))
  }, [race.query])

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius:'12px', overflow:'hidden', background:'#fff',
        boxShadow: hovered ? '0 8px 28px rgba(27,42,74,0.16)' : '0 2px 10px rgba(27,42,74,0.08)',
        cursor:'pointer', transition:'transform 0.2s,box-shadow 0.2s',
        transform: hovered ? 'translateY(-4px)' : 'none',
        flexShrink:0, width:'clamp(260px,30vw,420px)',
      }}
    >
      <div style={{ position:'relative', height:220, overflow:'hidden', background:'#1B2A4A' }}>
        <img
          src={photo}
          alt={race.name}
          style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
        />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0) 40%,rgba(0,0,0,0.6))' }} />
        <div style={{ position:'absolute', top:12, right:12, background:'rgba(201,168,76,0.92)', borderRadius:'6px', padding:'3px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', color:'#1B2A4A', textTransform:'uppercase' }}>Registered</div>
        <div style={{ position:'absolute', bottom:12, left:12 }}>
          <Stamp distance={race.distance} size={44} />
        </div>
      </div>
      <div style={{ padding:'16px 18px' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#1B2A4A', letterSpacing:'0.5px', marginBottom:'5px', lineHeight:1.2 }}>{race.name}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4' }}>{race.date} · {race.location}</div>
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
      if (!user || isDemo(user?.email)) {
        setProfile({ full_name: `${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}` })
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    loadProfile()

    const style = document.createElement('style')
    style.id = 'rp-home-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      .nav-tab {
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        padding: 0 24px; height: 64px; justify-content: center;
        cursor: pointer; border: none; background: none; color: #9aa5b4;
        transition: color 0.15s; font-family: 'Barlow Condensed', sans-serif;
        font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
        position: relative; border-bottom: 2px solid transparent; white-space: nowrap;
      }
      .nav-tab.active { color: #1B2A4A; border-bottom-color: #C9A84C; }
      .nav-tab.active svg { color: #C9A84C; }
      .nav-tab:hover { color: #1B2A4A; }
      .dropdown-item { display: block; width: 100%; padding: 10px 18px; background: none; border: none; text-align: left; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1px; color: #1B2A4A; cursor: pointer; transition: background 0.1s; white-space: nowrap; }
      .dropdown-item:hover { background: #f4f5f7; }
      .nearby-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #fff; border-radius: 10px; box-shadow: 0 1px 6px rgba(27,42,74,0.06); margin-bottom: 10px; cursor: pointer; transition: box-shadow 0.15s, transform 0.15s; }
      .nearby-row:hover { box-shadow: 0 4px 16px rgba(27,42,74,0.12); transform: translateY(-1px); }
      .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #1B2A4A; letter-spacing: 1px; }
      .view-all-btn { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #C9A84C; text-transform: uppercase; cursor: pointer; border: none; background: none; padding: 0; }
    `
    if (!document.getElementById('rp-home-styles')) document.head.appendChild(style)

    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.getElementById('rp-home-styles')?.remove()
      document.removeEventListener('mousedown', handleClick)
    }
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
    <div style={{ minHeight:'100vh', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif" }}>

      {/* STICKY TOP NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#fff', borderBottom:'1px solid #e8eaed', boxShadow:'0 1px 8px rgba(27,42,74,0.06)' }}>
        <div style={{ width:'100%', padding:'0 32px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          {/* Tabs */}
          <div style={{ display:'flex', alignItems:'stretch' }}>
            {NAV_TABS.map(tab => (
              <button key={tab.path} className={`nav-tab ${location.pathname === tab.path ? 'active' : ''}`} onClick={() => navigate(tab.path)}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          {/* Avatar */}
          <div ref={dropdownRef} style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <div onClick={() => setShowDropdown(!showDropdown)}
              style={{ width:38, height:38, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid #e2e6ed', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
              onMouseLeave={e => e.currentTarget.style.borderColor='#e2e6ed'}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'13px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
            </div>
            {showDropdown && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'#fff', border:'1px solid #e2e6ed', borderRadius:'10px', boxShadow:'0 8px 32px rgba(27,42,74,0.14)', minWidth:'180px', overflow:'hidden', zIndex:100 }}>
                <div style={{ padding:'12px 18px 8px', borderBottom:'1px solid #f0f2f5' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#1B2A4A', letterSpacing:'0.5px' }}>{profile?.full_name || 'Ryan Groene'}</div>
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

      {/* Import banner */}
      {showImportBanner && (
        <div style={{ background:'#1B2A4A', borderBottom:'3px solid #C9A84C', padding:'12px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#fff' }}>{importedCount} races added to your Race Passport!</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <span onClick={() => navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer' }}>View Passport →</span>
            <span onClick={() => setShowImportBanner(false)} style={{ color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'18px', lineHeight:1 }}>✕</span>
          </div>
        </div>
      )}

      {/* GREETING */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed', padding:'32px 32px 28px' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,4.5vw,56px)', color:'#1B2A4A', letterSpacing:'2px', lineHeight:1, marginBottom:'4px' }}>
          {greeting}, {firstName.toUpperCase()}.
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,4.5vw,56px)', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>
          THE START LINE IS CALLING.
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ width:'100%', padding:'28px 32px 60px' }}>

        {/* STATS */}
        <div style={{ background:'#1B2A4A', borderRadius:'14px', padding:'26px 0', display:'grid', gridTemplateColumns:'1fr 1px 1fr 1px 1fr 1px 1fr', marginBottom:'36px', border:'1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ textAlign:'center', padding:'0 24px' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,4vw,44px)', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>14</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', marginTop:'6px' }}>Races</div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.08)' }} />
          <div style={{ padding:'0 24px' }}><FlipStat items={MILES_ITEMS} interval={3500} /></div>
          <div style={{ background:'rgba(255,255,255,0.08)' }} />
          <div style={{ padding:'0 24px' }}><FlipStat items={PR_ITEMS} interval={4000} /></div>
          <div style={{ background:'rgba(255,255,255,0.08)' }} />
          <div style={{ textAlign:'center', padding:'0 24px', cursor:'pointer' }} onClick={() => navigate('/discover')}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,4vw,44px)', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>3</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', marginTop:'6px' }}>Upcoming</div>
          </div>
        </div>

        {/* UPCOMING RACES */}
        <div style={{ marginBottom:'36px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
            <span className="section-title">Upcoming Races</span>
            <button className="view-all-btn" onClick={() => navigate('/discover')}>View All →</button>
          </div>
          <div style={{ display:'flex', gap:'20px', overflowX:'auto', paddingBottom:'8px' }}>
            {MOCK_UPCOMING.map(race => <RaceCard key={race.id} race={race} />)}
          </div>
        </div>

        {/* STAMPS */}
        <div style={{ marginBottom:'36px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
            <span className="section-title">Your Stamps</span>
            <button className="view-all-btn" onClick={() => navigate('/passport')}>View Passport →</button>
          </div>
          <div style={{ display:'flex', gap:'16px', overflowX:'auto', paddingBottom:'8px', alignItems:'flex-start' }}>
            {MOCK_STAMPS.map(stamp => (
              <div key={stamp.id} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
                <Stamp distance={stamp.distance} size={68} />
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', letterSpacing:'0.5px', color:'#9aa5b4', textAlign:'center', maxWidth:'68px', lineHeight:1.3 }}>{stamp.name}</div>
              </div>
            ))}
            <div onClick={() => navigate('/discover')} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', cursor:'pointer' }}>
              <div style={{ width:68, height:68, borderRadius:'50%', border:'2px dashed #e2e6ed', display:'flex', alignItems:'center', justifyContent:'center', background:'#fafbfc', transition:'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.borderColor='#e2e6ed'}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 5v12M5 11h12" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', letterSpacing:'0.5px', color:'#C9A84C', textAlign:'center', maxWidth:'68px', lineHeight:1.3 }}>Get More Stamps</div>
            </div>
          </div>
        </div>

        {/* RACES NEAR YOU */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
            <span className="section-title">Races Near You</span>
            <button className="view-all-btn" onClick={() => navigate('/discover')}>Browse All →</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'12px' }}>
            {MOCK_NEARBY.map(race => (
              <div key={race.id} className="nearby-row" onClick={() => navigate(`/race/${race.id}`)}>
                <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                  <div style={{ width:48, height:48, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', color:'#C9A84C', letterSpacing:'0.5px' }}>{race.distance}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A', letterSpacing:'0.5px', marginBottom:'2px' }}>{race.name}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{race.date} · {race.location}</div>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                  <path d="M6 3l5 5-5 5" stroke="#b0b8c4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
