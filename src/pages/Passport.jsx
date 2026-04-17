import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const RYAN_RACES = [
  { id:1,  distance:'10K',  name:'Sole of the City 10K',          location:'Baltimore, MD',   month:'Oct', year:'2021', time:'47:49',   pr:true  },
  { id:2,  distance:'10K',  name:'Bay Bridge Run',                 location:'Annapolis, MD',   month:'Nov', year:'2021', time:'50:57',   pr:false },
  { id:3,  distance:'10K',  name:'Baltimore Running Festival 10K', location:'Baltimore, MD',   month:'Oct', year:'2021', time:'58:03',   pr:false },
  { id:4,  distance:'13.1', name:'Holiday Half Marathon',          location:'Annandale, VA',   month:'Dec', year:'2021', time:'2:19:05', pr:false },
  { id:5,  distance:'26.2', name:'Marine Corps Marathon',          location:'Washington, DC',  month:'Oct', year:'2023', time:'4:45:42', pr:false },
  { id:6,  distance:'26.2', name:'LA Marathon',                    location:'Los Angeles, CA', month:'Mar', year:'2023', time:'4:44:47', pr:true  },
  { id:7,  distance:'5K',   name:'Turkey Trot',                    location:'Columbia, MD',    month:'Nov', year:'2024', time:'28:16',   pr:true  },
  { id:8,  distance:'13.1', name:'Austin Half Marathon',           location:'Austin, TX',      month:'Feb', year:'2025', time:'1:57:40', pr:true  },
  { id:9,  distance:'70.3', name:'IRONMAN 70.3 Eagleman',          location:'Cambridge, MD',   month:'Jun', year:'2025', time:'6:32:08', pr:true  },
  { id:10, distance:'5K',   name:'Turkey Trot',                    location:'Columbia, MD',    month:'Nov', year:'2025', time:'35:09',   pr:false },
]
const STATS = { races:10, miles:199, prs:4, states:5 }
const MOCK_GOAL = { type:'distance', distance:'Half Marathon', label:'13.1', targetDate:'Sep 2026', suggestedRace:'Parks Half Marathon', suggestedRaceId:'d1' }

function PassportCard({ race, index, onClick, t }) {
  const [hovered, setHovered] = useState(false)
  const colors = getDistanceColor(race.distance)
  const cleaned = race.distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length>4 ? 14 : cleaned.length>2 ? 17 : 24
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'14px', overflow:'hidden', cursor:'pointer', border:hovered?`2px solid #C9A84C`:`1.5px solid ${t.border}`, transition:'all 0.2s', transform:hovered?'translateY(-6px)':'none', boxShadow:hovered?`0 16px 40px rgba(201,168,76,0.12)`:t.cardShadow, background:t.surface, animation:'fadeUp 0.4s ease both', animationDelay:`${index*60}ms` }}>
      <div style={{ background:'#1B2A4A', padding:'20px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative', minHeight:'100px' }}>
        <div style={{ position:'absolute', top:10, left:14, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase' }}>PAGE {String(index+1).padStart(2,'0')}</div>
        <div style={{ marginTop:'16px', width:72, height:72, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <div style={{ position:'absolute', inset:6, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.stampText, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1 }}>{cleaned}</div>
        </div>
        <div style={{ flex:1, marginLeft:'14px', marginTop:'18px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#fff', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'4px' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.45)', letterSpacing:'0.5px' }}>{race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.3)', letterSpacing:'0.5px', marginTop:'2px' }}>{race.month} {race.year}</div>
        </div>
        {race.pr && <div style={{ position:'absolute', top:10, right:12, background:'#C9A84C', borderRadius:'4px', padding:'2px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:700, letterSpacing:'1.5px', color:'#1B2A4A' }}>PR</div>}
      </div>
      <div style={{ padding:'12px 16px 14px', borderTop:`1px solid ${t.borderLight}` }}>
        <div style={{ marginBottom:'10px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{race.time}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'2px' }}>Finish Time</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 10px', background:'rgba(201,168,76,0.08)', border:'1px dashed rgba(201,168,76,0.35)', borderRadius:'6px' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textTransform:'uppercase' }}>Add your story →</span>
        </div>
      </div>
    </div>
  )
}

function GoalSection({ goal, navigate, t }) {
  const colors = getDistanceColor(goal.label)
  return (
    <div style={{ marginTop:'48px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'4px' }}>What You're Chasing</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px' }}>Goals</div>
        </div>
        <button onClick={() => navigate('/goal-races')}
          style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', background:'none', border:`1.5px solid ${t.border}`, borderRadius:'8px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=t.text; e.currentTarget.style.color=t.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.color=t.textMuted }}>Edit Goal</button>
      </div>
      <div style={{ background:t.surface, border:`1.5px solid ${t.border}`, borderRadius:'14px', overflow:'hidden', marginBottom:'16px' }}>
        <div style={{ padding:'20px 24px', display:'flex', alignItems:'center', gap:'20px' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
            <div style={{ position:'absolute', inset:6, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:goal.label.length>3?14:goal.label.length>2?18:24, color:colors.stampText, position:'relative', zIndex:1, letterSpacing:'0.04em' }}>{goal.label}</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
              <div style={{ background:`${t.isDark?'rgba(201,168,76,0.15)':'rgba(27,42,74,0.08)'}`, border:`1px solid ${t.isDark?'rgba(201,168,76,0.3)':'rgba(27,42,74,0.18)'}`, borderRadius:'5px', padding:'3px 9px' }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:700, letterSpacing:'2px', color:t.text, textTransform:'uppercase' }}>Active Goal</span>
              </div>
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', lineHeight:1, marginBottom:'4px' }}>{goal.distance}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, letterSpacing:'0.5px' }}>{goal.targetDate&&`Target: ${goal.targetDate}`}{goal.suggestedRace&&` · ${goal.suggestedRace} suggested`}</div>
          </div>
          <button onClick={() => navigate('/discover')}
            style={{ padding:'7px 14px', border:`1.5px solid ${t.text}`, borderRadius:'8px', background:'rgba(27,42,74,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:t.text, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0 }}
            onMouseEnter={e => { e.currentTarget.style.background='#1B2A4A'; e.currentTarget.style.color='#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(27,42,74,0.06)'; e.currentTarget.style.color=t.text }}>View Races →</button>
        </div>
      </div>
    </div>
  )
}

export default function Passport() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const [profile, setProfile]       = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [filter, setFilter]         = useState('ALL')
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
      * { box-sizing:border-box; }
      @keyframes fadeUp { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
      .rp-nav-tab { display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 24px;height:64px;justify-content:center;cursor:pointer;border:none;background:none;transition:color 0.15s;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid transparent;white-space:nowrap; }
    `
    if (!document.getElementById('rp-passport-styles')) document.head.appendChild(style)
    const handleClick = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-passport-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user])

  const firstName = profile?.full_name?.split(' ')[0] || 'Ryan'
  const lastName  = profile?.full_name?.split(' ').slice(1).join(' ') || 'Groene'
  const initials  = (profile?.full_name||'RG').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }
  const FILTERS = ['ALL','5K','10K','13.1','26.2','TRI']
  const filteredRaces = filter==='ALL' ? RYAN_RACES : RYAN_RACES.filter(r => filter==='TRI' ? ['70.3','140.6'].includes(r.distance) : r.distance===filter)

  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:'/profile',  icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s' }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, transition:'background 0.25s' }}>
        <div style={{ width:'100%', padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:t.text, transition:'color 0.25s' }}>RACE PASSPORT</span>
          </div>
          <div style={{ display:'flex', alignItems:'stretch' }}>
            {NAV_TABS.map(tab => (
              <button key={tab.path} className="rp-nav-tab"
                style={{ color:location.pathname===tab.path?t.text:t.textMuted, borderBottomColor:location.pathname===tab.path?'#C9A84C':'transparent' }}
                onClick={() => navigate(tab.path)}>{tab.icon}{tab.label}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center' }}>
            <div ref={dropdownRef} style={{ position:'relative' }}>
              <div onClick={() => setShowDropdown(!showDropdown)}
                style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
              </div>
              {showDropdown && (
                <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'200px', overflow:'hidden', zIndex:100 }}>
                  <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{profile?.full_name||'Ryan Groene'}</div>
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
        </div>
      </div>

      {/* HERO */}
      <div style={{ background:'#1B2A4A', padding:'40px 40px 36px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:'-20px', top:'-10px', fontFamily:"'Bebas Neue',sans-serif", fontSize:'180px', color:'transparent', WebkitTextStroke:'1px rgba(255,255,255,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>PASSPORT</div>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'24px' }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.7)', textTransform:'uppercase', marginBottom:'8px' }}>Race Passport</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,5vw,60px)', color:'#fff', letterSpacing:'2px', lineHeight:1, marginBottom:'6px' }}>{firstName.toUpperCase()} {lastName.toUpperCase()}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.45)', letterSpacing:'1px' }}>Endurance Athlete · Highland, MD · Est. 2021</div>
            </div>
            <div style={{ display:'flex', gap:'32px' }}>
              {[{value:STATS.races,label:'Races'},{value:STATS.miles,label:'Race Miles'},{value:STATS.prs,label:'PRs'},{value:STATS.states,label:'States'}].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:'#fff', lineHeight:1, letterSpacing:'1px' }}>{s.value}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height:'3px', background:'linear-gradient(to right,#C9A84C,transparent)', marginTop:'20px', borderRadius:'2px' }} />
        </div>
      </div>

      {/* GRID */}
      <div style={{ padding:'28px 40px 80px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding:'6px 16px', borderRadius:'20px', border:`1.5px solid ${filter===f?'#1B2A4A':t.border}`, background:filter===f?'#1B2A4A':t.surface, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', cursor:'pointer', transition:'all 0.15s', color:filter===f?'#fff':t.textMuted }}>{f}</button>
            ))}
          </div>
          <button onClick={() => navigate('/race-import')}
            style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 20px', background:'#1B2A4A', border:'none', borderRadius:'8px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Add Race
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'20px' }}>
          {filteredRaces.map((race, i) => (
            <PassportCard key={race.id} race={race} index={i} t={t} onClick={() => navigate(`/race/${race.id}`)} />
          ))}
        </div>
        <GoalSection goal={MOCK_GOAL} navigate={navigate} t={t} />
      </div>
    </div>
  )
}
