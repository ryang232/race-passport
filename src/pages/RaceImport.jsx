import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
const DISTANCES = ['5K','10K','10 mi','13.1','26.2','50K','70.3','140.6','Ultra','Other']

const SESSION_KEY = 'rp_race_import_races'

function injectStyles() {
  if (document.getElementById('rp-ri2-styles')) return
  const s = document.createElement('style')
  s.id = 'rp-ri2-styles'
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
    @keyframes tickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
    .ri-dist-btn{padding:9px 16px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.12s;border:1.5px solid #e2e6ed;background:#fafbfc;color:#9aa5b4}
    .ri-dist-btn.sel{background:#1B2A4A;color:#fff;border-color:#1B2A4A}
    .ri-dist-btn:hover:not(.sel){border-color:#1B2A4A;color:#1B2A4A;background:#fff}
    .ri-row{animation:fadeIn 0.3s ease both;cursor:pointer;transition:background 0.15s}
    .ri-row:hover{background:#f8f9fb!important}
    div::-webkit-scrollbar{display:none}
  `
  document.head.appendChild(s)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(secs) {
  if (!secs) return ''
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}
function fmtDist(m) { return m ? `${(m/1609.34).toFixed(2)} mi` : '—' }
function fmtPace(secs, meters) {
  if (!secs || !meters) return '—'
  const spm = secs / (meters/1609.34)
  return `${Math.floor(spm/60)}:${String(Math.round(spm%60)).padStart(2,'0')}/mi`
}

// ── Mini stamp ────────────────────────────────────────────────────────────────
function MiniStamp({ distance, size=46 }) {
  const c = getDistanceColor(distance)
  const t = (distance||'').replace(' mi','').replace(' miles','')
  const fs = t.length>4?9:t.length>2?13:16
  return (
    <div style={{width:size,height:size,borderRadius:'50%',border:`2px solid ${c.stampBorder}`,background:`${c.stampBorder}15`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',flexShrink:0}}>
      <div style={{position:'absolute',inset:3,borderRadius:'50%',border:`1px dashed ${c.stampDash}`}}/>
      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:fs,color:c.stampBorder,position:'relative',zIndex:1,textAlign:'center',lineHeight:1,padding:'0 2px'}}>{t||'?'}</span>
    </div>
  )
}

// ── Ticker background ─────────────────────────────────────────────────────────
function TickerBg() {
  return (
    <div style={{position:'fixed',top:'50%',transform:'translateY(-55%)',left:0,whiteSpace:'nowrap',pointerEvents:'none',zIndex:0}}>
      <div style={{display:'inline-flex',animation:'tickerScroll 60s linear infinite'}}>
        {TICKER.map((d,i)=><span key={i} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(160px,22vw,300px)',color:'transparent',WebkitTextStroke:'1px rgba(27,42,74,0.04)',lineHeight:1,padding:'0 40px',userSelect:'none',flexShrink:0}}>{d}</span>)}
      </div>
    </div>
  )
}

// ── Pacer thinking animation ──────────────────────────────────────────────────
function PacerThinking({ label='Pacer is looking this up...' }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'16px 20px',background:'rgba(201,168,76,0.06)',border:'1.5px solid rgba(201,168,76,0.2)',borderRadius:'14px',animation:'shimmer 1.2s ease infinite'}}>
      <span style={{fontSize:'20px'}}>⚡</span>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',letterSpacing:'1.5px',color:'#C9A84C',textTransform:'uppercase'}}>{label}</span>
      <div style={{display:'flex',gap:'5px',marginLeft:'auto'}}>
        {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C',animation:`pulse 1s ease-in-out ${i*0.3}s infinite`}}/>)}
      </div>
    </div>
  )
}

// ── Strava mini map ───────────────────────────────────────────────────────────
function StravaActivityCard({ activity, onConfirm, onReject, t='confirm' }) {
  const mapRef = useRef(null)
  const rendered = useRef(false)

  useEffect(() => {
    if (!activity?.map?.summary_polyline || !mapRef.current || rendered.current) return
    rendered.current = true
    const draw = async () => {
      try {
        if (!window.L) {
          const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
          await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=resolve; document.head.appendChild(s) })
        }
        if (!window.polyline) {
          await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/@mapbox/polyline@1.1.1/src/polyline.js'; s.onload=resolve; document.head.appendChild(s) })
        }
        const L = window.L, poly = window.polyline
        if (!poly || !L || !mapRef.current) return
        const latlngs = poly.decode(activity.map.summary_polyline)
        if (!latlngs.length) return
        const map = L.map(mapRef.current, { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, attributionControl:false })
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:18 }).addTo(map)
        const line = L.polyline(latlngs, { color:'#FC4C02', weight:3, opacity:0.9 }).addTo(map)
        map.fitBounds(line.getBounds(), { padding:[16,16] })
      } catch(e) {}
    }
    draw()
  }, [activity])

  const elev = activity.total_elevation_gain ? `${Math.round(activity.total_elevation_gain * 3.281)}ft` : '—'
  const date = activity.start_date_local ? new Date(activity.start_date_local).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''

  return (
    <div style={{marginTop:'16px',borderRadius:'12px',overflow:'hidden',border:'1.5px solid rgba(252,76,2,0.25)',animation:'slideDown 0.3s ease both'}}>
      {/* Header */}
      <div style={{background:'rgba(252,76,2,0.06)',padding:'10px 14px',display:'flex',alignItems:'center',gap:'8px',borderBottom:'1px solid rgba(252,76,2,0.15)'}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#FC4C02',textTransform:'uppercase'}}>Strava Activity Found</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(252,76,2,0.6)',marginLeft:'auto'}}>{date}</span>
      </div>
      {/* Map */}
      {activity.map?.summary_polyline ? (
        <div ref={mapRef} style={{height:'160px',background:'#f8f9fb'}}/>
      ) : (
        <div style={{height:'80px',background:'#f8f9fb',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#9aa5b4'}}>No route data available</span>
        </div>
      )}
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,borderTop:'1px solid rgba(252,76,2,0.1)'}}>
        {[
          { label:'Distance', value: fmtDist(activity.distance) },
          { label:'Time',     value: fmtTime(activity.moving_time) },
          { label:'Pace',     value: fmtPace(activity.moving_time, activity.distance) },
          { label:'Elevation',value: elev },
        ].map((s,i) => (
          <div key={s.label} style={{padding:'10px 0',textAlign:'center',borderRight:i<3?'1px solid rgba(252,76,2,0.1)':'none'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'16px',color:'#1B2A4A',letterSpacing:'0.5px',lineHeight:1}}>{s.value}</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginTop:'2px'}}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Activity name */}
      <div style={{padding:'8px 14px',borderTop:'1px solid rgba(252,76,2,0.1)',background:'rgba(252,76,2,0.02)'}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#6b7a8d'}}>"{activity.name}"</span>
      </div>
      {/* Confirm/reject */}
      {t === 'confirm' && (
        <div style={{display:'flex',gap:'8px',padding:'12px 14px',borderTop:'1px solid rgba(252,76,2,0.1)'}}>
          <button onClick={onReject}
            style={{flex:1,padding:'10px',border:'1.5px solid #e2e6ed',borderRadius:'8px',background:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,color:'#9aa5b4',cursor:'pointer',textTransform:'uppercase'}}>
            Not This One
          </button>
          <button onClick={onConfirm}
            style={{flex:2,padding:'10px',border:'none',borderRadius:'8px',background:'#FC4C02',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,color:'#fff',cursor:'pointer',textTransform:'uppercase'}}
            onMouseEnter={e=>e.currentTarget.style.opacity='0.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            Yes, This Is It →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Manual Strava activity picker ─────────────────────────────────────────────
function StravaManualPicker({ candidates, onSelect, onSkip }) {
  return (
    <div style={{marginTop:'16px',animation:'slideDown 0.3s ease both'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1.5px',color:'#FC4C02',textTransform:'uppercase'}}>
          Pick from nearby activities
        </span>
        <button onClick={onSkip} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#9aa5b4',background:'none',border:'none',cursor:'pointer',textTransform:'uppercase',letterSpacing:'1px'}}>
          Skip →
        </button>
      </div>
      {candidates.length === 0 ? (
        <div style={{padding:'20px',textAlign:'center',border:'1.5px dashed #e2e6ed',borderRadius:'10px'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#9aa5b4'}}>No Strava activities found near this date</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:'240px',overflowY:'auto'}}>
          {candidates.map(a => {
            const date = a.start_date_local ? new Date(a.start_date_local).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''
            return (
              <div key={a.id} onClick={() => onSelect(a)}
                style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',border:'1.5px solid #e2e6ed',borderRadius:'10px',cursor:'pointer',transition:'all 0.15s',background:'#fafbfc'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#FC4C02';e.currentTarget.style.background='rgba(252,76,2,0.03)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e6ed';e.currentTarget.style.background='#fafbfc'}}>
                <div style={{width:32,height:32,borderRadius:'8px',background:'rgba(252,76,2,0.08)',border:'1px solid rgba(252,76,2,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,color:'#1B2A4A',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.name}</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#9aa5b4'}}>{date} · {fmtDist(a.distance)} · {fmtTime(a.moving_time)}</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#9aa5b4" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Race edit form (Pacer popup) ──────────────────────────────────────────────
function RaceEditForm({ initial, onSave, onCancel, saveLabel='Add to My Passport →', isNew=true, stravaProfile, stravaConnected }) {
  const [name, setName]           = useState(initial.name||'')
  const [date, setDate]           = useState(initial.date||'')
  const [location, setLocation]   = useState(initial.location||'')
  const [distance, setDistance]   = useState(initial.distance||'')
  const [time, setTime]           = useState(initial.time||'')
  const nameRef = useRef(null)

  // Strava search state
  const [stravaSearching, setStravaSearching]   = useState(false)
  const [stravaActivity, setStravaActivity]     = useState(initial.strava_activity||null)
  const [stravaCandidates, setStravaCandidates] = useState([])
  const [stravaState, setStravaState]           = useState(
    initial.strava_activity ? 'confirmed' : 'idle'
  ) // idle | searching | found | manual | confirmed | nomatch

  useEffect(() => { if (isNew && nameRef.current) nameRef.current.focus() }, [])

  const inp = (extra={}) => ({
    width:'100%', padding:'12px 14px', borderRadius:'10px', border:'1.5px solid #e2e6ed',
    background:'#fafbfc', color:'#1B2A4A', fontSize:'16px', fontFamily:"'Barlow',sans-serif",
    outline:'none', boxSizing:'border-box', transition:'border-color 0.15s', ...extra
  })

  const confidenceLabel = initial.confidence===3 ? 'Pacer Found It' : initial.confidence===2 ? 'Best Guess — Please Verify' : 'Add Your Details'
  const confidenceColor = initial.confidence===3 ? '#16a34a' : initial.confidence===2 ? '#C9A84C' : '#9aa5b4'

  const searchStrava = async () => {
    if (!stravaProfile || !date) return
    setStravaSearching(true)
    setStravaState('searching')
    setStravaActivity(null)
    setStravaCandidates([])
    try {
      const token = stravaProfile.strava_access_token

      // Parse race date — support "Oct 2023", "February 16, 2025", "2025-02-16"
      const raceDate = new Date(date)
      if (isNaN(raceDate)) { setStravaState('nomatch'); setStravaSearching(false); return }

      // Search a wide +-60 day window to catch races where user entered approx date
      const afterTs  = Math.floor(raceDate.getTime()/1000) - 60*86400
      const beforeTs = Math.floor(raceDate.getTime()/1000) + 60*86400

      const resp = await fetch(`/api/strava?action=activities&access_token=${token}&per_page=100&after=${afterTs}&before=${beforeTs}`)
      const acts = await resp.json()
      if (!Array.isArray(acts) || acts.length === 0) {
        setStravaState('nomatch')
        setStravaSearching(false)
        return
      }

      // Only consider relevant activity types
      const runTypes = ['run','virtualrun','walk','ride','swim','elliptical']
      const pool = acts.filter(a => runTypes.includes((a.type||a.sport_type||'').toLowerCase()))

      // Scoring: name match = 50pts, distance match = 30pts, same day = 20pts
      const DIST_MILES = {
        '5K':3.1,'10K':6.2,'10 mi':10,'13.1':13.1,
        '26.2':26.2,'50K':31,'70.3':70.3,'140.6':140.6
      }
      const targetMi = DIST_MILES[distance] || null
      const normalize = (s) => (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()
      const raceName  = normalize(name)
      const raceWords = raceName.split(' ').filter(w => w.length > 2)

      const scored = pool.map(a => {
        let score = 0
        const actName = normalize(a.name)

        // Name scoring
        if (actName === raceName) {
          score += 50
        } else {
          const matchedWords = raceWords.filter(w => actName.includes(w))
          score += (matchedWords.length / Math.max(raceWords.length, 1)) * 40
        }

        // Distance scoring
        if (targetMi && a.distance) {
          const actMi = a.distance / 1609.34
          const pctOff = Math.abs(actMi - targetMi) / targetMi
          if (pctOff <= 0.05)      score += 30
          else if (pctOff <= 0.10) score += 20
          else if (pctOff <= 0.20) score += 10
          else if (pctOff > 0.5)   score -= 30
        }

        // Date scoring
        const actDate = new Date(a.start_date_local)
        const daysDiff = Math.abs((actDate - raceDate) / 86400000)
        if (daysDiff <= 1)       score += 20
        else if (daysDiff <= 7)  score += 10
        else if (daysDiff <= 14) score += 5

        return { activity: a, score }
      })

      scored.sort((a, b) => b.score - a.score)

      const best = scored[0]
      const AUTO_MATCH_THRESHOLD = 25

      if (best && best.score >= AUTO_MATCH_THRESHOLD) {
        const detailResp = await fetch(`/api/strava?action=activity&access_token=${token}&activity_id=${best.activity.id}`)
        const detail = await detailResp.json()
        setStravaActivity(detail.id ? detail : best.activity)
        setStravaState('found')
      } else {
        const candidates = scored.slice(0, 10).map(s => s.activity)
        setStravaCandidates(candidates)
        setStravaState(candidates.length > 0 ? 'manual' : 'nomatch')
      }
    } catch(e) {
      setStravaState('nomatch')
    }
    setStravaSearching(false)
  }

  const confirmActivity = (act) => {
    setStravaActivity(act)
    setStravaState('confirmed')
    // Pre-fill finish time from Strava
    if (act.moving_time && !time) {
      setTime(fmtTime(act.moving_time))
    } else if (act.moving_time) {
      setTime(fmtTime(act.moving_time))
    }
  }

  const handleSave = () => {
    if (!name.trim() || !distance) return
    onSave({
      name: name.trim(), date, date_sort: initial.date_sort||null,
      location, city: initial.city||'', state: initial.state||'',
      distance, time, confidence: initial.confidence||2,
      strava_activity: stravaState === 'confirmed' ? stravaActivity : null,
    })
  }

  return (
    <div style={{background:'#fff',border:`2px solid ${initial.confidence===3?'rgba(22,163,74,0.3)':'rgba(201,168,76,0.35)'}`,borderRadius:'16px',overflow:'hidden',animation:'slideDown 0.3s ease both',boxShadow:'0 4px 24px rgba(27,42,74,0.08)'}}>
      {/* Header */}
      <div style={{background:initial.confidence===3?'rgba(22,163,74,0.05)':'rgba(201,168,76,0.06)',borderBottom:`1px solid ${initial.confidence===3?'rgba(22,163,74,0.12)':'rgba(201,168,76,0.12)'}`,padding:'11px 18px',display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{fontSize:'16px'}}>⚡</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'2px',color:confidenceColor,textTransform:'uppercase'}}>{confidenceLabel}</span>
        {onCancel && <button onClick={onCancel} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#9aa5b4',fontSize:'20px',lineHeight:1,padding:'0 2px'}}>×</button>}
      </div>

      <div style={{padding:'18px'}}>
        {/* Race name */}
        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
            Race Name <span style={{color:'#C9A84C'}}>*</span>
          </label>
          <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Cherry Blossom 10 Miler"
            style={inp({fontSize:'18px',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600})}
            onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#e2e6ed'}/>
        </div>

        {/* Distance */}
        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'8px'}}>
            Distance <span style={{color:'#C9A84C'}}>*</span>
          </label>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {DISTANCES.map(d=>(
              <button key={d} className={`ri-dist-btn${distance===d?' sel':''}`} onClick={()=>setDistance(d)}>{d}</button>
            ))}
          </div>
        </div>

        {/* Date + Location */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
          <div>
            <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
              Date <span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
            </label>
            <input value={date} onChange={e=>setDate(e.target.value)} placeholder="e.g. Oct 2023"
              style={inp()} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#e2e6ed'}/>
          </div>
          <div>
            <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
              Location <span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
            </label>
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="City, ST"
              style={inp()} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='#e2e6ed'}/>
          </div>
        </div>

        {/* Finish time */}
        <div style={{marginBottom:'16px'}}>
          <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
            Finish Time <span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
            {stravaState==='confirmed'&&<span style={{color:'#FC4C02',marginLeft:'8px',fontSize:'10px'}}>· from Strava</span>}
          </label>
          <input value={time} onChange={e=>setTime(e.target.value)} placeholder="e.g. 1:57:40 or 28:16"
            style={inp({fontSize:'18px',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:'0.5px',borderColor:stravaState==='confirmed'?'rgba(252,76,2,0.3)':'#e2e6ed'})}
            onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=stravaState==='confirmed'?'rgba(252,76,2,0.3)':'#e2e6ed'}/>
        </div>

        {/* Strava section */}
        <div style={{marginBottom:'16px'}}>
          {stravaConnected ? (
            <>
              {/* Search button */}
              {(stravaState==='idle'||stravaState==='nomatch') && (
                <button onClick={searchStrava} disabled={stravaSearching||!date}
                  style={{width:'100%',padding:'11px',border:'1.5px solid rgba(252,76,2,0.35)',borderRadius:'10px',background:'rgba(252,76,2,0.04)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1px',color:'#FC4C02',cursor:(!date||stravaSearching)?'not-allowed':'pointer',textTransform:'uppercase',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',opacity:!date?0.5:1,transition:'all 0.15s'}}
                  onMouseEnter={e=>{if(date)e.currentTarget.style.background='rgba(252,76,2,0.08)'}}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(252,76,2,0.04)'}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  {stravaState==='nomatch' ? 'Try Strava Search Again' : 'Search for This Activity in Strava'}
                  {!date && <span style={{fontSize:'10px',fontWeight:400,opacity:0.7}}>(add a date first)</span>}
                </button>
              )}
              {stravaState==='nomatch' && (
                <div style={{marginTop:'8px',padding:'10px 14px',background:'rgba(252,76,2,0.04)',borderRadius:'8px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#9aa5b4'}}>
                  No matching Strava activity found near this date.
                </div>
              )}
              {/* Searching */}
              {stravaState==='searching' && <div style={{marginTop:'8px'}}><PacerThinking label="Searching your Strava..."/></div>}
              {/* Found — show map + confirm */}
              {stravaState==='found' && stravaActivity && (
                <StravaActivityCard activity={stravaActivity} onConfirm={()=>confirmActivity(stravaActivity)} onReject={()=>{setStravaState('manual');setStravaActivity(null)}} />
              )}
              {/* Manual picker */}
              {stravaState==='manual' && (
                <StravaManualPicker candidates={stravaCandidates} onSelect={async (a)=>{
                  // Fetch full detail for polyline
                  try {
                    const token = stravaProfile.strava_access_token
                    const r = await fetch(`/api/strava?action=activity&access_token=${token}&activity_id=${a.id}`)
                    const detail = await r.json()
                    setStravaActivity(detail.id ? detail : a)
                    setStravaState('found')
                  } catch(e) { setStravaActivity(a); setStravaState('found') }
                }} onSkip={()=>setStravaState('idle')} />
              )}
              {/* Confirmed */}
              {stravaState==='confirmed' && stravaActivity && (
                <StravaActivityCard activity={stravaActivity} t="confirmed" />
              )}
              {stravaState==='confirmed' && (
                <button onClick={()=>{setStravaState('idle');setStravaActivity(null);}} style={{marginTop:'8px',width:'100%',padding:'8px',border:'1px solid #e2e6ed',borderRadius:'8px',background:'transparent',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#9aa5b4',cursor:'pointer',textTransform:'uppercase',letterSpacing:'1px'}}>
                  Remove Strava Activity
                </button>
              )}
            </>
          ) : (
            /* Not connected — grayed out */
            <div style={{padding:'11px 16px',border:'1.5px solid #e2e6ed',borderRadius:'10px',background:'#f8f9fb',display:'flex',alignItems:'center',gap:'10px',opacity:0.6}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#9aa5b4"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#9aa5b4',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase'}}>Connect Strava above to pull in this activity</span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{display:'flex',gap:'10px'}}>
          {onCancel && (
            <button onClick={onCancel} style={{flex:1,padding:'13px',border:'1.5px solid #e2e6ed',borderRadius:'12px',background:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,color:'#9aa5b4',cursor:'pointer',textTransform:'uppercase'}}>
              Cancel
            </button>
          )}
          <button onClick={handleSave} disabled={!name.trim()||!distance}
            style={{flex:2,padding:'14px',border:'none',borderRadius:'12px',background:name.trim()&&distance?'#1B2A4A':'#e2e6ed',color:name.trim()&&distance?'#fff':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',cursor:name.trim()&&distance?'pointer':'not-allowed',transition:'background 0.2s'}}
            onMouseEnter={e=>{if(name.trim()&&distance)e.currentTarget.style.background='#C9A84C'}}
            onMouseLeave={e=>{if(name.trim()&&distance)e.currentTarget.style.background='#1B2A4A'}}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Added race row ────────────────────────────────────────────────────────────
function RaceRow({ race, onRemove, onUpdate, index, stravaConnected, stravaProfile }) {
  const [editing, setEditing] = useState(false)
  const [stravaSearching, setStravaSearching] = useState(false)
  const c = getDistanceColor(race.distance)
  const hasStrava = !!race.strava_activity

  // Pull in Strava for an already-added race
  const pullStrava = async () => {
    if (!stravaProfile || !race.date) return
    setStravaSearching(true)
    try {
      const token = stravaProfile.strava_access_token
      const raceDate = new Date(race.date)
      if (isNaN(raceDate)) { setStravaSearching(false); return }
      const afterTs  = Math.floor(raceDate.getTime()/1000) - 14*86400
      const beforeTs = Math.floor(raceDate.getTime()/1000) + 14*86400
      const resp = await fetch(`/api/strava?action=activities&access_token=${token}&per_page=60&after=${afterTs}&before=${beforeTs}`)
      const acts = await resp.json()
      if (!Array.isArray(acts)) { setStravaSearching(false); return }
      const DIST_MILES = {'5K':3.1,'10K':6.2,'10 mi':10,'13.1':13.1,'26.2':26.2,'50K':31}
      const targetMi = DIST_MILES[race.distance]||null
      const pool = acts.filter(a => ['run','virtualrun','walk'].includes((a.type||'').toLowerCase()))
      let match = targetMi ? pool.find(a=>Math.abs((a.distance||0)/1609.34-targetMi)/targetMi<=0.05) : null
      if (!match) match = pool.find(a=>new Date(a.start_date_local).toDateString()===raceDate.toDateString())
      if (match) {
        const r = await fetch(`/api/strava?action=activity&access_token=${token}&activity_id=${match.id}`)
        const detail = await r.json()
        const activity = detail.id ? detail : match
        onUpdate(race.id, { ...race, strava_activity: activity, time: fmtTime(activity.moving_time)||race.time })
      }
    } catch(e) {}
    setStravaSearching(false)
  }

  if (editing) return (
    <div style={{animation:'slideDown 0.25s ease both',animationDelay:`${index*0.05}s`}}>
      <RaceEditForm initial={race} isNew={false} saveLabel="Save Changes →"
        stravaConnected={stravaConnected} stravaProfile={stravaProfile}
        onSave={updated=>{ onUpdate(race.id, {...race,...updated}); setEditing(false) }}
        onCancel={()=>setEditing(false)} />
    </div>
  )

  return (
    <div className="ri-row" onClick={()=>setEditing(true)}
      style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:'#fff',borderRadius:'14px',border:`1.5px solid ${c.stampBorder}25`,borderLeft:`4px solid ${c.stampBorder}`,animationDelay:`${index*0.05}s`,position:'relative'}}>
      <MiniStamp distance={race.distance} size={46}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'19px',color:'#1B2A4A',letterSpacing:'0.5px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.1}}>{race.name}</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#9aa5b4',marginTop:'2px',display:'flex',alignItems:'center',gap:'8px'}}>
          {[race.location,race.date].filter(Boolean).join(' · ')}
          {race.time&&<span style={{color:c.stampBorder,fontWeight:600}}>{race.time}</span>}
          {hasStrava&&<span style={{display:'flex',alignItems:'center',gap:'3px',color:'#FC4C02'}}><svg width="8" height="8" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>Strava</span>}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
        {/* Pull Strava button for connected but not yet matched */}
        {stravaConnected && !hasStrava && race.date && (
          <button onClick={e=>{e.stopPropagation();pullStrava()}} disabled={stravaSearching}
            style={{padding:'5px 10px',border:'1px solid rgba(252,76,2,0.3)',borderRadius:'6px',background:'rgba(252,76,2,0.05)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1px',color:'#FC4C02',cursor:'pointer',textTransform:'uppercase',display:'flex',alignItems:'center',gap:'4px',whiteSpace:'nowrap'}}>
            {stravaSearching
              ? <div style={{width:8,height:8,border:'1.5px solid rgba(252,76,2,0.3)',borderTopColor:'#FC4C02',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
              : <svg width="8" height="8" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            }
            Pull Activity
          </button>
        )}
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#b0b8c4',letterSpacing:'1px'}}>TAP TO EDIT</span>
        <button onClick={e=>{e.stopPropagation();onRemove(race.id)}}
          style={{background:'none',border:'none',cursor:'pointer',padding:'6px',borderRadius:'6px',color:'#c53030',fontSize:'18px',lineHeight:1}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(197,48,48,0.08)'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>×</button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RaceImport() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()

  const [firstName, setFirstName]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [query, setQuery]               = useState('')
  const [searching, setSearching]       = useState(false)
  const [pacerResult, setPacerResult]   = useState(null)
  const [searchError, setSearchError]   = useState('')
  const [races, setRaces]               = useState([])
  const [popupOpen, setPopupOpen]       = useState(false)

  // Strava state
  const [stravaProfile, setStravaProfile]   = useState(null)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaConnecting, setStravaConnecting] = useState(false)

  const inputRef = useRef(null)

  useEffect(() => {
    injectStyles()

    const init = async () => {
      if (locationState?.firstName) setFirstName(locationState.firstName)

      if (!user || isDemo(user?.email)) { setFirstName('Ryan'); return }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (!uid) return

        const { data: prof } = await supabase.from('profiles')
          .select('full_name,strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
          .eq('id', uid).single()

        if (prof?.full_name) {
          const parts = prof.full_name.trim().split(' ')
          if (parts[0] && !locationState?.firstName) setFirstName(parts[0])
        }
        if (prof?.strava_connected && prof?.strava_access_token) {
          setStravaProfile(prof)
          setStravaConnected(true)
        }
      } catch(e) {}
    }

    // Restore races from sessionStorage (in case user went through Strava OAuth)
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        const restored = JSON.parse(saved)
        if (restored.length > 0) setRaces(restored)
      } catch(e) {}
      sessionStorage.removeItem(SESSION_KEY)
    }

    init()
    return () => document.getElementById('rp-ri2-styles')?.remove()
  }, [user])

  // Save races to sessionStorage before Strava OAuth redirect
  const connectStrava = async () => {
    if (races.length > 0) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(races))
    }
    setStravaConnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) sessionStorage.setItem('strava_user_id', uid)
      sessionStorage.setItem('strava_return_to', '/race-import')
      const r = await fetch(`/api/strava?action=auth_url${uid?`&user_id=${uid}`:''}`)
      const d = await r.json()
      if (d.url) window.location.href = d.url
    } catch(e) { setStravaConnecting(false) }
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    setPacerResult(null)
    setPopupOpen(true)
    try {
      const resp = await fetch('/api/pacer', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'race_lookup', query:query.trim() })
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setPacerResult(data)
    } catch(e) {
      setSearchError("Pacer couldn't find that race — try being more specific.")
      setPacerResult({ name:query.trim(), date:'', date_sort:null, location:'', city:'', state:'', distance:'', confidence:1 })
    }
    setSearching(false)
  }

  const handleAddRace = (details) => {
    setRaces(p => [{
      id:`manual_${Date.now()}`,
      name:details.name, date:details.date||'', date_sort:details.date_sort||null,
      location:details.location||'', city:details.city||'', state:details.state||'',
      distance:details.distance||'Other', time:details.time||'',
      source:'MANUAL', confidence:details.confidence||2,
      strava_activity:details.strava_activity||null,
    }, ...p])
    setQuery('')
    setPacerResult(null)
    setSearchError('')
    setPopupOpen(false)
    setTimeout(()=>inputRef.current?.focus(), 100)
  }

  const handleUpdateRace = (id, updated) => {
    setRaces(p => p.map(r => r.id===id ? {...r,...updated} : r))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (userId && races.length > 0) {
        const toInsert = races.map(r => ({
          user_id:userId, name:r.name, date:r.date, date_sort:r.date_sort||null,
          location:r.location, city:r.city, state:r.state,
          distance:r.distance, time:r.time, source:r.source, confidence:r.confidence,
        }))
        await supabase.from('passport_races').upsert(toInsert, { onConflict:'user_id,name,date', ignoreDuplicates:true })
      }
    } catch(e) { console.error('Save error:', e) }
    setSaving(false)
    navigate('/build-passport', { state:{ imported:races.length, firstName } })
  }

  const closePopup = () => {
    setPacerResult(null)
    setSearchError('')
    setQuery('')
    setPopupOpen(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Barlow',sans-serif",position:'relative',overflow:'hidden'}}>
      <TickerBg/>

      <div style={{position:'relative',zIndex:1,maxWidth:'560px',margin:'0 auto',padding:'0 20px 160px'}}>

        {/* Header */}
        <div style={{textAlign:'center',padding:'44px 0 28px',animation:'fadeIn 0.4s ease both'}}>
          <button onClick={()=>navigate('/race-search-prompt',{state:{firstName}})}
            style={{display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'20px',padding:0}}
            onMouseEnter={e=>e.currentTarget.style.color='#1B2A4A'}
            onMouseLeave={e=>e.currentTarget.style.color='#9aa5b4'}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>

          <div style={{display:'inline-flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C'}}/>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'11px',letterSpacing:'3px',color:'#9aa5b4'}}>RACE PASSPORT</span>
          </div>
          <div style={{display:'flex',gap:'6px',justifyContent:'center',marginBottom:'12px'}}>
            <div style={{height:'3px',width:'36px',background:'#e2e6ed',borderRadius:'2px'}}/>
            <div style={{height:'3px',width:'36px',background:'#C9A84C',borderRadius:'2px'}}/>
            <div style={{height:'3px',width:'36px',background:'#e2e6ed',borderRadius:'2px'}}/>
          </div>
          <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',letterSpacing:'2.5px',color:'#9aa5b4',margin:'0 0 12px',textTransform:'uppercase'}}>Step 2 of 3 — Build Your Passport</p>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(42px,10vw,60px)',color:'#1B2A4A',margin:'0 0 10px',letterSpacing:'1.5px',lineHeight:1}}>
            ADD YOUR<br/>RACE HISTORY
          </h1>
          <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'16px',color:'#6b7a8d',margin:0,fontWeight:300,lineHeight:1.7}}>
            Type any race name — Pacer will confirm the details and stamp it to your Passport.
          </p>
        </div>

        {/* Strava connect button */}
        <div style={{marginBottom:'16px',animation:'fadeIn 0.4s ease 0.05s both'}}>
          {stravaConnected ? (
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',background:'rgba(252,76,2,0.05)',border:'1.5px solid rgba(252,76,2,0.2)',borderRadius:'12px'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,color:'#FC4C02',letterSpacing:'0.5px'}}>Strava Connected</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(252,76,2,0.6)',marginLeft:'auto'}}>Activities will match automatically</span>
            </div>
          ) : (
            <button
              onClick={connectStrava}
              disabled={stravaConnecting || popupOpen}
              style={{width:'100%',padding:'13px 16px',border:'1.5px solid rgba(252,76,2,0.35)',borderRadius:'12px',background:'rgba(252,76,2,0.04)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1.5px',color: popupOpen?'#9aa5b4':'#FC4C02',cursor:popupOpen||stravaConnecting?'not-allowed':'pointer',textTransform:'uppercase',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',transition:'all 0.15s',opacity:popupOpen?0.5:1}}
              title={popupOpen?'Close the race search first':''}
              onMouseEnter={e=>{if(!popupOpen&&!stravaConnecting){e.currentTarget.style.background='rgba(252,76,2,0.09)'}}}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(252,76,2,0.04)'}>
              {stravaConnecting ? (
                <div style={{width:14,height:14,border:'2px solid rgba(252,76,2,0.3)',borderTopColor:'#FC4C02',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              )}
              {stravaConnecting ? 'Connecting...' : popupOpen ? 'Close race search to connect Strava' : 'Sync Strava to Pull in Race Activities'}
            </button>
          )}
        </div>

        {/* Search bar */}
        <div style={{marginBottom:'16px',animation:'fadeIn 0.4s ease 0.1s both'}}>
          <div style={{display:'flex',gap:'10px'}}>
            <div style={{flex:1,position:'relative'}}>
              <div style={{position:'absolute',left:'15px',top:'50%',transform:'translateY(-50%)',fontSize:'20px',pointerEvents:'none',zIndex:1}}>⚡</div>
              <input ref={inputRef} value={query}
                onChange={e=>{ setQuery(e.target.value); if(pacerResult){setPacerResult(null);setSearchError('');setPopupOpen(false)} }}
                onKeyDown={e=>e.key==='Enter'&&handleSearch()}
                placeholder="e.g. Cherry Blossom 10 Miler 2023"
                autoCapitalize="words" autoCorrect="off"
                style={{width:'100%',padding:'17px 17px 17px 48px',borderRadius:'14px',border:'2px solid #e2e6ed',background:'#fafbfc',color:'#1B2A4A',fontSize:'17px',fontFamily:"'Barlow',sans-serif",outline:'none',boxSizing:'border-box',transition:'border-color 0.2s,box-shadow 0.2s'}}
                onFocus={e=>{e.target.style.borderColor='#1B2A4A';e.target.style.boxShadow='0 0 0 3px rgba(27,42,74,0.06)'}}
                onBlur={e=>{e.target.style.borderColor='#e2e6ed';e.target.style.boxShadow='none'}}/>
            </div>
            <button onClick={handleSearch} disabled={!query.trim()||searching}
              style={{padding:'0 24px',border:'none',borderRadius:'14px',background:query.trim()&&!searching?'#C9A84C':'#e2e6ed',color:query.trim()&&!searching?'#1B2A4A':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',cursor:query.trim()&&!searching?'pointer':'not-allowed',transition:'all 0.15s',flexShrink:0}}
              onMouseEnter={e=>{if(query.trim()&&!searching)e.currentTarget.style.background='#b8913a'}}
              onMouseLeave={e=>{if(query.trim()&&!searching)e.currentTarget.style.background='#C9A84C'}}>
              {searching?'...':'Look Up'}
            </button>
          </div>
          {!pacerResult&&!searching&&!searchError&&(
            <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#b0b8c4',marginTop:'8px',textAlign:'center',marginBottom:0}}>
              Include the year for best results · Press Enter or tap Look Up
            </p>
          )}
          {searchError&&!pacerResult&&(
            <div style={{marginTop:'10px',padding:'11px 15px',background:'rgba(197,48,48,0.05)',border:'1px solid rgba(197,48,48,0.15)',borderRadius:'10px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#c53030'}}>
              {searchError}
            </div>
          )}
        </div>

        {/* Pacer thinking */}
        {searching && <div style={{marginBottom:'16px'}}><PacerThinking/></div>}

        {/* Pacer result popup */}
        {pacerResult && !searching && (
          <div style={{marginBottom:'24px'}}>
            <RaceEditForm
              initial={pacerResult}
              isNew={true}
              saveLabel="Add to My Passport →"
              stravaConnected={stravaConnected}
              stravaProfile={stravaProfile}
              onSave={handleAddRace}
              onCancel={closePopup}
            />
          </div>
        )}

        {/* Added races */}
        {races.length > 0 && (
          <div style={{marginBottom:'24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#C9A84C'}}/>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'2px',color:'#9aa5b4',textTransform:'uppercase'}}>
                {races.length} Race{races.length!==1?'s':''} Added
              </span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {races.map((race,i)=>(
                <RaceRow key={race.id} race={race} index={i}
                  stravaConnected={stravaConnected}
                  stravaProfile={stravaProfile}
                  onRemove={id=>setRaces(p=>p.filter(r=>r.id!==id))}
                  onUpdate={handleUpdateRace}/>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {races.length===0&&!pacerResult&&!searching&&(
          <div style={{textAlign:'center',padding:'28px 20px',animation:'fadeIn 0.5s ease 0.2s both'}}>
            <div style={{display:'flex',justifyContent:'center',gap:'12px',marginBottom:'16px',opacity:0.2}}>
              {['5K','13.1','26.2'].map(d=><MiniStamp key={d} distance={d} size={50}/>)}
            </div>
            <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',color:'#b0b8c4',lineHeight:1.7,margin:0}}>
              Your races will appear here as you add them.<br/>Start by typing a race name above.
            </p>
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:10,padding:'16px 20px 36px',background:'linear-gradient(to top,#fff 65%,rgba(255,255,255,0))'}}>
        <div style={{maxWidth:'560px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'8px'}}>
          <button onClick={handleSave} disabled={saving}
            style={{width:'100%',padding:'17px',border:'none',borderRadius:'14px',background:races.length>0?'#1B2A4A':'#e2e6ed',color:races.length>0?'#fff':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'15px',fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',cursor:races.length>0&&!saving?'pointer':'default',transition:'background 0.2s'}}
            onMouseEnter={e=>{if(races.length>0&&!saving)e.currentTarget.style.background='#C9A84C'}}
            onMouseLeave={e=>{if(races.length>0)e.currentTarget.style.background='#1B2A4A'}}>
            {saving?'Saving...':`${races.length>0?`Save ${races.length} Race${races.length!==1?'s':''} to My Passport →`:'Add races above to continue'}`}
          </button>
          <p onClick={()=>navigate('/build-passport',{state:{firstName}})}
            style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#b0b8c4',cursor:'pointer',margin:0}}>
            Skip — I'll add races later
          </p>
        </div>
      </div>
    </div>
  )
}
