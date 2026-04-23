import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'
import { useIsMobile } from '../lib/useIsMobile'

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
const MOCK_GOAL = { type:'distance', distance:'Half Marathon', label:'13.1', targetDate:'Sep 2026', suggestedRace:'Parks Half Marathon', suggestedRaceId:'d1' }

function PassportCard({ race, index, onClick, t, compact }) {
  const [hovered, setHovered] = useState(false)
  const colors = getDistanceColor(race.distance)
  const cleaned = race.distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length>4 ? 14 : cleaned.length>2 ? 17 : 24
  const stampSize = compact ? 48 : 72

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'14px', overflow:'hidden', cursor:'pointer', border:hovered?`2px solid #C9A84C`:`1.5px solid ${t.border}`, transition:'all 0.2s', transform:hovered&&!compact?'translateY(-6px)':'none', boxShadow:hovered?`0 16px 40px rgba(201,168,76,0.12)`:t.cardShadow, background:t.surface, animation:'fadeUp 0.4s ease both', animationDelay:`${index*60}ms` }}>
      {/* Navy header with stamp */}
      <div style={{ background:'#1B2A4A', padding: compact ? '10px 12px' : '20px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative', minHeight: compact ? '60px' : '100px' }}>
        {!compact && <div style={{ position:'absolute', top:10, left:14, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase' }}>PAGE {String(index+1).padStart(2,'0')}</div>}
        <div style={{ marginTop: compact ? '0' : '16px', width:stampSize, height:stampSize, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
          <div style={{ position:'absolute', inset: compact ? 4 : 6, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: compact ? Math.round(fs*0.75) : fs, color:colors.stampText, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1 }}>{cleaned}</div>
        </div>
        <div style={{ flex:1, marginLeft:'10px', marginTop: compact ? '0' : '18px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: compact ? '13px' : '17px', color:'#fff', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'2px' }}>{race.name}</div>
          {!compact && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.45)' }}>{race.location}</div>}
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{race.month} {race.year}</div>
        </div>
        {race.pr && <div style={{ position:'absolute', top: compact ? 6 : 10, right: compact ? 8 : 12, background:'#C9A84C', borderRadius:'4px', padding:'2px 6px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', fontWeight:700, letterSpacing:'1.5px', color:'#1B2A4A' }}>PR</div>}
      </div>
      {/* Bottom: time */}
      <div style={{ padding: compact ? '8px 12px' : '12px 16px 14px', borderTop:`1px solid ${t.borderLight}` }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: compact ? '16px' : '20px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{race.time}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'2px' }}>Finish Time</div>
        {!compact && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 10px', background:'rgba(201,168,76,0.08)', border:'1px dashed rgba(201,168,76,0.35)', borderRadius:'6px', marginTop:'8px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textTransform:'uppercase' }}>Add your story →</span>
          </div>
        )}
      </div>
    </div>
  )
}

function GoalSection({ goal, navigate, t, isMobile }) {
  const colors = getDistanceColor(goal.label)
  const distFilterMap = { '5K':'5K','10K':'10K','13.1':'13.1','Half Marathon':'13.1','26.2':'26.2','Marathon':'26.2','70.3':'TRI','140.6':'TRI','Triathlon':'TRI','Ultra':'ULTRA' }
  const handleViewRaces = () => {
    let dateFrom='',dateTo=''
    if (goal.targetDate) {
      const parts=goal.targetDate.split(' '),months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11}
      const m=months[parts[0]],y=parseInt(parts[1])
      if (!isNaN(m)&&!isNaN(y)) { dateFrom=new Date(y,m-1,1).toISOString().slice(0,10); dateTo=new Date(y,m+1,0).toISOString().slice(0,10) }
    }
    navigate('/discover',{state:{autoSearch:{distFilter:distFilterMap[goal.distance]||distFilterMap[goal.label]||'ALL',dateFrom,dateTo}}})
  }
  return (
    <div style={{marginTop:'40px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'3px',color:'#C9A84C',textTransform:'uppercase',marginBottom:'4px'}}>What You're Chasing</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'24px',color:t.text,letterSpacing:'1px'}}>Goals</div>
        </div>
        <button onClick={()=>navigate('/goal-races')} style={{padding:'7px 14px',background:'none',border:`1.5px solid ${t.border}`,borderRadius:'8px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,cursor:'pointer',textTransform:'uppercase'}}>Edit Goal</button>
      </div>
      <div style={{background:t.surface,border:`1.5px solid ${t.border}`,borderRadius:'14px',overflow:'hidden'}}>
        <div style={{padding:isMobile?'14px 16px':'24px 32px',display:'flex',alignItems:'center',gap:'16px',flexWrap:isMobile?'wrap':'nowrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px',flex:1}}>
            <div style={{width:56,height:56,borderRadius:'50%',border:`2.5px solid ${colors.stampBorder}`,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',flexShrink:0}}>
              <div style={{position:'absolute',inset:5,borderRadius:'50%',border:`1px dashed ${colors.stampDash}`}}/>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:goal.label.length>3?13:goal.label.length>2?16:20,color:colors.stampText,position:'relative',zIndex:1}}>{goal.label}</span>
            </div>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',color:t.text,letterSpacing:'1px',lineHeight:1,marginBottom:'3px'}}>{goal.distance}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:t.textMuted}}>{goal.targetDate&&`Target: ${goal.targetDate}`}</div>
            </div>
          </div>
          <button onClick={handleViewRaces} style={{padding:'9px 18px',border:`1.5px solid ${t.text}`,borderRadius:'8px',background:'rgba(27,42,74,0.06)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1px',color:t.text,cursor:'pointer',textTransform:'uppercase',flexShrink:0}}>View Races →</button>
        </div>
      </div>
    </div>
  )
}

export default function Passport() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const isMobile  = useIsMobile()
  const [profile, setProfile]             = useState(null)
  const [passportRaces, setPassportRaces] = useState(RYAN_RACES)
  const [showDropdown, setShowDropdown]   = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [filter, setFilter]               = useState('ALL')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) { setProfile({ full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}` }); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      const { data: praces } = await supabase.from('passport_races').select('*').eq('user_id', user.id).order('date_sort', { ascending: false })
      if (praces && praces.length > 0) {
        setPassportRaces(praces.map(r => {
          const dp = (r.date||'').split(' ')
          return { id:r.id, distance:r.distance||'', name:r.name, location:r.location||`${r.city||''}${r.city&&r.state?', ':''}${r.state||''}`, month:dp[0]||'', year:dp[dp.length-1]||'', time:r.time||'', pr:r.is_pr||false }
        }))
      }
    }
    loadProfile()
    const style = document.createElement('style')
    style.id = 'rp-passport-styles'
    style.textContent = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');*{box-sizing:border-box;}@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}.rp-nav-tab{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 24px;height:64px;justify-content:center;cursor:pointer;border:none;background:none;transition:color 0.15s;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid transparent;white-space:nowrap;}`
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
  const filteredRaces = filter==='ALL' ? passportRaces : passportRaces.filter(r => filter==='TRI' ? ['70.3','140.6'].includes(r.distance) : r.distance===filter)
  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'The Wall', path:'/wall',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2c0 4-5 6-5 10a5 5 0 0 0 10 0c0-4-5-6-5-10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 14a1.5 1.5 0 0 1-1.5-1.5c0-1 1.5-2 1.5-2s1.5 1 1.5 2A1.5 1.5 0 0 1 10 14z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:'/profile',  icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s', overflowX:'hidden' }}>
      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow }}>
        {isMobile ? (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <img src={isDark?'/icon-dark-1024.png':'/icon-light-1024.png'} alt="RP" style={{ width:32, height:32, borderRadius:'8px', objectFit:'cover' }} />
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', letterSpacing:'2px', color:t.text }}>RACE PASSPORT</span>
              </div>
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ width:38, height:38, borderRadius:'8px', background:'transparent', border:`1.5px solid ${t.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px', cursor:'pointer', padding:'8px' }}>
                <div style={{ width:16, height:2, background:t.text, borderRadius:'1px', transform: showMobileMenu?'rotate(45deg) translateY(7px)':'none', transition:'all 0.2s' }} />
                <div style={{ width:16, height:2, background:t.text, borderRadius:'1px', opacity: showMobileMenu?0:1, transition:'opacity 0.15s' }} />
                <div style={{ width:16, height:2, background:t.text, borderRadius:'1px', transform: showMobileMenu?'rotate(-45deg) translateY(-7px)':'none', transition:'all 0.2s' }} />
              </button>
            </div>
            {showMobileMenu && (
              <div style={{ background:t.surface, borderTop:`1px solid ${t.border}` }}>
                {NAV_TABS.map(tab => (
                  <button key={tab.path} onClick={() => { navigate(tab.path); setShowMobileMenu(false) }}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:'14px', padding:'14px 20px', background:location.pathname===tab.path?t.surfaceAlt:'transparent', border:'none', borderLeft:location.pathname===tab.path?'3px solid #C9A84C':'3px solid transparent', cursor:'pointer' }}>
                    <span style={{ color:location.pathname===tab.path?'#C9A84C':t.textMuted }}>{tab.icon}</span>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:location.pathname===tab.path?t.text:t.textMuted }}>{tab.label}</span>
                  </button>
                ))}
                <div style={{ padding:'12px 20px', borderTop:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text }}>Dark Mode</span>
                  <button onClick={toggleTheme} style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                    <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                  </button>
                </div>
                <button onClick={handleSignOut} style={{ width:'100%', padding:'14px 20px', background:'transparent', border:'none', borderTop:`1px solid ${t.border}`, textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:'#c53030', cursor:'pointer' }}>Log Out</button>
              </div>
            )}
          </>
        ) : (
          <div style={{ width:'100%', padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</span>
            </div>
            <div style={{ display:'flex', alignItems:'stretch' }}>
              {NAV_TABS.map(tab => (
                <button key={tab.path} className="rp-nav-tab" style={{ color:location.pathname===tab.path?t.text:t.textMuted, borderBottomColor:location.pathname===tab.path?'#C9A84C':'transparent' }} onClick={() => navigate(tab.path)}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center' }}>
              <div ref={dropdownRef} style={{ position:'relative' }}>
                <div onClick={() => setShowDropdown(!showDropdown)} style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}` }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C' }}>{initials}</span>
                </div>
                {showDropdown && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'200px', overflow:'hidden', zIndex:100 }}>
                    <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{profile?.full_name||'Ryan Groene'}</div>
                    </div>
                    <button style={{ display:'block', width:'100%', padding:'10px 18px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text, cursor:'pointer' }} onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
                    <button style={{ display:'block', width:'100%', padding:'10px 18px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text, cursor:'pointer' }} onClick={() => { navigate('/profile'); setShowDropdown(false) }}>Settings</button>
                    <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text }}>Dark Mode</span>
                      <button onClick={toggleTheme} style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                        <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                      </button>
                    </div>
                    <button style={{ display:'block', width:'100%', padding:'10px 18px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#c53030', cursor:'pointer' }} onClick={handleSignOut}>Log Out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HERO */}
      <div style={{ background:'#1B2A4A', padding: isMobile ? '18px 16px 14px' : '40px 40px 36px', position:'relative', overflow:'hidden' }}>
        {!isMobile && <div style={{ position:'absolute', right:'-20px', top:'-10px', fontFamily:"'Bebas Neue',sans-serif", fontSize:'180px', color:'transparent', WebkitTextStroke:'1px rgba(255,255,255,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>PASSPORT</div>}
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.7)', textTransform:'uppercase', marginBottom:'5px' }}>Race Passport</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile ? 'clamp(26px,7vw,44px)' : 'clamp(36px,5vw,60px)', color:'#fff', letterSpacing:'2px', lineHeight:1, marginBottom:'4px' }}>{firstName.toUpperCase()} {lastName.toUpperCase()}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.45)' }}>Endurance Athlete · Est. 2021</div>
            </div>
            <div style={{ display:'flex', gap: isMobile ? '18px' : '32px' }}>
              {[
                { value: passportRaces.length, label:'Races' },
                { value: passportRaces.filter(r=>r.pr).length, label:'PRs' },
                { value: new Set(passportRaces.map(r=>r.location?.split(',')[1]?.trim()).filter(Boolean)).size, label:'States' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile ? '26px' : '36px', color:'#fff', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', marginTop:'3px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height:'3px', background:'linear-gradient(to right,#C9A84C,transparent)', marginTop:'14px', borderRadius:'2px' }} />
        </div>
      </div>

      {/* GRID */}
      <div style={{ padding: isMobile ? '14px 16px 80px' : '28px 40px 80px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: isMobile ? '4px 10px' : '6px 16px', borderRadius:'20px', border:`1.5px solid ${filter===f?'#1B2A4A':t.border}`, background:filter===f?'#1B2A4A':t.surface, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', cursor:'pointer', color:filter===f?'#fff':t.textMuted }}>{f}</button>
            ))}
          </div>
          <button onClick={() => navigate('/race-import')}
            style={{ display:'flex', alignItems:'center', gap:'5px', padding: isMobile ? '5px 12px' : '8px 20px', background:'#1B2A4A', border:'none', borderRadius:'8px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Add
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: isMobile ? '10px' : '20px' }}>
          {filteredRaces.map((race, i) => (
            <PassportCard key={race.id} race={race} index={i} t={t} compact={isMobile} onClick={() => navigate(`/race/${race.id}`)} />
          ))}
        </div>
        <GoalSection goal={MOCK_GOAL} navigate={navigate} t={t} isMobile={isMobile} />
      </div>
    </div>
  )
}
