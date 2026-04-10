import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const MOCK_RACES = [
  { id:1, distance:'26.2', name:'Marine Corps Marathon', location:'Arlington, VA', month:'Oct', year:'2024', time:'4:02:11', pr:true, photos:3, hasStrava:true, filled:true },
  { id:2, distance:'70.3', name:'IRONMAN 70.3', location:'Atlantic City, NJ', month:'Sept', year:'2024', time:'5:41:22', pr:false, photos:5, hasStrava:true, filled:true },
  { id:3, distance:'13.1', name:"Rock 'N' Roll Half", location:'Nashville, TN', month:'Apr', year:'2023', time:'1:52:04', pr:true, photos:2, hasStrava:false, filled:true },
  { id:4, distance:'50K', name:'Seneca Creek Trail Ultra', location:'Gaithersburg, MD', month:'Mar', year:'2022', time:'6:14:38', pr:false, photos:0, hasStrava:false, filled:false },
  { id:5, distance:'10K', name:'Broad Street Run', location:'Philadelphia, PA', month:'May', year:'2023', time:'57:14', pr:false, photos:1, hasStrava:true, filled:true },
  { id:6, distance:'5K', name:'Turkey Trot', location:'Chicago, IL', month:'Nov', year:'2023', time:'24:02', pr:false, photos:0, hasStrava:false, filled:false },
  { id:7, distance:'5K', name:'Hot Cider Hustle', location:'Washington, DC', month:'Nov', year:'2022', time:'24:33', pr:false, photos:4, hasStrava:false, filled:true },
]

const STATS = { races: 14, miles: 341, prs: 3, states: 6 }

function PassportCard({ race, index, onClick }) {
  const [hovered, setHovered] = useState(false)
  const colors = getDistanceColor(race.distance)
  const cleaned = race.distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 14 : cleaned.length > 2 ? 17 : 24

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'14px', overflow:'hidden', cursor:'pointer', border: hovered ? `2px solid ${colors.primary}` : '1.5px solid #e2e6ed', transition:'all 0.2s', transform: hovered ? 'translateY(-6px)' : 'none', boxShadow: hovered ? `0 16px 40px ${colors.light.replace('0.08','0.25').replace('0.09','0.25')}` : '0 2px 12px rgba(27,42,74,0.07)', background:'#fff', animation:'fadeUp 0.4s ease both', animationDelay:`${index * 60}ms` }}>

      {/* Color-coded top bar */}
      <div style={{ height:'4px', background:colors.primary }} />

      {/* Navy header */}
      <div style={{ background:'#1B2A4A', padding:'20px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative', minHeight:'100px' }}>
        <div style={{ position:'absolute', top:10, left:14, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase' }}>
          PAGE {String(index + 1).padStart(2, '0')}
        </div>
        {/* Color-coded stamp */}
        <div style={{ marginTop:'16px', width:72, height:72, borderRadius:'50%', border:`2.5px solid ${colors.primary}`, background:colors.light, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <div style={{ position:'absolute', inset:6, borderRadius:'50%', border:`1px dashed ${colors.dashed}` }} />
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.primary, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1 }}>{cleaned}</div>
        </div>
        <div style={{ flex:1, marginLeft:'14px', marginTop:'18px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#fff', letterSpacing:'0.5px', lineHeight:1.15, marginBottom:'4px' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.45)', letterSpacing:'0.5px' }}>{race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.3)', letterSpacing:'0.5px', marginTop:'2px' }}>{race.month} {race.year}</div>
        </div>
        {race.pr && (
          <div style={{ position:'absolute', top:10, right:12, background:colors.primary, borderRadius:'4px', padding:'2px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:700, letterSpacing:'1.5px', color: colors.primary === '#C9A84C' ? '#1B2A4A' : '#fff' }}>PR</div>
        )}
      </div>

      {/* White footer */}
      <div style={{ padding:'12px 16px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#1B2A4A', letterSpacing:'1px', lineHeight:1 }}>{race.time}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginTop:'2px' }}>Finish Time</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            {race.hasStrava && (
              <div style={{ width:24, height:24, borderRadius:'6px', background:'#FC4C02', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              </div>
            )}
            {race.photos > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:'3px', background:'#f4f5f7', borderRadius:'6px', padding:'4px 7px' }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1" y="2.5" width="10" height="7" rx="1" stroke="#9aa5b4" strokeWidth="1.1"/><circle cx="6" cy="6" r="1.5" stroke="#9aa5b4" strokeWidth="1.1"/></svg>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4', fontWeight:600 }}>{race.photos}</span>
              </div>
            )}
          </div>
        </div>
        {!race.filled ? (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 10px', background:colors.light, border:`1px dashed ${colors.dashed}`, borderRadius:'6px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:colors.primary, flexShrink:0 }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', color:colors.primary, textTransform:'uppercase' }}>Add your story →</span>
          </div>
        ) : (
          <div style={{ display:'flex', gap:'4px' }}>
            {['Photo','Story','Stats'].map(tag => (
              <div key={tag} style={{ padding:'3px 8px', background:'#f4f5f7', borderRadius:'4px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#9aa5b4', textTransform:'uppercase' }}>{tag}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Passport() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) { setProfile({ full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}` }); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    loadProfile()
    const style = document.createElement('style')
    style.id = 'rp-passport-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      @keyframes fadeUp { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
      .nav-tab { display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 24px; height:64px; justify-content:center; cursor:pointer; border:none; background:none; color:#9aa5b4; transition:color 0.15s; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; position:relative; border-bottom:2px solid transparent; white-space:nowrap; }
      .nav-tab.active { color:#1B2A4A; border-bottom-color:#C9A84C; }
      .nav-tab:hover { color:#1B2A4A; }
      .filter-btn { padding:6px 16px; border-radius:20px; border:1.5px solid #e2e6ed; background:#fff; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; color:#9aa5b4; }
      .filter-btn.active { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .dropdown-item { display:block; width:100%; padding:10px 18px; background:none; border:none; text-align:left; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:1px; color:#1B2A4A; cursor:pointer; transition:background 0.1s; white-space:nowrap; }
      .dropdown-item:hover { background:#f4f5f7; }
    `
    if (!document.getElementById('rp-passport-styles')) document.head.appendChild(style)
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-passport-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user])

  const firstName = profile?.full_name?.split(' ')[0] || 'Runner'
  const lastName = profile?.full_name?.split(' ').slice(1).join(' ') || ''
  const initials = (profile?.full_name || 'RG').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }

  const FILTERS = ['ALL','5K','10K','13.1','26.2','ULTRA','TRI']
  const filteredRaces = filter === 'ALL' ? MOCK_RACES : MOCK_RACES.filter(r => {
    if (filter === 'ULTRA') return ['50K','50M','100K','100M'].includes(r.distance.toUpperCase())
    if (filter === 'TRI') return ['70.3','140.6'].includes(r.distance)
    return r.distance === filter
  })

  const NAV_TABS = [
    { label:'Home', path:'/home', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile', path:'/profile', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  // Color legend
  const LEGEND = [
    { label:'5K · 10K · 13.1 · 10mi', color:'#1E5FA8' },
    { label:'Marathon 26.2', color:'#C9A84C' },
    { label:'Triathlon', color:'#B83232' },
    { label:'Ultra', color:'#9C7C4A' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif" }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#fff', borderBottom:'1px solid #e8eaed', boxShadow:'0 1px 8px rgba(27,42,74,0.06)' }}>
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

      {/* HERO */}
      <div style={{ background:'#1B2A4A', padding:'40px 40px 36px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:'-20px', top:'-10px', fontFamily:"'Bebas Neue',sans-serif", fontSize:'180px', color:'transparent', WebkitTextStroke:'1px rgba(255,255,255,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>PASSPORT</div>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'24px' }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.7)', textTransform:'uppercase', marginBottom:'8px' }}>Race Passport</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,60px)', color:'#fff', letterSpacing:'2px', lineHeight:1, marginBottom:'6px' }}>
                {firstName.toUpperCase()} {lastName.toUpperCase()}
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.45)', letterSpacing:'1px' }}>Endurance Athlete · Est. 2019</div>
            </div>
            <div style={{ display:'flex', gap:'32px' }}>
              {[{ value:STATS.races, label:'Races' },{ value:STATS.miles, label:'Race Miles' },{ value:STATS.prs, label:'PRs' },{ value:STATS.states, label:'States' }].map(stat => (
                <div key={stat.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>{stat.value}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', marginTop:'4px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Color legend */}
          <div style={{ display:'flex', alignItems:'center', gap:'20px', marginTop:'24px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.08)', flexWrap:'wrap' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase' }}>Distance Colors:</span>
            {LEGEND.map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:l.color, flexShrink:0 }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.45)', letterSpacing:'0.5px' }}>{l.label}</span>
              </div>
            ))}
          </div>
          <div style={{ height:'3px', background:'linear-gradient(to right, #C9A84C, transparent)', marginTop:'20px', borderRadius:'2px' }} />
        </div>
      </div>

      {/* GRID */}
      <div style={{ padding:'28px 40px 80px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {FILTERS.map(f => <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>{f}</button>)}
          </div>
          <button onClick={() => navigate('/race-import')} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 20px', background:'#1B2A4A', border:'none', borderRadius:'8px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add Race
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' }}>
          {filteredRaces.map((race, i) => (
            <PassportCard key={race.id} race={race} index={i} onClick={() => navigate(`/race/${race.id}`)} />
          ))}
        </div>
        {filteredRaces.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'8px' }}>NO RACES YET</div>
            <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', color:'#9aa5b4' }}>Import your race history or add a race manually.</p>
          </div>
        )}
      </div>
    </div>
  )
}
