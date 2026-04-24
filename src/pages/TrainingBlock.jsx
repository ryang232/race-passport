import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { useStrava } from '../lib/useStrava'
import { useIsMobile } from '../lib/useIsMobile'
import { getDistanceColor } from '../lib/colors'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(secs) {
  if (!secs) return '—'
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}
function fmtMi(meters) {
  return `${(meters/1609.34).toFixed(2)} mi`
}
function fmtPace(secs, meters) {
  if (!secs || !meters) return '—'
  const secsPerMi = secs / (meters/1609.34)
  return `${Math.floor(secsPerMi/60)}:${String(Math.round(secsPerMi%60)).padStart(2,'0')}/mi`
}
function sportLabel(type) {
  const t = (type||'').toLowerCase()
  if (t.includes('ride') || t.includes('bike') || t.includes('cycling')) return 'Bike'
  if (t.includes('swim')) return 'Swim'
  if (t.includes('run')) return 'Run'
  if (t.includes('walk')) return 'Walk'
  if (t.includes('hike')) return 'Hike'
  return type || 'Activity'
}
function sportIcon(type) {
  const l = sportLabel(type)
  if (l==='Bike') return '🚴'
  if (l==='Swim') return '🏊'
  if (l==='Run')  return '🏃'
  if (l==='Walk') return '🚶'
  if (l==='Hike') return '🥾'
  return '⚡'
}
function sportColor(type) {
  const l = sportLabel(type)
  if (l==='Bike')  return '#f59e0b'
  if (l==='Swim')  return '#3b82f6'
  if (l==='Run')   return '#10b981'
  if (l==='Walk')  return '#8b5cf6'
  return '#9aa5b4'
}

// ── Weekly volume bars ────────────────────────────────────────────────────────
function WeeklyChart({ activities, t }) {
  const weeks = useMemo(() => {
    const map = {}
    activities.forEach(a => {
      const d = new Date(a.start_date_local || a.date)
      if (isNaN(d)) return
      // Start of week (Monday)
      const day = d.getDay() || 7
      const mon = new Date(d); mon.setDate(d.getDate() - day + 1)
      const key = mon.toISOString().split('T')[0]
      if (!map[key]) map[key] = { key, miles: 0, count: 0 }
      map[key].miles += (a.distance||0)/1609.34
      map[key].count++
    })
    return Object.values(map).sort((a,b) => a.key.localeCompare(b.key)).slice(-16)
  }, [activities])

  if (weeks.length === 0) return null
  const maxMiles = Math.max(...weeks.map(w => w.miles), 1)

  return (
    <div style={{ marginBottom:'24px' }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase', marginBottom:'10px' }}>
        Weekly Volume — Last {weeks.length} Weeks
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'4px', height:60 }}>
        {weeks.map(w => (
          <div key={w.key} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
            <div style={{ width:'100%', background:'#C9A84C', borderRadius:'3px 3px 0 0', opacity:0.85,
              height:`${Math.max(4, (w.miles/maxMiles)*52)}px`, transition:'height 0.3s' }} />
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', color:t.textMuted, transform:'rotate(-45deg)', whiteSpace:'nowrap', transformOrigin:'top center', marginTop:'4px' }}>
              {new Date(w.key).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'28px' }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
          Total: <strong style={{ color:t.text }}>{activities.reduce((s,a)=>s+(a.distance||0)/1609.34,0).toFixed(1)} mi</strong>
        </span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
          Activities: <strong style={{ color:t.text }}>{activities.length}</strong>
        </span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
          Peak week: <strong style={{ color:t.text }}>{maxMiles.toFixed(1)} mi</strong>
        </span>
      </div>
    </div>
  )
}

// ── Activity Card ─────────────────────────────────────────────────────────────
function ActivityCard({ activity, selected, onToggle, t, isMobile }) {
  const type  = activity.type || activity.sport_type || ''
  const color = sportColor(type)
  const icon  = sportIcon(type)
  const label = sportLabel(type)
  const date  = new Date(activity.start_date_local || activity.date)
  const dateStr = isNaN(date) ? '—' : date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})

  return (
    <div onClick={() => onToggle(activity.id)}
      style={{ borderRadius:'12px', border:`2px solid ${selected?'#1B2A4A':t.border}`, background:selected?t.isDark?'rgba(27,42,74,0.25)':'rgba(27,42,74,0.04)':t.surface, cursor:'pointer', transition:'all 0.15s', padding: isMobile?'12px':'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>

      {/* Sport icon */}
      <div style={{ width:40, height:40, borderRadius:'10px', background:`${color}18`, border:`1.5px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>
        {icon}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile?'15px':'17px', color:t.text, letterSpacing:'0.5px', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:'3px' }}>
          {activity.name || `${label} Activity`}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{dateStr}</span>
          {activity.distance > 0 && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:t.text }}>{fmtMi(activity.distance)}</span>}
          {activity.moving_time > 0 && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{fmtTime(activity.moving_time)}</span>}
          {activity.distance > 0 && activity.moving_time > 0 && label==='Run' && (
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{fmtPace(activity.moving_time, activity.distance)}</span>
          )}
          {activity.total_elevation_gain > 0 && (
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>↑{Math.round(activity.total_elevation_gain*3.28)}ft</span>
          )}
        </div>
      </div>

      {/* Sport badge */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', color, background:`${color}15`, padding:'3px 8px', borderRadius:'20px', textTransform:'uppercase' }}>{label}</span>
        {/* Checkbox */}
        <div style={{ width:22, height:22, borderRadius:'6px', border:`2px solid ${selected?'#1B2A4A':t.border}`, background:selected?'#1B2A4A':'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
          {selected && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TrainingBlock() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { id }    = useParams()
  const { user }  = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const isMobile  = useIsMobile()

  const [race, setRace]           = useState(location.state?.race || null)
  const [profile, setProfile]     = useState(null)
  const [activities, setActivities] = useState([])
  const [saved, setSaved]         = useState([]) // already-saved activity IDs
  const [selected, setSelected]   = useState({}) // currently selected
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved_ok, setSavedOk]    = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Filters
  const [sportFilter, setSportFilter] = useState('All')
  const [minMiles, setMinMiles]       = useState(0)
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')

  const { connected: stravaConnected, getActivities, token } = useStrava(profile, user?.id)

  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'The Wall', path:'/wall',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2c0 4-5 6-5 10a5 5 0 0 0 10 0c0-4-5-6-5-10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 14a1.5 1.5 0 0 1-1.5-1.5c0-1 1.5-2 1.5-2s1.5 1 1.5 2A1.5 1.5 0 0 1 10 14z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:'/profile',  icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  const initials = (profile?.full_name||'RG').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-tb-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      @keyframes pulse { 0%,100%{opacity:0.5;}50%{opacity:1;} }
      .rp-nav-tab { display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 24px;height:64px;justify-content:center;cursor:pointer;border:none;background:none;transition:color 0.15s;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid transparent;white-space:nowrap; }
      .rp-dropdown-item { display:block;width:100%;padding:10px 18px;background:none;border:none;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;transition:background 0.1s; }
      div::-webkit-scrollbar { display:none; }
    `
    if (!document.getElementById('rp-tb-styles')) document.head.appendChild(style)

    const init = async () => {
      if (!user) return

      // Load profile
      const { data: prof } = await supabase.from('profiles')
        .select('full_name,strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
        .eq('id', user.id).single()
      setProfile(prof)

      // Load race if not passed via state
      if (!race) {
        const { data: r } = await supabase.from('passport_races')
          .select('*').eq('id', id).single()
        if (r) setRace({ id:r.id, name:r.name, distance:r.distance, date:r.date_sort||r.date, time:r.time, is_upcoming: new Date(r.date_sort||r.date) > new Date() })
      }

      // Load already-saved training activities for this race
      const { data: existing } = await supabase.from('training_activities')
        .select('strava_activity_id,included,activity_data')
        .eq('user_id', user.id).eq('race_id', id)
      if (existing?.length) {
        setSaved(existing.map(e => e.strava_activity_id))
        // Pre-select included ones
        const sel = {}
        existing.filter(e => e.included).forEach(e => { sel[e.strava_activity_id] = true })
        setSelected(sel)
        // Restore activity data for display
        const restored = existing.map(e => ({ ...e.activity_data, id: e.strava_activity_id }))
        setActivities(restored)
      }

      setLoading(false)
    }
    init()

    const handleClick = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-tb-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user, id])

  // Pull Strava activities for the training window
  const pullFromStrava = async () => {
    if (!stravaConnected || !race) return
    setLoading(true)

    // Calculate training window
    const raceDate = new Date(race.date)
    const dist = (race.distance||'').toString()
    let weeksBack = 16
    if (dist.includes('5K') || dist.includes('5k')) weeksBack = 8
    else if (dist.includes('10K') || dist.includes('10k')) weeksBack = 10
    else if (dist.includes('13.1') || dist.toLowerCase().includes('half')) weeksBack = 12
    else if (dist.includes('140.6') || dist.toLowerCase().includes('ironman')) weeksBack = 24

    const windowStart = new Date(raceDate)
    windowStart.setDate(windowStart.getDate() - weeksBack * 7)
    const afterTs = Math.floor(windowStart.getTime() / 1000)
    const beforeTs = Math.floor(raceDate.getTime() / 1000) + 86400

    // Fetch up to 3 pages
    try {
      const [p1, p2, p3] = await Promise.all([
        getActivities({ per_page:60, page:1, after:afterTs, before:beforeTs }),
        getActivities({ per_page:60, page:2, after:afterTs, before:beforeTs }),
        getActivities({ per_page:60, page:3, after:afterTs, before:beforeTs }),
      ])
      const all = [...(p1||[]), ...(p2||[]), ...(p3||[])]
        .filter(a => a.id)
        .sort((a,b) => new Date(b.start_date_local) - new Date(a.start_date_local))

      setActivities(all)
      // Auto-select all runs/rides/swims by default
      const sel = {}
      all.forEach(a => {
        const t = (a.type||a.sport_type||'').toLowerCase()
        if (['run','virtualrun','ride','virtualride','swim'].includes(t)) sel[a.id] = true
      })
      setSelected(sel)

      // Set date filter defaults
      if (all.length > 0) {
        const dates = all.map(a => a.start_date_local).filter(Boolean).sort()
        setDateFrom(dates[0]?.split('T')[0] || '')
        setDateTo(dates[dates.length-1]?.split('T')[0] || '')
      }
    } catch(e) { console.error('Strava pull error:', e) }
    setLoading(false)
  }

  // Filtered activities
  const filtered = useMemo(() => {
    return activities.filter(a => {
      const type = sportLabel(a.type || a.sport_type || '')
      if (sportFilter !== 'All' && type !== sportFilter) return false
      if (minMiles > 0 && (a.distance||0)/1609.34 < minMiles) return false
      if (dateFrom) {
        const d = new Date(a.start_date_local || a.date)
        if (d < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const d = new Date(a.start_date_local || a.date)
        if (d > new Date(dateTo + 'T23:59:59')) return false
      }
      return true
    })
  }, [activities, sportFilter, minMiles, dateFrom, dateTo])

  const selectedFiltered = filtered.filter(a => selected[a.id])
  const sportTypes = ['All', ...new Set(activities.map(a => sportLabel(a.type||a.sport_type||'')).filter(Boolean))]

  const toggleActivity = id => setSelected(p => ({ ...p, [id]: !p[id] }))
  const selectAll      = () => { const s={}; filtered.forEach(a=>{s[a.id]=true}); setSelected(p=>({...p,...s})) }
  const deselectAll    = () => { const s={}; filtered.forEach(a=>{s[a.id]=false}); setSelected(p=>({...p,...s})) }

  // Save selected activities to training_activities table
  const handleSave = async () => {
    if (!user || !race) return
    setSaving(true)
    try {
      const rows = activities.map(a => ({
        user_id:            user.id,
        race_id:            race.id,
        strava_activity_id: a.id,
        activity_data: {
          id:                  a.id,
          name:                a.name,
          type:                a.type || a.sport_type,
          distance:            a.distance,
          moving_time:         a.moving_time,
          total_elevation_gain:a.total_elevation_gain,
          start_date_local:    a.start_date_local,
          date:                a.start_date_local,
          map:                 a.map,
        },
        included:     !!selected[a.id],
        reviewed_at:  new Date().toISOString(),
      }))

      await supabase.from('training_activities').upsert(rows, {
        onConflict: 'user_id,race_id,strava_activity_id',
        ignoreDuplicates: false,
      })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch(e) { console.error('Save error:', e) }
    setSaving(false)
  }

  const raceIsUpcoming = race ? new Date(race.date) > new Date() : false
  const colors = race ? getDistanceColor(race.distance||'') : {}

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s', overflowX:'hidden' }}>

      {/* ── NAV ── */}
      {isMobile ? (
        <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
            <button onClick={() => navigate(`/race/${id}`)}
              style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase', padding:0 }}>
              ← Back to Race
            </button>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', letterSpacing:'2px', color:t.text }}>TRAINING BLOCK</div>
            <div style={{ width:60 }} />
          </div>
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderTop:`1px solid ${t.navBorder}`, display:'flex', height:64 }}>
            {NAV_TABS.map(tab => (
              <button key={tab.path} className="rp-nav-tab"
                style={{ color:location.pathname.startsWith('/race/')?t.textMuted:t.textMuted, borderBottom:'none', flex:1, height:64 }}
                onClick={() => navigate(tab.path)}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow }}>
          <div style={{ width:'100%', padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</span>
            </div>
            <div style={{ display:'flex', alignItems:'stretch' }}>
              {NAV_TABS.map(tab => (
                <button key={tab.path} className="rp-nav-tab"
                  style={{ color:t.textMuted, borderBottomColor:'transparent' }}
                  onClick={() => navigate(tab.path)}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div ref={dropdownRef} style={{ position:'relative' }}>
                <div onClick={() => setShowDropdown(!showDropdown)}
                  style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}` }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
                  onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C' }}>{initials}</span>
                </div>
                {showDropdown && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'180px', overflow:'hidden', zIndex:100 }}>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={() => { navigate('/passport'); setShowDropdown(false) }} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>My Passport</button>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={() => { navigate('/profile'); setShowDropdown(false) }} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Settings</button>
                    <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text }}>Dark Mode</span>
                      <button onClick={toggleTheme} style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                        <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div style={{ background:t.greetingBg, borderBottom:`3px solid #C9A84C`, padding: isMobile?'24px 20px 20px':'36px 40px 28px' }}>
        <button onClick={() => navigate(`/race/${id}`)}
          style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', padding:0, marginBottom:'16px', display:'flex', alignItems:'center', gap:'6px' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to {race?.name || 'Race Page'}
        </button>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px' }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile?'32px':'clamp(36px,5vw,56px)', color:t.text, letterSpacing:'2px', lineHeight:1, marginBottom:'6px' }}>
              {raceIsUpcoming ? 'Training Block' : 'Race Training History'}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile?'16px':'22px', color:'#C9A84C', letterSpacing:'1.5px', lineHeight:1, marginBottom:'8px' }}>
              {race?.name || '—'}
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, lineHeight:1.6 }}>
              {raceIsUpcoming
                ? `Select Strava activities that are part of your ${race?.distance||''} training block. Pacer will grade your preparation over time.`
                : `Select the Strava activities that were part of your build-up for this ${race?.distance||''} race. Pacer will analyze your training and generate a Report Card.`}
            </div>
          </div>
          {race?.distance && (
            <div style={{ flexShrink:0, width:60, height:60, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder||'#C9A84C'}`, display:'flex', alignItems:'center', justifyContent:'center', background:t.isDark?'rgba(201,168,76,0.06)':'#fff' }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:race.distance.length>4?12:race.distance.length>2?16:22, color:colors.stampText||'#1B2A4A', letterSpacing:'0.5px' }}>
                {race.distance.replace(' mi','').replace(' miles','')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding: isMobile?'20px 16px 120px':'32px 40px 80px', animation:'fadeIn 0.4s ease both' }}>

        {/* Pull from Strava CTA — if no activities yet */}
        {activities.length === 0 && (
          <div style={{ marginBottom:'28px', borderRadius:'16px', border:`2px dashed ${t.border}`, padding: isMobile?'28px 20px':'36px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>⚡</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'8px' }}>
              {stravaConnected ? 'Pull Your Strava Activities' : 'Connect Strava First'}
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'20px', lineHeight:1.6, maxWidth:'420px', margin:'0 auto 20px' }}>
              {stravaConnected
                ? `We'll pull up to ${raceIsUpcoming ? '16' : '24'} weeks of Strava activities for your review. You choose which ones are part of this training block.`
                : 'Connect your Strava account to import training activities.'}
            </div>
            {stravaConnected ? (
              <button onClick={pullFromStrava}
                style={{ padding:'12px 28px', border:'none', borderRadius:'10px', background:'#FC4C02', fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', letterSpacing:'1.5px', color:'#fff', cursor:'pointer', transition:'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                Pull from Strava →
              </button>
            ) : (
              <button onClick={() => navigate('/profile')}
                style={{ padding:'12px 28px', border:'none', borderRadius:'10px', background:'#FC4C02', fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', letterSpacing:'1.5px', color:'#fff', cursor:'pointer' }}>
                Connect Strava →
              </button>
            )}
          </div>
        )}

        {/* Loading spinner */}
        {loading && activities.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px', color:t.textMuted }}>
            <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px' }}>Pulling from Strava...</div>
          </div>
        )}

        {activities.length > 0 && (
          <>
            {/* Weekly chart */}
            <div style={{ background:t.surface, borderRadius:'16px', padding: isMobile?'16px':'24px', marginBottom:'20px', border:`1px solid ${t.border}` }}>
              <WeeklyChart activities={activities.filter(a => selected[a.id])} t={t} />
            </div>

            {/* Filter bar */}
            <div style={{ background:t.surface, borderRadius:'12px', padding:'14px 16px', marginBottom:'16px', border:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
              {/* Sport type chips */}
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {sportTypes.map(s => (
                  <button key={s} onClick={() => setSportFilter(s)}
                    style={{ padding:'5px 12px', borderRadius:'20px', border:`1.5px solid ${sportFilter===s?'#1B2A4A':t.border}`, background:sportFilter===s?'#1B2A4A':'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'0.5px', color:sportFilter===s?'#fff':t.textMuted, cursor:'pointer', transition:'all 0.15s', textTransform:'uppercase' }}>
                    {s}
                  </button>
                ))}
              </div>
              {/* Min distance */}
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>Min</span>
                <select value={minMiles} onChange={e => setMinMiles(Number(e.target.value))}
                  style={{ padding:'4px 8px', borderRadius:'6px', border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', cursor:'pointer', outline:'none' }}>
                  <option value={0}>Any distance</option>
                  <option value={1}>1+ mi</option>
                  <option value={3}>3+ mi</option>
                  <option value={5}>5+ mi</option>
                  <option value={10}>10+ mi</option>
                </select>
              </div>
              {/* Date range */}
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ padding:'4px 8px', borderRadius:'6px', border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', outline:'none', cursor:'pointer' }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ padding:'4px 8px', borderRadius:'6px', border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', outline:'none', cursor:'pointer' }} />
              </div>
              {/* Refresh */}
              {stravaConnected && (
                <button onClick={pullFromStrava}
                  style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'5px', padding:'5px 12px', border:`1.5px solid rgba(252,76,2,0.3)`, borderRadius:'20px', background:'rgba(252,76,2,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#FC4C02', cursor:'pointer', textTransform:'uppercase' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M9 5A4 4 0 1 1 5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M5 1l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Refresh
                </button>
              )}
            </div>

            {/* Select/deselect controls */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted }}>
                {filtered.length} activities · <strong style={{ color:t.text }}>{selectedFiltered.length} selected</strong>
              </span>
              <div style={{ display:'flex', gap:'12px' }}>
                <button onClick={selectAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase', padding:0 }}>Select All</button>
                <button onClick={deselectAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase', padding:0 }}>Clear</button>
              </div>
            </div>

            {/* Activities list */}
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'24px' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:t.textMuted, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px' }}>
                  No activities match these filters
                </div>
              ) : (
                filtered.map(a => (
                  <ActivityCard key={a.id} activity={a} selected={!!selected[a.id]} onToggle={toggleActivity} t={t} isMobile={isMobile} />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── STICKY FOOTER CTA ── */}
      {activities.length > 0 && (
        <div style={{ position:'fixed', bottom: isMobile?64:0, left:0, right:0, zIndex:40, background:t.navBg, backdropFilter:'blur(12px)', borderTop:`1px solid ${t.navBorder}`, padding: isMobile?'12px 16px':'14px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted }}>
            <strong style={{ color:t.text }}>{selectedCount}</strong> activities · <strong style={{ color:t.text }}>{activities.filter(a=>selected[a.id]).reduce((s,a)=>s+(a.distance||0)/1609.34,0).toFixed(1)} mi</strong> total
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            {saved_ok && (
              <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 16px', borderRadius:'8px', background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.3)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#16a34a' }}>Saved!</span>
              </div>
            )}
            <button onClick={handleSave} disabled={saving || selectedCount === 0}
              style={{ padding:'10px 24px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', opacity:selectedCount===0?0.5:1, transition:'background 0.2s', display:'flex', alignItems:'center', gap:'8px' }}
              onMouseEnter={e => { if(selectedCount>0) e.currentTarget.style.background='#C9A84C'; e.currentTarget.querySelector('span').style.color='#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background='#1B2A4A'; e.currentTarget.querySelector('span').style.color='#C9A84C' }}>
              <span>{saving ? 'Saving...' : `Save ${selectedCount} Activities →`}</span>
            </button>
            <button onClick={() => { handleSave().then(() => navigate(`/race/${id}`)) }}
              disabled={saving || selectedCount === 0}
              style={{ padding:'10px 20px', border:`1.5px solid ${t.border}`, borderRadius:'10px', background:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase', opacity:selectedCount===0?0.4:1 }}>
              Save & Generate Report Card →
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
