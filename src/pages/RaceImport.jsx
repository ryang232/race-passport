import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
const DISTANCES = ['5K','10K','10 mi','13.1','26.2','50K','70.3','140.6','Ultra','Other']

const SESSION_KEY = 'rp_race_import_races'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => String(CURRENT_YEAR - i))

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
    .ri-search-dist-btn{padding:7px 13px;border-radius:20px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.12s;border:1.5px solid #e2e6ed;background:#fafbfc;color:#9aa5b4;white-space:nowrap}
    .ri-search-dist-btn.sel{background:#C9A84C;color:#1B2A4A;border-color:#C9A84C}
    .ri-search-dist-btn:hover:not(.sel){border-color:#C9A84C;color:#1B2A4A;background:rgba(201,168,76,0.08)}
    .ri-row{animation:fadeIn 0.3s ease both;cursor:pointer;transition:background 0.15s}
    .ri-row:hover{background:#f8f9fb!important}
    div::-webkit-scrollbar{display:none}
  `
  document.head.appendChild(s)
}

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

function timeToSecs(t) {
  if (!t) return null
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + (p[1]||0)
}

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

function TickerBg() {
  return (
    <div style={{position:'fixed',top:'50%',transform:'translateY(-55%)',left:0,whiteSpace:'nowrap',pointerEvents:'none',zIndex:0}}>
      <div style={{display:'inline-flex',animation:'tickerScroll 60s linear infinite'}}>
        {TICKER.map((d,i)=><span key={i} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(160px,22vw,300px)',color:'transparent',WebkitTextStroke:'1px rgba(27,42,74,0.04)',lineHeight:1,padding:'0 40px',userSelect:'none',flexShrink:0}}>{d}</span>)}
      </div>
    </div>
  )
}

function PacerThinking({ label='Pacer is searching for this race...' }) {
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
const SEG_COLORS = { swim:'#0EA5E9', ride:'#F97316', virtualride:'#F97316', mountainbikeride:'#F97316', run:'#FC4C02', virtualrun:'#FC4C02' }
const SEG_LABELS = { swim:'Swim 🏊', ride:'Bike 🚴', virtualride:'Bike 🚴', mountainbikeride:'Bike 🚴', run:'Run 🏃', virtualrun:'Run 🏃' }

function StravaActivityCard({ activity, onConfirm, onReject, t='confirm' }) {
  const [activeSegment, setActiveSegment] = useState('all') // 'all' | segment index
  const mapRef = useRef(null)
  const rendered = useRef(false)
  const isTri = activity?.isTriathlon && activity?.segments?.length > 0

  const mapInstanceRef = useRef(null)
  const mapLayersRef  = useRef([])

  const redrawMap = (L, poly, map) => {
    // Clear existing layers
    mapLayersRef.current.forEach(l => { try { map.removeLayer(l) } catch(e){} })
    mapLayersRef.current = []
    const allBounds = []
    if (isTri) {
      const segsToShow = activeSegment === 'all'
        ? activity.segments
        : [activity.segments[activeSegment]].filter(Boolean)
      segsToShow.forEach(seg => {
        if (!seg?.map?.summary_polyline) return
        const type = (seg.type||seg.sport_type||'').toLowerCase()
        const color = SEG_COLORS[type] || '#FC4C02'
        const latlngs = poly.decode(seg.map.summary_polyline)
        if (!latlngs.length) return
        const line = L.polyline(latlngs, { color, weight: activeSegment==='all'?3:5, opacity:0.95 }).addTo(map)
        mapLayersRef.current.push(line)
        allBounds.push(...latlngs)
      })
    } else {
      const latlngs = poly.decode(activity.map.summary_polyline)
      if (latlngs.length) {
        const line = L.polyline(latlngs, { color:'#FC4C02', weight:3, opacity:0.9 }).addTo(map)
        mapLayersRef.current.push(line)
        allBounds.push(...latlngs)
      }
    }
    if (allBounds.length) map.fitBounds(L.latLngBounds(allBounds), { padding:[16,16], animate: true })
  }

  useEffect(() => {
    if (!mapRef.current) return
    const hasData = isTri
      ? activity.segments.some(s => s.map?.summary_polyline)
      : activity?.map?.summary_polyline
    if (!hasData) return

    const init = async () => {
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
        if (!mapInstanceRef.current) {
          const map = L.map(mapRef.current, { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, attributionControl:false })
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:18 }).addTo(map)
          mapInstanceRef.current = { map, L, poly }
        }
        redrawMap(mapInstanceRef.current.L, mapInstanceRef.current.poly, mapInstanceRef.current.map)
      } catch(e) {}
    }
    init()
  }, [activity, activeSegment])

  const triTotals = isTri ? {
    distance: activity.segments.reduce((s,a) => s + (a.distance||0), 0),
    moving_time: activity.segments.reduce((s,a) => s + (a.moving_time||0), 0),
    total_elevation_gain: activity.segments.reduce((s,a) => s + (a.total_elevation_gain||0), 0),
  } : null

  const displayActivity = isTri ? { ...triTotals, name: `${activity.segments.length} segments` } : activity
  const elev = displayActivity.total_elevation_gain ? `${Math.round(displayActivity.total_elevation_gain * 3.281)}ft` : '—'
  const date = isTri
    ? (activity.segments[0]?.start_date_local ? new Date(activity.segments[0].start_date_local).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '')
    : (activity.start_date_local ? new Date(activity.start_date_local).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '')

  return (
    <div style={{marginTop:'16px',borderRadius:'12px',overflow:'hidden',border:'1.5px solid rgba(252,76,2,0.25)',animation:'slideDown 0.3s ease both'}}>
      <div style={{background:'rgba(252,76,2,0.06)',padding:'10px 14px',display:'flex',alignItems:'center',gap:'8px',borderBottom:'1px solid rgba(252,76,2,0.15)'}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#FC4C02',textTransform:'uppercase'}}>
          {isTri ? `${activity.segments.length} Strava Segments Found` : 'Strava Activity Found'}
        </span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(252,76,2,0.6)',marginLeft:'auto'}}>{date}</span>
      </div>
      <div ref={mapRef} style={{height:'160px',background:'#f8f9fb'}}/>
      {isTri && (
        <div style={{display:'flex',gap:'0',borderTop:'1px solid rgba(252,76,2,0.1)'}}>
          {/* All segments tab */}
          <div onClick={()=>setActiveSegment('all')}
            style={{flex:1,padding:'8px 0',textAlign:'center',borderRight:'1px solid rgba(252,76,2,0.1)',cursor:'pointer',background:activeSegment==='all'?'rgba(252,76,2,0.08)':'transparent',transition:'background 0.15s'}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,color:'#FC4C02',letterSpacing:'0.5px'}}>All 🗺️</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',color:'#9aa5b4',marginTop:'1px'}}>Full route</div>
          </div>
          {activity.segments.map((seg,i) => {
            const type = (seg.type||seg.sport_type||'').toLowerCase()
            const color = SEG_COLORS[type] || '#FC4C02'
            const label = SEG_LABELS[type] || type
            const isActive = activeSegment === i
            return (
              <div key={seg.id||i} onClick={()=>setActiveSegment(isActive?'all':i)}
                style={{flex:1,padding:'8px 0',textAlign:'center',borderRight:i<activity.segments.length-1?'1px solid rgba(252,76,2,0.1)':'none',background:isActive?`${color}18`:`${color}06`,cursor:'pointer',transition:'background 0.15s',outline:isActive?`2px solid ${color}`:'none',outlineOffset:'-2px'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,color,letterSpacing:'0.5px'}}>{label}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',color:'#9aa5b4',marginTop:'1px'}}>{fmtDist(seg.distance)}</div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,borderTop:'1px solid rgba(252,76,2,0.1)'}}>
        {(() => {
          // Show segment-specific stats when a segment is selected
          if (isTri && activeSegment !== 'all' && activity.segments[activeSegment]) {
            const seg = activity.segments[activeSegment]
            const segType = (seg.type||seg.sport_type||'').toLowerCase()
            const segElev = seg.total_elevation_gain ? `${Math.round(seg.total_elevation_gain*3.281)}ft` : '—'
            return [
              { label:'Distance', value: fmtDist(seg.distance) },
              { label:'Time', value: fmtTime(seg.moving_time) },
              { label:'Pace', value: segType==='swim' ? '—' : fmtPace(seg.moving_time, seg.distance) },
              { label:'Elevation', value: segElev },
            ]
          }
          // Total race stats
          return [
            { label:'Total Distance', value: fmtDist(displayActivity.distance) },
            { label:'Total Time', value: fmtTime(displayActivity.moving_time) },
            { label:'Pace', value: isTri ? '—' : fmtPace(displayActivity.moving_time, displayActivity.distance) },
            { label:'Elevation', value: elev },
          ]
        })().map((s,i) => (
          <div key={s.label} style={{padding:'10px 0',textAlign:'center',borderRight:i<3?'1px solid rgba(252,76,2,0.1)':'none'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'16px',color:'#1B2A4A',letterSpacing:'0.5px',lineHeight:1}}>{s.value}</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginTop:'2px'}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{padding:'8px 14px',borderTop:'1px solid rgba(252,76,2,0.1)',background:'rgba(252,76,2,0.02)'}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#6b7a8d'}}>
          {isTri ? `Swim · Bike · Run — ${date}` : `"${activity.name}"`}
        </span>
      </div>
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

// ── Race edit form ────────────────────────────────────────────────────────────
function RaceEditForm({ initial, onSave, onCancel, saveLabel='Add to My Passport →', isNew=true, stravaProfile, stravaConnected, onLocationRetry }) {
  const [name, setName]               = useState(initial.name||'')
  const [date, setDate]               = useState(initial.date||'')
  const [location, setLocation]       = useState(initial.location||'')
  const [distance, setDistance]       = useState(initial.distance||'')
  const [officialTime, setOfficialTime] = useState(initial.official_time||'')
  const [stravaTime, setStravaTime]   = useState('')
  const nameRef = useRef(null)

  const [localLocationHint, setLocalLocationHint] = useState('')
  const resultFound   = initial.runner_result?.found === true
  const placeOverall  = initial.runner_result?.place_overall || ''
  const placeAG       = initial.runner_result?.place_age_group || ''
  const resultsUrl    = initial.runner_result?.results_url || ''

  // Strava search state
  const [stravaActivity, setStravaActivity]     = useState(initial.strava_activity||null)
  const [stravaCandidates, setStravaCandidates] = useState([])
  const [stravaState, setStravaState]           = useState(
    initial.strava_activity ? 'confirmed' : 'idle'
  )
  const [stravaSearching, setStravaSearching]   = useState(false)

  useEffect(() => { if (isNew && nameRef.current) nameRef.current.focus() }, [])

  // Auto-trigger Strava search silently when card opens
  useEffect(() => {
    if (!isNew || !stravaConnected || !stravaProfile) return
    const useDate = initial.date_sort || initial.date || ''
    if (!useDate) return
    searchStrava(useDate, initial.distance)
  }, [])

  const inp = (extra={}) => ({
    width:'100%', padding:'12px 14px', borderRadius:'10px', border:'1.5px solid #e2e6ed',
    background:'#fafbfc', color:'#1B2A4A', fontSize:'16px', fontFamily:"'Barlow',sans-serif",
    outline:'none', boxSizing:'border-box', transition:'border-color 0.15s', ...extra
  })

  const confidenceLabel = resultFound ? 'Result Found' : initial.confidence===3 ? 'Pacer Found It' : initial.confidence===2 ? 'Best Guess — Please Verify' : 'Add Your Details'
  const confidenceColor = resultFound ? '#16a34a' : initial.confidence===3 ? '#16a34a' : initial.confidence===2 ? '#C9A84C' : '#9aa5b4'
  const headerBg        = resultFound ? 'rgba(22,163,74,0.05)' : initial.confidence===3 ? 'rgba(22,163,74,0.05)' : 'rgba(201,168,76,0.06)'
  const headerBorder    = resultFound ? 'rgba(22,163,74,0.12)' : initial.confidence===3 ? 'rgba(22,163,74,0.12)' : 'rgba(201,168,76,0.12)'
  const cardBorder      = resultFound ? 'rgba(22,163,74,0.3)' : initial.confidence===3 ? 'rgba(22,163,74,0.3)' : 'rgba(201,168,76,0.35)'

  const searchStrava = async (dateOverride, distOverride) => {
    if (!stravaProfile) return
    const useDate = dateOverride || date
    if (!useDate) return
    setStravaSearching(true)
    setStravaState('searching')
    setStravaActivity(null)
    setStravaCandidates([])
    try {
      const token = stravaProfile.strava_access_token
      const raceDate = new Date(useDate)
      if (isNaN(raceDate)) { setStravaState('nomatch'); setStravaSearching(false); return }

      const afterTs  = Math.floor(raceDate.getTime()/1000) - 60*86400
      const beforeTs = Math.floor(raceDate.getTime()/1000) + 60*86400

      const resp = await fetch(`/api/strava?action=activities&access_token=${token}&per_page=100&after=${afterTs}&before=${beforeTs}`)
      const acts = await resp.json()
      if (!Array.isArray(acts) || acts.length === 0) { setStravaState('nomatch'); setStravaSearching(false); return }

      const runTypes = ['run','virtualrun','walk','ride','swim','elliptical']
      const pool = acts.filter(a => runTypes.includes((a.type||a.sport_type||'').toLowerCase()))

      const DIST_MILES = { '5K':3.1,'10K':6.2,'10 mi':10,'13.1':13.1,'26.2':26.2,'50K':31,'70.3':70.3,'140.6':140.6 }
      const useDist   = distOverride || distance
      const targetMi  = DIST_MILES[useDist] || null
      const normalize = (s) => (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()
      const raceName  = normalize(name)
      const raceWords = raceName.split(' ').filter(w => w.length > 2)

      const scored = pool.map(a => {
        let score = 0
        const actName = normalize(a.name)
        if (actName === raceName) { score += 50 } else {
          const matchedWords = raceWords.filter(w => actName.includes(w))
          score += (matchedWords.length / Math.max(raceWords.length, 1)) * 40
        }
        if (targetMi && a.distance) {
          const actMi = a.distance / 1609.34
          const pctOff = Math.abs(actMi - targetMi) / targetMi
          if (pctOff <= 0.05) score += 30
          else if (pctOff <= 0.10) score += 20
          else if (pctOff <= 0.20) score += 10
          else if (pctOff > 0.5) score -= 30
        }
        const actDate = new Date(a.start_date_local)
        const daysDiff = Math.abs((actDate - raceDate) / 86400000)
        if (daysDiff <= 1) score += 20
        else if (daysDiff <= 7) score += 10
        else if (daysDiff <= 14) score += 5
        return { activity: a, score }
      })

      // Triathlon detection
      const TRI_DISTANCES = ['70.3','140.6','tri','triathlon','olympic','sprint']
      const isTri = TRI_DISTANCES.some(d => (useDist||'').toLowerCase().includes(d))
        || (useDist === 'Other' && name.toLowerCase().includes('tri'))
      if (isTri) {
        const is140 = useDist === '140.6', is70 = useDist === '70.3'
        const minSwimM  = is140 ? 3000 : is70 ? 1500 : 400
        const minBikeMi = is140 ? 80 : is70 ? 40 : 8
        const minRunMi  = is140 ? 20 : is70 ? 8 : 1.5
        const SWIM = ['swim'], BIKE = ['ride','virtualride','ebikeride','mountainbikeride'], RUN = ['run','virtualrun']
        const sameDay = pool.filter(a => Math.abs((new Date(a.start_date_local) - raceDate) / 86400000) <= 1)
        const swimPool = sameDay.filter(a => SWIM.includes((a.type||a.sport_type||'').toLowerCase()) && (a.distance||0) > minSwimM).sort((a,b) => b.distance - a.distance)
        const bikePool = sameDay.filter(a => BIKE.includes((a.type||a.sport_type||'').toLowerCase()) && (a.distance||0)/1609.34 > minBikeMi).sort((a,b) => b.distance - a.distance)
        const runPool  = sameDay.filter(a => RUN.includes((a.type||a.sport_type||'').toLowerCase()) && (a.distance||0)/1609.34 > minRunMi).sort((a,b) => b.distance - a.distance)
        const segs = [swimPool[0], bikePool[0], runPool[0]].filter(Boolean)
        if (segs.length >= 2) {
          const detailed = await Promise.all(segs.map(async seg => {
            try {
              const r = await fetch(`/api/strava?action=activity&access_token=${token}&activity_id=${seg.id}`)
              const d = await r.json()
              return d.id ? d : seg
            } catch(e) { return seg }
          }))
          setStravaActivity({ isTriathlon: true, segments: detailed })
          setStravaState('found')
        } else {
          setStravaCandidates(sameDay.slice(0, 10))
          setStravaState(sameDay.length > 0 ? 'manual' : 'nomatch')
        }
        setStravaSearching(false)
        return
      }

      scored.sort((a, b) => b.score - a.score)
      const best = scored[0]
      const AUTO_MATCH_THRESHOLD = 25
      if (best && best.score >= AUTO_MATCH_THRESHOLD) {
        const detailResp = await fetch(`/api/strava?action=activity&access_token=${token}&activity_id=${best.activity.id}`)
        const detail = await detailResp.json()
        const act = detail.id ? detail : best.activity
        // Auto-confirm if very high confidence (score >= 45), otherwise show confirm card
        if (best.score >= 45) {
          confirmActivity(act)
        } else {
          setStravaActivity(act)
          setStravaState('found')
        }
      } else {
        const candidates = scored.slice(0, 10).map(s => s.activity)
        setStravaCandidates(candidates)
        setStravaState(candidates.length > 0 ? 'manual' : 'nomatch')
      }
    } catch(e) { setStravaState('nomatch') }
    setStravaSearching(false)
  }

  const confirmActivity = (act) => {
    setStravaActivity(act)
    setStravaState('confirmed')
    // Only pre-fill Strava time if no official time exists
    if (!officialTime) {
      if (act.isTriathlon && act.segments) {
        const totalSecs = act.segments.reduce((s, a) => s + (a.moving_time||0), 0)
        if (totalSecs) setStravaTime(fmtTime(totalSecs))
      } else if (act.moving_time) {
        setStravaTime(fmtTime(act.moving_time))
      }
    }
  }

  const handleSave = () => {
    if (!name.trim() || !distance) return
    // Official time takes precedence over Strava time
    const finalTime = officialTime.trim() || stravaTime.trim()
    onSave({
      name: name.trim(), date, date_sort: initial.date_sort||null,
      location, city: initial.city||'', state: initial.state||'',
      distance, time: finalTime, confidence: initial.confidence||2,
      official_time: officialTime.trim(),
      strava_activity: stravaState === 'confirmed' ? stravaActivity : null,
      runner_result: initial.runner_result||null,
    })
  }

  return (
    <div style={{background:'#fff',border:`2px solid ${cardBorder}`,borderRadius:'16px',overflow:'hidden',animation:'slideDown 0.3s ease both',boxShadow:'0 4px 24px rgba(27,42,74,0.08)'}}>
      {/* Header */}
      <div style={{background:headerBg,borderBottom:`1px solid ${headerBorder}`,padding:'11px 18px',display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{fontSize:'16px'}}>⚡</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'2px',color:confidenceColor,textTransform:'uppercase'}}>{confidenceLabel}</span>
        {onCancel && <button onClick={onCancel} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#9aa5b4',fontSize:'20px',lineHeight:1,padding:'0 2px'}}>×</button>}
      </div>

      <div style={{padding:'18px'}}>

        {/* Pacer vibe — confidence 3 with vibe content */}
        {initial.race_vibe && initial.confidence >= 3 && (
          <div style={{marginBottom:'16px',padding:'14px 16px',background:'rgba(27,42,74,0.03)',border:'1.5px solid rgba(27,42,74,0.08)',borderRadius:'12px',borderLeft:'4px solid #C9A84C'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'7px'}}>
              <span style={{fontSize:'13px'}}>⚡</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'2px',color:'#C9A84C',textTransform:'uppercase'}}>Pacer on this race</span>
            </div>
            <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'14px',color:'#3d4f6b',lineHeight:1.65,margin:0,fontWeight:300}}>{initial.race_vibe}</p>
          </div>
        )}

        {/* Local gem message — confidence < 3 or no vibe found */}
        {initial.confidence < 3 && (
          <div style={{marginBottom:'16px',padding:'14px 16px',background:'rgba(201,168,76,0.04)',border:'1.5px solid rgba(201,168,76,0.2)',borderRadius:'12px',borderLeft:'4px solid #C9A84C'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'7px'}}>
              <span style={{fontSize:'13px'}}>⚡</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'2px',color:'#C9A84C',textTransform:'uppercase'}}>Pacer on this race</span>
            </div>
            <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'14px',color:'#3d4f6b',lineHeight:1.65,margin:0,fontWeight:300}}>
              Pacer couldn't find this one online — which usually means it's a true local gem. Those races are often the most meaningful ones in a runner's story.
            </p>
            {/* Location hint — try again with location */}
            {onLocationRetry && (
              <div style={{marginTop:'12px',display:'flex',gap:'8px'}}>
                <input
                  value={localLocationHint}
                  onChange={e => setLocalLocationHint(e.target.value)}
                  placeholder="Add city/state (e.g. Columbia MD)"
                  onKeyDown={e => e.key==='Enter' && localLocationHint.trim() && onLocationRetry(localLocationHint.trim())}
                  style={{flex:1,padding:'9px 12px',borderRadius:'8px',border:'1.5px solid rgba(201,168,76,0.3)',background:'#fff',fontFamily:"'Barlow',sans-serif",fontSize:'13px',color:'#1B2A4A',outline:'none'}}
                  onFocus={e=>e.target.style.borderColor='#C9A84C'}
                  onBlur={e=>e.target.style.borderColor='rgba(201,168,76,0.3)'}
                />
                <button
                  onClick={() => localLocationHint.trim() && onLocationRetry(localLocationHint.trim())}
                  disabled={!localLocationHint.trim()}
                  style={{padding:'9px 14px',border:'none',borderRadius:'8px',background:localLocationHint.trim()?'#C9A84C':'#e2e6ed',color:localLocationHint.trim()?'#1B2A4A':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1px',cursor:localLocationHint.trim()?'pointer':'not-allowed',textTransform:'uppercase',whiteSpace:'nowrap'}}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result found badge */}
        {resultFound && (
          <div style={{marginBottom:'14px',padding:'10px 14px',background:'rgba(22,163,74,0.06)',border:'1.5px solid rgba(22,163,74,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#16a34a',flexShrink:0}}/>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1px',color:'#16a34a',textTransform:'uppercase'}}>Official result found</span>
            </div>
            <div style={{display:'flex',gap:'10px',marginLeft:'auto',flexWrap:'wrap'}}>
              {placeOverall && <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#6b7a8d'}}>{placeOverall} overall</span>}
              {placeAG && <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#6b7a8d'}}>{placeAG} AG</span>}
              {resultsUrl && (
                <a href={resultsUrl} target="_blank" rel="noopener noreferrer"
                  style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#C9A84C',textDecoration:'none',fontWeight:600}}>
                  View results ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Race name */}
        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
            Race Name <span style={{color:'#C9A84C'}}>*</span>
          </label>
          <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Cherry Blossom Ten Mile Run"
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
            <input value={date} onChange={e=>{
              setDate(e.target.value)
              // If Strava previously searched with wrong date, reset so user can re-search
              if (stravaState === 'nomatch' || stravaState === 'confirmed') {
                setStravaState('idle')
                setStravaActivity(null)
                setStravaTime('')
              }
            }} placeholder="e.g. Oct 2023"
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

        {/* Official time */}
        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
            {resultFound ? 'Official Finish Time' : 'Finish Time'}
            {' '}<span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
            {resultFound && <span style={{marginLeft:'8px',fontSize:'10px',color:'#16a34a',fontWeight:600}}>· from official results</span>}
            {!resultFound && stravaState==='confirmed' && <span style={{marginLeft:'8px',fontSize:'10px',color:'#FC4C02'}}>· Strava time shown below</span>}
          </label>
          <input value={officialTime} onChange={e=>setOfficialTime(e.target.value)} placeholder="e.g. 1:57:40 or 28:16"
            style={inp({fontSize:'18px',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:'0.5px',borderColor:resultFound?'rgba(22,163,74,0.4)':'#e2e6ed'})}
            onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=resultFound?'rgba(22,163,74,0.4)':'#e2e6ed'}/>
        </div>

        {/* Strava time (separate, only shown when confirmed and no official time) */}
        {stravaState==='confirmed' && !officialTime && stravaTime && (
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
              Strava Time <span style={{fontWeight:400,color:'#b0b8c4'}}>(not chip time — verify above)</span>
            </label>
            <input value={stravaTime} onChange={e=>setStravaTime(e.target.value)} placeholder=""
              style={inp({fontSize:'18px',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:'0.5px',borderColor:'rgba(252,76,2,0.3)'})}
              onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor='rgba(252,76,2,0.3)'}/>
          </div>
        )}

        {/* Strava section — silent auto-search, manual override available */}
        <div style={{marginBottom:'16px'}}>
          {stravaConnected ? (
            <>
              {/* Searching silently */}
              {stravaState==='searching' && (
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px',border:'1.5px solid rgba(252,76,2,0.2)',borderRadius:'10px',background:'rgba(252,76,2,0.03)'}}>
                  <div style={{width:12,height:12,border:'2px solid rgba(252,76,2,0.3)',borderTopColor:'#FC4C02',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1px',color:'#FC4C02',textTransform:'uppercase'}}>Searching your Strava...</span>
                </div>
              )}
              {/* No match — show search again */}
              {stravaState==='nomatch' && (
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px',border:'1.5px solid #e2e6ed',borderRadius:'10px',background:'#fafbfc'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#9aa5b4"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#9aa5b4',flex:1}}>No Strava activity found</span>
                  <button onClick={()=>searchStrava()} style={{padding:'5px 12px',border:'1.5px solid rgba(252,76,2,0.3)',borderRadius:'6px',background:'transparent',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,color:'#FC4C02',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.5px',whiteSpace:'nowrap'}}>
                    Search Again
                  </button>
                </div>
              )}
              {/* Idle (no date) */}
              {stravaState==='idle' && (
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px',border:'1.5px solid rgba(252,76,2,0.2)',borderRadius:'10px',background:'rgba(252,76,2,0.03)'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,color:'#FC4C02',letterSpacing:'0.5px'}}>Strava Connected</span>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(252,76,2,0.6)',marginLeft:'auto'}}>Add a date to match activity</span>
                </div>
              )}
              {/* Found — confirm or reject */}
              {stravaState==='found' && stravaActivity && (
                <StravaActivityCard activity={stravaActivity} onConfirm={()=>confirmActivity(stravaActivity)} onReject={()=>{setStravaState('manual');setStravaActivity(null)}} />
              )}
              {/* Manual picker */}
              {stravaState==='manual' && (
                <StravaManualPicker candidates={stravaCandidates} onSelect={async (a)=>{
                  try {
                    const token = stravaProfile.strava_access_token
                    const r = await fetch(`/api/strava?action=activity&access_token=${token}&activity_id=${a.id}`)
                    const detail = await r.json()
                    setStravaActivity(detail.id ? detail : a)
                    setStravaState('found')
                  } catch(e) { setStravaActivity(a); setStravaState('found') }
                }} onSkip={()=>setStravaState('nomatch')} />
              )}
              {/* Confirmed — show map + wrong/remove options */}
              {stravaState==='confirmed' && stravaActivity && (
                <>
                  <StravaActivityCard activity={stravaActivity} t="confirmed" />
                  <div style={{marginTop:'8px',display:'flex',gap:'8px'}}>
                    <button onClick={()=>{setStravaState('manual');setStravaActivity(null);setStravaTime('')}}
                      style={{flex:1,padding:'8px',border:'1px solid #e2e6ed',borderRadius:'8px',background:'transparent',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#9aa5b4',cursor:'pointer',textTransform:'uppercase',letterSpacing:'1px'}}>
                      Wrong Activity
                    </button>
                    <button onClick={()=>{setStravaState('idle');setStravaActivity(null);setStravaTime('')}}
                      style={{flex:1,padding:'8px',border:'1px solid #e2e6ed',borderRadius:'8px',background:'transparent',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#c53030',cursor:'pointer',textTransform:'uppercase',letterSpacing:'1px'}}>
                      Remove
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{padding:'11px 16px',border:'1.5px solid #e2e6ed',borderRadius:'10px',background:'#fafbfc',display:'flex',alignItems:'center',gap:'10px',opacity:0.5}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#9aa5b4"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#9aa5b4',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase'}}>Connect Strava on the previous screen</span>
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
  const c = getDistanceColor(race.distance)
  const hasStrava = !!race.strava_activity
  const hasOfficial = !!race.official_time

  if (editing) return (
    <div style={{animation:'slideDown 0.25s ease both',animationDelay:`${index*0.05}s`}}>
      <RaceEditForm initial={race} isNew={false} saveLabel="Save Changes →"
        stravaConnected={stravaConnected} stravaProfile={stravaProfile}
        onSave={updated=>{ onUpdate(race.id, {...race,...updated}); setEditing(false) }}
        onCancel={()=>setEditing(false)} />
    </div>
  )

  const displayTime = race.official_time || race.time

  return (
    <div className="ri-row" onClick={()=>setEditing(true)}
      style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:'#fff',borderRadius:'14px',border:`1.5px solid ${c.stampBorder}25`,borderLeft:`4px solid ${c.stampBorder}`,animationDelay:`${index*0.05}s`,position:'relative'}}>
      <MiniStamp distance={race.distance} size={46}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'19px',color:'#1B2A4A',letterSpacing:'0.5px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.1}}>{race.name}</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#9aa5b4',marginTop:'2px',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
          {[race.location,race.date].filter(Boolean).join(' · ')}
          {displayTime&&<span style={{color:c.stampBorder,fontWeight:600}}>{displayTime}</span>}
          {hasOfficial&&<span style={{fontSize:'10px',color:'#16a34a',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Official</span>}
          {hasStrava&&<span style={{display:'flex',alignItems:'center',gap:'3px',color:'#FC4C02'}}><svg width="8" height="8" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>Strava</span>}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#b0b8c4',letterSpacing:'1px'}}>TAP TO EDIT</span>
        <button onClick={e=>{e.stopPropagation();onRemove(race.id)}}
          style={{background:'none',border:'none',cursor:'pointer',padding:'6px',borderRadius:'6px',color:'#c53030',fontSize:'18px',lineHeight:1}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(197,48,48,0.08)'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>×</button>
      </div>
    </div>
  )
}

// ── Strava Import Tab ────────────────────────────────────────────────────────
function StravaImportTab({ stravaActivities, stravaActLoading, stravaActFilter, setStravaActFilter, userProfile, stravaProfile, onAddRace }) {
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [raceName, setRaceName]                 = useState('')
  const [raceDist, setRaceDist]                 = useState('')
  const [searching, setSearching]               = useState(false)
  const [pacerResult, setPacerResult]           = useState(null)

  // Fuzzy match — check if all words in query appear somewhere in text
  const fuzzyMatch = (text, query) => {
    if (!query.trim()) return true
    const words = query.toLowerCase().trim().split(/\s+/)
    const haystack = text.toLowerCase()
    return words.every(w => haystack.includes(w))
  }

  const filtered = (stravaActivities || []).filter(a => {
    if (!stravaActFilter.trim()) return true
    const name = a.name || ''
    const distMi = ((a.distance||0)/1609.34).toFixed(1)
    const date = a.start_date_local ? new Date(a.start_date_local).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''
    const combined = [name, distMi + ' mi', date].join(' ')
    return fuzzyMatch(combined, stravaActFilter)
  })

  const selectActivity = (a) => {
    setSelectedActivity(a)
    setPacerResult(null)
    // Pre-fill race name from activity name
    setRaceName(a.name || '')
    // Guess distance from activity distance
    const distMi = (a.distance||0)/1609.34
    const type = (a.type||a.sport_type||'').toLowerCase()
    let guessedDist = ''
    if (type.includes('swim')) guessedDist = ''
    else if (Math.abs(distMi-3.1)<0.3) guessedDist='5K'
    else if (Math.abs(distMi-6.2)<0.4) guessedDist='10K'
    else if (Math.abs(distMi-10)<0.5) guessedDist='10 mi'
    else if (Math.abs(distMi-13.1)<0.6) guessedDist='13.1'
    else if (Math.abs(distMi-26.2)<1) guessedDist='26.2'
    else if (Math.abs(distMi-70.3)<2) guessedDist='70.3'
    else if (Math.abs(distMi-140.6)<3) guessedDist='140.6'
    setRaceDist(guessedDist)
  }

  const handleFindRace = async () => {
    if (!raceName.trim()) return
    setSearching(true)
    setPacerResult(null)
    try {
      const yearStr = selectedActivity?.start_date_local ? String(new Date(selectedActivity.start_date_local).getFullYear()) : ''
      const body = {
        action: 'race_lookup',
        query: raceName.trim(),
        year: yearStr,
        distance: raceDist || '',
        location_hint: '',
      }
      if (userProfile) {
        body.first_name = userProfile.first_name || userProfile.full_name?.trim().split(' ')[0] || ''
        body.last_name  = userProfile.last_name  || userProfile.full_name?.trim().split(' ').slice(1).join(' ') || ''
        body.dob        = userProfile.dob || userProfile.date_of_birth || ''
      }
      const resp = await fetch('/api/pacer', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const data = await resp.json()
      if (!data.error) {
        data.strava_activity = selectedActivity
        setPacerResult(data)
      }
    } catch(e) {
      const yearStr = selectedActivity?.start_date_local ? String(new Date(selectedActivity.start_date_local).getFullYear()) : ''
      setPacerResult({
        name: raceName.trim(),
        date: yearStr ? `Jan ${yearStr}` : '',
        date_sort: yearStr ? `${yearStr}-01-01` : null,
        location:'', city:'', state:'', distance: raceDist||'Other',
        confidence:1, race_vibe:'', strava_activity: selectedActivity,
      })
    }
    setSearching(false)
  }

  const handleAddFromStrava = () => {
    if (!pacerResult) return
    const yearStr = selectedActivity?.start_date_local ? String(new Date(selectedActivity.start_date_local).getFullYear()) : ''
    onAddRace({
      name: pacerResult.name || raceName,
      date: pacerResult.date || (yearStr ? `Jan ${yearStr}` : ''),
      date_sort: pacerResult.date_sort || (yearStr ? `${yearStr}-01-01` : null),
      location: pacerResult.location || '',
      city: pacerResult.city || '',
      state: pacerResult.state || '',
      distance: raceDist || pacerResult.distance || 'Other',
      time: fmtTime(selectedActivity?.moving_time) || '',
      confidence: pacerResult.confidence || 2,
      official_time: '',
      strava_activity: selectedActivity,
      runner_result: null,
    })
    setSelectedActivity(null)
    setPacerResult(null)
    setRaceName('')
    setRaceDist('')
  }

  const typeColor = (a) => {
    const t = (a.type||a.sport_type||'').toLowerCase()
    return t==='swim'?'#0EA5E9':t.includes('ride')?'#F97316':'#FC4C02'
  }
  const typeEmoji = (a) => {
    const t = (a.type||a.sport_type||'').toLowerCase()
    return t==='swim'?'🏊':t.includes('ride')?'🚴':'🏃'
  }

  return (
    <div style={{animation:'fadeIn 0.25s ease both'}}>

      {/* Search input */}
      <div style={{position:'relative',marginBottom:'12px'}}>
        <div style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',fontSize:'16px',pointerEvents:'none'}}>🔍</div>
        <input value={stravaActFilter} onChange={e=>setStravaActFilter(e.target.value)}
          placeholder="Search your Strava — name, race, distance..."
          style={{width:'100%',padding:'14px 14px 14px 42px',borderRadius:'14px',border:'2px solid #e2e6ed',background:'#fafbfc',color:'#1B2A4A',fontSize:'15px',fontFamily:"'Barlow',sans-serif",outline:'none',boxSizing:'border-box',transition:'border-color 0.2s'}}
          onFocus={e=>{e.target.style.borderColor='#FC4C02'}}
          onBlur={e=>{e.target.style.borderColor='#e2e6ed'}}/>
      </div>

      {stravaActLoading && (
        <div style={{textAlign:'center',padding:'32px 0'}}>
          <div style={{width:24,height:24,border:'3px solid rgba(252,76,2,0.2)',borderTopColor:'#FC4C02',borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 10px'}}/>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#9aa5b4',letterSpacing:'1px',textTransform:'uppercase'}}>Loading your activities...</span>
        </div>
      )}

      {!stravaActLoading && stravaActivities !== null && !selectedActivity && (
        filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'32px 20px',color:'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px'}}>
            No matching activities found
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'8px',maxHeight:'440px',overflowY:'auto'}}>
            {filtered.slice(0,60).map(a => {
              const distMi = ((a.distance||0)/1609.34).toFixed(1)
              const time   = fmtTime(a.moving_time)
              const date   = a.start_date_local ? new Date(a.start_date_local).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''
              const tc     = typeColor(a)
              const te     = typeEmoji(a)
              return (
                <div key={a.id} onClick={()=>selectActivity(a)}
                  style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',border:'1.5px solid #e2e6ed',borderRadius:'12px',cursor:'pointer',transition:'all 0.15s',background:'#fafbfc'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=tc;e.currentTarget.style.background=`${tc}08`}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e6ed';e.currentTarget.style.background='#fafbfc'}}>
                  <div style={{width:36,height:36,borderRadius:'10px',background:`${tc}12`,border:`1.5px solid ${tc}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'16px'}}>
                    {te}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:600,color:'#1B2A4A',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.name}</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#9aa5b4',marginTop:'1px'}}>{date} · {distMi} mi · {time}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#9aa5b4" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Selected activity — inline race form */}
      {selectedActivity && (
        <div style={{animation:'slideDown 0.25s ease both'}}>
          {/* Selected activity header */}
          <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',background:'rgba(252,76,2,0.04)',border:'1.5px solid rgba(252,76,2,0.2)',borderRadius:'12px',marginBottom:'14px'}}>
            <span style={{fontSize:'20px'}}>{typeEmoji(selectedActivity)}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,color:'#FC4C02',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{selectedActivity.name}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(252,76,2,0.6)'}}>
                {selectedActivity.start_date_local ? new Date(selectedActivity.start_date_local).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''}
                {' · '}{((selectedActivity.distance||0)/1609.34).toFixed(1)} mi
                {' · '}{fmtTime(selectedActivity.moving_time)}
              </div>
            </div>
            <button onClick={()=>{setSelectedActivity(null);setPacerResult(null);setRaceName('');setRaceDist('')}}
              style={{background:'none',border:'none',cursor:'pointer',color:'#9aa5b4',fontSize:'18px',padding:'0 2px'}}>×</button>
          </div>

          {/* Race name — editable */}
          <div style={{marginBottom:'12px'}}>
            <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
              What race was this? <span style={{color:'#C9A84C'}}>*</span>
            </label>
            <input value={raceName} onChange={e=>{setRaceName(e.target.value);setPacerResult(null)}}
              placeholder="e.g. Marine Corps Marathon, Baltimore Running Festival..."
              style={{width:'100%',padding:'12px 14px',borderRadius:'10px',border:'1.5px solid #e2e6ed',background:'#fafbfc',color:'#1B2A4A',fontSize:'16px',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,outline:'none',boxSizing:'border-box',transition:'border-color 0.15s'}}
              onFocus={e=>e.target.style.borderColor='#C9A84C'}
              onBlur={e=>e.target.style.borderColor='#e2e6ed'}
              onKeyDown={e=>e.key==='Enter'&&handleFindRace()}/>
          </div>

          {/* Distance */}
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'8px'}}>Distance</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
              {DISTANCES.map(d=>(
                <button key={d} className={`ri-dist-btn${raceDist===d?' sel':''}`} onClick={()=>setRaceDist(prev=>prev===d?'':d)}>{d}</button>
              ))}
            </div>
          </div>

          {/* Pacer vibe result */}
          {pacerResult && pacerResult.race_vibe && pacerResult.confidence >= 3 && (
            <div style={{marginBottom:'14px',padding:'14px 16px',background:'rgba(27,42,74,0.03)',border:'1.5px solid rgba(27,42,74,0.08)',borderRadius:'12px',borderLeft:'4px solid #C9A84C'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'7px'}}>
                <span style={{fontSize:'13px'}}>⚡</span>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'2px',color:'#C9A84C',textTransform:'uppercase'}}>Pacer on this race</span>
              </div>
              <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'14px',color:'#3d4f6b',lineHeight:1.65,margin:0,fontWeight:300}}>{pacerResult.race_vibe}</p>
            </div>
          )}

          {searching && <div style={{marginBottom:'12px'}}><PacerThinking label="Pacer is researching this race..."/></div>}

          {/* Action buttons */}
          <div style={{display:'flex',gap:'8px'}}>
            {!pacerResult ? (
              <button onClick={handleFindRace} disabled={!raceName.trim()||searching}
                style={{flex:1,padding:'13px',border:'none',borderRadius:'12px',background:raceName.trim()&&!searching?'#C9A84C':'#e2e6ed',color:raceName.trim()&&!searching?'#1B2A4A':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',cursor:raceName.trim()&&!searching?'pointer':'not-allowed',transition:'background 0.2s'}}
                onMouseEnter={e=>{if(raceName.trim()&&!searching)e.currentTarget.style.background='#b8913a'}}
                onMouseLeave={e=>{if(raceName.trim()&&!searching)e.currentTarget.style.background='#C9A84C'}}>
                {searching ? '...' : '⚡ Find This Race'}
              </button>
            ) : (
              <>
                <button onClick={()=>{setPacerResult(null)}}
                  style={{flex:1,padding:'13px',border:'1.5px solid #e2e6ed',borderRadius:'12px',background:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,color:'#9aa5b4',cursor:'pointer',textTransform:'uppercase'}}>
                  Search Again
                </button>
                <button onClick={handleAddFromStrava} disabled={!raceDist}
                  style={{flex:2,padding:'13px',border:'none',borderRadius:'12px',background:raceDist?'#1B2A4A':'#e2e6ed',color:raceDist?'#fff':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',cursor:raceDist?'pointer':'not-allowed',transition:'background 0.2s'}}
                  onMouseEnter={e=>{if(raceDist)e.currentTarget.style.background='#C9A84C'}}
                  onMouseLeave={e=>{if(raceDist)e.currentTarget.style.background='#1B2A4A'}}>
                  Add to My Passport →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RaceImport() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()

  const [firstName, setFirstName]   = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [query, setQuery]           = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedDist, setSelectedDist] = useState('')
  const [searching, setSearching]   = useState(false)
  const [pacerResult, setPacerResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [races, setRaces]           = useState([])
  const [popupOpen, setPopupOpen]   = useState(false)
  const [locationHint, setLocationHint] = useState('')
  const [importTab, setImportTab]     = useState('pacer') // 'pacer' | 'strava'
  const [stravaActivities, setStravaActivities] = useState(null) // null = not loaded
  const [stravaActFilter, setStravaActFilter]   = useState('')
  const [stravaActLoading, setStravaActLoading] = useState(false)
  const [poolConsent]               = useState(locationState?.poolConsent !== false)

  // Strava state
  const [stravaProfile, setStravaProfile]     = useState(null)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaConnecting, setStravaConnecting] = useState(false)
  const [stravaGateChoice, setStravaGateChoice] = useState(null) // null | 'connect' | 'skip'

  const inputRef = useRef(null)

  useEffect(() => {
    injectStyles()

    const init = async () => {
      if (locationState?.firstName) setFirstName(locationState.firstName)
      if (!user) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (!uid) return

        const { data: prof } = await supabase.from('profiles')
          .select('full_name,first_name,last_name,dob,date_of_birth,gender,strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
          .eq('id', uid).single()

        if (prof) {
          setUserProfile(prof)
          const fn = prof.first_name || prof.full_name?.trim().split(' ')[0] || ''
          if (fn && !locationState?.firstName) setFirstName(fn)
          if (prof.strava_connected && prof.strava_access_token) {
            setStravaProfile(prof)
            setStravaConnected(true)
          }
        }
      } catch(e) {}
    }

    // Restore races from sessionStorage (Strava OAuth redirect)
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        const restored = JSON.parse(saved)
        if (restored.length > 0) setRaces(restored)
      } catch(e) {}
      sessionStorage.removeItem(SESSION_KEY)
    }
    // Restore persisted races from back navigation
    if (!saved) {
      const persisted = sessionStorage.getItem(SESSION_KEY + '_persist')
      if (persisted) {
        try {
          const restored = JSON.parse(persisted)
          if (restored.length > 0) setRaces(restored)
        } catch(e) {}
      }
    }

    init()
    return () => document.getElementById('rp-ri2-styles')?.remove()
  }, [user])

  const connectStrava = async () => {
    if (races.length > 0) sessionStorage.setItem(SESSION_KEY, JSON.stringify(races))
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

  const loadStravaActivities = async () => {
    if (!stravaProfile || stravaActivities !== null) return
    setStravaActLoading(true)
    try {
      const token = stravaProfile.strava_access_token
      // Fetch last 200 activities — wide net, we filter client-side
      const after = Math.floor((Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) / 1000) // 5 years back
      const resp = await fetch(`/api/strava?action=activities&access_token=${token}&per_page=200&after=${after}`)
      const acts = await resp.json()
      if (!Array.isArray(acts)) { setStravaActivities([]); setStravaActLoading(false); return }

      // Race signal filters
      const RACE_KEYWORDS = ['marathon','half','5k','10k','10 mi','10m','tri','ironman','iron man','70.3','140.6','ultra','trot','festival','race','run','sprint','olympic','century']
      const MIN_DIST = { run:3.0, virtualrun:3.0, walk:3.0, ride:10.0, swim:0.3, default:3.0 } // miles

      const filtered = acts.filter(a => {
        const type = (a.type||a.sport_type||'').toLowerCase()
        const distMi = (a.distance||0) / 1609.34
        const minMi = MIN_DIST[type] || MIN_DIST.default
        if (distMi < minMi) return false
        // Accept if name has race keyword OR if it's a long enough run/ride
        const name = (a.name||'').toLowerCase()
        const hasKeyword = RACE_KEYWORDS.some(k => name.includes(k))
        const isLongEnough = (type === 'run' || type === 'virtualrun') && distMi >= 3.0
          || type === 'ride' && distMi >= 10.0
          || type === 'swim' && distMi >= 0.3
        return hasKeyword || isLongEnough
      })

      // Sort newest first
      filtered.sort((a,b) => new Date(b.start_date_local) - new Date(a.start_date_local))
      setStravaActivities(filtered)
    } catch(e) { setStravaActivities([]) }
    setStravaActLoading(false)
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    if (!selectedDist) {
      // Gently nudge user to pick a distance
      inputRef.current?.focus()
      return
    }
    setSearching(true)
    setSearchError('')
    setPacerResult(null)
    setPopupOpen(true)

    try {
      const body = {
        action: 'race_lookup',
        query: query.trim(),
        year: selectedYear || '',
        distance: selectedDist,
        location_hint: locationHint.trim(),
      }
      // Pass runner identity for result lookup
      if (userProfile) {
        body.first_name = userProfile.first_name || userProfile.full_name?.trim().split(' ')[0] || ''
        body.last_name  = userProfile.last_name  || userProfile.full_name?.trim().split(' ').slice(1).join(' ') || ''
        body.dob        = userProfile.dob || userProfile.date_of_birth || ''
      }

      const resp = await fetch('/api/pacer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setPacerResult(data)
    } catch(e) {
      setSearchError("Pacer couldn't find that race — try being more specific.")
      setPacerResult({
        name: query.trim(), date: selectedYear ? `Jan ${selectedYear}` : '',
        date_sort: selectedYear ? `${selectedYear}-01-01` : null,
        location: '', city: '', state: '', distance: selectedDist || '', confidence: 1,
        race_vibe: '', runner_result: { found: false },
      })
    }
    setSearching(false)
  }

  const handleAddRace = async (details) => {
    const newRace = {
      id: `manual_${Date.now()}`,
      name: details.name, date: details.date||'', date_sort: details.date_sort||null,
      location: details.location||'', city: details.city||'', state: details.state||'',
      distance: details.distance||'Other',
      time: details.official_time || details.time || '',
      official_time: details.official_time || '',
      source: 'MANUAL', confidence: details.confidence||2,
      strava_activity: details.strava_activity||null,
      runner_result: details.runner_result||null,
    }
    setRaces(p => [newRace, ...p])
    setQuery('')
    setSelectedDist('')
    setPacerResult(null)
    setSearchError('')
    setPopupOpen(false)
    setTimeout(() => inputRef.current?.focus(), 100)
    // Persist to sessionStorage so navigating back restores races
    setTimeout(() => {
      setRaces(p => { sessionStorage.setItem(SESSION_KEY + '_persist', JSON.stringify(p)); return p })
    }, 50)

    // Contribute to pool (non-blocking) if consent given and official time exists
    if (poolConsent && details.official_time && details.date_sort && userProfile) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (uid) {
          const raceDateObj = new Date(details.date_sort)
          const dobObj = userProfile.dob || userProfile.date_of_birth ? new Date(userProfile.dob || userProfile.date_of_birth) : null
          let ageAtRace = null
          if (dobObj && !isNaN(dobObj) && !isNaN(raceDateObj)) {
            ageAtRace = raceDateObj.getFullYear() - dobObj.getFullYear()
            const m = raceDateObj.getMonth() - dobObj.getMonth()
            if (m < 0 || (m === 0 && raceDateObj.getDate() < dobObj.getDate())) ageAtRace--
          }
          const timeSecs = timeToSecs(details.official_time)
          if (timeSecs) {
            const raceYear = raceDateObj.getFullYear()
            const normalizedName = details.name.toLowerCase().trim()
            await supabase.from('race_results_pool').insert({
              user_id: uid,
              race_name: normalizedName,
              race_year: raceYear,
              distance: details.distance,
              official_time_secs: timeSecs,
              age_at_race: ageAtRace,
              gender: userProfile.gender || null,
            })
          }
        }
      } catch(e) { /* non-blocking — silently ignore */ }
    }
  }

  const handleUpdateRace = (id, updated) => {
    setRaces(p => p.map(r => r.id===id ? {...r,...updated} : r))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (userId && races.length > 0) {
        const toInsert = races.map(r => ({
          user_id: userId, name: r.name, date: r.date, date_sort: r.date_sort||null,
          location: r.location, city: r.city, state: r.state,
          distance: r.distance, time: r.official_time || r.time,
          source: r.source, confidence: r.confidence,
        }))
        const { data: inserted } = await supabase
          .from('passport_races')
          .upsert(toInsert, { onConflict:'user_id,name,date', ignoreDuplicates:true })
          .select()

        if (inserted && inserted.length > 0) {
          const allRaces = inserted
          const scoreInBackground = async () => {
            for (const race of inserted) {
              if (!race.time) continue
              try {
                const resp = await fetch('/api/pacer', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'race_score', is_partial: true,
                    race: { id: race.id, name: race.name, distance: race.distance, time: race.time, is_pr: race.is_pr || false },
                    all_races: allRaces,
                  }),
                })
                const data = await resp.json()
                if (data.score) {
                  await supabase.from('passport_races').update({
                    pacer_score: data.score, pacer_grade: data.grade, pacer_score_partial: true,
                  }).eq('id', race.id)
                }
              } catch(e) {}
            }
          }
          scoreInBackground()
        }
      }
    } catch(e) { console.error('Save error:', e) }
    setSaving(false)
    navigate('/goal-races', { state: { imported: races.length, firstName } })
  }

  const closePopup = () => {
    setPacerResult(null)
    setSearchError('')
    setQuery('')
    setSelectedDist('')
    setLocationHint('')
    setPopupOpen(false)
  }

  const distMissing = !selectedDist && query.trim().length > 0

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
            Type a race name, pick your distance and year — Pacer searches the web to confirm it and matches your Strava activity automatically.
          </p>
        </div>

        {/* Strava gate — connect first or skip */}
        <div style={{marginBottom:'16px',animation:'fadeIn 0.4s ease 0.05s both'}}>
          {stravaConnected ? (
            /* Already connected */
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',background:'rgba(252,76,2,0.05)',border:'1.5px solid rgba(252,76,2,0.2)',borderRadius:'12px'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,color:'#FC4C02',letterSpacing:'0.5px'}}>Strava Connected</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(252,76,2,0.6)',marginLeft:'auto'}}>Activities will match automatically</span>
            </div>
          ) : stravaGateChoice === null ? (
            /* Gate — choose connect or skip */
            <div style={{border:'1.5px solid rgba(252,76,2,0.25)',borderRadius:'14px',overflow:'hidden',background:'rgba(252,76,2,0.02)'}}>
              <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(252,76,2,0.12)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,color:'#FC4C02',letterSpacing:'0.5px'}}>Connect Strava First</span>
                </div>
                <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#6b7a8d',margin:0,lineHeight:1.5}}>
                  Pacer will automatically match your race to a Strava activity — pulling in your route map, splits, and elevation. No manual entry needed.
                </p>
              </div>
              <div style={{display:'flex',gap:'0'}}>
                <button onClick={connectStrava} disabled={stravaConnecting}
                  style={{flex:2,padding:'13px',border:'none',background:'#FC4C02',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1px',color:'#fff',cursor:'pointer',textTransform:'uppercase',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',transition:'opacity 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
                  onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                  {stravaConnecting
                    ? <div style={{width:12,height:12,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  }
                  {stravaConnecting ? 'Connecting...' : 'Connect Strava'}
                </button>
                <button onClick={()=>setStravaGateChoice('skip')}
                  style={{flex:1,padding:'13px',border:'none',borderLeft:'1px solid rgba(252,76,2,0.2)',background:'transparent',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1px',color:'#9aa5b4',cursor:'pointer',textTransform:'uppercase',transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.03)';e.currentTarget.style.color='#1B2A4A'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#9aa5b4'}}>
                  I Don't Have Strava
                </button>
              </div>
            </div>
          ) : (
            /* Skipped — show subtle reminder */
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:'#f8f9fb',border:'1.5px solid #e2e6ed',borderRadius:'12px'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#9aa5b4"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#9aa5b4',flex:1}}>Strava not connected — you can always add it later from your profile</span>
              <button onClick={()=>setStravaGateChoice(null)}
                style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#FC4C02',background:'none',border:'none',cursor:'pointer',fontWeight:600,letterSpacing:'0.5px',whiteSpace:'nowrap'}}>
                Connect →
              </button>
            </div>
          )}
        </div>

        {/* Import tabs — gated behind Strava choice */}
        {(stravaConnected || stravaGateChoice !== null) && (<>

        {/* Tab toggle */}
        <div style={{display:'flex',gap:'6px',marginBottom:'14px',padding:'4px',background:'#f4f5f7',borderRadius:'12px',animation:'fadeIn 0.3s ease both'}}>
          <button onClick={()=>setImportTab('pacer')}
            style={{flex:1,padding:'10px',border:'none',borderRadius:'9px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',cursor:'pointer',transition:'all 0.15s',
              background:importTab==='pacer'?'#fff':'transparent',
              color:importTab==='pacer'?'#1B2A4A':'#9aa5b4',
              boxShadow:importTab==='pacer'?'0 1px 6px rgba(27,42,74,0.1)':'none'}}>
            ⚡ Pacer Search
          </button>
          <button onClick={()=>{ setImportTab('strava'); if(stravaConnected) loadStravaActivities() }}
            disabled={!stravaConnected}
            style={{flex:1,padding:'10px',border:'none',borderRadius:'9px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',cursor:stravaConnected?'pointer':'not-allowed',transition:'all 0.15s',
              background:importTab==='strava'?'#fff':'transparent',
              color:importTab==='strava'?'#1B2A4A':stravaConnected?'#9aa5b4':'#c8cfd8',
              boxShadow:importTab==='strava'?'0 1px 6px rgba(27,42,74,0.1)':'none',
              opacity:stravaConnected?1:0.5}}>
            <svg style={{display:'inline',marginRight:'5px',verticalAlign:'middle'}} width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            From Strava
          </button>
        </div>

        {/* ── Pacer Search tab ── */}
        {importTab === 'pacer' && <>

        {/* Search bar */}
        <div style={{marginBottom:'12px',animation:'fadeIn 0.4s ease 0.1s both'}}>
          <div style={{display:'flex',gap:'10px'}}>
            <div style={{flex:1,position:'relative'}}>
              <div style={{position:'absolute',left:'15px',top:'50%',transform:'translateY(-50%)',fontSize:'20px',pointerEvents:'none',zIndex:1}}>⚡</div>
              <input ref={inputRef} value={query}
                onChange={e=>{ setQuery(e.target.value); if(pacerResult){setPacerResult(null);setSearchError('');setPopupOpen(false)} }}
                onKeyDown={e=>e.key==='Enter'&&handleSearch()}
                placeholder="e.g. Cherry Blossom 10 Miler"
                autoCapitalize="words" autoCorrect="off"
                style={{width:'100%',padding:'17px 17px 17px 48px',borderRadius:'14px',border:'2px solid #e2e6ed',background:'#fafbfc',color:'#1B2A4A',fontSize:'17px',fontFamily:"'Barlow',sans-serif",outline:'none',boxSizing:'border-box',transition:'border-color 0.2s,box-shadow 0.2s'}}
                onFocus={e=>{e.target.style.borderColor='#1B2A4A';e.target.style.boxShadow='0 0 0 3px rgba(27,42,74,0.06)'}}
                onBlur={e=>{e.target.style.borderColor='#e2e6ed';e.target.style.boxShadow='none'}}/>
            </div>
            <button onClick={handleSearch} disabled={!query.trim()||searching||!selectedDist}
              style={{padding:'0 24px',border:'none',borderRadius:'14px',background:query.trim()&&!searching&&selectedDist?'#C9A84C':'#e2e6ed',color:query.trim()&&!searching&&selectedDist?'#1B2A4A':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',cursor:query.trim()&&!searching&&selectedDist?'pointer':'not-allowed',transition:'all 0.15s',flexShrink:0}}
              onMouseEnter={e=>{if(query.trim()&&!searching&&selectedDist)e.currentTarget.style.background='#b8913a'}}
              onMouseLeave={e=>{if(query.trim()&&!searching&&selectedDist)e.currentTarget.style.background='#C9A84C'}}>
              {searching?'...':'Look Up'}
            </button>
          </div>

          {/* Distance pills row */}
          <div style={{marginTop:'10px',display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'2px'}}>
            {DISTANCES.map(d=>(
              <button key={d} className={`ri-search-dist-btn${selectedDist===d?' sel':''}`}
                onClick={()=>setSelectedDist(prev=>prev===d?'':d)}>
                {d}
              </button>
            ))}
          </div>

          {/* Year pills row */}
          <div style={{marginTop:'8px',display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'2px'}}>
            {YEARS.slice(0,15).map(y=>(
              <button key={y}
                onClick={()=>setSelectedYear(prev=>prev===y?'':y)}
                style={{padding:'6px 12px',borderRadius:'20px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,cursor:'pointer',transition:'all 0.12s',border:'1.5px solid',whiteSpace:'nowrap',flexShrink:0,
                  borderColor: selectedYear===y?'#1B2A4A':'#e2e6ed',
                  background:  selectedYear===y?'#1B2A4A':'#fafbfc',
                  color:       selectedYear===y?'#fff':'#9aa5b4',
                }}>
                {y}
              </button>
            ))}
            {/* Older years collapsed into a select */}
            <select value={YEARS.slice(15).includes(selectedYear)?selectedYear:''}
              onChange={e=>setSelectedYear(e.target.value)}
              style={{padding:'6px 10px',borderRadius:'20px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1.5px solid #e2e6ed',background:'#fafbfc',color:'#9aa5b4',outline:'none',flexShrink:0}}>
              <option value="">Older...</option>
              {YEARS.slice(15).map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Helper text */}
          {!pacerResult&&!searching&&!searchError&&(
            <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:distMissing?'#C9A84C':'#b0b8c4',marginTop:'8px',textAlign:'center',marginBottom:0,transition:'color 0.2s'}}>
              {distMissing ? '← Pick your distance to look up this race' : 'Pick a distance and year, then tap Look Up'}
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
              onLocationRetry={async (hint) => {
                setLocationHint(hint)
                setSearching(true)
                try {
                  const body = {
                    action: 'race_lookup',
                    query: query.trim(),
                    year: selectedYear || '',
                    distance: selectedDist,
                    location_hint: hint,
                  }
                  if (userProfile) {
                    body.first_name = userProfile.first_name || userProfile.full_name?.trim().split(' ')[0] || ''
                    body.last_name  = userProfile.last_name  || userProfile.full_name?.trim().split(' ').slice(1).join(' ') || ''
                    body.dob        = userProfile.dob || userProfile.date_of_birth || ''
                  }
                  const resp = await fetch('/api/pacer', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  })
                  const data = await resp.json()
                  if (!data.error) setPacerResult(data)
                } catch(e) {}
                setSearching(false)
              }}
            />
          </div>
        )}

        </> /* end Pacer tab */}

        {/* ── Strava import tab ── */}
        {importTab === 'strava' && stravaConnected && (
          <StravaImportTab
            stravaActivities={stravaActivities}
            stravaActLoading={stravaActLoading}
            stravaActFilter={stravaActFilter}
            setStravaActFilter={setStravaActFilter}
            userProfile={userProfile}
            stravaProfile={stravaProfile}
            onAddRace={handleAddRace}
          />
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

      </>)
      }
      </div>

        {/* Gate prompt — shown when no Strava choice made yet */}
        {!stravaConnected && stravaGateChoice === null && (
          <div style={{textAlign:'center',padding:'40px 20px',animation:'fadeIn 0.4s ease 0.2s both'}}>
            <div style={{display:'flex',justifyContent:'center',gap:'12px',marginBottom:'16px',opacity:0.15}}>
              {['5K','13.1','26.2'].map(d=><MiniStamp key={d} distance={d} size={50}/>)}
            </div>
            <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',color:'#b0b8c4',lineHeight:1.7,margin:0}}>
              Connect Strava above to get started, or select "I Don't Have Strava" to continue without it.
            </p>
          </div>
        )}

      {/* Fixed bottom bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:10,padding:'16px 20px 36px',background:'linear-gradient(to top,#fff 65%,rgba(255,255,255,0))'}}>
        <div style={{maxWidth:'560px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'8px'}}>
          <button onClick={handleSave} disabled={saving}
            style={{width:'100%',padding:'17px',border:'none',borderRadius:'14px',background:races.length>0?'#1B2A4A':'#e2e6ed',color:races.length>0?'#fff':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'15px',fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',cursor:races.length>0&&!saving?'pointer':'default',transition:'background 0.2s'}}
            onMouseEnter={e=>{if(races.length>0&&!saving)e.currentTarget.style.background='#C9A84C'}}
            onMouseLeave={e=>{if(races.length>0)e.currentTarget.style.background='#1B2A4A'}}>
            {saving?'Saving...':`${races.length>0?`Save ${races.length} Race${races.length!==1?'s':''} to My Passport →`:'Add races above to continue'}`}
          </button>
          <p onClick={()=>navigate('/goal-races',{state:{firstName}})}
            style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#b0b8c4',cursor:'pointer',margin:0}}>
            Skip — I'll add races later
          </p>
        </div>
      </div>
    </div>
  )
}
