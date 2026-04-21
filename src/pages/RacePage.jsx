import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { getDistanceColor } from '../lib/colors'
import { useStrava, looksLikeRace } from '../lib/useStrava'

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
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
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

// ── Strava Activity Section ───────────────────────────────────────────────────
function StravaActivitySection({ race, t }) {
  const { user }                        = useAuth()
  const [profile, setProfile]           = useState(null)
  const [activity, setActivity]         = useState(null)
  const [candidates, setCandidates]     = useState([]) // nearby activities for manual pick
  const [loading, setLoading]           = useState(true)
  const [showPicker, setShowPicker]     = useState(false)
  const [mapRendered, setMapRendered]   = useState(false)
  const mapRef = useRef(null)

  // Load profile fresh from Supabase
  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id || user.id
        const { data } = await supabase.from('profiles')
          .select('strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
          .eq('id', uid).single()
        setProfile(data)
      } catch(e) { setLoading(false) }
    }
    load()
  }, [user])

  const { connected, getActivities, connectStrava } = useStrava(profile, user?.id)

  // Auto-match Strava activity to this race
  useEffect(() => {
    if (!connected || !race.date || !profile) return
    const find = async () => {
      setLoading(true)
      try {
        const raceDate  = new Date(race.date)
        const afterTs   = Math.floor(raceDate.getTime() / 1000) - 3 * 86400
        const acts      = await getActivities({ per_page: 30, after: afterTs })

        // Best match: same day + looks like a race
        const sameDay = acts.filter(a => {
          const d = new Date(a.start_date_local)
          return d.toDateString() === raceDate.toDateString()
        })
        const match = sameDay.find(a => looksLikeRace(a)) || sameDay[0]

        if (match) {
          setActivity(match)
        } else {
          // No match — offer nearby activities for manual selection
          const nearby = acts.filter(a => {
            const type = (a.type || a.sport_type || '').toLowerCase()
            return ['run','virtualrun','walk','ride'].includes(type)
          }).slice(0, 10)
          setCandidates(nearby)
        }
      } catch(e) {}
      setLoading(false)
    }
    find()
  }, [connected, race.date, profile])

  // Draw Leaflet map
  useEffect(() => {
    if (!activity?.map?.summary_polyline || !mapRef.current || mapRendered) return
    const draw = async () => {
      try {
        if (!window.L) {
          const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
          await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=resolve; document.head.appendChild(s) })
        }
        if (!window.polyline) {
          await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/@mapbox/polyline@1.1.1/src/polyline.js'; s.onload=resolve; document.head.appendChild(s) })
        }
        const L = window.L
        const poly = window.polyline || window.Polyline
        if (!poly || !L) return
        const latlngs = poly.decode(activity.map.summary_polyline)
        if (!latlngs.length) return
        const map = L.map(mapRef.current, { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, attributionControl:false })
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:18 }).addTo(map)
        const line = L.polyline(latlngs, { color:'#FC4C02', weight:3, opacity:0.9 }).addTo(map)
        map.fitBounds(line.getBounds(), { padding:[16,16] })
        setMapRendered(true)
      } catch(e) {}
    }
    draw()
  }, [activity])

  const fmt     = m  => m ? `${(m/1609.34).toFixed(2)} mi` : '—'
  const fmtTime = s  => { if (!s) return '—'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}` }
  const fmtPace = (s,m) => { if (!s||!m) return '—'; const spm=s/(m/1609.34),mm=Math.floor(spm/60),ss=Math.round(spm%60); return `${mm}:${String(ss).padStart(2,'0')}/mi` }
  const fmtDate = d  => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''

  // ── Not connected ──
  if (!loading && !connected) return (
    <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', marginBottom:'24px', border:`1px solid ${t.border}` }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'16px' }}>Strava Activity</div>
      <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'16px', background:t.surfaceAlt, borderRadius:'10px', border:`1px solid ${t.border}` }}>
        <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(252,76,2,0.1)', border:'1px solid rgba(252,76,2,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text, marginBottom:'2px' }}>Connect Strava to see your activity</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>We'll match this race to your Strava activity and show your map and stats.</div>
        </div>
        <button onClick={() => connectStrava('/passport')}
          style={{ padding:'8px 18px', border:'1.5px solid rgba(252,76,2,0.5)', borderRadius:'8px', background:'rgba(252,76,2,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#FC4C02', cursor:'pointer', textTransform:'uppercase', flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(252,76,2,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(252,76,2,0.08)'}>
          Connect Strava
        </button>
      </div>
    </div>
  )

  // ── Loading ──
  if (loading) return (
    <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', marginBottom:'24px', border:`1px solid ${t.border}` }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'16px' }}>Strava Activity</div>
      <div style={{ height:'220px', background:t.surfaceAlt, borderRadius:'10px', animation:'pulse 1.5s ease infinite' }} />
    </div>
  )

  // ── No match found — manual picker ──
  if (!activity) return (
    <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', marginBottom:'24px', border:`1px solid ${t.border}` }}>
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
            <div key={a.id} onClick={() => { setActivity(a); setShowPicker(false) }}
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
    <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', marginBottom:'24px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px' }}>Strava Activity</div>
          <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'3px 8px', background:'rgba(252,76,2,0.08)', border:'1px solid rgba(252,76,2,0.2)', borderRadius:'6px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#FC4C02', textTransform:'uppercase' }}>Matched</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => { setActivity(null); setShowPicker(true); setMapRendered(false) }}
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

      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'14px' }}>{activity.name} · {fmtDate(activity.start_date_local)}</div>

      {/* Map */}
      {activity.map?.summary_polyline && (
        <div ref={mapRef} style={{ height:'220px', borderRadius:'12px', overflow:'hidden', background:t.surfaceAlt, marginBottom:'16px' }} />
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
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
    </div>
  )
}

export default function RacePage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const numId = parseInt(id) || 1

  const [editMode, setEditMode]     = useState(false)
  const [race, setRace]             = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [story, setStory]           = useState('')
  const [gear, setGear]             = useState([])
  const [stickers, setStickers]     = useState([])
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showSplits, setShowSplits] = useState(true)
  const [showAddGear, setShowAddGear] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [activePhoto, setActivePhoto] = useState(null)
  const [localPhotos, setLocalPhotos] = useState([]) // uploaded photos as object URLs
  const [showDropdown, setShowDropdown] = useState(false)
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
    const data = RYAN_RACE_DATA[numId] || RYAN_RACE_DATA[1]
    const idx  = ALL_IDS.indexOf(data.id)
    setCurrentIdx(idx >= 0 ? idx : 0)
    setRace(data); setStory(data.story||''); setGear(data.gear||[]); setStickers(data.stickers||[])

    const style = document.createElement('style')
    style.id = 'rp-racepage-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing:border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
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

  if (!race) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:t.bg }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  )

  const colors  = getDistanceColor(race.distance)
  const cleaned = race.distance.replace(' mi','').replace(' miles','')
  const fs      = cleaned.length>4 ? 22 : cleaned.length>2 ? 28 : 40

  const prevId   = currentIdx > 0 ? ALL_IDS[currentIdx-1] : null
  const nextId   = currentIdx < ALL_IDS.length-1 ? ALL_IDS[currentIdx+1] : null
  const prevRace = prevId ? RYAN_RACE_DATA[prevId] : null
  const nextRace = nextId ? RYAN_RACE_DATA[nextId] : null

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
      <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(8px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', height:'56px', transition:'background 0.25s' }}>
        {/* Back to passport */}
        <button onClick={() => navigate('/passport')}
          style={{ display:'flex', alignItems:'center', gap:'8px', background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:0, transition:'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color=t.text} onMouseLeave={e => e.currentTarget.style.color=t.textMuted}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Passport
        </button>

        {/* Page navigation */}
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => prevRace && navigate(`/race/${prevRace.id}`)} disabled={!prevRace}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:prevRace?'pointer':'default', color:prevRace?t.textMuted:t.borderLight, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'4px 8px', borderRadius:'6px', transition:'color 0.15s' }}
            onMouseEnter={e => prevRace && (e.currentTarget.style.color=t.text)}
            onMouseLeave={e => e.currentTarget.style.color = prevRace?t.textMuted:t.borderLight}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {prevRace ? prevRace.name.split(' ').slice(0,2).join(' ') : 'First'}
          </button>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase' }}>Page {currentIdx+1} / {ALL_IDS.length}</div>
          <button onClick={() => nextRace && navigate(`/race/${nextRace.id}`)} disabled={!nextRace}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:nextRace?'pointer':'default', color:nextRace?t.textMuted:t.borderLight, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'4px 8px', borderRadius:'6px', transition:'color 0.15s' }}
            onMouseEnter={e => nextRace && (e.currentTarget.style.color=t.text)}
            onMouseLeave={e => e.currentTarget.style.color = nextRace?t.textMuted:t.borderLight}>
            {nextRace ? nextRace.name.split(' ').slice(0,2).join(' ') : 'Last'}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Right: edit + avatar dropdown */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {!editMode ? (
            <>
              <button style={{ padding:'6px 16px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=t.text; e.currentTarget.style.color=t.text }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.color=t.textMuted }}>Share</button>
              <button onClick={() => setEditMode(true)}
                style={{ padding:'6px 18px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>Edit Page</button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditMode(false); setShowAddGear(false) }} style={{ padding:'6px 16px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:'6px 18px', border:'none', borderRadius:'8px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase', opacity:saving?0.7:1 }}>{saving?'Saving...':'Save Page'}</button>
            </>
          )}
          {/* Avatar dropdown */}
          <div ref={dropdownRef} style={{ position:'relative' }}>
            <div onClick={() => setShowDropdown(!showDropdown)}
              style={{ width:34, height:34, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
              onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', color:'#C9A84C' }}>{initials}</span>
            </div>
            {showDropdown && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'200px', overflow:'hidden', zIndex:100 }}>
                <div style={{ padding:'12px 16px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:t.text }}>{fullName}</div>
                </div>
                <button style={{ display:'block', width:'100%', padding:'10px 16px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text, cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
                <button style={{ display:'block', width:'100%', padding:'10px 16px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text, cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  onClick={() => { navigate('/profile'); setShowDropdown(false) }}>Settings</button>
                {/* Dark mode toggle */}
                <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text }}>Dark Mode</span>
                  <button onClick={toggleTheme}
                    style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s', background:isDark?'#C9A84C':'#d0d7e0', padding:0, flexShrink:0 }}>
                    <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
                <div style={{ height:'1px', background:t.borderLight }} />
                <button style={{ display:'block', width:'100%', padding:'10px 16px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#c53030', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  onClick={handleSignOut}>Log Out</button>
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
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 40px 0', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'40px', marginBottom:'32px' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:'10px' }}>Race Passport · Page {currentIdx+1} of {ALL_IDS.length}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(40px,6vw,72px)', color:'#fff', letterSpacing:'2px', lineHeight:0.95, marginBottom:'10px' }}>{race.name}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'16px', color:'rgba(255,255,255,0.5)', letterSpacing:'1px', marginBottom:'16px' }}>{race.date} · {race.location}</div>
              {race.pr && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.35)', borderRadius:'8px', padding:'6px 16px' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase' }}>Personal Best</span>
                </div>
              )}
            </div>
            <div style={{ width:140, height:140, borderRadius:'50%', border:`3px solid ${colors.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
              <div style={{ position:'absolute', inset:10, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.stampText, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1, textAlign:'center' }}>{cleaned}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:colors.stampText, textTransform:'uppercase', marginTop:'4px', position:'relative', zIndex:1, opacity:0.55 }}>{colors.label}</div>
            </div>
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', position:'relative', zIndex:1 }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'0 40px' }}>
            {[{ label:'Finish Time', value:race.time },{ label:'Avg Pace', value:race.pace||'Multi-sport' },{ label:'Overall Place', value:race.place||'—' },{ label:'Elevation', value:race.elevation }].map((s,i) => (
              <div key={i} style={{ padding:'20px 0', textAlign:'center', borderRight:i<3?'1px solid rgba(255,255,255,0.08)':'none' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:'#fff', letterSpacing:'1px', lineHeight:1 }}>{s.value}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {race.weather && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 40px', position:'relative', zIndex:1, maxWidth:'1200px', margin:'0 auto' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>Race day: {race.weather}</span>
          </div>
        )}
        {editMode && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', padding:'8px 40px', display:'flex', alignItems:'center', gap:'4px', background:'rgba(0,0,0,0.2)', position:'relative', zIndex:6 }}>
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
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'32px 40px 80px' }}>

        {/* PHOTOS */}
        <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', marginBottom:'24px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease both', transition:'background 0.25s' }}>
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
        <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', marginBottom:'24px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease 0.1s both', transition:'background 0.25s' }}>
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
        <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', marginBottom:'24px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease 0.15s both', transition:'background 0.25s' }}>
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

        {/* MUSIC */}
        <div style={{ background:t.surface, borderRadius:'16px', padding:'28px', marginBottom:'24px', border:`1px solid ${t.border}`, animation:'fadeIn 0.4s ease 0.25s both', transition:'background 0.25s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>Race Day Music</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'3px' }}>What were you listening to?</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
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
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
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
