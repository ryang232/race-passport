import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { useStrava } from '../lib/useStrava'
import { useIsMobile } from '../lib/useIsMobile'
import { getDistanceColor } from '../lib/colors'

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseRaceDate(dateStr) {
  if (!dateStr) return null
  // Try ISO first (2025-06-08)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr + 'T12:00:00')
  // Try display format (Jun 8, 2025 or June 8, 2025)
  const d = new Date(dateStr)
  return isNaN(d) ? null : d
}

function fmtTime(secs) {
  if (!secs) return '—'
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}
function fmtMi(meters) { return `${(meters/1609.34).toFixed(2)} mi` }
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
  if (t.includes('weight') || t.includes('strength') || t.includes('workout')) return 'Strength'
  return type || 'Activity'
}
function sportIcon(type) {
  const l = sportLabel(type)
  if (l==='Bike')     return '🚴'
  if (l==='Swim')     return '🏊'
  if (l==='Run')      return '🏃'
  if (l==='Walk')     return '🚶'
  if (l==='Hike')     return '🥾'
  if (l==='Strength') return '💪'
  return '⚡'
}
function sportColor(type) {
  const l = sportLabel(type)
  if (l==='Bike')     return '#f59e0b'
  if (l==='Swim')     return '#3b82f6'
  if (l==='Run')      return '#10b981'
  if (l==='Walk')     return '#8b5cf6'
  if (l==='Strength') return '#ef4444'
  return '#9aa5b4'
}

// Weeks back by distance
function weeksBackForDistance(dist) {
  const d = (dist||'').toString().toLowerCase()
  if (d.includes('5k'))  return 8
  if (d.includes('10k')) return 10
  if (d.includes('13.1') || d.includes('half')) return 12
  if (d.includes('140.6') || (d.includes('ironman') && !d.includes('70'))) return 24
  if (d.includes('70.3') || d.includes('tri')) return 16
  if (d.includes('26.2') || d.includes('marathon')) return 16
  if (d.includes('ultra') || d.includes('50')) return 20
  return 16
}

// ── Weekly volume chart ───────────────────────────────────────────────────────
function WeeklyChart({ activities, t }) {
  const weeks = useMemo(() => {
    const map = {}
    activities.forEach(a => {
      const d = new Date(a.start_date_local || a.date)
      if (isNaN(d)) return
      const day = d.getDay() || 7
      const mon = new Date(d); mon.setDate(d.getDate() - day + 1)
      const key = mon.toISOString().split('T')[0]
      if (!map[key]) map[key] = { key, miles:0, count:0 }
      map[key].miles += (a.distance||0)/1609.34
      map[key].count++
    })
    return Object.values(map).sort((a,b) => a.key.localeCompare(b.key)).slice(-20)
  }, [activities])

  if (weeks.length === 0) return null
  const maxMiles = Math.max(...weeks.map(w => w.miles), 1)

  return (
    <div style={{ marginBottom:'8px' }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase', marginBottom:'10px' }}>
        Weekly Volume — {weeks.length} Weeks Selected
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:56 }}>
        {weeks.map(w => (
          <div key={w.key} title={`Week of ${new Date(w.key).toLocaleDateString('en-US',{month:'short',day:'numeric'})}: ${w.miles.toFixed(1)} mi`}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
            <div style={{ width:'100%', background:'#C9A84C', borderRadius:'3px 3px 0 0', opacity:0.8, height:`${Math.max(3,(w.miles/maxMiles)*50)}px`, transition:'height 0.3s' }} />
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'8px', flexWrap:'wrap', gap:'8px' }}>
        {[
          { label:'Total Miles', value:`${activities.reduce((s,a)=>s+(a.distance||0)/1609.34,0).toFixed(1)} mi` },
          { label:'Activities',  value:activities.length },
          { label:'Peak Week',   value:`${maxMiles.toFixed(1)} mi` },
          { label:'Avg/Week',    value:weeks.length>0?`${(activities.reduce((s,a)=>s+(a.distance||0)/1609.34,0)/weeks.length).toFixed(1)} mi`:'—' },
        ].map(s => (
          <div key={s.label} style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:t.text, letterSpacing:'0.5px', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'2px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Activity Card ─────────────────────────────────────────────────────────────
function ActivityCard({ activity, selected, onToggle, t, isMobile, isRaceDay }) {
  const type  = activity.type || activity.sport_type || ''
  const color = isRaceDay ? '#C9A84C' : sportColor(type)
  const icon  = isRaceDay ? '⭐' : sportIcon(type)
  const label = isRaceDay ? 'Race Day' : sportLabel(type)
  const date  = new Date(activity.start_date_local || activity.date)
  const dateStr = isNaN(date) ? '—' : date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})

  return (
    <div onClick={() => !isRaceDay && onToggle(activity.id)}
      style={{ borderRadius:'12px', border:`2px solid ${isRaceDay?'#C9A84C':selected?'#1B2A4A':t.border}`, background:isRaceDay?(t.isDark?'rgba(201,168,76,0.08)':'#FFFDF5'):selected?(t.isDark?'rgba(27,42,74,0.25)':'rgba(27,42,74,0.04)'):t.surface, cursor:isRaceDay?'default':'pointer', transition:'all 0.15s', padding:isMobile?'12px':'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>

      {/* Sport icon */}
      <div style={{ width:40, height:40, borderRadius:'10px', background:`${color}18`, border:`1.5px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>
        {icon}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isMobile?'15px':'17px', color:t.text, letterSpacing:'0.5px', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {activity.name || `${label} Activity`}
          </div>
          {isRaceDay && (
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', background:'rgba(201,168,76,0.12)', padding:'2px 8px', borderRadius:'10px', flexShrink:0, textTransform:'uppercase' }}>Race Day</span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{dateStr}</span>
          {activity.distance > 0 && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:t.text }}>{fmtMi(activity.distance)}</span>}
          {activity.moving_time > 0 && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{fmtTime(activity.moving_time)}</span>}
          {activity.distance>0 && activity.moving_time>0 && sportLabel(type)==='Run' && (
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{fmtPace(activity.moving_time,activity.distance)}</span>
          )}
          {activity.total_elevation_gain > 0 && (
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>↑{Math.round(activity.total_elevation_gain*3.28)}ft</span>
          )}
        </div>
      </div>

      {/* Badge + checkbox */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', color, background:`${color}15`, padding:'3px 8px', borderRadius:'20px', textTransform:'uppercase' }}>{label}</span>
        {!isRaceDay && (
          <div style={{ width:22, height:22, borderRadius:'6px', border:`2px solid ${selected?'#1B2A4A':t.border}`, background:selected?'#1B2A4A':'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
            {selected && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pacer Auto-Grade Panel ────────────────────────────────────────────────────
function PacerAutoPanel({ race, t, isMobile, onAutoSelect, weeksBack, setWeeksBack, sportMode, setSportMode }) {
  const SPORT_MODES = [
    { key:'endurance', label:'Running only',           desc:'Only runs — perfect for road races',            sports:['Run','VirtualRun'] },
    { key:'tri',       label:'Run + Bike + Swim',      desc:'All triathlon disciplines',                     sports:['Run','VirtualRun','Ride','VirtualRide','Swim'] },
    { key:'all',       label:'All activities',         desc:'Everything except strength/weight training',    sports:null },
    { key:'custom',    label:'Let me choose',          desc:'I\'ll select activities manually',              sports:null },
  ]

  return (
    <div style={{ marginBottom:'24px', borderRadius:'16px', background:t.isDark?'rgba(201,168,76,0.06)':'#FFFDF5', border:`1px solid ${t.isDark?'rgba(201,168,76,0.2)':'rgba(201,168,76,0.3)'}`, padding:isMobile?'16px':'20px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
        <span style={{ fontSize:'20px' }}>🏃</span>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>Not sure which activities to pick?</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, marginTop:'2px' }}>Let Pacer do it — tell us what to include and we'll auto-select your training block.</div>
        </div>
      </div>

      <div style={{ height:'1px', background:t.borderLight, margin:'14px 0' }} />

      {/* How far back */}
      <div style={{ marginBottom:'16px' }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>How far back should Pacer look?</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {[
            { weeks:8,  label:'8 weeks' },
            { weeks:12, label:'12 weeks' },
            { weeks:16, label:'16 weeks', recommended: !['5K','10K'].includes(race?.distance) },
            { weeks:20, label:'20 weeks' },
            { weeks:24, label:'24 weeks', recommended: ['140.6'].includes(race?.distance) },
          ].map(opt => (
            <button key={opt.weeks} onClick={() => setWeeksBack(opt.weeks)}
              style={{ padding:'6px 14px', borderRadius:'20px', border:`1.5px solid ${weeksBack===opt.weeks?'#1B2A4A':t.border}`, background:weeksBack===opt.weeks?'#1B2A4A':'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:weeksBack===opt.weeks?'#fff':t.textMuted, cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', gap:'5px' }}>
              {opt.label}
              {opt.recommended && <span style={{ fontSize:'9px', color:weeksBack===opt.weeks?'#C9A84C':'#C9A84C', fontWeight:700 }}>★ REC</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Sport mode */}
      <div style={{ marginBottom:'16px' }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>What types of activities?</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {SPORT_MODES.map(mode => (
            <div key={mode.key} onClick={() => setSportMode(mode.key)}
              style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 12px', borderRadius:'8px', border:`1.5px solid ${sportMode===mode.key?'#1B2A4A':t.border}`, background:sportMode===mode.key?t.isDark?'rgba(27,42,74,0.3)':'rgba(27,42,74,0.05)':'none', cursor:'pointer', transition:'all 0.15s' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', border:`2px solid ${sportMode===mode.key?'#1B2A4A':t.textMuted}`, background:sportMode===mode.key?'#1B2A4A':'none', flexShrink:0, marginTop:4 }} />
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text }}>{mode.label}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{mode.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {sportMode !== 'custom' && (
        <button onClick={() => onAutoSelect(weeksBack, sportMode)}
          style={{ width:'100%', padding:'12px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', transition:'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background='#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
          <span style={{ color:'#fff' }}>Let Pacer Auto-Select My Training →</span>
        </button>
      )}
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

  const [race, setRace]             = useState(location.state?.race || null)
  const [raceActivities, setRaceActivities] = useState([]) // ALL activities on race day (swim, bike, run for tri)
  const [profile, setProfile]       = useState(null)
  const [activities, setActivities] = useState([]) // all pulled activities (excl race day)
  const [selected, setSelected]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [savedOk, setSavedOk]     = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [pacerAutoWeeks, setPacerAutoWeeks] = useState(16)
  const [pacerSportMode, setPacerSportMode] = useState('endurance')
  const dropdownRef = useRef(null)

  // Filters
  const [sportFilter, setSportFilter] = useState('All')
  const [minMiles, setMinMiles]       = useState(0)
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')

  const { connected: stravaConnected, getActivities } = useStrava(profile, user?.id)

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
      const { data: prof } = await supabase.from('profiles')
        .select('full_name,strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
        .eq('id', user.id).single()
      setProfile(prof)

      if (!race) {
        const { data: r } = await supabase.from('passport_races').select('*').eq('id', id).single()
        if (r) {
          const rd = parseRaceDate(r.date_sort || r.date)
          setRace({ id:r.id, name:r.name, distance:r.distance, date:r.date_sort||r.date, raceDate:rd, time:r.time })
          setPacerAutoWeeks(weeksBackForDistance(r.distance))
        }
      } else {
        setPacerAutoWeeks(weeksBackForDistance(race.distance))
        if (!race.raceDate) setRace(prev => ({ ...prev, raceDate: parseRaceDate(prev.date) }))
      }

      // Load saved training activities
      const { data: existing } = await supabase.from('training_activities')
        .select('strava_activity_id,included,activity_data')
        .eq('user_id', user.id).eq('race_id', id)
      if (existing?.length) {
        const sel = {}
        existing.filter(e => e.included).forEach(e => { sel[e.strava_activity_id] = true })
        setSelected(sel)
        const restored = existing.map(e => ({ ...e.activity_data, id: e.strava_activity_id }))
          .sort((a,b) => new Date(b.start_date_local||b.date) - new Date(a.start_date_local||a.date))
        setActivities(restored)
      }
      setLoading(false)
    }
    init()

    const handleClick = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-tb-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user, id])

  // ── Pull from Strava ──────────────────────────────────────────────────────
  const pullFromStrava = async (weeksOverride) => {
    if (!stravaConnected || !race) return
    setLoading(true)

    const raceDate = race.raceDate || parseRaceDate(race.date)
    if (!raceDate) { setLoading(false); return }

    const weeks = weeksOverride || weeksBackForDistance(race.distance)
    const windowStart = new Date(raceDate)
    windowStart.setDate(windowStart.getDate() - weeks * 7)

    // CRITICAL: before = race date + 1 day (include race day, exclude everything after)
    const afterTs  = Math.floor(windowStart.getTime() / 1000)
    const beforeTs = Math.floor(raceDate.getTime() / 1000) + 86400 // race day + 1 day

    try {
      const [p1, p2, p3] = await Promise.all([
        getActivities({ per_page:60, page:1, after:afterTs, before:beforeTs }),
        getActivities({ per_page:60, page:2, after:afterTs, before:beforeTs }),
        getActivities({ per_page:60, page:3, after:afterTs, before:beforeTs }),
      ])
      const all = [...(p1||[]), ...(p2||[]), ...(p3||[])]
        .filter(a => a.id)
        // Sort newest first (chronological descending)
        .sort((a,b) => new Date(b.start_date_local) - new Date(a.start_date_local))

      // Separate race day activities from training
      const raceDateStr = raceDate.toISOString().split('T')[0]
      const raceDayActs = all.filter(a => (a.start_date_local||'').split('T')[0] === raceDateStr)
      const trainingActs = all.filter(a => (a.start_date_local||'').split('T')[0] !== raceDateStr)

      // Pin ALL race day activities (Swim + Bike + Run for tri)
      setRaceActivities(raceDayActs.sort((a,b) => new Date(a.start_date_local) - new Date(b.start_date_local)))

      setActivities(trainingActs)

      // Auto-select runs/rides/swims by default
      const sel = {}
      trainingActs.forEach(a => {
        const t = (a.type||a.sport_type||'').toLowerCase()
        if (['run','virtualrun','ride','virtualride','swim'].includes(t)) sel[a.id] = true
      })
      setSelected(sel)

      // Set date filter defaults
      if (trainingActs.length > 0) {
        const dates = trainingActs.map(a => a.start_date_local).filter(Boolean).sort()
        setDateFrom(dates[0]?.split('T')[0] || '')
        setDateTo(dates[dates.length-1]?.split('T')[0] || '')
      }
    } catch(e) { console.error('Strava pull error:', e) }
    setLoading(false)
  }

  // ── Pacer auto-select ─────────────────────────────────────────────────────
  const handlePacerAutoSelect = async (weeks, sportMode) => {
    await pullFromStrava(weeks)
    // After pull, override selection based on sport mode
    setActivities(prev => {
      const sel = {}
      prev.forEach(a => {
        const type = (a.type||a.sport_type||'').toLowerCase()
        const label = sportLabel(a.type||a.sport_type||'')
        if (sportMode === 'endurance') {
          sel[a.id] = ['run','virtualrun'].includes(type)
        } else if (sportMode === 'tri') {
          sel[a.id] = ['run','virtualrun','ride','virtualride','swim'].includes(type)
        } else if (sportMode === 'all') {
          sel[a.id] = label !== 'Strength' // exclude weight training
        }
      })
      setSelected(sel)
      return prev
    })
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return activities.filter(a => {
      const type = sportLabel(a.type || a.sport_type || '')
      if (sportFilter !== 'All' && type !== sportFilter) return false
      if (minMiles > 0 && (a.distance||0)/1609.34 < minMiles) return false
      if (dateFrom) { const d = new Date(a.start_date_local||a.date); if (d < new Date(dateFrom)) return false }
      if (dateTo)   { const d = new Date(a.start_date_local||a.date); if (d > new Date(dateTo+'T23:59:59')) return false }
      return true
    })
  }, [activities, sportFilter, minMiles, dateFrom, dateTo])

  const selectedFiltered = filtered.filter(a => selected[a.id])
  const sportTypes = ['All', ...new Set(activities.map(a => sportLabel(a.type||a.sport_type||'')).filter(Boolean))]
  const toggleActivity = id => setSelected(p => ({ ...p, [id]:!p[id] }))
  const selectAll  = () => { const s={}; filtered.forEach(a=>{s[a.id]=true});  setSelected(p=>({...p,...s})) }
  const clearAll   = () => { const s={}; filtered.forEach(a=>{s[a.id]=false}); setSelected(p=>({...p,...s})) }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !race) return
    setSaving(true)
    try {
      const rows = activities.map(a => ({
        user_id:            user.id,
        race_id:            race.id,
        strava_activity_id: a.id,
        activity_data: { id:a.id, name:a.name, type:a.type||a.sport_type, distance:a.distance, moving_time:a.moving_time, total_elevation_gain:a.total_elevation_gain, start_date_local:a.start_date_local, date:a.start_date_local, map:a.map },
        included:    !!selected[a.id],
        reviewed_at: new Date().toISOString(),
      }))
      await supabase.from('training_activities').upsert(rows, { onConflict:'user_id,race_id,strava_activity_id', ignoreDuplicates:false })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch(e) {}
    setSaving(false)
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const colors = race ? getDistanceColor(race.distance||'') : {}
  const raceIsUpcoming = race ? (race.raceDate || parseRaceDate(race.date) || new Date()) > new Date() : false

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s', overflowX:'hidden' }}>

      {/* ── NAV ── */}
      {isMobile ? (
        <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
            <button onClick={() => navigate(`/race/${id}`)} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase', padding:0 }}>← Back</button>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', letterSpacing:'2px', color:t.text }}>TRAINING BLOCK</div>
            <div style={{ width:60 }} />
          </div>
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderTop:`1px solid ${t.navBorder}`, display:'flex', height:64 }}>
            {NAV_TABS.map(tab => (
              <button key={tab.path} className="rp-nav-tab" style={{ color:t.textMuted, borderBottom:'none', flex:1, height:64 }} onClick={() => navigate(tab.path)}>{tab.icon}{tab.label}</button>
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
                <button key={tab.path} className="rp-nav-tab" style={{ color:t.textMuted, borderBottomColor:'transparent' }} onClick={() => navigate(tab.path)}>{tab.icon}{tab.label}</button>
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
      <div style={{ background:t.greetingBg, borderBottom:`3px solid #C9A84C`, padding:isMobile?'24px 20px 20px':'36px 40px 28px' }}>
        <button onClick={() => navigate(`/race/${id}`)}
          style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', padding:0, marginBottom:'16px', display:'flex', alignItems:'center', gap:'6px' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to {race?.name || 'Race Page'}
        </button>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px' }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isMobile?'32px':'clamp(36px,5vw,56px)', color:t.text, letterSpacing:'2px', lineHeight:1, marginBottom:'4px' }}>
              {raceIsUpcoming ? 'Training Block' : 'Race Training History'}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isMobile?'16px':'22px', color:'#C9A84C', letterSpacing:'1.5px', marginBottom:'8px' }}>{race?.name || '—'}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, lineHeight:1.6 }}>
              {raceIsUpcoming
                ? `Select Strava activities that are part of your ${race?.distance||''} training block.`
                : `Select activities from your ${race?.distance||''} training build. Pacer will analyze and generate your Report Card.`}
            </div>
          </div>
          {race?.distance && (
            <div style={{ flexShrink:0, width:60, height:60, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder||'#C9A84C'}`, display:'flex', alignItems:'center', justifyContent:'center', background:t.isDark?'rgba(201,168,76,0.06)':'#fff' }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:race.distance.length>4?12:race.distance.length>2?16:22, color:colors.stampText||'#1B2A4A' }}>
                {race.distance.replace(' mi','').replace(' miles','')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:isMobile?'20px 16px 120px':'32px 40px 80px', animation:'fadeIn 0.4s ease both' }}>

        {/* Pull CTA — no activities yet */}
        {activities.length === 0 && !loading && (
          <div style={{ marginBottom:'28px', borderRadius:'16px', border:`2px dashed ${t.border}`, padding:isMobile?'28px 20px':'36px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>⚡</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'8px' }}>
              {stravaConnected ? 'Pull Your Strava Training' : 'Connect Strava First'}
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'20px', lineHeight:1.6, maxWidth:'420px', margin:'0 auto 20px' }}>
              {stravaConnected
                ? `We'll pull your activities from the ${weeksBackForDistance(race?.distance)}-week window before race day. Only activities before ${race?.name} will be shown.`
                : 'Connect your Strava account in Profile to import training activities.'}
            </div>
            {stravaConnected ? (
              <button onClick={() => pullFromStrava()}
                style={{ padding:'12px 28px', border:'none', borderRadius:'10px', background:'#FC4C02', fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', letterSpacing:'1.5px', color:'#fff', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.85'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
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

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:'60px' }}>
            <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted }}>Pulling from Strava...</div>
          </div>
        )}

        {activities.length > 0 && (
          <>
            {/* Pacer auto-select panel */}
            <PacerAutoPanel
              race={race} t={t} isMobile={isMobile}
              onAutoSelect={handlePacerAutoSelect}
              weeksBack={pacerAutoWeeks} setWeeksBack={setPacerAutoWeeks}
              sportMode={pacerSportMode} setSportMode={setPacerSportMode}
            />

            {/* Weekly chart */}
            <div style={{ background:t.surface, borderRadius:'16px', padding:isMobile?'16px':'24px', marginBottom:'16px', border:`1px solid ${t.border}` }}>
              <WeeklyChart activities={activities.filter(a => selected[a.id])} t={t} />
            </div>

            {/* Filter bar */}
            <div style={{ background:t.surface, borderRadius:'12px', padding:'14px 16px', marginBottom:'14px', border:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {sportTypes.map(s => (
                  <button key={s} onClick={() => setSportFilter(s)}
                    style={{ padding:'5px 12px', borderRadius:'20px', border:`1.5px solid ${sportFilter===s?'#1B2A4A':t.border}`, background:sportFilter===s?'#1B2A4A':'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:sportFilter===s?'#fff':t.textMuted, cursor:'pointer', transition:'all 0.15s', textTransform:'uppercase' }}>
                    {s}
                  </button>
                ))}
              </div>
              <select value={minMiles} onChange={e => setMinMiles(Number(e.target.value))}
                style={{ padding:'5px 8px', borderRadius:'6px', border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', cursor:'pointer', outline:'none' }}>
                <option value={0}>Any distance</option>
                <option value={1}>1+ mi</option>
                <option value={3}>3+ mi</option>
                <option value={5}>5+ mi</option>
                <option value={10}>10+ mi</option>
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ padding:'5px 8px', borderRadius:'6px', border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', outline:'none' }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ padding:'5px 8px', borderRadius:'6px', border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', outline:'none' }} />
              <button onClick={() => pullFromStrava()}
                style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'5px', padding:'5px 12px', border:`1.5px solid rgba(252,76,2,0.3)`, borderRadius:'20px', background:'rgba(252,76,2,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#FC4C02', cursor:'pointer', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                ↻ Refresh
              </button>
            </div>

            {/* Select/deselect */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted }}>
                {filtered.length} activities · <strong style={{ color:t.text }}>{selectedFiltered.length} in training block</strong>
              </span>
              <div style={{ display:'flex', gap:'12px' }}>
                <button onClick={selectAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#C9A84C', cursor:'pointer', textTransform:'uppercase', padding:0 }}>Select All</button>
                <button onClick={clearAll}  style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:t.textMuted, cursor:'pointer', textTransform:'uppercase', padding:0 }}>Clear</button>
              </div>
            </div>

            {/* ⭐ Race day — all activities pinned at top */}
            {raceActivities.length > 0 && (
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'6px' }}>
                  ⭐ Race Day — {new Date(raceActivities[0].start_date_local).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {raceActivities.map(a => (
                    <ActivityCard key={a.id} activity={a} selected={false} onToggle={() => {}} t={t} isMobile={isMobile} isRaceDay={true} />
                  ))}
                </div>
                <div style={{ height:'1px', background:t.borderLight, margin:'12px 0' }} />
              </div>
            )}

            {/* Training activities — newest first */}
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'24px' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:t.textMuted, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px' }}>No activities match these filters</div>
              ) : (
                filtered.map(a => (
                  <ActivityCard key={a.id} activity={a} selected={!!selected[a.id]} onToggle={toggleActivity} t={t} isMobile={isMobile} isRaceDay={false} />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── STICKY FOOTER ── */}
      {activities.length > 0 && (
        <div style={{ position:'fixed', bottom:isMobile?64:0, left:0, right:0, zIndex:40, background:t.navBg, backdropFilter:'blur(12px)', borderTop:`1px solid ${t.navBorder}`, padding:isMobile?'12px 16px':'14px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted }}>
            <strong style={{ color:t.text }}>{selectedCount}</strong> activities · <strong style={{ color:t.text }}>{activities.filter(a=>selected[a.id]).reduce((s,a)=>s+(a.distance||0)/1609.34,0).toFixed(1)} mi</strong>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            {savedOk && (
              <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'8px 14px', borderRadius:'8px', background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.3)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#16a34a' }}>Saved!</span>
              </div>
            )}
            <button onClick={handleSave} disabled={saving || selectedCount===0}
              style={{ padding:'10px 20px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', opacity:selectedCount===0?0.5:1, transition:'background 0.2s' }}
              onMouseEnter={e => { if(selectedCount>0) e.currentTarget.style.background='#C9A84C' }}
              onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
              <span style={{ color: selectedCount===0?'#C9A84C':'inherit' }}>{saving ? 'Saving...' : `Save ${selectedCount} Activities →`}</span>
            </button>
            <button onClick={async () => { await handleSave(); navigate(`/race/${id}`) }} disabled={saving || selectedCount===0}
              style={{ padding:'10px 16px', border:`1.5px solid ${t.border}`, borderRadius:'10px', background:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:t.textMuted, cursor:'pointer', textTransform:'uppercase', opacity:selectedCount===0?0.4:1, whiteSpace:'nowrap' }}>
              Save & Report Card →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
