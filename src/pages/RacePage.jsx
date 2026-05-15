import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { getDistanceColor } from '../lib/colors'
import { useStrava, looksLikeRace } from '../lib/useStrava'
import { useIsMobile } from '../lib/useIsMobile'

// ── Static demo data ──────────────────────────────────────────────────────────
const RYAN_RACE_DATA = {
  1:  { id:1,  distance:'10K',  name:'Sole of the City 10K',          location:'Baltimore, MD',   date:'October 16, 2021',  time:'47:49',   pr:true,  story:'', photos:[], gear:[], splits:[] },
  2:  { id:2,  distance:'10K',  name:'Bay Bridge Run',                 location:'Annapolis, MD',   date:'November 7, 2021',  time:'50:57',   pr:false, story:'', photos:[], gear:[], splits:[] },
  3:  { id:3,  distance:'10K',  name:'Baltimore Running Festival 10K', location:'Baltimore, MD',   date:'October 9, 2021',   time:'58:03',   pr:false, story:'', photos:[], gear:[], splits:[] },
  4:  { id:4,  distance:'13.1', name:'Holiday Half Marathon',          location:'Annandale, VA',   date:'December 4, 2021',  time:'2:19:05', pr:false, story:'', photos:[], gear:[], splits:[] },
  5:  { id:5,  distance:'26.2', name:'Marine Corps Marathon',          location:'Washington, DC',  date:'October 22, 2023',  time:'4:45:42', pr:false, story:'', photos:[], gear:[], splits:[] },
  6:  { id:6,  distance:'26.2', name:'LA Marathon',                    location:'Los Angeles, CA', date:'March 19, 2023',    time:'4:44:47', pr:true,  story:'', photos:[], gear:[], splits:[] },
  7:  { id:7,  distance:'5K',   name:'Downtown Columbia Turkey Trot',  location:'Columbia, MD',    date:'November 28, 2024', time:'28:16',   pr:true,  story:'', photos:[], gear:[], splits:[] },
  8:  { id:8,  distance:'13.1', name:'Austin Half Marathon',           location:'Austin, TX',      date:'February 16, 2025', time:'1:57:40', pr:true,  story:'', photos:[], gear:[], splits:[] },
  9:  { id:9,  distance:'70.3', name:'IRONMAN 70.3 Eagleman',          location:'Cambridge, MD',   date:'June 8, 2025',      time:'6:32:08', pr:true,  story:'', photos:[], gear:[],
    splits:[{ label:'Swim',time:'0:50:09' },{ label:'T1',time:'0:06:17' },{ label:'Bike',time:'3:15:09' },{ label:'T2',time:'0:07:09' },{ label:'Run',time:'2:13:24' },{ label:'Total',time:'6:32:08' }] },
  10: { id:10, distance:'5K',   name:'Downtown Columbia Turkey Trot',  location:'Columbia, MD',    date:'November 27, 2025', time:'35:09',   pr:false, story:'', photos:[], gear:[], splits:[] },
}
const ALL_IDS = [1,2,3,4,5,6,7,8,9,10]
const STICKER_OPTIONS = ['🏅','🔥','💪','🎉','⚡','🏆','👟','💦','🌟','🎯','💯','🏃','🚴','🏊']
const GEAR_CATEGORIES = ['Shoes','Watch','Outfit','Socks','Sunglasses','Hat','Headphones','Other']

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcPace(timeStr, distance) {
  if (!timeStr || !distance) return null
  if (['70.3','140.6'].includes(distance)) return null
  const MILES = { '5K':3.10559,'10K':6.21371,'10 mi':10,'13.1':13.1,'26.2':26.2,'50K':31.0686,'Ultra':50 }
  const miles = MILES[distance]
  if (!miles) return null
  const p = timeStr.split(':').map(Number)
  let s = 0
  if (p.length===3) s = p[0]*3600+p[1]*60+p[2]
  else if (p.length===2) s = p[0]*60+(p[1]||0)
  if (!s) return null
  const spm = s/miles
  return `${Math.floor(spm/60)}:${String(Math.round(spm%60)).padStart(2,'0')}/mi`
}

async function fetchWeather(location, dateStr) {
  if (!location||!dateStr) return null
  try {
    const city = location.split(',')[0]?.trim()
    if (!city) return null
    const geoR = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`)
    const geoD = await geoR.json()
    const loc  = geoD.results?.[0]
    if (!loc) return null
    let date = dateStr
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(dateStr)
      if (isNaN(d)) return null
      date = d.toISOString().split('T')[0]
    }
    if (date >= new Date().toISOString().split('T')[0]) return null
    const wxR = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${loc.latitude}&longitude=${loc.longitude}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&temperature_unit=fahrenheit`)
    const wx = await wxR.json()
    const d  = wx.daily
    if (!d) return null
    const high=Math.round(d.temperature_2m_max?.[0]), low=Math.round(d.temperature_2m_min?.[0]), wc=d.weathercode?.[0]
    if (isNaN(high)||isNaN(low)) return null
    const WC={0:'Clear',1:'Mainly Clear',2:'Partly Cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Drizzle',53:'Drizzle',55:'Drizzle',61:'Rain',63:'Rain',65:'Heavy Rain',71:'Snow',73:'Snow',75:'Heavy Snow',80:'Showers',81:'Showers',82:'Heavy Showers',95:'Thunderstorm',99:'Thunderstorm'}
    return `${Math.round((high+low)/2)}°F · ${WC[wc]||'Cloudy'} · Hi ${high}° Lo ${low}°`
  } catch(e) { return null }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function AddGearForm({ onAdd, onCancel, t }) {
  const [cat,setCat]=useState(''), [brand,setBrand]=useState(''), [model,setModel]=useState('')
  const [color,setColor]=useState(''), [url,setUrl]=useState(''), [note,setNote]=useState('')
  const inp = { width:'100%',padding:'9px 12px',borderRadius:'6px',border:`1.5px solid ${t.border}`,background:t.inputBg,color:t.text,fontSize:'13px',fontFamily:"'Barlow',sans-serif",outline:'none',boxSizing:'border-box',transition:'border-color 0.15s' }
  return (
    <div style={{background:t.surfaceAlt,border:`1.5px solid ${t.border}`,borderRadius:'12px',padding:'20px',marginTop:'12px'}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'18px',color:t.text,letterSpacing:'1px',marginBottom:'14px'}}>Add Gear</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'10px',marginBottom:'10px'}}>
        {[['Category','select',cat,setCat],['Brand','text',brand,setBrand],['Model','text',model,setModel],['Color','text',color,setColor]].map(([label,type,val,setVal])=>(
          <div key={label}>
            <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,textTransform:'uppercase',marginBottom:'4px'}}>{label}</label>
            {type==='select'
              ? <select value={val} onChange={e=>setVal(e.target.value)} style={{...inp,appearance:'none',cursor:'pointer'}} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=t.border}><option value="">Select...</option>{GEAR_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
              : <input value={val} onChange={e=>setVal(e.target.value)} placeholder={label==='Brand'?'Nike, Garmin...':label==='Model'?'Clifton 9...':label==='Color'?'Black/White...':''} style={inp} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=t.border}/>
            }
          </div>
        ))}
      </div>
      <div style={{marginBottom:'10px'}}>
        <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,textTransform:'uppercase',marginBottom:'4px'}}>Shop Link <span style={{color:t.textMuted,fontWeight:400}}>(optional)</span></label>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." style={inp} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=t.border}/>
      </div>
      <div style={{marginBottom:'16px'}}>
        <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,textTransform:'uppercase',marginBottom:'4px'}}>Note <span style={{color:t.textMuted,fontWeight:400}}>(optional)</span></label>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Race day go-to..." style={inp} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=t.border}/>
      </div>
      <div style={{display:'flex',gap:'10px'}}>
        <button onClick={()=>{if(cat&&brand&&model) onAdd({id:Date.now(),category:cat,brand,model,color,url,note})}} disabled={!cat||!brand||!model}
          style={{flex:1,padding:'10px',border:'none',borderRadius:'8px',background:'#1B2A4A',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1.5px',color:'#fff',cursor:'pointer',textTransform:'uppercase',opacity:(!cat||!brand||!model)?0.5:1}}>Add to Page</button>
        <button onClick={onCancel} style={{padding:'10px 20px',border:`1.5px solid ${t.border}`,borderRadius:'8px',background:'transparent',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,cursor:'pointer',textTransform:'uppercase'}}>Cancel</button>
      </div>
    </div>
  )
}

// ── Triathlon segment carousel ────────────────────────────────────────────────
function TriCarousel({ triActivities, t, fmt, fmtTime, fmtPace }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const mapRefs  = useRef([])
  const rendered = useRef({})
  const SEG_COLORS = { swim:'#0EA5E9',ride:'#F97316',virtualride:'#F97316',mountainbikeride:'#F97316',run:'#FC4C02',virtualrun:'#FC4C02' }
  const SEG_LABELS = { swim:'Swim',ride:'Bike',virtualride:'Bike',mountainbikeride:'Bike',run:'Run',virtualrun:'Run' }
  const SEG_EMOJI  = { swim:'🏊',ride:'🚴',virtualride:'🚴',mountainbikeride:'🚴',run:'🏃',virtualrun:'🏃' }
  const getType  = s => (s.type||s.sport_type||'').toLowerCase()
  const getColor = s => SEG_COLORS[getType(s)]||'#1B2A4A'
  const getLabel = s => SEG_LABELS[getType(s)]||getType(s)
  const getEmoji = s => SEG_EMOJI[getType(s)]||'🏅'

  const drawMap = async (seg, el) => {
    if (!el||rendered.current[seg.id]||!seg?.map?.summary_polyline) return
    rendered.current[seg.id] = true
    try {
      if (!window.L) { const lnk=document.createElement('link');lnk.rel='stylesheet';lnk.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(lnk); await new Promise(r=>{const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=r;document.head.appendChild(s)}) }
      if (!window.polyline) { await new Promise(r=>{const s=document.createElement('script');s.src='https://unpkg.com/@mapbox/polyline@1.1.1/src/polyline.js';s.onload=r;document.head.appendChild(s)}) }
      const L=window.L, poly=window.polyline
      if (!poly||!L) return
      const latlngs = poly.decode(seg.map.summary_polyline)
      if (!latlngs.length) return
      const map = L.map(el,{zoomControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,attributionControl:false})
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:18}).addTo(map)
      const line = L.polyline(latlngs,{color:getColor(seg),weight:4,opacity:0.9}).addTo(map)
      map.fitBounds(line.getBounds(),{padding:[20,20]})
    } catch(e) {}
  }

  useEffect(() => {
    const seg=triActivities[activeIdx], el=mapRefs.current[activeIdx]
    if (seg&&el) drawMap(seg,el)
  }, [activeIdx, triActivities])

  return (
    <div>
      <div style={{position:'relative',marginBottom:'12px'}}>
        <div style={{position:'relative',height:'240px',borderRadius:'12px',overflow:'hidden',background:t.surfaceAlt}}>
          {triActivities.map((seg,i) => (
            <div key={seg.id} ref={el=>{mapRefs.current[i]=el;if(el&&i===activeIdx) drawMap(seg,el)}}
              style={{position:'absolute',inset:0,opacity:i===activeIdx?1:0,transition:'opacity 0.3s',pointerEvents:i===activeIdx?'auto':'none'}} />
          ))}
        </div>
        {activeIdx>0 && <button onClick={()=>setActiveIdx(i=>i-1)} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.9)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:10}}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="#1B2A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
        {activeIdx<triActivities.length-1 && <button onClick={()=>setActiveIdx(i=>i+1)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.9)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:10}}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#1B2A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
        <div style={{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',display:'flex',gap:'6px',zIndex:10}}>
          {triActivities.map((seg,i) => <div key={seg.id} onClick={()=>setActiveIdx(i)} style={{width:i===activeIdx?20:6,height:6,borderRadius:'3px',background:i===activeIdx?getColor(triActivities[i]):'rgba(255,255,255,0.5)',transition:'all 0.25s',cursor:'pointer'}}/>)}
        </div>
        <div style={{position:'absolute',top:12,left:12,display:'flex',alignItems:'center',gap:'6px',background:'rgba(255,255,255,0.92)',borderRadius:'8px',padding:'5px 10px',zIndex:10}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:getColor(triActivities[activeIdx]),flexShrink:0}}/>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:700,letterSpacing:'1.5px',color:'#1B2A4A',textTransform:'uppercase'}}>{getLabel(triActivities[activeIdx])}</span>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {triActivities.map((seg,i) => {
          const color=getColor(seg), isActive=i===activeIdx
          return (
            <div key={seg.id} onClick={()=>setActiveIdx(i)}
              style={{display:'grid',gridTemplateColumns:'70px 1fr 1fr 1fr 1fr',gap:'6px',alignItems:'center',borderRadius:'10px',padding:'10px 12px',borderLeft:`3px solid ${color}`,cursor:'pointer',transition:'all 0.2s',
                background:isActive?(color==='#0EA5E9'?'rgba(14,165,233,0.08)':color==='#F97316'?'rgba(249,115,22,0.08)':'rgba(252,76,2,0.08)'):t.surfaceAlt,
                boxShadow:isActive?`0 0 0 1.5px ${color}33`:'none'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:700,color:isActive?color:t.text,letterSpacing:'0.5px'}}>{getEmoji(seg)} {getLabel(seg)}</div>
              {[{label:'Distance',value:fmt(seg.distance)},{label:'Time',value:fmtTime(seg.moving_time)},{label:'Pace',value:fmtPace(seg.moving_time,seg.distance)},{label:'Elev',value:seg.total_elevation_gain?`${Math.round(seg.total_elevation_gain*3.281)}ft`:'—'}].map(s=>(
                <div key={s.label} style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'18px',color:isActive?color:t.text,letterSpacing:'1px',lineHeight:1,transition:'color 0.2s'}}>{s.value}</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,textTransform:'uppercase',marginTop:'2px'}}>{s.label}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Strava activity section ───────────────────────────────────────────────────
function StravaActivitySection({ race, t }) {
  const { user } = useAuth()
  const [profile,setProfile]           = useState(null)
  const [userId,setUserId]             = useState(null)
  const [activity,setActivity]         = useState(null)
  const [triActivities,setTriActivities] = useState([])
  const [candidates,setCandidates]     = useState([])
  const [loading,setLoading]           = useState(true)
  const [showPicker,setShowPicker]     = useState(false)
  const [mapRendered,setMapRendered]   = useState(false)
  const [locked,setLocked]             = useState(false)
  const mapRef = useRef(null)
  const isTri = ['70.3','140.6','tri','triathlon'].some(k=>(race.distance||'').toLowerCase().includes(k))

  const saveActivity = async (act, triActs) => {
    if (!userId||!race.id) return
    try {
      const data = triActs?.length>0
        ? { segments: triActs.map(a=>({id:a.id,type:a.type||a.sport_type,name:a.name,distance:a.distance,moving_time:a.moving_time,total_elevation_gain:a.total_elevation_gain,map:a.map,start_date_local:a.start_date_local})) }
        : { id:act?.id,type:act?.type||act?.sport_type,name:act?.name,distance:act?.distance,moving_time:act?.moving_time,total_elevation_gain:act?.total_elevation_gain,map:act?.map,start_date_local:act?.start_date_local }
      await supabase.from('passport_races').update({ strava_activity_id:triActs?.length>0?triActs[0]?.id:act?.id, strava_activity_data:data }).eq('id',race.id)
      setLocked(true)
    } catch(e) {}
  }

  const removeActivity = async () => {
    if (!userId||!race.id) return
    try { await supabase.from('passport_races').update({strava_activity_id:null,strava_activity_data:null}).eq('id',race.id); setActivity(null);setTriActivities([]);setLocked(false);setMapRendered(false);setCandidates([]) } catch(e) {}
  }

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return }
      try {
        const { data:{session} } = await supabase.auth.getSession()
        const uid = session?.user?.id||user.id
        setUserId(uid)
        const { data:prof } = await supabase.from('profiles').select('strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected').eq('id',uid).single()
        setProfile(prof)
        if (race.id) {
          const { data:pr } = await supabase.from('passport_races').select('strava_activity_id,strava_activity_data').eq('id',race.id).single()
          if (pr?.strava_activity_data) {
            const saved = pr.strava_activity_data
            if (saved.segments) { setTriActivities(saved.segments); setActivity(saved.segments.find(s=>['ride','virtualride'].includes((s.type||'').toLowerCase()))||saved.segments[0]) }
            else if (saved.id) setActivity(saved)
            setLocked(true); setLoading(false); return
          }
        }
      } catch(e) {}
      setLoading(false)
    }
    load()
  }, [user, race.id])

  const { connected, getActivities } = useStrava(profile, userId)

  useEffect(() => {
    if (!connected||!race.date||!profile||locked||activity) return
    const find = async () => {
      setLoading(true)
      try {
        const raceDate = new Date(race.date)
        if (isNaN(raceDate)) { setLoading(false); return }
        const isISO = /^\d{4}-\d{2}-\d{2}$/.test(race.date)
        const hasDay = isISO ? raceDate.getDate()!==1 : race.date.match(/\w+ \d{1,2},/)
        const isMonthOnly = !hasDay
        let afterTs, beforeTs
        if (isMonthOnly) {
          const sm=new Date(raceDate.getFullYear(),raceDate.getMonth(),1), em=new Date(raceDate.getFullYear(),raceDate.getMonth()+1,0,23,59,59)
          afterTs=Math.floor(sm.getTime()/1000); beforeTs=Math.floor(em.getTime()/1000)
        } else { afterTs=Math.floor(raceDate.getTime()/1000)-14*86400; beforeTs=Math.floor(raceDate.getTime()/1000)+14*86400 }
        const acts = await getActivities({per_page:60,after:afterTs})
        const inWindow = acts.filter(a=>{const ts=Math.floor(new Date(a.start_date_local).getTime()/1000);return ts>=afterTs&&ts<=beforeTs})
        const sameDay = isMonthOnly ? inWindow : inWindow.filter(a=>new Date(a.start_date_local).toDateString()===raceDate.toDateString())
        const pool = sameDay.length>0 ? sameDay : inWindow
        if (isTri) {
          const is140=(race.distance||'').includes('140')
          const SWIM=['swim'],BIKE=['ride','virtualride','ebikeride','mountainbikeride'],RUN=['run','virtualrun']
          const swim=pool.filter(a=>SWIM.includes((a.type||a.sport_type||'').toLowerCase())&&(a.distance||0)>500).sort((a,b)=>b.distance-a.distance)[0]
          const bike=pool.filter(a=>BIKE.includes((a.type||a.sport_type||'').toLowerCase())&&(a.distance||0)/1609.34>(is140?80:40)).sort((a,b)=>b.distance-a.distance)[0]
          const run=pool.filter(a=>RUN.includes((a.type||a.sport_type||'').toLowerCase())&&(a.distance||0)/1609.34>(is140?20:8)).sort((a,b)=>b.distance-a.distance)[0]
          const segs=[swim,bike,run].filter(Boolean)
          if (segs.length>0) { setTriActivities(segs); setActivity(bike||run||swim); await saveActivity(null,segs) }
          else setCandidates(inWindow.filter(a=>['run','virtualrun','swim','ride'].includes((a.type||a.sport_type||'').toLowerCase())).slice(0,10))
        } else {
          const distMi={'5K':3.1,'10K':6.2,'10 mi':10,'13.1':13.1,'26.2':26.2,'50K':31,'50 mi':50,'100K':62,'100 mi':100}[race.distance]||null
          let match=null
          if (distMi) { match=acts.filter(a=>{const mi=(a.distance||0)/1609.34;const type=(a.type||a.sport_type||'').toLowerCase();return ['run','virtualrun','walk'].includes(type)&&Math.abs(mi-distMi)/distMi<=0.02}).sort((a,b)=>Math.abs(new Date(a.start_date_local)-raceDate)-Math.abs(new Date(b.start_date_local)-raceDate))[0] }
          if (!match) match=pool.find(a=>looksLikeRace(a))||pool[0]
          if (match) { setActivity(match); await saveActivity(match,null) }
          else setCandidates(inWindow.filter(a=>['run','virtualrun','walk','ride'].includes((a.type||a.sport_type||'').toLowerCase())).slice(0,10))
        }
      } catch(e) {}
      setLoading(false)
    }
    find()
  }, [connected, race.date, profile, locked])

  useEffect(() => {
    const hasData = isTri ? triActivities.length>0 : !!activity?.map?.summary_polyline
    if (!hasData||!mapRef.current||mapRendered) return
    const draw = async () => {
      try {
        if (!window.L) { const lnk=document.createElement('link');lnk.rel='stylesheet';lnk.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(lnk);await new Promise(r=>{const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=r;document.head.appendChild(s)}) }
        if (!window.polyline) { await new Promise(r=>{const s=document.createElement('script');s.src='https://unpkg.com/@mapbox/polyline@1.1.1/src/polyline.js';s.onload=r;document.head.appendChild(s)}) }
        const L=window.L, poly=window.polyline||window.Polyline
        if (!poly||!L) return
        const map=L.map(mapRef.current,{zoomControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,attributionControl:false})
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:18}).addTo(map)
        const allBounds=[]
        if (isTri&&triActivities.length>0) {
          const SC={swim:'#0EA5E9',ride:'#F97316',virtualride:'#F97316',mountainbikeride:'#F97316',run:'#FC4C02',virtualrun:'#FC4C02'}
          triActivities.forEach(seg=>{if(!seg?.map?.summary_polyline) return;const type=(seg.type||seg.sport_type||'').toLowerCase();const color=SC[type]||'#1B2A4A';const ll=poly.decode(seg.map.summary_polyline);if(!ll.length) return;L.polyline(ll,{color,weight:3,opacity:0.9}).addTo(map);allBounds.push(...ll)})
        } else if (activity?.map?.summary_polyline) {
          const ll=poly.decode(activity.map.summary_polyline);if(ll.length){L.polyline(ll,{color:'#FC4C02',weight:3,opacity:0.9}).addTo(map);allBounds.push(...ll)}
        }
        if (allBounds.length) map.fitBounds(L.latLngBounds(allBounds),{padding:[16,16]})
        setMapRendered(true)
      } catch(e) {}
    }
    draw()
  }, [activity, triActivities])

  const fmt     = m  => m?`${(m/1609.34).toFixed(2)} mi`:'—'
  const fmtTime = s  => {if(!s) return '—';const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`}
  const fmtPace = (s,m) => {if(!s||!m) return '—';const spm=s/(m/1609.34),mm=Math.floor(spm/60),ss=Math.round(spm%60);return `${mm}:${String(ss).padStart(2,'0')}/mi`}
  const fmtDate = d  => d?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):''

  const connectBtn = async () => {
    const {data:{session}} = await supabase.auth.getSession()
    const uid = session?.user?.id||user?.id
    if (uid) sessionStorage.setItem('strava_user_id',uid)
    sessionStorage.setItem('strava_return_to',window.location.pathname)
    const r=await fetch(`/api/strava?action=auth_url${uid?`&user_id=${uid}`:''}`)
    const d=await r.json()
    if (d.url) window.location.href=d.url
  }

  const card = (content) => (
    <div style={{background:t.surface,borderRadius:'16px',padding:'20px',marginBottom:'16px',border:`1px solid ${t.border}`}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'24px',color:t.text,letterSpacing:'1px'}}>Strava Activity</div>
        <div style={{display:'flex',alignItems:'center',gap:'5px',padding:'3px 8px',background:'rgba(252,76,2,0.08)',border:'1px solid rgba(252,76,2,0.2)',borderRadius:'6px'}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1px',color:'#FC4C02',textTransform:'uppercase'}}>{connected?'Connected':'Strava'}</span>
        </div>
      </div>
      {content}
    </div>
  )

  if (!loading&&!connected) return card(
    <div style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px',background:t.surfaceAlt,borderRadius:'10px',border:`1px solid ${t.border}`}}>
      <div style={{flex:1}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:600,color:t.text,marginBottom:'2px'}}>Connect Strava to see your activity</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:t.textMuted}}>We'll match this race to your activity and show your map, pace, and elevation.</div>
      </div>
      <button onClick={connectBtn} style={{padding:'8px 18px',border:'1.5px solid rgba(252,76,2,0.5)',borderRadius:'8px',background:'rgba(252,76,2,0.08)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#FC4C02',cursor:'pointer',textTransform:'uppercase',flexShrink:0}}>Connect Strava</button>
    </div>
  )

  if (loading) return card(<div style={{height:'220px',background:t.surfaceAlt,borderRadius:'10px',animation:'pulse 1.5s ease infinite'}}/>)

  if (!activity) return card(
    <div>
      {!showPicker ? (
        <div style={{textAlign:'center',padding:'28px',border:`2px dashed ${t.border}`,borderRadius:'10px',background:t.surfaceAlt}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'18px',color:t.border,letterSpacing:'1px',marginBottom:'6px'}}>NO AUTO-MATCH FOUND</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:t.textMuted,marginBottom:candidates.length>0?'16px':0}}>We couldn't automatically find a Strava activity for {race.date}.</div>
          {candidates.length>0 && <button onClick={()=>setShowPicker(true)} style={{padding:'8px 20px',border:'1.5px solid #C9A84C',borderRadius:'8px',background:'rgba(201,168,76,0.08)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',cursor:'pointer',textTransform:'uppercase'}}>Choose from nearby activities →</button>}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:t.textMuted,marginBottom:'4px'}}>Select the Strava activity that matches this race:</div>
          {candidates.map(a=>(
            <div key={a.id} onClick={()=>{setActivity(a);setShowPicker(false);saveActivity(a,null)}}
              style={{display:'flex',alignItems:'center',gap:'14px',padding:'12px 14px',background:t.surfaceAlt,borderRadius:'10px',border:`1.5px solid ${t.border}`,cursor:'pointer',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#FC4C02';e.currentTarget.style.background='rgba(252,76,2,0.04)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.background=t.surfaceAlt}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:600,color:t.text,marginBottom:'2px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.name}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:t.textMuted}}>{fmtDate(a.start_date_local)} · {fmt(a.distance)} · {fmtTime(a.moving_time)}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return card(
    <div style={{animation:'fadeIn 0.4s ease both'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:t.textMuted}}>
          {isTri&&triActivities.length>0 ? `${triActivities.length} segments · ${fmtDate(triActivities[0].start_date_local)}` : `${activity.name} · ${fmtDate(activity.start_date_local)}`}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <button onClick={()=>{removeActivity();setShowPicker(false)}} style={{padding:'5px 12px',border:`1.5px solid ${t.border}`,borderRadius:'8px',background:'transparent',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1px',color:t.textMuted,cursor:'pointer',textTransform:'uppercase'}}>Change</button>
          <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noreferrer"
            style={{display:'flex',alignItems:'center',gap:'5px',padding:'5px 12px',border:'1.5px solid rgba(252,76,2,0.3)',borderRadius:'8px',background:'rgba(252,76,2,0.06)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1px',color:'#FC4C02',textDecoration:'none',textTransform:'uppercase'}}>
            View on Strava →
          </a>
        </div>
      </div>
      {isTri&&triActivities.length>0 ? (
        <TriCarousel triActivities={triActivities} t={t} fmt={fmt} fmtTime={fmtTime} fmtPace={fmtPace}/>
      ) : (
        <>
          <div ref={mapRef} style={{height:'240px',borderRadius:'12px',overflow:'hidden',background:t.surfaceAlt,marginBottom:'16px'}}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:'10px'}}>
            {[{label:'Distance',value:fmt(activity.distance)},{label:'Time',value:fmtTime(activity.moving_time)},{label:'Avg Pace',value:fmtPace(activity.moving_time,activity.distance)},{label:'Elevation',value:activity.total_elevation_gain?`${Math.round(activity.total_elevation_gain*3.281)}ft`:'—'}].map(s=>(
              <div key={s.label} style={{background:t.surfaceAlt,borderRadius:'10px',padding:'14px',textAlign:'center',borderTop:'3px solid #FC4C02'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',color:t.text,letterSpacing:'1px',lineHeight:1}}>{s.value}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,textTransform:'uppercase',marginTop:'4px'}}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main RacePage ─────────────────────────────────────────────────────────────
export default function RacePage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const isMobile  = useIsMobile()
  const numId     = parseInt(id)||1

  const [editMode,setEditMode]           = useState(false)
  const [race,setRace]                   = useState(null)
  const [allPassportRaces,setAllPassportRaces] = useState([])
  const [currentIdx,setCurrentIdx]       = useState(0)
  const [story,setStory]                 = useState('')
  const [gear,setGear]                   = useState([])
  const [stickers,setStickers]           = useState([])
  const [showStickerPicker,setShowStickerPicker] = useState(false)
  const [showSplits,setShowSplits]       = useState(true)
  const [showAddGear,setShowAddGear]     = useState(false)
  const [saving,setSaving]               = useState(false)
  const [activePhoto,setActivePhoto]     = useState(null)
  const [localPhotos,setLocalPhotos]     = useState([])
  const [showDropdown,setShowDropdown]   = useState(false)
  const [pacerReflection,setPacerReflection] = useState(null)
  const [pacerReflectionLoading,setPacerReflectionLoading] = useState(false)
  const [reportCard,setReportCard]       = useState(null)
  const [reportCardLoading,setReportCardLoading] = useState(false)
  const [raceScore,setRaceScore]         = useState(null)
  const [scoreLoading,setScoreLoading]   = useState(false)
  const [reportCardSubmitted,setReportCardSubmitted] = useState(false)
  const [showReportCard,setShowReportCard] = useState(false)
  const [weatherData,setWeatherData]     = useState(null)
  const fileInputRef = useRef(null)
  const dropdownRef  = useRef(null)

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files||[])
    if (!files.length) return
    setLocalPhotos(prev=>[...prev,...files.map(f=>({id:`local_${Date.now()}_${Math.random()}`,url:URL.createObjectURL(f),caption:f.name.replace(/\.[^.]+$/,''),name:f.name}))])
    e.target.value=''
  }
  const removePhoto = (id) => setLocalPhotos(prev=>{const p=prev.find(x=>x.id===id);if(p?.url?.startsWith('blob:'))URL.revokeObjectURL(p.url);return prev.filter(x=>x.id!==id)})

  // ── Load race ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadRace = async () => {
      try {
        const {data:{session}} = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (userId) {
          const {data:praces} = await supabase.from('passport_races').select('*').eq('user_id',userId).order('date_sort',{ascending:false})
          if (praces?.length>0) {
            const isUUID = id&&id.includes('-')
            const raceData = isUUID ? (praces.find(r=>r.id===id)||praces[0]) : (praces[numId-1]||praces[0])
            const idx = praces.findIndex(r=>r.id===raceData.id)
            setAllPassportRaces(praces)
            setCurrentIdx(idx>=0?idx:0)
            const mapped = {
              id:raceData.id, name:raceData.name, date:raceData.date_sort||raceData.date,
              date_display:raceData.date||raceData.date_sort,
              location:raceData.location||`${raceData.city||''}${raceData.city&&raceData.state?', ':''}${raceData.state||''}`,
              city:raceData.city||'', state:raceData.state||'',
              distance:raceData.distance, time:raceData.time, pr:raceData.is_pr||false,
              story:raceData.story||'', photos:[], gear:[], stickers:[], elevation:null, weather:null, place:null, splits:[],
              pacer_score:raceData.pacer_score||null, pacer_grade:raceData.pacer_grade||null,
              pacer_score_partial:raceData.pacer_score_partial!==false,
              strava_activity_id:raceData.strava_activity_id||null,
              // Pre-loaded from Supabase if already generated
              pacer_reflection:raceData.pacer_reflection||null,
              pacer_report_card:raceData.pacer_report_card||null,
            }
            if (raceData.pacer_score) setRaceScore({score:raceData.pacer_score,grade:raceData.pacer_grade||'',justification:'',is_partial:raceData.pacer_score_partial!==false})
            // Pre-populate reflection and report card from Supabase
            if (raceData.pacer_reflection) { setPacerReflection(raceData.pacer_reflection) }
            if (raceData.pacer_report_card) { setReportCard(raceData.pacer_report_card); setReportCardSubmitted(true) }
            setRace(mapped); setStory(mapped.story); setGear([]); setStickers([])
            return
          }
        }
      } catch(e) {}
      const data=RYAN_RACE_DATA[numId]||RYAN_RACE_DATA[1]
      setCurrentIdx(ALL_IDS.indexOf(data.id))
      setRace(data); setStory(data.story||''); setGear(data.gear||[]); setStickers(data.stickers||[])
    }
    loadRace()
  }, [numId, id])

  // ── Styles ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-racepage-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      *{box-sizing:border-box;}
      @keyframes fadeIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
      @keyframes spin{to{transform:rotate(360deg);}}
      @keyframes pulse{0%,100%{opacity:0.5;}50%{opacity:1;}}
      .rp-photo-slot{border-radius:10px;overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;position:relative;aspect-ratio:4/3;}
      .rp-photo-slot:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(27,42,74,0.15);}
      .sticker-chip{padding:6px 12px;border-radius:20px;border:1.5px solid;background:transparent;cursor:pointer;font-size:18px;transition:transform 0.15s;}
      .sticker-chip:hover{transform:scale(1.2);}
      .edit-toolbar-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;border:none;background:none;cursor:pointer;border-radius:8px;transition:background 0.15s;}
      .edit-toolbar-btn:hover{background:rgba(255,255,255,0.12);}
      .edit-toolbar-btn span{font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:600;letter-spacing:1px;color:rgba(255,255,255,0.5);text-transform:uppercase;}
    `
    if (!document.getElementById('rp-racepage-styles')) document.head.appendChild(style)
    const handleClick=e=>{if(dropdownRef.current&&!dropdownRef.current.contains(e.target))setShowDropdown(false)}
    document.addEventListener('mousedown',handleClick)
    return ()=>{document.getElementById('rp-racepage-styles')?.remove();document.removeEventListener('mousedown',handleClick)}
  }, [])

  // ── Weather ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!race||race.weather) return
    fetchWeather(race.location, race.date||race.date_sort).then(wx=>{if(wx)setWeatherData(wx)})
  }, [race?.id])

  // ── Pacer reflection — generate if not already loaded from Supabase ─────────
  useEffect(() => {
    if (!race?.name||pacerReflection) return // already loaded
    const cacheKey=`pacer_reflection_${race.id||race.name}`
    const cached=sessionStorage.getItem(cacheKey)
    if (cached) { try { setPacerReflection(JSON.parse(cached)); return } catch(e) {} }
    setPacerReflectionLoading(true)
    fetch('/api/pacer',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action:'race_reflection', race:{id:race.id,name:race.name,distance:race.distance,time:race.time,date:race.date,is_pr:race.pr,splits:race.splits||[]}, races:allPassportRaces.slice(0,15) }),
    })
    .then(r=>r.json())
    .then(async data=>{
      if (data.headline) {
        setPacerReflection(data)
        sessionStorage.setItem(cacheKey,JSON.stringify(data))
        // ── Save to Supabase so Race Recaps card can read it ──
        if (race?.id) { try { await supabase.from('passport_races').update({pacer_reflection:data}).eq('id',race.id) } catch(e) {} }
      }
    })
    .catch(()=>{})
    .finally(()=>setPacerReflectionLoading(false))
  }, [race?.id])

  // ── Full score when Strava + report card available ───────────────────────────
  useEffect(() => {
    if (!race?.id||!reportCardSubmitted||!race.strava_activity_id) return
    if (raceScore&&!raceScore.is_partial) return
    if (!reportCard?.grades?.length) return
    const gen = async () => {
      setScoreLoading(true)
      try {
        const resp=await fetch('/api/pacer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'race_score',is_partial:false,race:{id:race.id,name:race.name,distance:race.distance,time:race.time,is_pr:race.pr},all_races:allPassportRaces,report_card_grades:reportCard.grades.map(g=>g.grade),strava_data:{linked:true}})})
        const data=await resp.json()
        if (data.score) {
          setRaceScore({...data,is_partial:false})
          await supabase.from('passport_races').update({pacer_score:data.score,pacer_grade:data.grade,pacer_score_partial:false}).eq('id',race.id)
        }
      } catch(e) {}
      setScoreLoading(false)
    }
    gen()
  }, [reportCardSubmitted, race?.strava_activity_id, reportCard?.grades?.length])

  if (!race) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:t.bg}}>
      <div style={{width:36,height:36,border:'3px solid rgba(201,168,76,0.3)',borderTopColor:'#C9A84C',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isTri     = ['70.3','140.6'].includes(race.distance)
  const compPace  = isTri ? null : calcPace(race.time, race.distance)
  const dispWx    = race.weather||weatherData
  const colors    = getDistanceColor(race.distance)
  const cleaned   = race.distance.replace(' mi','').replace(' miles','')
  const fs        = cleaned.length>4?22:cleaned.length>2?28:40
  const prevRace  = currentIdx>0 ? allPassportRaces[currentIdx-1] : null
  const nextRace  = currentIdx<allPassportRaces.length-1 ? allPassportRaces[currentIdx+1] : null
  const gradeDisplay  = raceScore?.grade||race.pacer_grade||null
  const gradePartial  = raceScore ? raceScore.is_partial : race.pacer_score_partial!==false
  const gradeColor    = gradeDisplay ? (gradePartial?'rgba(154,165,180,0.9)':gradeDisplay.startsWith('A')?'#4ade80':gradeDisplay.startsWith('B')?'#C9A84C':'#9aa5b4') : null
  const headerStats = [
    {label:'Finish Time', value:race.time||'—'},
    {label:'Avg Pace',    value:isTri?'See Splits':(compPace||'—')},
    {label:gradeDisplay?(gradePartial?'Race Grade*':'Race Grade'):'Overall Place', value:gradeDisplay||race.place||'—', color:gradeColor},
    {label:'Elevation',   value:race.elevation||'—'},
  ]
  const meta=user?.user_metadata||{}
  const fullName=(meta.full_name||`${meta.first_name||''} ${meta.last_name||''}`.trim()||'RG')
  const initials=fullName.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'RG'
  const handleSave   = async()=>{setSaving(true);await new Promise(r=>setTimeout(r,600));setSaving(false);setEditMode(false)}
  const handleSignOut= async()=>{await signOut?.();navigate('/login')}
  const addSticker   = s=>{setStickers(p=>[...p,{id:Date.now(),emoji:s,x:20+Math.random()*60,y:20+Math.random()*60}]);setShowStickerPicker(false)}
  const addGear      = item=>{setGear(p=>[...p,item]);setShowAddGear(false)}
  const removeGear   = id=>setGear(p=>p.filter(g=>g.id!==id))

  return (
    <div style={{minHeight:'100vh',background:t.bg,fontFamily:"'Barlow',sans-serif",transition:'background 0.25s'}}>

      {/* ── TOP NAV ── */}
      <div style={{position:'sticky',top:0,zIndex:50,background:t.navBg,backdropFilter:'blur(8px)',borderBottom:`1px solid ${t.navBorder}`,boxShadow:t.navShadow,display:'flex',alignItems:'center',justifyContent:'space-between',padding:isMobile?'0 12px':'0 40px',height:'52px'}}>
        <button onClick={()=>navigate('/home')}
          style={{display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',cursor:'pointer',color:t.textMuted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',padding:0,flexShrink:0}}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {isMobile?'':'Home'}
        </button>
        <div style={{display:'flex',alignItems:'center',gap:isMobile?'8px':'16px'}}>
          <button onClick={()=>prevRace&&navigate(`/race/${prevRace.id}`)} disabled={!prevRace}
            style={{display:'flex',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:prevRace?'pointer':'default',color:prevRace?t.textMuted:t.borderLight,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',padding:'4px 6px',borderRadius:'6px'}}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {!isMobile&&(prevRace?prevRace.name.split(' ').slice(0,2).join(' '):'First')}
          </button>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'2px',color:t.textMuted,textTransform:'uppercase',whiteSpace:'nowrap'}}>{currentIdx+1} / {allPassportRaces.length||ALL_IDS.length}</div>
          <button onClick={()=>nextRace&&navigate(`/race/${nextRace.id}`)} disabled={!nextRace}
            style={{display:'flex',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:nextRace?'pointer':'default',color:nextRace?t.textMuted:t.borderLight,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',padding:'4px 6px',borderRadius:'6px'}}>
            {!isMobile&&(nextRace?nextRace.name.split(' ').slice(0,2).join(' '):'Last')}
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
          {!editMode ? (
            <button onClick={()=>setEditMode(true)} style={{padding:'5px 14px',border:'none',borderRadius:'8px',background:'#1B2A4A',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#fff',cursor:'pointer',textTransform:'uppercase'}} onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>Edit</button>
          ) : (
            <>
              <button onClick={()=>{setEditMode(false);setShowAddGear(false)}} style={{padding:'5px 12px',border:`1.5px solid ${t.border}`,borderRadius:'8px',background:'transparent',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,cursor:'pointer',textTransform:'uppercase'}}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{padding:'5px 14px',border:'none',borderRadius:'8px',background:'#C9A84C',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#1B2A4A',cursor:'pointer',textTransform:'uppercase',opacity:saving?0.7:1}}>{saving?'Saving...':'Save'}</button>
            </>
          )}
          <div ref={dropdownRef} style={{position:'relative'}}>
            <div onClick={()=>setShowDropdown(!showDropdown)} style={{width:30,height:30,borderRadius:'50%',background:'#1B2A4A',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:`2px solid ${t.border}`}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'11px',color:'#C9A84C'}}>{initials}</span>
            </div>
            {showDropdown && (
              <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',background:t.surface,border:`1px solid ${t.border}`,borderRadius:'10px',boxShadow:t.cardShadowHover,minWidth:'180px',overflow:'hidden',zIndex:100}}>
                <div style={{padding:'12px 16px 8px',borderBottom:`1px solid ${t.borderLight}`}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'14px',color:t.text}}>{fullName}</div></div>
                {[['My Passport','/home'],['Settings','/profile']].map(([label,path])=>(
                  <button key={path} onClick={()=>{navigate(path);setShowDropdown(false)}} style={{display:'block',width:'100%',padding:'9px 16px',background:'none',border:'none',textAlign:'left',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,color:t.text,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{label}</button>
                ))}
                <div style={{padding:'9px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${t.borderLight}`}}>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,color:t.text}}>Dark Mode</span>
                  <button onClick={toggleTheme} style={{width:36,height:20,borderRadius:'10px',border:'none',cursor:'pointer',position:'relative',background:isDark?'#C9A84C':'#d0d7e0',padding:0}}><div style={{position:'absolute',top:2,left:isDark?'calc(100% - 18px)':'2px',width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.25s'}}/></button>
                </div>
                <button onClick={handleSignOut} style={{display:'block',width:'100%',padding:'9px 16px',background:'none',border:'none',textAlign:'left',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,color:'#c53030',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Log Out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div style={{background:'#1B2A4A',position:'relative',overflow:'hidden'}}>
        <div style={{height:'4px',background:'#C9A84C'}}/>
        {stickers.length>0 && (
          <div style={{position:'absolute',inset:0,zIndex:5,pointerEvents:'none'}}>
            {stickers.map(s=><div key={s.id} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,fontSize:'32px',lineHeight:1,userSelect:'none'}}>{s.emoji}</div>)}
          </div>
        )}
        <div style={{maxWidth:'960px',margin:'0 auto',padding:isMobile?'20px 16px 0':'40px 40px 0',position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:isMobile?'16px':'40px',marginBottom:isMobile?'16px':'32px'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'3px',color:'rgba(201,168,76,0.6)',textTransform:'uppercase',marginBottom:'8px'}}>Race Passport · Page {currentIdx+1}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?'clamp(26px,7vw,42px)':'clamp(40px,6vw,72px)',color:'#fff',letterSpacing:'2px',lineHeight:0.95,marginBottom:'8px'}}>{race.name}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:isMobile?'13px':'16px',color:'rgba(255,255,255,0.5)',letterSpacing:'1px',marginBottom:'12px'}}>{race.date_display||race.date} · {race.location}</div>
              {race.pr && (
                <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(201,168,76,0.15)',border:'1px solid rgba(201,168,76,0.35)',borderRadius:'8px',padding:'5px 12px'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C'}}/>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:700,letterSpacing:'2px',color:'#C9A84C',textTransform:'uppercase'}}>Personal Best</span>
                </div>
              )}
            </div>
            <div style={{width:isMobile?80:140,height:isMobile?80:140,borderRadius:'50%',border:`3px solid ${colors.stampBorder}`,background:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',flexShrink:0}}>
              <div style={{position:'absolute',inset:isMobile?6:10,borderRadius:'50%',border:`1px dashed ${colors.stampDash}`}}/>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?Math.round(fs*0.65):fs,color:colors.stampText,letterSpacing:'0.04em',lineHeight:1,position:'relative',zIndex:1,textAlign:'center'}}>{cleaned}</div>
              {!isMobile && <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:colors.stampText,textTransform:'uppercase',marginTop:'4px',position:'relative',zIndex:1,opacity:0.55}}>{colors.label}</div>}
            </div>
          </div>
        </div>
        {/* Stat boxes */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',position:'relative',zIndex:1}}>
          <div style={{maxWidth:'960px',margin:'0 auto',display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',padding:isMobile?'0 16px':'0 40px'}}>
            {headerStats.map((s,i)=>(
              <div key={i} style={{padding:isMobile?'14px 0':'20px 0',textAlign:'center',borderRight:isMobile?(i%2===0?'1px solid rgba(255,255,255,0.08)':'none'):(i<3?'1px solid rgba(255,255,255,0.08)':'none'),borderBottom:isMobile&&i<2?'1px solid rgba(255,255,255,0.08)':'none'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?'20px':(s.color?'32px':'26px'),color:s.color||'#fff',letterSpacing:'1px',lineHeight:1}}>{s.value}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',marginTop:'4px'}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {gradeDisplay&&gradePartial && (
          <div style={{borderTop:'1px solid rgba(255,255,255,0.04)',padding:isMobile?'6px 16px':'6px 40px',maxWidth:'960px',margin:'0 auto'}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',color:'rgba(255,255,255,0.25)',letterSpacing:'0.5px'}}>* Partial grade — connect Strava and add training below for your full score</span>
          </div>
        )}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:isMobile?'8px 16px':'10px 40px',position:'relative',zIndex:1,maxWidth:'960px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{dispWx?`☁️  ${dispWx}`:'☁️  Loading race day weather...'}</span>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(252,76,2,0.75)',display:'flex',alignItems:'center',gap:'5px'}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            Connect Strava below for elevation, map &amp; pace data
          </span>
        </div>
        {/* Edit toolbar */}
        {editMode && (
          <div style={{borderTop:'1px solid rgba(255,255,255,0.1)',padding:isMobile?'8px 16px':'8px 40px',display:'flex',alignItems:'center',gap:'4px',background:'rgba(0,0,0,0.2)',position:'relative',zIndex:6}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'2px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',marginRight:'8px'}}>Edit:</div>
            <button className="edit-toolbar-btn" onClick={()=>setShowStickerPicker(!showStickerPicker)}><span style={{fontSize:'16px'}}>🏅</span><span>Sticker</span></button>
            <button className="edit-toolbar-btn" onClick={()=>setStickers([])}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round"/></svg><span>Clear</span></button>
            {showStickerPicker && (
              <div style={{position:'absolute',bottom:'calc(100% + 8px)',left:'120px',background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'12px',boxShadow:t.cardShadowHover,display:'flex',flexWrap:'wrap',gap:'8px',maxWidth:'240px',zIndex:20}}>
                {STICKER_OPTIONS.map(s=><button key={s} className="sticker-chip" style={{borderColor:t.border}} onClick={()=>addSticker(s)}>{s}</button>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div style={{maxWidth:'960px',margin:'0 auto',padding:isMobile?'16px 16px 80px':'32px 40px 80px'}}>

        {/* Pacer reflection */}
        {(pacerReflectionLoading||pacerReflection) && (
          <div style={{marginBottom:'20px',borderRadius:'16px',background:t.isDark?'rgba(201,168,76,0.06)':'#FFFDF5',border:`1px solid ${t.isDark?'rgba(201,168,76,0.2)':'rgba(201,168,76,0.35)'}`,padding:isMobile?'16px':'20px 24px',animation:'fadeIn 0.4s ease both'}}>
            {pacerReflectionLoading ? (
              <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{width:40,height:40,borderRadius:'10px',background:'#1B2A4A',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'20px'}}>⚡</div>
                <div style={{flex:1}}>
                  <div style={{height:11,borderRadius:6,background:t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)',marginBottom:10,width:'50%',animation:'pulse 1.5s ease infinite'}}/>
                  <div style={{height:10,borderRadius:6,background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.05)',width:'75%',animation:'pulse 1.5s ease infinite'}}/>
                </div>
              </div>
            ) : pacerReflection && (
              <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
                <div style={{width:40,height:40,borderRadius:'10px',background:'#1B2A4A',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px',fontSize:'20px',lineHeight:1}}>⚡</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'12px',letterSpacing:'2.5px',color:'#C9A84C'}}>PACER</span>
                    <div style={{width:3,height:3,borderRadius:'50%',background:'rgba(201,168,76,0.5)'}}/>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',letterSpacing:'1.5px',color:t.textMuted,textTransform:'uppercase'}}>Race Intelligence</span>
                  </div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?'20px':'24px',color:t.text,letterSpacing:'1px',marginBottom:'8px',lineHeight:1.1}}>{pacerReflection.headline}</div>
                  <p style={{fontFamily:"'Barlow',sans-serif",fontSize:isMobile?'13px':'14px',color:t.text,margin:'0 0 10px',lineHeight:1.65}}>{pacerReflection.reflection}</p>
                  {pacerReflection.highlight && (
                    <div style={{display:'inline-flex',alignItems:'center',gap:'7px',background:t.isDark?'rgba(201,168,76,0.1)':'rgba(201,168,76,0.12)',borderRadius:'20px',padding:'5px 12px'}}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1l1.5 3H10L7.5 6l1 3L5 7.5 1.5 9l1-3L0 4h3.5z" fill="#C9A84C"/></svg>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',fontWeight:600,color:'#C9A84C'}}>{pacerReflection.highlight}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        <div style={{background:t.surface,borderRadius:'16px',padding:isMobile?'16px':'28px',marginBottom:'16px',border:`1px solid ${t.border}`,animation:'fadeIn 0.4s ease both',transition:'background 0.25s'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'24px',color:t.text,letterSpacing:'1px'}}>Race Photos</div>
              {localPhotos.length>0 && <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1px',color:t.textMuted,background:t.surfaceAlt,padding:'3px 10px',borderRadius:'10px'}}>{localPhotos.length}</div>}
            </div>
            <button onClick={()=>fileInputRef.current?.click()} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 18px',border:'1.5px solid #C9A84C',borderRadius:'8px',background:'rgba(201,168,76,0.08)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',cursor:'pointer',textTransform:'uppercase'}}>+ Add Photos</button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handlePhotoUpload}/>
          {localPhotos.length>0 ? (
            <div style={{columns:'3 220px',gap:'12px'}}>
              {localPhotos.map(photo=>(
                <div key={photo.id} style={{breakInside:'avoid',marginBottom:'12px',borderRadius:'12px',overflow:'hidden',position:'relative',cursor:'pointer',display:'block'}} onClick={()=>setActivePhoto(photo)} onMouseEnter={e=>e.currentTarget.querySelector('.photo-overlay').style.opacity='1'} onMouseLeave={e=>e.currentTarget.querySelector('.photo-overlay').style.opacity='0'}>
                  <img src={photo.url} alt={photo.caption} style={{width:'100%',display:'block',borderRadius:'12px',objectFit:'cover'}}/>
                  <div className="photo-overlay" style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.45)',borderRadius:'12px',opacity:0,transition:'opacity 0.2s',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px'}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(255,255,255,0.8)',fontWeight:600}}>View</span>
                    <button onClick={e=>{e.stopPropagation();removePhoto(photo.id)}} style={{width:28,height:28,borderRadius:'50%',background:'rgba(197,48,48,0.8)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',lineHeight:1}}>✕</button>
                  </div>
                </div>
              ))}
              <div onClick={()=>fileInputRef.current?.click()} style={{breakInside:'avoid',marginBottom:'12px',borderRadius:'12px',border:'2px dashed rgba(201,168,76,0.35)',aspectRatio:'4/3',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'8px',cursor:'pointer',background:t.surfaceAlt}} onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(201,168,76,0.35)'}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(201,168,76,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',textTransform:'uppercase'}}>Add More</span>
              </div>
            </div>
          ) : (
            <div onClick={()=>fileInputRef.current?.click()} style={{border:'2px dashed rgba(201,168,76,0.35)',borderRadius:'16px',padding:'56px 40px',textAlign:'center',background:t.surfaceAlt,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(201,168,76,0.35)'}>
              <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(201,168,76,0.1)',border:'1.5px solid rgba(201,168,76,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 16l4-4 4 4 4-6 4 6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="18" rx="3" stroke="#C9A84C" strokeWidth="1.5"/></svg></div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',color:t.text,letterSpacing:'1px',marginBottom:'8px'}}>Add Your Race Photos</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:t.textMuted,marginBottom:'20px',lineHeight:1.6}}>Bring this race page to life with finish line moments and pre-race photos.</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'10px 24px',border:'1.5px solid #C9A84C',borderRadius:'8px',background:'rgba(201,168,76,0.08)'}}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3-4 3 4" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10h10" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',textTransform:'uppercase'}}>Upload Photos</span>
              </div>
            </div>
          )}
        </div>

        {/* Story */}
        <div style={{background:t.surface,borderRadius:'16px',padding:'20px',marginBottom:'16px',border:`1px solid ${t.border}`,animation:'fadeIn 0.4s ease 0.1s both',transition:'background 0.25s'}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'24px',color:t.text,letterSpacing:'1px',marginBottom:'18px'}}>My Story</div>
          {editMode ? (
            <textarea value={story} onChange={e=>setStory(e.target.value)} placeholder="What was race day like? What kept you going?"
              style={{width:'100%',minHeight:'160px',padding:'14px',border:`1.5px solid ${t.border}`,borderRadius:'10px',fontFamily:"'Barlow',sans-serif",fontSize:'14px',fontWeight:300,color:t.text,lineHeight:1.7,resize:'vertical',outline:'none',background:t.inputBg,transition:'border-color 0.15s'}}
              onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=t.border}/>
          ) : story ? (
            <div style={{fontFamily:"'Barlow',sans-serif",fontSize:'15px',fontWeight:300,color:t.text,lineHeight:1.9,fontStyle:'italic',borderLeft:'3px solid #C9A84C',paddingLeft:'18px'}}>"{story}"</div>
          ) : (
            <div style={{textAlign:'center',padding:'32px'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',color:t.border,letterSpacing:'1px',marginBottom:'8px'}}>NO STORY YET</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:t.textMuted,marginBottom:'14px'}}>Every race has a story worth telling.</div>
              <button onClick={()=>setEditMode(true)} style={{padding:'8px 20px',border:'1.5px solid #C9A84C',borderRadius:'8px',background:'rgba(201,168,76,0.08)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',cursor:'pointer',textTransform:'uppercase'}}>Write It</button>
            </div>
          )}
        </div>

        {/* Gear */}
        <div style={{background:t.surface,borderRadius:'16px',padding:'20px',marginBottom:'16px',border:`1px solid ${t.border}`,animation:'fadeIn 0.4s ease 0.15s both',transition:'background 0.25s'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'18px'}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'24px',color:t.text,letterSpacing:'1px',lineHeight:1}}>Race Day Gear</div>
              {!editMode&&gear.length>0 && <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:t.textMuted,marginTop:'3px'}}>Click any item to shop it</div>}
            </div>
            {editMode && <button onClick={()=>setShowAddGear(!showAddGear)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 16px',border:'1.5px solid #C9A84C',borderRadius:'8px',background:'rgba(201,168,76,0.08)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',cursor:'pointer',textTransform:'uppercase'}}>+ Add Gear</button>}
          </div>
          {gear.length>0 ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'12px'}}>
              {gear.map(item=>(
                <div key={item.id} style={{background:t.surfaceAlt,border:`1.5px solid ${t.border}`,borderRadius:'12px',padding:'16px',position:'relative'}}>
                  {editMode && <button onClick={()=>removeGear(item.id)} style={{position:'absolute',top:8,right:8,width:22,height:22,borderRadius:'50%',background:'rgba(197,48,48,0.1)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="#c53030" strokeWidth="1.2" strokeLinecap="round"/></svg></button>}
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,textTransform:'uppercase',marginBottom:'3px'}}>{item.category}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'16px',color:t.text,letterSpacing:'0.5px',lineHeight:1.1,marginBottom:'2px'}}>{item.brand} {item.model}</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:t.textMuted}}>{item.color}</div>
                  {item.note && <div style={{fontFamily:"'Barlow',sans-serif",fontSize:'11px',color:'#C9A84C',marginTop:'4px',fontStyle:'italic'}}>{item.note}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'32px',border:`2px dashed ${t.border}`,borderRadius:'12px',background:t.surfaceAlt}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'20px',color:t.border,letterSpacing:'1px',marginBottom:'6px'}}>NO GEAR YET</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:t.textMuted,marginBottom:'14px'}}>What did you race in? Add shoes, watch, outfit.</div>
              {!editMode && <button onClick={()=>setEditMode(true)} style={{padding:'7px 18px',border:'1.5px solid #C9A84C',borderRadius:'8px',background:'rgba(201,168,76,0.08)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',cursor:'pointer',textTransform:'uppercase'}}>Add Gear</button>}
            </div>
          )}
          {showAddGear && <AddGearForm onAdd={addGear} onCancel={()=>setShowAddGear(false)} t={t}/>}
        </div>

        {/* Splits */}
        {race.splits?.length>0 && (
          <div style={{background:t.surface,borderRadius:'16px',padding:'28px',border:`1px solid ${t.border}`,marginBottom:'16px',animation:'fadeIn 0.4s ease 0.2s both',transition:'background 0.25s'}}>
            <button onClick={()=>setShowSplits(!showSplits)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',background:'none',border:'none',cursor:'pointer',padding:0}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'24px',color:t.text,letterSpacing:'1px'}}>{isTri?'Triathlon Splits':'Splits'}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{transition:'transform 0.2s',transform:showSplits?'rotate(180deg)':'rotate(0)'}}><path d="M4 6l4 4 4-4" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {showSplits && (
              <div style={{marginTop:'18px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'12px'}}>
                {race.splits.map((split,i)=>(
                  <div key={i} style={{background:t.surfaceAlt,borderRadius:'8px',padding:'14px',textAlign:'center',borderTop:'3px solid #C9A84C'}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'20px',color:t.text,letterSpacing:'1px',lineHeight:1}}>{split.time}</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:t.textMuted,textTransform:'uppercase',marginTop:'4px'}}>{split.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Strava */}
        <StravaActivitySection race={race} t={t}/>

        {/* Pacer Report Card */}
        <div style={{background:t.surface,borderRadius:'16px',padding:isMobile?'16px':'28px',marginBottom:'16px',border:`1px solid ${t.border}`,animation:'fadeIn 0.4s ease 0.22s both',transition:'background 0.25s'}}>
          <button onClick={()=>{
            setShowReportCard(p=>!p)
            if (!reportCard&&!reportCardLoading) {
              setReportCardLoading(true)
              fetch('/api/pacer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'report_card',race:{name:race.name,distance:race.distance,time:race.time,splits:race.splits||[],strava_activities:[]},races:allPassportRaces.slice(0,15)})})
              .then(r=>r.json())
              .then(async data=>{
                if (data.grades) {
                  setReportCard(data)
                  setReportCardSubmitted(true)
                  // ── Save to Supabase so Race Recaps card can read it ──
                  if (race?.id) { try { await supabase.from('passport_races').update({pacer_report_card:data}).eq('id',race.id) } catch(e) {} }
                }
              })
              .catch(()=>{})
              .finally(()=>setReportCardLoading(false))
            }
          }}
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',background:'none',border:'none',cursor:'pointer',padding:0,marginBottom:showReportCard?'20px':0}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <span style={{fontSize:'20px'}}>🏃</span>
              <div style={{textAlign:'left'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',color:t.text,letterSpacing:'1px',lineHeight:1}}>Pacer Report Card</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:t.textMuted,marginTop:'2px'}}>AI analysis of your training for this race</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{transition:'transform 0.2s',transform:showReportCard?'rotate(180deg)':'rotate(0)',flexShrink:0}}>
              <path d="M4 6l4 4 4-4" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showReportCard && (
            reportCardLoading ? (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {[1,2,3,4].map(i=><div key={i} style={{height:52,borderRadius:'8px',background:t.surfaceAlt,animation:'pulse 1.5s ease infinite'}}/>)}
              </div>
            ) : reportCard ? (
              <div>
                <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'14px',color:t.text,lineHeight:1.7,marginBottom:'20px'}}>{reportCard.summary}</p>
                <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>
                  {reportCard.grades.map(g=>{
                    const gc=g.grade.startsWith('A')?'#16a34a':g.grade.startsWith('B')?'#C9A84C':'#9aa5b4'
                    return (
                      <div key={g.category} style={{display:'flex',alignItems:'center',gap:'14px',padding:'12px 16px',background:t.surfaceAlt,borderRadius:'10px',border:`1px solid ${t.borderLight}`}}>
                        <div style={{width:40,height:40,borderRadius:'8px',background:`${gc}18`,border:`1.5px solid ${gc}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'20px',color:gc,letterSpacing:'0.5px'}}>{g.grade}</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,color:t.text,marginBottom:'2px'}}>{g.category}</div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:t.textMuted,lineHeight:1.4}}>{g.comment}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'12px'}}>
                  {reportCard.top_win && <div style={{padding:'14px 16px',background:'rgba(22,163,74,0.06)',borderRadius:'10px',border:'1px solid rgba(22,163,74,0.2)'}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1.5px',color:'#16a34a',textTransform:'uppercase',marginBottom:'4px'}}>🏆 Top Win</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:t.text,lineHeight:1.5}}>{reportCard.top_win}</div></div>}
                  {reportCard.next_focus && <div style={{padding:'14px 16px',background:'rgba(201,168,76,0.06)',borderRadius:'10px',border:'1px solid rgba(201,168,76,0.2)'}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',textTransform:'uppercase',marginBottom:'4px'}}>⚡ Next Focus</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:t.text,lineHeight:1.5}}>{reportCard.next_focus}</div></div>}
                </div>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'20px',color:t.textMuted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px'}}>Connect Strava to unlock your full training analysis</div>
            )
          )}
        </div>

        {/* Bottom nav */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'16px'}}>
          <div style={{background:t.surface,borderRadius:'16px',padding:'20px 24px',border:`1px solid ${t.border}`}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'2px',color:t.textMuted,textTransform:'uppercase',marginBottom:'10px'}}>Privacy</div>
            <div style={{display:'flex',gap:'8px'}}>
              {['Public','Hide Time','Private'].map(opt=>(
                <button key={opt} style={{padding:'7px 14px',border:'1.5px solid',borderRadius:'8px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1px',cursor:'pointer',transition:'all 0.15s',background:opt==='Public'?'#1B2A4A':t.inputBg,borderColor:opt==='Public'?'#1B2A4A':t.border,color:opt==='Public'?'#fff':t.textMuted}}>{opt}</button>
              ))}
            </div>
          </div>
          <div style={{background:t.surface,borderRadius:'16px',padding:'20px 24px',border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <button onClick={()=>prevRace&&navigate(`/race/${prevRace.id}`)} disabled={!prevRace}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',border:`1.5px solid ${t.border}`,borderRadius:'10px',background:'transparent',cursor:prevRace?'pointer':'default',opacity:prevRace?1:0.4,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1px',color:t.text,textTransform:'uppercase'}}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Prev
            </button>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',color:t.textMuted,letterSpacing:'1px'}}>{currentIdx+1} / {allPassportRaces.length||ALL_IDS.length}</div>
            <button onClick={()=>nextRace&&navigate(`/race/${nextRace.id}`)} disabled={!nextRace}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',border:`1.5px solid ${t.border}`,borderRadius:'10px',background:'transparent',cursor:nextRace?'pointer':'default',opacity:nextRace?1:0.4,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1px',color:t.text,textTransform:'uppercase'}}>
              Next<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Photo lightbox */}
      {activePhoto && (() => {
        const idx=localPhotos.findIndex(p=>p.id===activePhoto.id)
        const prev=idx>0?localPhotos[idx-1]:null
        const next=idx<localPhotos.length-1?localPhotos[idx+1]:null
        return (
          <div onClick={()=>setActivePhoto(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.94)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
            <button onClick={()=>setActivePhoto(null)} style={{position:'fixed',top:24,right:24,width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
            {prev && <button onClick={e=>{e.stopPropagation();setActivePhoto(prev)}} style={{position:'fixed',left:24,top:'50%',transform:'translateY(-50%)',width:48,height:48,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
            <div onClick={e=>e.stopPropagation()} style={{maxWidth:'900px',width:'100%',display:'flex',flexDirection:'column',gap:'12px'}}>
              <img src={activePhoto.url} alt={activePhoto.caption} style={{width:'100%',display:'block',borderRadius:'12px',maxHeight:'80vh',objectFit:'contain'}}/>
              {activePhoto.caption && <div style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'rgba(255,255,255,0.5)'}}>{activePhoto.caption} · {idx+1} of {localPhotos.length}</div>}
            </div>
            {next && <button onClick={e=>{e.stopPropagation();setActivePhoto(next)}} style={{position:'fixed',right:24,top:'50%',transform:'translateY(-50%)',width:48,height:48,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
          </div>
        )
      })()}
    </div>
  )
}
