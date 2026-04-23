import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { getDistanceColor } from '../lib/colors'
import { useStrava, looksLikeRace } from '../lib/useStrava'
import { useIsMobile } from '../lib/useIsMobile'

const RYAN_RACE_DATA = {
  1:  { id:1,  distance:'10K',  name:'Sole of the City 10K',          location:'Baltimore, MD',   date:'October 16, 2021',   time:'47:49',   pace:'7:42/mi',  place:null, elevation:'190ft', weather:'64°F, Cloudy',       pr:true,  story:'', photos:[], gear:[], splits:[] },
  2:  { id:2,  distance:'10K',  name:'Bay Bridge Run',                 location:'Annapolis, MD',   date:'November 7, 2021',   time:'50:57',   pace:'8:12/mi',  place:null, elevation:'140ft', weather:'52°F, Sunny',        pr:false, story:'', photos:[], gear:[], splits:[] },
  3:  { id:3,  distance:'10K',  name:'Baltimore Running Festival 10K', location:'Baltimore, MD',   date:'October 9, 2021',    time:'58:03',   pace:'9:21/mi',  place:null, elevation:'185ft', weather:'58°F, Partly Cloudy', pr:false, story:'', photos:[], gear:[], splits:[] },
  4:  { id:4,  distance:'13.1', name:'Holiday Half Marathon',          location:'Annandale, VA',   date:'December 4, 2021',   time:'2:19:05', pace:'10:37/mi', place:null, elevation:'350ft', weather:'41°F, Clear',        pr:false, story:'', photos:[], gear:[], splits:[] },
  5:  { id:5,  distance:'26.2', name:'Marine Corps Marathon',          location:'Washington, DC',  date:'October 22, 2023',   time:'4:45:42', pace:'10:55/mi', place:null, elevation:'900ft', weather:null,                 pr:false, story:'', photos:[], gear:[], splits:[] },
  6:  { id:6,  distance:'26.2', name:'LA Marathon',                    location:'Los Angeles, CA', date:'March 19, 2023',     time:'4:44:47', pace:'10:53/mi', place:null, elevation:'700ft', weather:null,                 pr:true,  story:'', photos:[], gear:[], splits:[] },
  7:  { id:7,  distance:'5K',   name:'Downtown Columbia Turkey Trot',  location:'Columbia, MD',    date:'November 28, 2024',  time:'28:16',   pace:'9:06/mi',  place:null, elevation:'95ft',  weather:'38°F, Clear',        pr:true,  story:'', photos:[], gear:[], splits:[] },
  8:  { id:8,  distance:'13.1', name:'Austin Half Marathon',           location:'Austin, TX',      date:'February 16, 2025',  time:'1:57:40', pace:'8:59/mi',  place:null, elevation:'290ft', weather:'55°F, Sunny',        pr:true,  story:'', photos:[], gear:[], splits:[] },
  9:  { id:9,  distance:'70.3', name:'IRONMAN 70.3 Eagleman',          location:'Cambridge, MD',   date:'June 8, 2025',       time:'6:32:08', pace:null,       place:null, elevation:'Flat',  weather:'78°F, Humid',        pr:true,  story:'', photos:[], gear:[],
    splits:[{ label:'Swim', time:'0:50:09' },{ label:'T1', time:'0:06:17' },{ label:'Bike', time:'3:15:09' },{ label:'T2', time:'0:07:09' },{ label:'Run', time:'2:13:24' },{ label:'Total', time:'6:32:08' }] },
  10: { id:10, distance:'5K',   name:'Downtown Columbia Turkey Trot',  location:'Columbia, MD',    date:'November 27, 2025',  time:'35:09',   pace:'11:19/mi', place:null, elevation:'95ft',  weather:'44°F, Clear',        pr:false, story:'', photos:[], gear:[], splits:[] },
}

const ALL_IDS = [1,2,3,4,5,6,7,8,9,10]
const STICKER_OPTIONS = ['🏅','🔥','💪','🎉','⚡','🏆','👟','💦','🌟','🎯','💯','🏃','🚴','🏊']
const GEAR_CATEGORIES = ['Shoes','Watch','Outfit','Socks','Sunglasses','Hat','Headphones','Other']

function AddGearForm({ onAdd, onCancel, t }) {
  const [cat, setCat] = useState(''), [brand, setBrand] = useState(''), [model, setModel] = useState('')
  const [color, setColor] = useState(''), [url, setUrl] = useState(''), [note, setNote] = useState('')
  const inp = { width:'100%', padding:'9px 12px', borderRadius:'6px', border:`1.5px solid ${t.border}`, background:t.inputBg, color:t.text, fontSize:'13px', fontFamily:"'Barlow',sans-serif", outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }
  return (
    <div style={{ background:t.surfaceAlt, border:`1.5px solid ${t.border}`, borderRadius:'12px', padding:'20px', marginTop:'12px' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:t.text, letterSpacing:'1px', marginBottom:'14px' }}>Add Gear</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'10px', marginBottom:'10px' }}>
        <div>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'4px' }}>Category</label>
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inp, appearance:'none', cursor:'pointer' }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border}>
            <option value="">Select...</option>{GEAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'4px' }}>Brand</label>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Nike, Garmin..." style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border} />
        </div>
        <div>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'4px' }}>Model</label>
          <input value={model} onChange={e => setModel(e.target.value)} placeholder="Clifton 9..." style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border} />
        </div>
        <div>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'4px' }}>Color</label>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="Black/White..." style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border} />
        </div>
      </div>
      <div style={{ marginBottom:'10px' }}>
        <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'4px' }}>Shop Link <span style={{ color:t.textMuted, fontWeight:400 }}>(optional)</span></label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border} />
      </div>
      <div style={{ marginBottom:'16px' }}>
        <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'4px' }}>Note <span style={{ color:t.textMuted, fontWeight:400 }}>(optional)</span></label>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Race day go-to..." style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border} />
      </div>
      <div style={{ display:'flex', gap:'10px' }}>
        <button onClick={() => { if (cat&&brand&&model) onAdd({ id:Date.now(), category:cat, brand, model, color, url, note }) }} disabled={!cat||!brand||!model}
          style={{ flex:1, padding:'10px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', opacity:(!cat||!brand||!model)?0.5:1 }}>Add to Page</button>
        <button onClick={onCancel} style={{ padding:'10px 20px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Triathlon Segment Carousel ────────────────────────────────────────────────
function TriCarousel({ triActivities, t, fmt, fmtTime, fmtPace }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const mapRefs  = useRef([])
  const rendered = useRef({})

  const SEG_COLORS = { swim:'#0EA5E9', ride:'#F97316', virtualride:'#F97316', mountainbikeride:'#F97316', run:'#FC4C02', virtualrun:'#FC4C02' }
  const SEG_LABELS = { swim:'Swim', ride:'Bike', virtualride:'Bike', mountainbikeride:'Bike', run:'Run', virtualrun:'Run' }
  const SEG_EMOJI  = { swim:'🏊', ride:'🚴', virtualride:'🚴', mountainbikeride:'🚴', run:'🏃', virtualrun:'🏃' }

  const getType  = seg => (seg.type || seg.sport_type || '').toLowerCase()
  const getColor = seg => SEG_COLORS[getType(seg)] || '#1B2A4A'
  const getLabel = seg => SEG_LABELS[getType(seg)] || getType(seg)
  const getEmoji = seg => SEG_EMOJI[getType(seg)] || '🏅'

  // Draw map for a segment when its ref is ready
  const drawMap = async (seg, el) => {
    if (!el || rendered.current[seg.id] || !seg?.map?.summary_polyline) return
    rendered.current[seg.id] = true
    try {
      if (!window.L) {
        const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
        await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=resolve; document.head.appendChild(s) })
      }
      if (!window.polyline) {
        await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/@mapbox/polyline@1.1.1/src/polyline.js'; s.onload=resolve; document.head.appendChild(s) })
      }
      const L    = window.L
      const poly = window.polyline
      if (!poly || !L) return
      const latlngs = poly.decode(seg.map.summary_polyline)
      if (!latlngs.length) return
      const map = L.map(el, { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, attributionControl:false })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:18 }).addTo(map)
      const line = L.polyline(latlngs, { color: getColor(seg), weight:4, opacity:0.9 }).addTo(map)
      map.fitBounds(line.getBounds(), { padding:[20,20] })
    } catch(e) {}
  }

  // Draw map whenever active segment changes
  useEffect(() => {
    const seg = triActivities[activeIdx]
    const el  = mapRefs.current[activeIdx]
    if (seg && el) drawMap(seg, el)
  }, [activeIdx, triActivities])

  const prev = () => setActiveIdx(i => Math.max(0, i-1))
  const next = () => setActiveIdx(i => Math.min(triActivities.length-1, i+1))

  return (
    <div>
      {/* Map carousel */}
      <div style={{ position:'relative', marginBottom:'12px' }}>
        {/* Map panels — only active one visible */}
        <div style={{ position:'relative', height:'240px', borderRadius:'12px', overflow:'hidden', background:t.surfaceAlt }}>
          {triActivities.map((seg, i) => (
            <div key={seg.id}
              ref={el => { mapRefs.current[i] = el; if (el && i === activeIdx) drawMap(seg, el) }}
              style={{ position:'absolute', inset:0, opacity: i === activeIdx ? 1 : 0, transition:'opacity 0.3s ease', pointerEvents: i === activeIdx ? 'auto' : 'none' }}
            />
          ))}
        </div>

        {/* Prev arrow */}
        {activeIdx > 0 && (
          <button onClick={prev}
            style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', zIndex:10 }}
            onMouseEnter={e => e.currentTarget.style.background='#fff'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.9)'}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="#1B2A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}

        {/* Next arrow */}
        {activeIdx < triActivities.length - 1 && (
          <button onClick={next}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', zIndex:10 }}
            onMouseEnter={e => e.currentTarget.style.background='#fff'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.9)'}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#1B2A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}

        {/* Dot indicators */}
        <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:'6px', zIndex:10 }}>
          {triActivities.map((seg, i) => (
            <div key={seg.id} onClick={() => setActiveIdx(i)}
              style={{ width: i === activeIdx ? 20 : 6, height:6, borderRadius:'3px', background: i === activeIdx ? getColor(triActivities[i]) : 'rgba(255,255,255,0.5)', transition:'all 0.25s', cursor:'pointer' }} />
          ))}
        </div>

        {/* Active segment label overlay */}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.92)', borderRadius:'8px', padding:'5px 10px', zIndex:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: getColor(triActivities[activeIdx]), flexShrink:0 }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'1.5px', color:'#1B2A4A', textTransform:'uppercase' }}>{getLabel(triActivities[activeIdx])}</span>
        </div>
      </div>

      {/* Segment rows — clickable, active one highlighted */}
      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {triActivities.map((seg, i) => {
          const color     = getColor(seg)
          const isActive  = i === activeIdx
          return (
            <div key={seg.id} onClick={() => setActiveIdx(i)}
              style={{ display:'grid', gridTemplateColumns:'70px 1fr 1fr 1fr 1fr', gap:'6px', alignItems:'center', borderRadius:'10px', padding:'10px 12px', borderLeft:`3px solid ${color}`, cursor:'pointer', transition:'all 0.2s',
                background: isActive ? (color === '#0EA5E9' ? 'rgba(14,165,233,0.08)' : color === '#F97316' ? 'rgba(249,115,22,0.08)' : 'rgba(252,76,2,0.08)') : t.surfaceAlt,
                boxShadow: isActive ? `0 0 0 1.5px ${color}33` : 'none',
              }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:700, color: isActive ? color : t.text, letterSpacing:'0.5px' }}>
                {getEmoji(seg)} {getLabel(seg)}
              </div>
              {[
                { label:'Distance', value: fmt(seg.distance) },
                { label:'Time',     value: fmtTime(seg.moving_time) },
                { label:'Pace',     value: fmtPace(seg.moving_time, seg.distance) },
                { label:'Elev',     value: seg.total_elevation_gain ? `${Math.round(seg.total_elevation_gain * 3.281)}ft` : '—' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color: isActive ? color : t.text, letterSpacing:'1px', lineHeight:1, transition:'color 0.2s' }}>{s.value}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Strava Activity Section ───────────────────────────────────────────────────
function StravaActivitySection({ race, t }) {
  const { user }                          = useAuth()
  const [profile, setProfile]             = useState(null)
  const [userId, setUserId]               = useState(null)
  const [activity, setActivity]           = useState(null)
  const [triActivities, setTriActivities] = useState([])
  const [candidates, setCandidates]       = useState([])
  const [loading, setLoading]             = useState(true)
  const [showPicker, setShowPicker]       = useState(false)
  const [mapRendered, setMapRendered]     = useState(false)
  const [locked, setLocked]               = useState(false)
  const mapRef = useRef(null)

  const isTri = ['70.3','140.6','tri','triathlon'].some(k =>
    (race.distance || '').toLowerCase().includes(k)
  )

  // Save matched activity to passport_races permanently
  const saveActivity = async (act, triActs) => {
    if (!userId || !race.id) return
    try {
      const dataToSave = triActs?.length > 0
        ? { segments: triActs.map(a => ({ id:a.id, type:a.type||a.sport_type, name:a.name, distance:a.distance, moving_time:a.moving_time, total_elevation_gain:a.total_elevation_gain, map:a.map, start_date_local:a.start_date_local })) }
        : { id:act?.id, type:act?.type||act?.sport_type, name:act?.name, distance:act?.distance, moving_time:act?.moving_time, total_elevation_gain:act?.total_elevation_gain, map:act?.map, start_date_local:act?.start_date_local }
      await supabase.from('passport_races').update({
        strava_activity_id:   triActs?.length > 0 ? triActs[0]?.id : act?.id,
        strava_activity_data: dataToSave,
      }).eq('id', race.id)
      setLocked(true)
    } catch(e) {}
  }

  // Remove locked activity
  const removeActivity = async () => {
    if (!userId || !race.id) return
    try {
      await supabase.from('passport_races').update({ strava_activity_id: null, strava_activity_data: null }).eq('id', race.id)
      setActivity(null); setTriActivities([]); setLocked(false); setMapRendered(false); setCandidates([])
    } catch(e) {}
  }

  // Load profile + check for saved activity first
  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id || user.id
        setUserId(uid)

        const { data: prof } = await supabase.from('profiles')
          .select('strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
          .eq('id', uid).single()
        setProfile(prof)

        // Check for saved/locked activity
        if (race.id) {
          const { data: prace } = await supabase.from('passport_races')
            .select('strava_activity_id,strava_activity_data')
            .eq('id', race.id).single()
          if (prace?.strava_activity_data) {
            const saved = prace.strava_activity_data
            if (saved.segments) {
              setTriActivities(saved.segments)
              setActivity(saved.segments.find(s => ['ride','virtualride'].includes((s.type||'').toLowerCase())) || saved.segments[0])
            } else if (saved.id) {
              setActivity(saved)
            }
            setLocked(true)
            setLoading(false)
            return // Already saved — no need to hit Strava API
          }
        }
      } catch(e) {}
      setLoading(false)
    }
    load()
  }, [user, race.id])

  const { connected, getActivities } = useStrava(profile, userId)

  // Auto-match from Strava — only runs if not already locked
  useEffect(() => {
    if (!connected || !race.date || !profile || locked || activity) return
    const find = async () => {
      setLoading(true)
      try {
        const raceDate = new Date(race.date)
        if (isNaN(raceDate)) { setLoading(false); return }

        // isMonthOnly = true when we only know month+year, not the exact day
        // ISO format (2023-10-22) and "October 22, 2023" both have a specific day
        // "Oct 2023" / "2023-10-01" from a month-only date_sort do not
        const isISO = /^\d{4}-\d{2}-\d{2}$/.test(race.date)
        const hasSpecificDay = isISO
          ? raceDate.getDate() !== 1  // ISO: not the 1st means it's a real day
          : race.date.match(/\w+ \d{1,2},/) // "October 22, 2023" style
        const isMonthOnly = !hasSpecificDay
        let afterTs, beforeTs
        if (isMonthOnly) {
          const startOfMonth = new Date(raceDate.getFullYear(), raceDate.getMonth(), 1)
          const endOfMonth   = new Date(raceDate.getFullYear(), raceDate.getMonth() + 1, 0, 23, 59, 59)
          afterTs  = Math.floor(startOfMonth.getTime() / 1000)
          beforeTs = Math.floor(endOfMonth.getTime() / 1000)
        } else {
          // For standard races, search ±14 days so distance matching can find the right activity
          afterTs  = Math.floor(raceDate.getTime() / 1000) - 14 * 86400
          beforeTs = Math.floor(raceDate.getTime() / 1000) + 14 * 86400
        }

        const acts = await getActivities({ per_page: 60, after: afterTs })
        const inWindow = acts.filter(a => {
          const ts = Math.floor(new Date(a.start_date_local).getTime() / 1000)
          return ts >= afterTs && ts <= beforeTs
        })
        const sameDay = isMonthOnly ? inWindow : inWindow.filter(a =>
          new Date(a.start_date_local).toDateString() === raceDate.toDateString()
        )
        const pool = sameDay.length > 0 ? sameDay : inWindow

        if (isTri) {
          const SWIM = ['swim'], BIKE = ['ride','virtualride','ebikeride','mountainbikeride'], RUN = ['run','virtualrun']
          // For tri matching, require reasonable distances to avoid warmups/cooldowns
          // 70.3: swim ~1.2mi, bike ~56mi, run ~13.1mi
          // 140.6: swim ~2.4mi, bike ~112mi, run ~26.2mi
          const is140 = (race.distance||'').includes('140')
          const swimPool = pool.filter(a => SWIM.includes((a.type||a.sport_type||'').toLowerCase()))
            .filter(a => (a.distance||0) > 500) // must be > 500m to be a race swim
            .sort((a,b) => b.distance - a.distance) // longest first
          const bikePool = pool.filter(a => BIKE.includes((a.type||a.sport_type||'').toLowerCase()))
            .filter(a => (a.distance||0)/1609.34 > (is140 ? 80 : 40)) // must be a real ride
            .sort((a,b) => b.distance - a.distance)
          const runPool = pool.filter(a => RUN.includes((a.type||a.sport_type||'').toLowerCase()))
            .filter(a => (a.distance||0)/1609.34 > (is140 ? 20 : 8)) // must be a real run
            .sort((a,b) => b.distance - a.distance)
          const swim = swimPool[0], bike = bikePool[0], run = runPool[0]
          const segs = [swim, bike, run].filter(Boolean)
          if (segs.length > 0) {
            setTriActivities(segs); setActivity(bike || run || swim)
            await saveActivity(null, segs)
          } else {
            setCandidates(inWindow.filter(a => ['run','virtualrun','swim','ride'].includes((a.type||a.sport_type||'').toLowerCase())).slice(0,10))
          }
        } else {
          // Standard race — match by distance first (most reliable), then date
          const distMi = {
            '5K': 3.1, '10K': 6.2, '10 mi': 10, '13.1': 13.1,
            '26.2': 26.2, '50K': 31, '50 mi': 50, '100K': 62, '100 mi': 100,
          }[race.distance] || null

          let match = null

          if (distMi) {
            // Find activity within 2% of expected distance, prefer closest to race date
            const byDist = acts.filter(a => {
              const aMi = (a.distance || 0) / 1609.34
              const type = (a.type || a.sport_type || '').toLowerCase()
              return ['run','virtualrun','walk'].includes(type) && Math.abs(aMi - distMi) / distMi <= 0.02
            }).sort((a, b) => {
              // Sort by proximity to race date
              const raceTs = raceDate.getTime()
              return Math.abs(new Date(a.start_date_local) - raceTs) - Math.abs(new Date(b.start_date_local) - raceTs)
            })
            match = byDist[0]
          }

          // Fallback: same-day or window match
          if (!match) match = pool.find(a => looksLikeRace(a)) || pool[0]

          if (match) {
            setActivity(match)
            await saveActivity(match, null)
          } else {
            setCandidates(inWindow.filter(a => ['run','virtualrun','walk','ride'].includes((a.type||a.sport_type||'').toLowerCase())).slice(0,10))
          }
        }
      } catch(e) {}
      setLoading(false)
    }
    find()
  }, [connected, race.date, profile, locked])

  // Draw Leaflet map — handles both single activity and triathlon multi-segment
  useEffect(() => {
    const hasActivity = isTri ? triActivities.length > 0 : !!activity?.map?.summary_polyline
    if (!hasActivity || !mapRef.current || mapRendered) return

    const draw = async () => {
      try {
        if (!window.L) {
          const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
          await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=resolve; document.head.appendChild(s) })
        }
        if (!window.polyline) {
          await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/@mapbox/polyline@1.1.1/src/polyline.js'; s.onload=resolve; document.head.appendChild(s) })
        }
        const L    = window.L
        const poly = window.polyline || window.Polyline
        if (!poly || !L) return

        const map = L.map(mapRef.current, { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, attributionControl:false })
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:18 }).addTo(map)

        const allBounds = []

        if (isTri && triActivities.length > 0) {
          // Color-coded segments: swim=blue, bike=orange, run=red
          const SEGMENT_COLORS = {
            swim:           '#0EA5E9', // sky blue
            ride:           '#F97316', // orange
            virtualride:    '#F97316',
            mountainbikeride:'#F97316',
            run:            '#FC4C02', // strava orange-red
            virtualrun:     '#FC4C02',
          }

          triActivities.forEach(seg => {
            if (!seg?.map?.summary_polyline) return
            const type   = (seg.type || seg.sport_type || '').toLowerCase()
            const color  = SEGMENT_COLORS[type] || '#1B2A4A'
            const latlngs = poly.decode(seg.map.summary_polyline)
            if (!latlngs.length) return
            const line = L.polyline(latlngs, { color, weight:3, opacity:0.9 }).addTo(map)
            allBounds.push(...latlngs)
          })
        } else if (activity?.map?.summary_polyline) {
          const latlngs = poly.decode(activity.map.summary_polyline)
          if (latlngs.length) {
            L.polyline(latlngs, { color:'#FC4C02', weight:3, opacity:0.9 }).addTo(map)
            allBounds.push(...latlngs)
          }
        }

        if (allBounds.length) {
          map.fitBounds(L.latLngBounds(allBounds), { padding:[16,16] })
        }

        setMapRendered(true)
      } catch(e) {}
    }
    draw()
  }, [activity, triActivities])

  const fmt     = m  => m ? `${(m/1609.34).toFixed(2)} mi` : '—'
  const fmtTime = s  => { if (!s) return '—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}` }
  const fmtPace = (s,m) => { if (!s||!m) return '—'; const spm=s/(m/1609.34),mm=Math.floor(spm/60),ss=Math.round(spm%60); return `${mm}:${String(ss).padStart(2,'0')}/mi` }
  const fmtDate = d  => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''

  // ── Not connected ──
  if (!loading && !connected) return (
    <div style={{ background:t.surface, borderRadius:'16px', padding:'20px', marginBottom:'16px', border:`1px solid ${t.border}` }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'16px' }}>Strava Activity</div>
      <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'16px', background:t.surfaceAlt, borderRadius:'10px', border:`1px solid ${t.border}` }}>
        <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(252,76,2,0.1)', border:'1px solid rgba(252,76,2,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text, marginBottom:'2px' }}>
            {profile?.strava_connected ? 'Strava session expired' : 'Connect Strava to see your activity'}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
            {profile?.strava_connected ? 'Your Strava token expired — reconnect to restore your activity data.' : "We'll match this race to your Strava activity and show your map and stats."}
          </div>
        </div>
        <button onClick={async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const uid = session?.user?.id || user?.id
            if (uid) sessionStorage.setItem('strava_user_id', uid)
            sessionStorage.setItem('strava_return_to', window.location.pathname)
            const r = await fetch(`/api/strava?action=auth_url${uid ? `&user_id=${uid}` : ''}`)
            const d = await r.json()
            if (d.url) window.location.href = d.url
          }}
          style={{ padding:'8px 18px', border:'1.5px solid rgba(252,76,2,0.5)', borderRadius:'8px', background:'rgba(252,76,2,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#FC4C02', cursor:'pointer', textTransform:'uppercase', flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(252,76,2,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(252,76,2,0.08)'}>
          {profile?.strava_connected ? 'Reconnect Strava' : 'Connect Strava'}
        </button>
      </div>
    </div>
  )

  // ── Loading ──
  if (loading) return (
    <div style={{ background:t.surface, borderRadius:'16px', padding:'20px', marginBottom:'16px', border:`1px solid ${t.border}` }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'16px' }}>Strava Activity</div>
      <div style={{ height:'220px', background:t.surfaceAlt, borderRadius:'10px', animation:'pulse 1.5s ease infinite' }} />
    </div>
  )

  // ── No match found — manual picker ──
  if (!activity) return (
    <div style={{ background:t.surface, borderRadius:'16px', padding:'20px', marginBottom:'16px', border:`1px solid ${t.border}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px' }}>Strava Activity</div>
          <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'3px 8px', background:'rgba(252,76,2,0.08)', border:'1px solid rgba(252,76,2,0.2)', borderRadius:'6px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#FC4C02', textTransform:'uppercase' }}>Connected</span>
          </div>
        </div>
        {candidates.length > 0 && (
          <button onClick={() => setShowPicker(!showPicker)}
            style={{ padding:'7px 14px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:t.surfaceAlt, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
            Select Manually
          </button>
        )}
      </div>

      {!showPicker ? (
        <div style={{ textAlign:'center', padding:'28px', border:`2px dashed ${t.border}`, borderRadius:'10px', background:t.surfaceAlt }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:t.border, letterSpacing:'1px', marginBottom:'6px' }}>NO AUTO-MATCH FOUND</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, marginBottom: candidates.length > 0 ? '16px' : 0 }}>
            We couldn't automatically find a Strava activity for {race.date}.
          </div>
          {candidates.length > 0 && (
            <button onClick={() => setShowPicker(true)}
              style={{ padding:'8px 20px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>
              Choose from nearby activities →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginBottom:'4px' }}>Select the Strava activity that matches this race:</div>
          {candidates.map(a => (
            <div key={a.id} onClick={() => { setActivity(a); setShowPicker(false); saveActivity(a, null) }}
              style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 14px', background:t.surfaceAlt, borderRadius:'10px', border:`1.5px solid ${t.border}`, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#FC4C02'; e.currentTarget.style.background='rgba(252,76,2,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.surfaceAlt }}>
              <div style={{ width:36, height:36, borderRadius:'8px', background:'rgba(252,76,2,0.1)', border:'1px solid rgba(252,76,2,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text, marginBottom:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.name}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
                  {fmtDate(a.start_date_local)} · {fmt(a.distance)} · {fmtTime(a.moving_time)}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Activity matched — show map + stats ──
  return (
    <div style={{ background:t.surface, borderRadius:'16px', padding:'20px', marginBottom:'16px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px' }}>Strava Activity</div>
          <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'3px 8px', background:'rgba(252,76,2,0.08)', border:'1px solid rgba(252,76,2,0.2)', borderRadius:'6px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#FC4C02', textTransform:'uppercase' }}>Matched</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => { removeActivity(); setShowPicker(false) }}
            style={{ padding:'6px 12px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}
            onMouseEnter={e => e.currentTarget.style.borderColor=t.text}
            onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
            Change
          </button>
          <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', border:'1.5px solid rgba(252,76,2,0.3)', borderRadius:'8px', background:'rgba(252,76,2,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#FC4C02', textDecoration:'none', textTransform:'uppercase' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(252,76,2,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(252,76,2,0.06)'}>
            View on Strava →
          </a>
        </div>
      </div>

      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'14px' }}>
        {isTri && triActivities.length > 0
          ? `${triActivities.length} segments · ${fmtDate(triActivities[0].start_date_local)}`
          : `${activity.name} · ${fmtDate(activity.start_date_local)}`}
      </div>

      {/* Tri carousel map + stats */}
      {isTri && triActivities.length > 0 ? (
        <TriCarousel triActivities={triActivities} t={t} fmt={fmt} fmtTime={fmtTime} fmtPace={fmtPace} mapRendered={mapRendered} setMapRendered={setMapRendered} />
      ) : (
        <>
          <div ref={mapRef} style={{ height:'240px', borderRadius:'12px', overflow:'hidden', background:t.surfaceAlt, marginBottom:'16px' }} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px, 1fr))', gap:'10px' }}>
            {[
              { label:'Distance',  value: fmt(activity.distance) },
              { label:'Time',      value: fmtTime(activity.moving_time) },
              { label:'Avg Pace',  value: fmtPace(activity.moving_time, activity.distance) },
              { label:'Elevation', value: activity.total_elevation_gain ? `${Math.round(activity.total_elevation_gain * 3.281)}ft` : '—' },
            ].map(s => (
              <div key={s.label} style={{ background:t.surfaceAlt, borderRadius:'10px', padding:'14px', textAlign:'center', borderTop:'3px solid #FC4C02' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{s.value}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function RacePage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const isMobile = useIsMobile()
  const numId = parseInt(id) || 1  // legacy fallback for old numeric links

  const [editMode, setEditMode]         = useState(false)
  const [race, setRace]                 = useState(null)
  const [allPassportRaces, setAllPassportRaces] = useState([])
  const [currentIdx, setCurrentIdx]     = useState(0)
  const [story, setStory]           = useState('')
  const [gear, setGear]             = useState([])
  const [stickers, setStickers]     = useState([])
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showSplits, setShowSplits] = useState(true)
  const [showAddGear, setShowAddGear] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [activePhoto, setActivePhoto] = useState(null)
  const [localPhotos, setLocalPhotos] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [pacerReflection, setPacerReflection] = useState(null)
  const [pacerReflectionLoading, setPacerReflectionLoading] = useState(false)
  const [reportCard, setReportCard]   = useState(null)
  const [reportCardLoading, setReportCardLoading] = useState(false)
  const [showReportCard, setShowReportCard] = useState(false)
  const fileInputRef = useRef(null)
  const dropdownRef  = useRef(null)

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newPhotos = files.map(f => ({
      id:      `local_${Date.now()}_${Math.random()}`,
      url:     URL.createObjectURL(f),
      caption: f.name.replace(/\.[^.]+$/, ''),
      name:    f.name,
    }))
    setLocalPhotos(prev => [...prev, ...newPhotos])
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const removePhoto = (id) => {
    setLocalPhotos(prev => {
      const photo = prev.find(p => p.id === id)
      if (photo?.url?.startsWith('blob:')) URL.revokeObjectURL(photo.url)
      return prev.filter(p => p.id !== id)
    })
  }

  useEffect(() => {
    const loadRace = async () => {
      // Try to load from Supabase passport_races first
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (userId) {
          // id param is now a UUID from passport_races
          const { data: praces } = await supabase
            .from('passport_races')
            .select('*')
            .eq('user_id', userId)
            .order('date_sort', { ascending: false })

          if (praces && praces.length > 0) {
            // Match by UUID first (new links), fall back to numeric index (old links)
            const isUUID = id && id.includes('-')
            const raceData = isUUID
              ? (praces.find(r => r.id === id) || praces[0])
              : (praces[numId - 1] || praces[0])
            const idx = praces.findIndex(r => r.id === raceData.id)
            setAllPassportRaces(praces)
            setCurrentIdx(idx >= 0 ? idx : 0)

            // Map to race page format — use date_sort for Strava matching if available
            const mapped = {
              id:        raceData.id,
              name:      raceData.name,
              date:      raceData.date_sort || raceData.date, // prefer date_sort (exact) for Strava matching
              location:  raceData.location || `${raceData.city || ''}${raceData.city && raceData.state ? ', ' : ''}${raceData.state || ''}`,
              distance:  raceData.distance,
              time:      raceData.time,
              pace:      raceData.pace || '',
              pr:        raceData.is_pr || false,
              story:     raceData.story || '',
              photos:    [],
              gear:      [],
              stickers:  [],
              elevation: null,
              weather:   null,
              place:     null,
            }
            setRace(mapped)
            setStory(mapped.story)
            setGear([])
            setStickers([])
            return
          }
        }
      } catch(e) {}

      // Fallback to hardcoded data
      const data = RYAN_RACE_DATA[numId] || RYAN_RACE_DATA[1]
      const idx  = ALL_IDS.indexOf(data.id)
      setCurrentIdx(idx >= 0 ? idx : 0)
      setRace(data); setStory(data.story||''); setGear(data.gear||[]); setStickers(data.stickers||[])
    }

    loadRace()

    const style = document.createElement('style')
    style.id = 'rp-racepage-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing:border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      @keyframes pulse { 0%,100%{opacity:0.5;}50%{opacity:1;} }
      .rp-photo-slot { border-radius:10px;overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;position:relative;aspect-ratio:4/3; }
      .rp-photo-slot:hover { transform:translateY(-3px);box-shadow:0 8px 24px rgba(27,42,74,0.15); }
      .sticker-chip { padding:6px 12px;border-radius:20px;border:1.5px solid;background:transparent;cursor:pointer;font-size:18px;transition:transform 0.15s; }
      .sticker-chip:hover { transform:scale(1.2); }
      .edit-toolbar-btn { display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;border:none;background:none;cursor:pointer;border-radius:8px;transition:background 0.15s; }
      .edit-toolbar-btn:hover { background:rgba(255,255,255,0.12); }
      .edit-toolbar-btn span { font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:600;letter-spacing:1px;color:rgba(255,255,255,0.5);text-transform:uppercase; }
    `
    if (!document.getElementById('rp-racepage-styles')) document.head.appendChild(style)

    const handleClick = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-racepage-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [numId])

  // Load Pacer reflection once race is ready
  useEffect(() => {
    if (!race || !race.name) return
    const cacheKey = `pacer_reflection_${race.id||race.name}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { try { setPacerReflection(JSON.parse(cached)); return } catch(e) {} }
    setPacerReflectionLoading(true)
    fetch('/api/pacer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'race_reflection',
        race: { id:race.id, name:race.name, distance:race.distance, time:race.time, date:race.date, is_pr:race.pr, splits:race.splits||[] },
        races: allPassportRaces.slice(0, 15),
      }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.headline) {
        setPacerReflection(data)
        sessionStorage.setItem(cacheKey, JSON.stringify(data))
      }
    })
    .catch(() => {})
    .finally(() => setPacerReflectionLoading(false))
  }, [race?.id])

  if (!race) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:t.bg }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  )

  const colors  = getDistanceColor(race.distance)
  const cleaned = race.distance.replace(' mi','').replace(' miles','')
  const fs      = cleaned.length>4 ? 22 : cleaned.length>2 ? 28 : 40

  const prevRace = currentIdx > 0 ? allPassportRaces[currentIdx-1] : null
  const nextRace = currentIdx < allPassportRaces.length-1 ? allPassportRaces[currentIdx+1] : null

  const handleSave = async () => { setSaving(true); await new Promise(r => setTimeout(r,600)); setSaving(false); setEditMode(false) }
  const addSticker  = s => { setStickers(prev => [...prev, { id:Date.now(), emoji:s, x:20+Math.random()*60, y:20+Math.random()*60 }]); setShowStickerPicker(false) }
  const removeGear  = id => setGear(prev => prev.filter(g => g.id!==id))
  const addGear     = item => { setGear(prev => [...prev, item]); setShowAddGear(false) }
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }

  // Initials from auth user
  const meta = user?.user_metadata || {}
  const fullName = meta.full_name || `${meta.first_name||''} ${meta.last_name||''}`.trim() || 'RG'
  const initials = fullName.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'RG'

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s' }}>

      {/* TOP NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(8px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, display:'flex', alignItems:'center', justifyContent:'space-between', padding: isMobile ? '0 12px' : '0 40px', height:'52px' }}>
        {/* Back to passport */}
        <button onClick={() => navigate('/passport')}
          style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:0, flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {isMobile ? '' : 'Passport'}
        </button>

        {/* Page navigation */}
        <div style={{ display:'flex', alignItems:'center', gap: isMobile ? '8px' : '16px' }}>
          <button onClick={() => prevRace && navigate(`/race/${prevRace.id}`)} disabled={!prevRace}
            style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:prevRace?'pointer':'default', color:prevRace?t.textMuted:t.borderLight, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'4px 6px', borderRadius:'6px' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {!isMobile && (prevRace ? prevRace.name.split(' ').slice(0,2).join(' ') : 'First')}
          </button>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase', whiteSpace:'nowrap' }}>
            {currentIdx+1} / {allPassportRaces.length || ALL_IDS.length}
          </div>
          <button onClick={() => nextRace && navigate(`/race/${nextRace.id}`)} disabled={!nextRace}
            style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:nextRace?'pointer':'default', color:nextRace?t.textMuted:t.borderLight, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'4px 6px', borderRadius:'6px' }}>
            {!isMobile && (nextRace ? nextRace.name.split(' ').slice(0,2).join(' ') : 'Last')}
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Right: edit + avatar dropdown */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
          {!editMode ? (
            <>
              {!isMobile && <button style={{ padding:'5px 14px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}>Share</button>}
              <button onClick={() => setEditMode(true)}
                style={{ padding:'5px 14px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}
                onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>Edit</button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditMode(false); setShowAddGear(false) }} style={{ padding:'5px 12px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:'5px 14px', border:'none', borderRadius:'8px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase', opacity:saving?0.7:1 }}>{saving?'Saving...':'Save'}</button>
            </>
          )}
          {/* Avatar dropdown */}
          <div ref={dropdownRef} style={{ position:'relative' }}>
            <div onClick={() => setShowDropdown(!showDropdown)}
              style={{ width:30, height:30, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}` }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', color:'#C9A84C' }}>{initials}</span>
            </div>
            {showDropdown && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'180px', overflow:'hidden', zIndex:100 }}>
                <div style={{ padding:'12px 16px 8px', borderBottom:`1px solid ${t.borderLight}` }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:t.text }}>{fullName}</div>
                </div>
                <button style={{ display:'block', width:'100%', padding:'9px 16px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:t.text, cursor:'pointer' }} onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
                <button style={{ display:'block', width:'100%', padding:'9px 16px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:t.text, cursor:'pointer' }} onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { navigate('/profile'); setShowDropdown(false) }}>Settings</button>
                <div style={{ padding:'9px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:t.text }}>Dark Mode</span>
                  <button onClick={toggleTheme} style={{ width:36, height:20, borderRadius:'10px', border:'none', cursor:'pointer', position:'relative', background:isDark?'#C9A84C':'#d0d7e0', padding:0 }}>
                    <div style={{ position:'absolute', top:2, left:isDark?'calc(100% - 18px)':'2px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                  </button>
                </div>
                <button style={{ display:'block', width:'100%', padding:'9px 16px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#c53030', cursor:'pointer' }} onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={handleSignOut}>Log Out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background:'#1B2A4A', position:'relative', overflow:'hidden' }}>
        <div style={{ height:'4px', background:'#C9A84C' }} />
        {stickers.length > 0 && (
          <div style={{ position:'absolute', inset:0, zIndex:5, pointerEvents:'none' }}>
            {stickers.map(s => <div key={s.id} style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`, fontSize:'32px', lineHeight:1, userSelect:'none' }}>{s.emoji}</div>)}
          </div>
        )}
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding: isMobile ? '20px 16px 0' : '40px 40px 0', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap: isMobile ? '16px' : '40px', marginBottom: isMobile ? '16px' : '32px' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:'8px' }}>Race Passport · Page {currentIdx+1}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile ? 'clamp(26px,7vw,42px)' : 'clamp(40px,6vw,72px)', color:'#fff', letterSpacing:'2px', lineHeight:0.95, marginBottom:'8px' }}>{race.name}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize: isMobile ? '13px' : '16px', color:'rgba(255,255,255,0.5)', letterSpacing:'1px', marginBottom:'12px' }}>{race.date} · {race.location}</div>
              {race.pr && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.35)', borderRadius:'8px', padding:'5px 12px' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase' }}>Personal Best</span>
                </div>
              )}
            </div>
            <div style={{ width: isMobile ? 80 : 140, height: isMobile ? 80 : 140, borderRadius:'50%', border:`3px solid ${colors.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
              <div style={{ position:'absolute', inset: isMobile ? 6 : 10, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile ? Math.round(fs*0.65) : fs, color:colors.stampText, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1, textAlign:'center' }}>{cleaned}</div>
              {!isMobile && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:colors.stampText, textTransform:'uppercase', marginTop:'4px', position:'relative', zIndex:1, opacity:0.55 }}>{colors.label}</div>}
            </div>
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', position:'relative', zIndex:1 }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', padding: isMobile ? '0 16px' : '0 40px' }}>
            {[{ label:'Finish Time', value:race.time },{ label:'Avg Pace', value:race.pace||'Multi-sport' },{ label:'Overall Place', value:race.place||'—' },{ label:'Elevation', value:race.elevation }].map((s,i) => (
              <div key={i} style={{ padding: isMobile ? '14px 0' : '20px 0', textAlign:'center', borderRight: isMobile ? (i%2===0?'1px solid rgba(255,255,255,0.08)':'none') : (i<3?'1px solid rgba(255,255,255,0.08)':'none'), borderBottom: isMobile && i<2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile ? '20px' : '26px', color:'#fff', letterSpacing:'1px', lineHeight:1 }}>{s.value}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {race.weather && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding: isMobile ? '8px 16px' : '10px 40px', position:'relative', zIndex:1, maxWidth:'1200px', margin:'0 auto' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>Race day: {race.weather}</span>
          </div>
        )}
        {editMode && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', padding: isMobile ? '8px 16px' : '8px 40px', display:'flex', alignItems:'center', gap:'4px', background:'rgba(0,0,0,0.2)', position:'relative', zIndex:6 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginRight:'8px' }}>Edit:</div>
            <button className="edit-toolbar-btn" onClick={() => setShowStickerPicker(!showStickerPicker)}><span style={{ fontSize:'16px' }}>🏅</span><span>Sticker</span></button>
            <button className="edit-toolbar-btn" onClick={() => setStickers([])}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round"/></svg><span>Clear</span></button>
            {showStickerPicker && (
              <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:'120px', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', padding:'12px', boxShadow:t.cardShadowHover, display:'flex', flexWrap:'wrap', gap:'8px', maxWidth:'240px', zIndex:20 }}>
                {STICKER_OPTIONS.map(s => (
                  <button key={s} className="sticker-chip" style={{ borderColor:t.border }} onClick={() => addSticker(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding: isMobile ? '16px 16px 80px' : '32px 40px 80px' }}>

        {/* PACER REFLECTION */}
        {(pacerReflectionLoading || pacerReflection) && (
          <div style={{ marginBottom:'20px', borderRadius:'16px', background: t.isDark?'rgba(201,168,76,0.06)':'#FFFDF5', border:`1px solid ${t.isDark?'rgba(201,168,76,0.2)':'rgba(201,168,76,0.35)'}`, padding: isMobile?'16px':'20px 24px', animation:'fadeIn 0.4s ease both' }}>
            {pacerReflectionLoading ? (
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:40, height:40, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>🏃</div>
                <div style={{ flex:1 }}>
                  <div style={{ height:11, borderRadius:6, background:t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)', marginBottom:10, width:'50%', animation:'pulse 1.5s ease infinite' }} />
                  <div style={{ height:10, borderRadius:6, background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.05)', width:'75%', animation:'pulse 1.5s ease infinite' }} />
                </div>
              </div>
            ) : pacerReflection && (
              <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
                <div style={{ width:40, height:40, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'1px', fontSize:'20px', lineHeight:1 }}>🏃</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'2.5px', color:'#C9A84C' }}>PACER</span>
                    <div style={{ width:3, height:3, borderRadius:'50%', background:'rgba(201,168,76,0.5)' }} />
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Your AI Race Coach</span>
                  </div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile?'20px':'24px', color:t.text, letterSpacing:'1px', marginBottom:'8px', lineHeight:1.1 }}>{pacerReflection.headline}</div>
                  <p style={{ fontFamily:"'Barlow',sans-serif", fontSize: isMobile?'13px':'14px', color:t.text, margin:'0 0 10px', lineHeight:1.65 }}>{pacerReflection.reflection}</p>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:t.isDark?'rgba(201,168,76,0.1)':'rgba(201,168,76,0.12)', borderRadius:'20px', padding:'5px 12px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1l1.5 3H10L7.5 6l1 3L5 7.5 1.5 9l1-3L0 4h3.5z" fill="#C9A84C"/></svg>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#C9A84C' }}>{pacerReflection.highlight}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHOTOS */}
        <div style={{ background:t.surface, borderRadius:'16px', padding: isMobile ? '16px' : '28px', marginBottom:'16px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease both', transition:'background 0.25s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px' }}>Race Photos</div>
              {localPhotos.length > 0 && (
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, background:t.surfaceAlt, padding:'3px 10px', borderRadius:'10px' }}>{localPhotos.length}</div>
              )}
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 18px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(201,168,76,0.16)' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(201,168,76,0.08)' }}>
              + Add Photos
            </button>
          </div>

          {/* Hidden file input — wired up */}
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handlePhotoUpload} />

          {localPhotos.length > 0 ? (
            <div style={{ columns:'3 220px', gap:'12px' }}>
              {localPhotos.map((photo, i) => (
                <div key={photo.id}
                  style={{ breakInside:'avoid', marginBottom:'12px', borderRadius:'12px', overflow:'hidden', position:'relative', cursor:'pointer', display:'block' }}
                  onClick={() => setActivePhoto(photo)}
                  onMouseEnter={e => { e.currentTarget.querySelector('.photo-overlay').style.opacity='1' }}
                  onMouseLeave={e => { e.currentTarget.querySelector('.photo-overlay').style.opacity='0' }}>
                  <img src={photo.url} alt={photo.caption}
                    style={{ width:'100%', display:'block', borderRadius:'12px', objectFit:'cover', transition:'transform 0.3s' }}
                    onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
                  {/* Hover overlay */}
                  <div className="photo-overlay" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', borderRadius:'12px', opacity:0, transition:'opacity 0.2s', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px' }}>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.8)', fontWeight:600 }}>View</span>
                    <button onClick={e => { e.stopPropagation(); removePhoto(photo.id) }}
                      style={{ width:28, height:28, borderRadius:'50%', background:'rgba(197,48,48,0.8)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', lineHeight:1 }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {/* Add more tile */}
              <div onClick={() => fileInputRef.current?.click()}
                style={{ breakInside:'avoid', marginBottom:'12px', borderRadius:'12px', border:`2px dashed rgba(201,168,76,0.35)`, aspectRatio:'4/3', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', cursor:'pointer', background:t.surfaceAlt, transition:'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(201,168,76,0.35)'}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>Add More</span>
              </div>
            </div>
          ) : (
            /* Empty state — big inviting drop zone */
            <div onClick={() => fileInputRef.current?.click()}
              style={{ border:'2px dashed rgba(201,168,76,0.35)', borderRadius:'16px', padding:'56px 40px', textAlign:'center', background:t.surfaceAlt, cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.background=t.isDark?'rgba(201,168,76,0.05)':'rgba(201,168,76,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(201,168,76,0.35)'; e.currentTarget.style.background=t.surfaceAlt }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(201,168,76,0.1)', border:'1.5px solid rgba(201,168,76,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 16l4-4 4 4 4-6 4 6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="18" rx="3" stroke="#C9A84C" strokeWidth="1.5"/></svg>
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', marginBottom:'8px' }}>Add Your Race Photos</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'20px', lineHeight:1.6 }}>
                Bring this race page to life — finish line moments, pre-race photos, anything that captures the day.
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'10px 24px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.08)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3-4 3 4" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10h10" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>Upload Photos</span>
              </div>
            </div>
          )}
        </div>

        {/* STORY */}
        <div style={{ background:t.surface, borderRadius:'16px', padding:'20px', marginBottom:'16px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease 0.1s both', transition:'background 0.25s' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'18px' }}>My Story</div>
          {editMode ? (
            <textarea value={story} onChange={e => setStory(e.target.value)} placeholder="What was race day like? What kept you going?"
              style={{ width:'100%', minHeight:'160px', padding:'14px', border:`1.5px solid ${t.border}`, borderRadius:'10px', fontFamily:"'Barlow',sans-serif", fontSize:'14px', fontWeight:300, color:t.text, lineHeight:1.7, resize:'vertical', outline:'none', background:t.inputBg, transition:'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border} />
          ) : story ? (
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', fontWeight:300, color:t.text, lineHeight:1.9, fontStyle:'italic', borderLeft:'3px solid #C9A84C', paddingLeft:'18px' }}>"{story}"</div>
          ) : (
            <div style={{ textAlign:'center', padding:'32px' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.border, letterSpacing:'1px', marginBottom:'8px' }}>NO STORY YET</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'14px' }}>Every race has a story worth telling.</div>
              <button onClick={() => setEditMode(true)} style={{ padding:'8px 20px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>Write It</button>
            </div>
          )}
        </div>

        {/* GEAR */}
        <div style={{ background:t.surface, borderRadius:'16px', padding:'20px', marginBottom:'16px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease 0.15s both', transition:'background 0.25s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>Race Day Gear</div>
              {!editMode && gear.length > 0 && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'3px' }}>Click any item to shop it</div>}
            </div>
            {editMode && (
              <button onClick={() => setShowAddGear(!showAddGear)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>+ Add Gear</button>
            )}
          </div>
          {gear.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'12px' }}>
              {gear.map(item => (
                <div key={item.id} style={{ background:t.surfaceAlt, border:`1.5px solid ${t.border}`, borderRadius:'12px', padding:'16px', position:'relative' }}>
                  {editMode && (
                    <button onClick={() => removeGear(item.id)} style={{ position:'absolute', top:8, right:8, width:22, height:22, borderRadius:'50%', background:'rgba(197,48,48,0.1)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="#c53030" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </button>
                  )}
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'3px' }}>{item.category}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text, letterSpacing:'0.5px', lineHeight:1.1, marginBottom:'2px' }}>{item.brand} {item.model}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{item.color}</div>
                  {item.note && <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'11px', color:'#C9A84C', marginTop:'4px', fontStyle:'italic' }}>{item.note}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'32px', border:`2px dashed ${t.border}`, borderRadius:'12px', background:t.surfaceAlt }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:t.border, letterSpacing:'1px', marginBottom:'6px' }}>NO GEAR YET</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, marginBottom:'14px' }}>What did you race in? Add shoes, watch, outfit.</div>
              {!editMode && <button onClick={() => setEditMode(true)} style={{ padding:'7px 18px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>Add Gear</button>}
            </div>
          )}
          {showAddGear && <AddGearForm onAdd={addGear} onCancel={() => setShowAddGear(false)} t={t} />}
        </div>

        {/* SPLITS */}
        {race.splits && race.splits.length > 0 && (
          <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', border:`1px solid ${t.border}`, marginBottom:'24px', animation:'fadeIn 0.4s ease 0.2s both', transition:'background 0.25s' }}>
            <button onClick={() => setShowSplits(!showSplits)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px' }}>{race.distance==='70.3'?'Triathlon Splits':'Splits'}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition:'transform 0.2s', transform:showSplits?'rotate(180deg)':'rotate(0)' }}><path d="M4 6l4 4 4-4" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {showSplits && (
              <div style={{ marginTop:'18px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:'12px' }}>
                {race.splits.map((split,i) => (
                  <div key={i} style={{ background:t.surfaceAlt, borderRadius:'8px', padding:'14px', textAlign:'center', borderTop:'3px solid #C9A84C' }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{split.time}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'4px' }}>{split.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STRAVA ACTIVITY */}
        <StravaActivitySection race={race} t={t} />

        {/* PACER REPORT CARD — Training Log */}
        <div style={{ background:t.surface, borderRadius:'16px', padding: isMobile?'16px':'28px', marginBottom:'16px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease 0.22s both', transition:'background 0.25s' }}>
          <button onClick={() => {
            setShowReportCard(p => !p)
            if (!reportCard && !reportCardLoading) {
              setReportCardLoading(true)
              fetch('/api/pacer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'report_card',
                  race: { name:race.name, distance:race.distance, time:race.time, splits:race.splits||[], strava_activities:[] },
                  races: allPassportRaces.slice(0,15),
                }),
              })
              .then(r => r.json())
              .then(data => { if (data.grades) setReportCard(data) })
              .catch(() => {})
              .finally(() => setReportCardLoading(false))
            }
          }}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', border:'none', cursor:'pointer', padding:0, marginBottom: showReportCard ? '20px' : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <span style={{ fontSize:'20px' }}>🏃</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>Pacer Report Card</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'2px' }}>AI analysis of your training for this race</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition:'transform 0.2s', transform:showReportCard?'rotate(180deg)':'rotate(0)', flexShrink:0 }}>
              <path d="M4 6l4 4 4-4" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showReportCard && (
            reportCardLoading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ height:52, borderRadius:'8px', background:t.surfaceAlt, animation:'pulse 1.5s ease infinite' }} />
                ))}
              </div>
            ) : reportCard ? (
              <div>
                <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:t.text, lineHeight:1.7, marginBottom:'20px' }}>{reportCard.summary}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
                  {reportCard.grades.map(g => {
                    const gradeColor = g.grade.startsWith('A') ? '#16a34a' : g.grade.startsWith('B') ? '#C9A84C' : '#9aa5b4'
                    return (
                      <div key={g.category} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 16px', background:t.surfaceAlt, borderRadius:'10px', border:`1px solid ${t.borderLight}` }}>
                        <div style={{ width:40, height:40, borderRadius:'8px', background:`${gradeColor}18`, border:`1.5px solid ${gradeColor}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:gradeColor, letterSpacing:'0.5px' }}>{g.grade}</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text, marginBottom:'2px' }}>{g.category}</div>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, lineHeight:1.4 }}>{g.comment}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'12px' }}>
                  <div style={{ padding:'14px 16px', background:`rgba(22,163,74,0.06)`, borderRadius:'10px', border:'1px solid rgba(22,163,74,0.2)' }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#16a34a', textTransform:'uppercase', marginBottom:'4px' }}>🏆 Top Win</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.text, lineHeight:1.5 }}>{reportCard.top_win}</div>
                  </div>
                  <div style={{ padding:'14px 16px', background:`rgba(201,168,76,0.06)`, borderRadius:'10px', border:'1px solid rgba(201,168,76,0.2)' }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'4px' }}>⚡ Next Focus</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.text, lineHeight:1.5 }}>{reportCard.next_focus}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'20px', color:t.textMuted, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px' }}>
                Connect Strava to unlock your full training analysis
              </div>
            )
          )}
        </div>

        {/* MUSIC */}
        <div style={{ background:t.surface, borderRadius:'16px', padding:'20px', marginBottom:'16px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease 0.25s both', transition:'background 0.25s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>Race Day Music</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'3px' }}>What were you listening to?</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'14px' }}>
            {/* Spotify */}
            <div style={{ border:`1.5px dashed ${t.border}`, borderRadius:'14px', padding:'28px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', textAlign:'center', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#1DB954'}
              onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(29,185,84,0.1)', border:'1.5px solid rgba(29,185,84,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              </div>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text, marginBottom:'3px' }}>Spotify</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, lineHeight:1.5 }}>Connect to show what you played on race day</div>
              </div>
              <button style={{ padding:'8px 20px', border:'1.5px solid #1DB954', borderRadius:'8px', background:'rgba(29,185,84,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#1DB954', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='#1DB954'; e.currentTarget.style.color='#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(29,185,84,0.08)'; e.currentTarget.style.color='#1DB954' }}>
                Connect Spotify
              </button>
            </div>
            {/* Apple Music */}
            <div style={{ border:`1.5px dashed ${t.border}`, borderRadius:'14px', padding:'28px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', textAlign:'center', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#FA2D55'}
              onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(250,45,85,0.1)', border:'1.5px solid rgba(250,45,85,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#FA2D55"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.816.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.55.053 1.1.06 1.65.06h11.033c.49 0 .978-.034 1.466-.1.837-.105 1.622-.351 2.295-.849 1.013-.741 1.651-1.731 1.917-2.952.133-.613.17-1.238.17-1.864l.003-12.16zm-6.17 3.38l-4.577 7.83a.78.78 0 01-.672.39.802.802 0 01-.413-.113l-2.155-1.328a.78.78 0 01-.27-1.07l4.576-7.83a.782.782 0 011.345 0l1.94 3.12h.227z"/></svg>
              </div>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text, marginBottom:'3px' }}>Apple Music</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, lineHeight:1.5 }}>Connect to show what you played on race day</div>
              </div>
              <button style={{ padding:'8px 20px', border:'1.5px solid #FA2D55', borderRadius:'8px', background:'rgba(250,45,85,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#FA2D55', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='#FA2D55'; e.currentTarget.style.color='#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(250,45,85,0.08)'; e.currentTarget.style.color='#FA2D55' }}>
                Connect Apple Music
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM NAV */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'16px' }}>
          <div style={{ background:t.surface, borderRadius:'16px', padding:'20px 24px', border:`1px solid ${t.border}` }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase', marginBottom:'10px' }}>Privacy</div>
            <div style={{ display:'flex', gap:'8px' }}>
              {['Public','Hide Time','Private'].map(opt => (
                <button key={opt} style={{ padding:'7px 14px', border:'1.5px solid', borderRadius:'8px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', cursor:'pointer', transition:'all 0.15s', background:opt==='Public'?'#1B2A4A':t.inputBg, borderColor:opt==='Public'?'#1B2A4A':t.border, color:opt==='Public'?'#fff':t.textMuted }}>{opt}</button>
              ))}
            </div>
          </div>
          <div style={{ background:t.surface, borderRadius:'16px', padding:'20px 24px', border:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={() => prevRace && navigate(`/race/${prevRace.id}`)} disabled={!prevRace}
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 16px', border:`1.5px solid ${t.border}`, borderRadius:'10px', background:'transparent', cursor:prevRace?'pointer':'default', opacity:prevRace?1:0.4, transition:'all 0.15s', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:t.text, textTransform:'uppercase' }}
              onMouseEnter={e => prevRace && (e.currentTarget.style.borderColor='#C9A84C')}
              onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Prev
            </button>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted, letterSpacing:'1px' }}>{currentIdx+1} / {ALL_IDS.length}</div>
            <button onClick={() => nextRace && navigate(`/race/${nextRace.id}`)} disabled={!nextRace}
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 16px', border:`1.5px solid ${t.border}`, borderRadius:'10px', background:'transparent', cursor:nextRace?'pointer':'default', opacity:nextRace?1:0.4, transition:'all 0.15s', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:t.text, textTransform:'uppercase' }}
              onMouseEnter={e => nextRace && (e.currentTarget.style.borderColor='#C9A84C')}
              onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
              Next<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* PHOTO LIGHTBOX */}
      {activePhoto && (() => {
        const idx  = localPhotos.findIndex(p => p.id === activePhoto.id)
        const prev = idx > 0 ? localPhotos[idx-1] : null
        const next = idx < localPhotos.length-1 ? localPhotos[idx+1] : null
        return (
          <div onClick={() => setActivePhoto(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.94)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>

            {/* Close */}
            <button onClick={() => setActivePhoto(null)}
              style={{ position:'fixed', top:24, right:24, width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            {/* Prev */}
            {prev && (
              <button onClick={e => { e.stopPropagation(); setActivePhoto(prev) }}
                style={{ position:'fixed', left:24, top:'50%', transform:'translateY(-50%)', width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}

            {/* Image */}
            <div onClick={e => e.stopPropagation()} style={{ maxWidth:'900px', width:'100%', display:'flex', flexDirection:'column', gap:'12px' }}>
              <img src={activePhoto.url} alt={activePhoto.caption}
                style={{ width:'100%', display:'block', borderRadius:'12px', maxHeight:'80vh', objectFit:'contain' }} />
              {activePhoto.caption && (
                <div style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.5)', letterSpacing:'0.5px' }}>
                  {activePhoto.caption} · {idx+1} of {localPhotos.length}
                </div>
              )}
            </div>

            {/* Next */}
            {next && (
              <button onClick={e => { e.stopPropagation(); setActivePhoto(next) }}
                style={{ position:'fixed', right:24, top:'50%', transform:'translateY(-50%)', width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
          </div>
        )
      })()}
    </div>
  )
}
