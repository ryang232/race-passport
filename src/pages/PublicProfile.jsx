import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const MOCK_PROFILE = {
  full_name: 'Ryan Groene',
  username: 'ryan-groene',
  location: 'Highland, MD',
  bio: "Endurance athlete chasing PRs across roads, trails, and open water.",
  since: '2021',
  stats: { races:10, miles:199, prs:4, states:5 },
  races: [
    { id:9,  distance:'70.3',  name:'IRONMAN 70.3 Eagleman',         location:'Cambridge, MD',   month:'Jun', year:'2025', time:'6:32:08', pr:true  },
    { id:8,  distance:'13.1',  name:'Austin Half Marathon',          location:'Austin, TX',      month:'Feb', year:'2025', time:'1:57:40', pr:true  },
    { id:7,  distance:'5K',    name:'Downtown Columbia Turkey Trot', location:'Columbia, MD',    month:'Nov', year:'2024', time:'28:16',   pr:true  },
    { id:5,  distance:'26.2',  name:'Marine Corps Marathon',         location:'Washington, DC',  month:'Oct', year:'2023', time:'4:45:42', pr:false },
    { id:6,  distance:'26.2',  name:'LA Marathon',                   location:'Los Angeles, CA', month:'Mar', year:'2023', time:'4:44:47', pr:true  },
    { id:4,  distance:'13.1',  name:'Holiday Half Marathon',         location:'Annandale, VA',   month:'Dec', year:'2021', time:'2:19:05', pr:false },
    { id:1,  distance:'10K',   name:'Sole of the City 10K',          location:'Baltimore, MD',   month:'Oct', year:'2021', time:'47:49',   pr:true  },
    { id:2,  distance:'10K',   name:'Bay Bridge Run',                location:'Annapolis, MD',   month:'Nov', year:'2021', time:'50:57',   pr:false },
    { id:3,  distance:'10K',   name:'Baltimore Running Festival 10K',location:'Baltimore, MD',   month:'Oct', year:'2021', time:'58:03',   pr:false },
    { id:10, distance:'5K',    name:'Downtown Columbia Turkey Trot', location:'Columbia, MD',    month:'Nov', year:'2025', time:'35:09',   pr:false },
  ],
  prs: [
    { distance:'5K',      time:'28:16',   color:'#1E5FA8', race:'Turkey Trot 2024' },
    { distance:'10K',     time:'47:49',   color:'#1E5FA8', race:'Sole of the City 2021' },
    { distance:'Half',    time:'1:57:40', color:'#1E5FA8', race:'Austin Half Marathon 2025' },
    { distance:'Marathon',time:'4:44:47', color:'#C9A84C', race:'LA Marathon 2023' },
    { distance:'70.3',    time:'6:32:08', color:'#B83232', race:'IRONMAN 70.3 Eagleman 2025' },
  ],
  gear: [
    { id:1, category:'Shoes', brand:'Hoka',   model:'Clifton 9',        color:'Black/White', url:'https://hoka.com',   note:'Daily trainer' },
    { id:2, category:'Watch', brand:'Garmin', model:'Forerunner 245',   color:'Black',       url:'https://garmin.com', note:'' },
    { id:3, category:'Socks', brand:'Balega', model:'Hidden Comfort',   color:'Black',       url:'https://balega.com', note:'' },
  ],
}

function ScrollRow({ children, t }) {
  const ref = useRef(null)
  const [showLeft, setShowLeft]   = useState(false)
  const [showRight, setShowRight] = useState(true)
  const [hov, setHov]             = useState(false)
  const check = () => {
    const el = ref.current; if (!el) return
    setShowLeft(el.scrollLeft > 10)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }
  useEffect(() => { const el = ref.current; if (el) { el.addEventListener('scroll', check); check() }; return () => el?.removeEventListener('scroll', check) }, [])
  const scroll = d => ref.current?.scrollBy({ left:d*360, behavior:'smooth' })
  const btn = (dir, side) => (
    <button onClick={() => scroll(dir)} style={{ position:'absolute', [side]:-18, top:'45%', transform:'translateY(-50%)', zIndex:10, width:40, height:40, borderRadius:'50%', background:'#1B2A4A', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(27,42,74,0.2)', transition:'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background='#C9A84C'}
      onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d={dir<0?'M9 2L4 7l5 5':'M5 2l5 5-5 5'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  )
  return (
    <div style={{ position:'relative' }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {showLeft && hov && btn(-1,'left')}
      {showRight && hov && btn(1,'right')}
      <div ref={ref} style={{ display:'flex', gap:'20px', overflowX:'auto', paddingBottom:'8px', paddingTop:'4px', scrollbarWidth:'none' }}>
        {children}
      </div>
    </div>
  )
}

function GearCard({ item, t }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => item.url && window.open(item.url,'_blank')}
      style={{ background:hov?t.surfaceAlt:t.surface, border:`1.5px solid ${hov?'#C9A84C':t.border}`, borderRadius:'12px', padding:'16px', transition:'all 0.15s', cursor:item.url?'pointer':'default', minWidth:'220px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
        <div style={{ width:36, height:36, borderRadius:'8px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:'16px' }}>👟</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'3px' }}>{item.category}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:t.text, letterSpacing:'0.5px', lineHeight:1.1, marginBottom:'2px' }}>{item.brand} {item.model}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{item.color}</div>
          {item.note && <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'11px', color:'#C9A84C', marginTop:'4px', fontStyle:'italic' }}>{item.note}</div>}
        </div>
        {item.url && (
          <div style={{ opacity:hov?1:0, transition:'opacity 0.15s', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'3px', padding:'4px 8px', background:'#1B2A4A', borderRadius:'6px' }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:700, letterSpacing:'1px', color:'#fff', textTransform:'uppercase' }}>Shop</span>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 6.5l5-5M6.5 6.5V1.5H1.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PublicProfile() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { username } = useParams()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()

  const [profile]     = useState(MOCK_PROFILE)
  const [activeTab, setActiveTab]     = useState('passport')
  const [authProfile, setAuthProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const isOwnProfile = !username || username === 'ryan-groene'

  useEffect(() => {
    const loadAuth = async () => {
      if (!user || isDemo(user?.email)) { setAuthProfile({ full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}` }); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setAuthProfile(data)
    }
    loadAuth()

    const style = document.createElement('style')
    style.id = 'rp-pubprofile-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing:border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      .rp-nav-tab { display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 24px;height:64px;justify-content:center;cursor:pointer;border:none;background:none;transition:color 0.15s;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid transparent;white-space:nowrap; }
      .prof-tab { padding:12px 24px;border:none;background:none;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;border-bottom:2px solid transparent;transition:all 0.15s; }
      div::-webkit-scrollbar { display:none; }
    `
    if (!document.getElementById('rp-pubprofile-styles')) document.head.appendChild(style)
    const handleClick = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-pubprofile-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user])

  const initials     = (authProfile?.full_name || 'RG').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }

  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:`/${profile.username}`, icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s' }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:500, background:t.navBg, backdropFilter:'blur(8px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, display:'flex', alignItems:'stretch', justifyContent:'space-between', padding:'0 40px', transition:'background 0.25s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:t.text, transition:'color 0.25s' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', alignItems:'stretch' }}>
          {NAV_TABS.map(tab => (
            <button key={tab.label} className="rp-nav-tab"
              style={{ color:location.pathname===tab.path?t.text:t.textMuted, borderBottomColor:location.pathname===tab.path?'#C9A84C':'transparent' }}
              onClick={() => navigate(tab.path)}>{tab.icon}{tab.label}</button>
          ))}
        </div>
        <div ref={dropdownRef} style={{ position:'relative', display:'flex', alignItems:'center' }}>
          <div onClick={() => setShowDropdown(!showDropdown)}
            style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C' }}>{initials}</span>
          </div>
          {showDropdown && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'200px', overflow:'hidden', zIndex:600 }}>
              <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{authProfile?.full_name || 'Ryan Groene'}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>racepassportapp.com/ryan-groene</div>
              </div>
              <button style={{ display:'block', width:'100%', padding:'10px 18px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text, cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}
                onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
              <button style={{ display:'block', width:'100%', padding:'10px 18px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text, cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}
                onClick={() => { navigate('/profile'); setShowDropdown(false) }}>Settings</button>
              {/* Dark mode toggle */}
              <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text }}>Dark Mode</span>
                <button onClick={toggleTheme}
                  style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s', background:isDark?'#C9A84C':'#d0d7e0', padding:0, flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              <div style={{ height:'1px', background:t.borderLight }} />
              <button style={{ display:'block', width:'100%', padding:'10px 18px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#c53030', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}
                onClick={handleSignOut}>Log Out</button>
            </div>
          )}
        </div>
      </div>

      {/* HERO */}
      <div style={{ background:'#1B2A4A', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:0, top:'-20px', fontFamily:"'Bebas Neue',sans-serif", fontSize:'200px', color:'transparent', WebkitTextStroke:'1px rgba(255,255,255,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none', letterSpacing:'4px' }}>ATHLETE</div>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 40px 0', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'28px', marginBottom:'28px' }}>
            {/* Avatar */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:96, height:96, borderRadius:'50%', background:'#2a3f6a', border:'3px solid #C9A84C', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:'#C9A84C', letterSpacing:'2px' }}>
                  {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              {isOwnProfile && (
                <div style={{ position:'absolute', bottom:2, right:2, width:24, height:24, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid #1B2A4A' }}
                  onClick={() => navigate('/profile')}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1.5L8.5 3 3.5 8H2V6.5L7 1.5z" stroke="#1B2A4A" strokeWidth="1" strokeLinejoin="round"/></svg>
                </div>
              )}
            </div>
            {/* Identity */}
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:'6px' }}>racepassportapp.com/{profile.username}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,56px)', color:'#fff', letterSpacing:'2px', lineHeight:1, marginBottom:'8px' }}>{profile.full_name.toUpperCase()}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.45)', letterSpacing:'1px', marginBottom:'14px' }}>{profile.location} · Endurance Athlete · Est. {profile.since}</div>
              <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'rgba(255,255,255,0.6)', fontStyle:'italic', lineHeight:1.7, maxWidth:'480px', borderLeft:'3px solid #C9A84C', paddingLeft:'14px' }}>"{profile.bio}"</div>
            </div>
            {/* Stats */}
            <div style={{ display:'flex', gap:'28px', flexShrink:0 }}>
              {[{value:profile.stats.races,label:'Races'},{value:profile.stats.miles,label:'Race Miles'},{value:profile.stats.prs,label:'PRs'},{value:profile.stats.states,label:'States'}].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'40px', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>{s.value}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Tabs — on the dark hero */}
          <div style={{ display:'flex', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
            {['passport','prs','gear'].map(tab => (
              <button key={tab} className="prof-tab"
                style={{ color:activeTab===tab?'#fff':'rgba(255,255,255,0.35)', borderBottomColor:activeTab===tab?'#C9A84C':'transparent' }}
                onClick={() => setActiveTab(tab)}>
                {tab === 'passport' ? 'Passport' : tab === 'prs' ? 'PRs' : 'Gear'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'32px 40px 80px' }}>

        {/* PASSPORT TAB */}
        {activeTab === 'passport' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px' }}>Race Stamps</div>
              {isOwnProfile && (
                <button onClick={() => navigate('/passport')}
                  style={{ padding:'7px 18px', border:`1.5px solid ${t.text}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.text, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='#1B2A4A'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#1B2A4A' }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=t.text; e.currentTarget.style.borderColor=t.text }}>
                  View Full Passport →
                </button>
              )}
            </div>
            <ScrollRow t={t}>
              {profile.races.map(race => {
                const colors  = getDistanceColor(race.distance)
                const cleaned = race.distance.replace(' mi','').replace(' miles','')
                const fs = cleaned.length>4?16:cleaned.length>2?20:28
                return (
                  <div key={race.id} onClick={() => isOwnProfile && navigate(`/race/${race.id}`)}
                    style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', cursor:isOwnProfile?'pointer':'default', paddingBottom:'4px' }}>
                    <div style={{ width:110, height:110, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', transition:'transform 0.15s,box-shadow 0.15s' }}
                      onMouseEnter={e => isOwnProfile && (e.currentTarget.style.transform='scale(1.06)')}
                      onMouseLeave={e => isOwnProfile && (e.currentTarget.style.transform='scale(1)')}>
                      <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
                      {race.pr && (
                        <div style={{ position:'absolute', top:4, right:4, width:18, height:18, borderRadius:'50%', background:colors.stampBorder, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'7px', fontWeight:700, color:'#fff', letterSpacing:'0.5px' }}>PR</span>
                        </div>
                      )}
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.stampText, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1 }}>{cleaned}</span>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:t.text, letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'2px' }}>{race.time}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{race.location}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted, opacity:0.7 }}>{race.month} {race.year}</div>
                    </div>
                  </div>
                )
              })}
            </ScrollRow>

            <div style={{ marginTop:'40px' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', marginBottom:'16px' }}>All Races</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'12px' }}>
                {profile.races.map(race => {
                  const colors  = getDistanceColor(race.distance)
                  const cleaned = race.distance.replace(' mi','')
                  return (
                    <div key={race.id}
                      onClick={() => isOwnProfile && navigate(`/race/${race.id}`)}
                      style={{ background:t.surface, border:`1.5px solid ${t.border}`, borderRadius:'10px', overflow:'hidden', cursor:isOwnProfile?'pointer':'default', transition:'all 0.15s' }}
                      onMouseEnter={e => isOwnProfile && (e.currentTarget.style.borderColor=colors.stampBorder)}
                      onMouseLeave={e => isOwnProfile && (e.currentTarget.style.borderColor=t.border)}>
                      <div style={{ height:'3px', background:colors.stampBorder }} />
                      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px' }}>
                        <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${colors.stampBorder}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:cleaned.length>3?9:cleaned.length>2?11:15, color:colors.stampText, letterSpacing:'0.5px' }}>{cleaned}</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text, letterSpacing:'0.5px', lineHeight:1.2 }}>{race.name}</div>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{race.location} · {race.month} {race.year}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:t.text, letterSpacing:'1px' }}>{race.time}</div>
                          {race.pr && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:700, letterSpacing:'1.5px', color:colors.stampBorder, textTransform:'uppercase' }}>PR</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* PRs TAB */}
        {activeTab === 'prs' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px', marginBottom:'24px' }}>Personal Records</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'16px' }}>
              {profile.prs.map(pr => (
                <div key={pr.distance} style={{ background:t.surface, border:`1.5px solid ${t.border}`, borderRadius:'12px', padding:'20px 20px 16px', position:'relative', borderLeft:`4px solid ${pr.color}`, transition:'background 0.25s' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase', marginBottom:'10px' }}>{pr.distance}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{pr.time}</div>
                  <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:pr.color }} />
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:pr.color, textTransform:'uppercase' }}>Personal Best</span>
                  </div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted, marginTop:'4px' }}>{pr.race}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GEAR TAB */}
        {activeTab === 'gear' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>Race Day Gear</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, marginTop:'4px' }}>Click any item to shop it</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'14px' }}>
              {profile.gear.map(item => <GearCard key={item.id} item={item} t={t} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
