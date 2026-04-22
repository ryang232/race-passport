import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { loadRacePhoto, PHOTO_PLACEHOLDER } from '../lib/photos'
import { getDistanceColor } from '../lib/colors'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../lib/useIsMobile'

// ── Helpers ───────────────────────────────────────────────────────────────────

function useCountdown(dateStr) {
  const [cd, setCd] = useState({ days:0, hours:0, mins:0, secs:0, past:false })
  useEffect(() => {
    const tick = () => {
      const target = new Date(dateStr)
      if (isNaN(target)) return
      const diff = target - new Date()
      if (diff <= 0) { setCd(c => ({ ...c, past:true })); return }
      setCd({ days:Math.floor(diff/86400000), hours:Math.floor((diff%86400000)/3600000), mins:Math.floor((diff%3600000)/60000), secs:Math.floor((diff%60000)/1000), past:false })
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [dateStr])
  return cd
}

// Extract best available price from RunSignup race detail
function extractPrice(raceDetail) {
  if (!raceDetail) return null
  const now = new Date()
  let bestPrice = null

  // Try events[].registration_periods[].race_fee (most accurate — current period)
  const events = raceDetail.events || []
  for (const ev of events) {
    const periods = ev.registration_periods || ev.registrationPeriods || []
    for (const p of periods) {
      const start = p.start ? new Date(p.start) : null
      const end   = p.end   ? new Date(p.end)   : null
      const fee   = parseFloat(String(p.race_fee || p.fee || '').replace(/[^0-9.]/g,'')) || null
      if (fee && (!end || end > now) && (!start || start <= now)) {
        if (!bestPrice || fee < bestPrice) bestPrice = fee
      }
    }
  }
  if (bestPrice) return bestPrice

  // Fallback: registration_opens fee
  const opens = raceDetail.registration_opens || []
  for (const o of opens) {
    const fee = parseFloat(String(o.fee || '').replace(/[^0-9.]/g,'')) || null
    if (fee) { if (!bestPrice || fee < bestPrice) bestPrice = fee }
  }
  if (bestPrice) return bestPrice

  // Last resort: top-level fee
  const topFee = parseFloat(String(raceDetail.fee || raceDetail.price || '').replace(/[^0-9.]/g,'')) || null
  return topFee
}

// Open-Meteo: free, no API key, 16-day forecast
async function fetchWeather(lat, lng, dateStr) {
  if (!lat || !lng || !dateStr) return null
  try {
    const raceDate = new Date(dateStr)
    const today    = new Date()
    const diffDays = Math.round((raceDate - today) / 86400000)

    if (diffDays >= 0 && diffDays <= 15) {
      // Live forecast
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=auto&forecast_days=16`
      const resp = await fetch(url)
      const data = await resp.json()
      const dates = data.daily?.time || []
      const target = dateStr.substring(0, 10)
      const idx = dates.findIndex(d => d === target)
      if (idx >= 0) {
        const hi  = Math.round(data.daily.temperature_2m_max[idx])
        const lo  = Math.round(data.daily.temperature_2m_min[idx])
        const pop = data.daily.precipitation_probability_max[idx]
        const wc  = data.daily.weathercode[idx]
        const desc = wmoDescription(wc)
        return { type:'forecast', hi, lo, pop, desc, daysOut: diffDays }
      }
    }

    // Historical average (ERA5) — climate normals
    const month = String(raceDate.getMonth() + 1).padStart(2, '0')
    const day   = String(raceDate.getDate()).padStart(2, '0')
    // Use past 5 years of same month for average
    const year = raceDate.getFullYear() - 1
    const startDate = `${year}-${month}-${day}`
    const url2 = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&start_date=${startDate}&end_date=${startDate}`
    const resp2 = await fetch(url2).catch(() => null)
    if (resp2?.ok) {
      const d2 = await resp2.json()
      const hi = Math.round(d2.daily?.temperature_2m_max?.[0])
      const lo = Math.round(d2.daily?.temperature_2m_min?.[0])
      if (hi && lo) return { type:'historical', hi, lo, month: raceDate.toLocaleString('en', { month:'long' }) }
    }
  } catch(e) {}
  return null
}

function wmoDescription(code) {
  if (code === 0) return 'Clear skies'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 99) return 'Thunderstorms'
  return 'Mixed'
}

function weatherIcon(desc) {
  if (!desc) return '🌤️'
  const d = desc.toLowerCase()
  if (d.includes('clear')) return '☀️'
  if (d.includes('partly')) return '⛅'
  if (d.includes('overcast') || d.includes('cloudy')) return '☁️'
  if (d.includes('fog')) return '🌫️'
  if (d.includes('thunder')) return '⛈️'
  if (d.includes('snow')) return '❄️'
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️'
  if (d.includes('shower')) return '🌦️'
  return '🌤️'
}

// ── Stamp — matches homepage design ──────────────────────────────────────────
function DistanceStamp({ distance, size = 100 }) {
  const colors  = getDistanceColor(distance)
  const cleaned = (distance || '').replace(' mi','').replace(' miles','')
  const fs      = cleaned.length > 4 ? size*0.18 : cleaned.length > 2 ? size*0.24 : size*0.34
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder}`, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', inset: size*0.08, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.stampText, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1, textAlign:'center' }}>{cleaned}</div>
    </div>
  )
}

// ── Share sheet ───────────────────────────────────────────────────────────────
function ShareButton({ race, t }) {
  const [copied, setCopied] = useState(false)
  const url   = window.location.href
  const title = `${race.name} — ${race.date}`
  const text  = `Check out ${race.name} on Race Passport!`

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return } catch(e) {}
    }
    // Fallback: copy link
    try { await navigator.clipboard.writeText(url) } catch(e) { const ta = document.createElement('textarea'); ta.value=url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleShare}
      style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 18px', border:`1.5px solid ${t.border}`, borderRadius:'10px', background:t.surface, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color: copied ? '#16a34a' : t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', width:'100%', justifyContent:'center' }}
      onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor=t.text; e.currentTarget.style.color=t.text } }}
      onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.color=t.textMuted } }}>
      {copied ? (
        <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Link Copied!</>
      ) : (
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Share This Race</>
      )}
    </button>
  )
}

// ── Apple Maps card with Leaflet embed ───────────────────────────────────────
function AppleMapCard({ race, t }) {
  const mapRef = useRef(null)
  const rendered = useRef(false)

  useEffect(() => {
    if (!mapRef.current || rendered.current || !race.lat || !race.lng) return
    rendered.current = true

    const init = async () => {
      if (!window.L) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
        await new Promise(resolve => {
          const s = document.createElement('script')
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          s.onload = resolve
          document.head.appendChild(s)
        })
      }
      const L = window.L
      const map = L.map(mapRef.current, {
        center: [race.lat, race.lng],
        zoom: 14,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        attributionControl: false,
      })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map)
      L.circleMarker([race.lat, race.lng], {
        radius: 10, fillColor: '#C9A84C', color: '#1B2A4A', weight: 2, fillOpacity: 1
      }).addTo(map)
    }
    init()
  }, [race.lat, race.lng])

  if (!race.lat || !race.lng) return null

  const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(race.name)}&ll=${race.lat},${race.lng}&z=14`

  return (
    <a href={appleMapsUrl} target="_blank" rel="noreferrer"
      style={{ display:'block', borderRadius:'14px', overflow:'hidden', border:`1px solid ${t.border}`, textDecoration:'none', position:'relative', cursor:'pointer' }}>
      <div ref={mapRef} style={{ height:'160px', background:t.surfaceAlt }} />
      {/* Apple Maps badge */}
      <div style={{ position:'absolute', bottom:48, right:12, background:'rgba(255,255,255,0.95)', borderRadius:'8px', padding:'4px 10px', display:'flex', alignItems:'center', gap:'5px', zIndex:400 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#FC4C02"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:700, letterSpacing:'0.5px', color:'#1B2A4A' }}>Open in Maps</span>
      </div>
      <div style={{ padding:'10px 14px', background:t.surface, display:'flex', alignItems:'center', gap:'8px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#C9A84C" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="#C9A84C" strokeWidth="1.5"/></svg>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:t.text }}>{race.city || race.location}</div>
          {race.address && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted }}>{race.address}</div>}
        </div>
      </div>
    </a>
  )
}

// ── Weather card ──────────────────────────────────────────────────────────────
function WeatherCard({ weather, t }) {
  if (!weather) return null
  const icon = weatherIcon(weather.desc)
  return (
    <div style={{ background:t.surfaceAlt, borderRadius:'12px', padding:'14px 16px', border:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:'14px' }}>
      <div style={{ fontSize:'32px', lineHeight:1, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        {weather.type === 'forecast' ? (
          <>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{weather.hi}° / {weather.lo}°F</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'2px' }}>{weather.desc}{weather.pop > 20 ? ` · ${weather.pop}% rain` : ''}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', marginTop:'3px' }}>Live Forecast</div>
          </>
        ) : (
          <>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{weather.hi}° / {weather.lo}°F</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'2px' }}>Typical for {weather.month}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'3px' }}>Historical Avg</div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Countdown card ────────────────────────────────────────────────────────────
function CountdownCard({ race, price, t }) {
  const cd = useCountdown(race.date_sort || race.date)
  const dateStr = race.date || ''

  return (
    <div style={{ background:'#1B2A4A', borderRadius:'16px', padding:'20px', marginBottom:'14px' }}>
      {/* Distance stamp + date */}
      <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'16px' }}>
        <DistanceStamp distance={race.distance} size={64} />
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#fff', letterSpacing:'1px', lineHeight:1 }}>{dateStr}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.45)', marginTop:'3px' }}>{race.city || race.location}</div>
        </div>
      </div>

      {/* Countdown */}
      {!cd.past ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'16px' }}>
          {[{ val:String(cd.days).padStart(2,'0'), label:'Days' },{ val:String(cd.hours).padStart(2,'0'), label:'Hrs' },{ val:String(cd.mins).padStart(2,'0'), label:'Min' },{ val:String(cd.secs).padStart(2,'0'), label:'Sec' }].map(u => (
            <div key={u.label} style={{ textAlign:'center', background:'rgba(255,255,255,0.06)', borderRadius:'8px', padding:'8px 4px', border:'1px solid rgba(201,168,76,0.2)' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>{u.val}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginTop:'3px' }}>{u.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'12px', background:'rgba(201,168,76,0.1)', borderRadius:'8px', marginBottom:'16px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#C9A84C', letterSpacing:'1px' }}>This race has passed</div>
        </div>
      )}

      {/* Price */}
      {price && (
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.4)', textAlign:'center', marginBottom:'10px' }}>
          Entry from <span style={{ color:'#C9A84C', fontWeight:600 }}>${price}</span>
        </div>
      )}
    </div>
  )
}

// ── Signup modal ──────────────────────────────────────────────────────────────
function SignupModal({ race, onSave, onClose, t }) {
  const [goal, setGoal] = useState('')
  const [specificTime, setSpecificTime] = useState('')
  const [saving, setSaving] = useState(false)
  const GOALS = [
    { key:'pr',    label:'Go for a PR 🏆' },
    { key:'time',  label:'Hit a specific time 🎯' },
    { key:'fun',   label:'Have fun 🎉' },
    { key:'finish',label:'Just finish strong 💪' },
    { key:'cause', label:'Support a cause ❤️' },
  ]
  const handleSave = async () => { setSaving(true); await new Promise(r => setTimeout(r,400)); onSave({ goal, specificTime }); setSaving(false) }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:t.surface, borderRadius:'20px', padding:'24px', width:'100%', maxWidth:'420px', boxShadow:'0 24px 64px rgba(0,0,0,0.35)', border:`1px solid ${t.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(201,168,76,0.12)', border:'1.5px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🎉</div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>You're In!</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{race.name} · {race.date}</div>
          </div>
        </div>
        <div style={{ marginBottom:'20px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'10px' }}>What's your goal?</label>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {GOALS.map(g => (
              <button key={g.key} onClick={() => setGoal(goal===g.key?'':g.key)}
                style={{ padding:'9px 14px', borderRadius:'10px', border:`1.5px solid ${goal===g.key?'#C9A84C':t.border}`, background:goal===g.key?'rgba(201,168,76,0.1)':t.inputBg, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:goal===g.key?'#C9A84C':t.textMuted, cursor:'pointer', textAlign:'left' }}>
                {g.label}
              </button>
            ))}
          </div>
          {goal === 'time' && (
            <input value={specificTime} onChange={e => setSpecificTime(e.target.value)} placeholder="e.g. 1:55:00"
              style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:`1.5px solid ${t.border}`, background:t.inputBg, color:t.text, fontFamily:"'Barlow',sans-serif", fontSize:'14px', outline:'none', marginTop:'10px' }}
              onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border} />
          )}
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', border:`1.5px solid ${t.border}`, borderRadius:'10px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}>Skip</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:'11px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#fff', cursor:'pointer', textTransform:'uppercase', opacity:saving?0.7:1 }}
            onMouseEnter={e => { if(!saving) e.currentTarget.style.background='#C9A84C' }}
            onMouseLeave={e => { if(!saving) e.currentTarget.style.background='#1B2A4A' }}>
            {saving ? 'Adding...' : 'Add to My Races →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Signup banner ─────────────────────────────────────────────────────────────
function SignupBanner({ race, onYes, onNo }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:200, padding:'0 16px 16px', pointerEvents:'none' }}>
      <div style={{ maxWidth:'560px', margin:'0 auto', pointerEvents:'all', transition:'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)', transform:visible?'translateY(0)':'translateY(120%)' }}>
        <div style={{ background:'#1B2A4A', borderRadius:'16px', padding:'16px 18px', boxShadow:'0 8px 40px rgba(0,0,0,0.35)', border:'1px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.55)' }}>Welcome back!</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:'#fff', lineHeight:1.2 }}>Did you register for <span style={{ color:'#C9A84C' }}>{race.name}</span>?</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
            <button onClick={onNo} style={{ padding:'6px 12px', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.5)', cursor:'pointer', textTransform:'uppercase' }}>Not yet</button>
            <button onClick={onYes} style={{ padding:'6px 14px', border:'none', borderRadius:'8px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase' }}>Yes! 🎉</button>
          </div>
          <button onClick={onNo} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.25)', cursor:'pointer', fontSize:'16px', lineHeight:1, padding:0, flexShrink:0 }}>✕</button>
        </div>
      </div>
    </div>
  )
}

// ── Suggested Gear ────────────────────────────────────────────────────────────
function SuggestedGear({ race, t }) {
  const distance = race?.distance || ''
  const getGear = () => {
    const isTri = distance.includes('70.3')||distance.includes('140.6')||distance.toLowerCase().includes('tri')
    const isUltra = distance.toLowerCase().includes('ultra')||distance.includes('50')||distance.includes('100')
    const isMarathon = distance === '26.2'
    const isHalf = distance === '13.1'
    const base = [
      { emoji:'👟', name:'Race Day Shoes', note:'Lightweight, responsive for race pace', tag:'Essential' },
      { emoji:'🧢', name:'Running Cap', note:'Moisture-wicking, UV protection', tag:'Recommended' },
      { emoji:'🧴', name:'Body Glide', note:'Prevent chafing on long efforts', tag:'Essential' },
    ]
    if (isTri) return [{ emoji:'🏊', name:'Tri Suit', note:'Swim-to-run without changing', tag:'Essential' },{ emoji:'🚴', name:'Aero Helmet', note:'Time savings on the bike leg', tag:'Recommended' },{ emoji:'👟', name:'Race Day Shoes', note:'Quick laces for T2', tag:'Essential' },{ emoji:'🧴', name:'Body Glide', note:'Chafe prevention for all three legs', tag:'Essential' },{ emoji:'🥤', name:'Nutrition Belt', note:'Gels and hydration on the run', tag:'Recommended' }]
    if (isUltra) return [{ emoji:'🎒', name:'Running Vest', note:'Mandatory for most ultras', tag:'Essential' },{ emoji:'👟', name:'Trail Shoes', note:'Grip and protection', tag:'Essential' },{ emoji:'🧴', name:'Body Glide', note:'Multi-day chafe prevention', tag:'Essential' },{ emoji:'🥤', name:'Soft Flasks', note:'Easy hydration on the go', tag:'Essential' }]
    if (isMarathon) return [...base,{ emoji:'🥤', name:'Race Belt & Gels', note:'Fuel every 45 mins after mile 6', tag:'Essential' },{ emoji:'🧦', name:'Compression Socks', note:'Reduce fatigue in the final miles', tag:'Recommended' }]
    if (isHalf) return [...base,{ emoji:'🥤', name:'2–3 Energy Gels', note:'Take one at miles 5 and 9', tag:'Recommended' }]
    return base
  }
  const gear = getGear()
  const TAG = { Essential:{ bg:'rgba(201,168,76,0.1)', border:'rgba(201,168,76,0.3)', text:'#C9A84C' }, Recommended:{ bg:'rgba(27,42,74,0.06)', border:'rgba(27,42,74,0.15)', text:'#1B2A4A' } }
  return (
    <div style={{ background:t.surface, borderRadius:'16px', padding:'20px', border:`1px solid ${t.border}`, marginTop:'14px' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:t.text, letterSpacing:'1px', marginBottom:'3px' }}>Suggested Gear</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginBottom:'12px' }}>For a {distance} race</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'10px' }}>
        {gear.map((item,i) => { const tc=TAG[item.tag]||TAG.Recommended; return (
          <div key={i} style={{ background:t.surfaceAlt, borderRadius:'10px', padding:'12px', border:`1px solid ${t.border}`, display:'flex', flexDirection:'column', gap:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'20px', lineHeight:1 }}>{item.emoji}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', padding:'2px 6px', borderRadius:'4px', background:tc.bg, border:`1px solid ${tc.border}`, color:tc.text }}>{item.tag}</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:700, color:t.text, marginBottom:'2px' }}>{item.name}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted, lineHeight:1.5 }}>{item.note}</div>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RaceDetail() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const { t, isDark } = useTheme()
  const isMobile = useIsMobile()

  const [race, setRace]                   = useState(null)
  const [photo, setPhoto]                 = useState(PHOTO_PLACEHOLDER)
  const [raceLogoUrl, setRaceLogoUrl]     = useState(null)
  const [loading, setLoading]             = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [price, setPrice]                 = useState(null)
  const [weather, setWeather]             = useState(null)
  const [events, setEvents]               = useState([])
  const [showSignupBanner, setShowSignupBanner] = useState(false)
  const [showSignupModal, setShowSignupModal]   = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [signedUp, setSignedUp]           = useState(() => {
    try { const u = JSON.parse(sessionStorage.getItem('rp_upcoming')||'[]'); return u.some(r => r.id===parseInt(id)||r.id===id) } catch(e){ return false }
  })
  const pendingExternalNav = useRef(false)

  const handleCancelRegistration = () => {
    setSignedUp(false); setShowCancelConfirm(false)
    try {
      const existing = JSON.parse(sessionStorage.getItem('rp_upcoming')||'[]')
      sessionStorage.setItem('rp_upcoming', JSON.stringify(existing.filter(r => r.id!==parseInt(id)&&r.id!==id)))
    } catch(e) {}
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('races').select('*').eq('id', id).single()
        if (error || !data) { navigate('/discover'); return }
        setRace(data)
        if (data.logo_url || data.hero_image) setRaceLogoUrl(data.logo_url || data.hero_image)
        loadRacePhoto(data).then(url => { if (url) setPhoto(url) })

        // Fetch weather
        if (data.lat && data.lng && data.date_sort) {
          fetchWeather(data.lat, data.lng, data.date_sort).then(w => setWeather(w))
        }

        // Fetch RunSignup detail for price, logo, events, description
        setDetailLoading(true)
        try {
          const res  = await fetch(`/api/runsignup?action=get_race_detail&race_id=${id}`)
          const json = await res.json()
          if (json.race) {
            const r = json.race
            // Extract logo
            const logo = r.race_logo || r.logo_url || r.profile_image_url || null
            if (logo) setRaceLogoUrl(logo)
            // Extract best price
            const bestPrice = extractPrice(r)
            if (bestPrice) setPrice(bestPrice)
            // Extract events
            if (r.events?.length > 0) setEvents(r.events)
            // Enrich race data
            setRace(prev => ({
              ...prev,
              description:  r.description        || prev.description,
              website_url:  r.url                || prev.website_url,
              course_map:   r.course_map         || prev.course_map,
              address:      r.address?.street    || prev.address,
            }))
          }
        } catch(e) { console.warn('Detail fetch failed:', e.message) }
        setDetailLoading(false)
      } catch(e) { navigate('/discover') }
      setLoading(false)
    }
    load()

    // Inject font as a proper <link> tag — @import in dynamic style tags is unreliable
    if (!document.getElementById('rp-font-link')) {
      const link = document.createElement('link')
      link.id   = 'rp-font-link'
      link.rel  = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap'
      document.head.appendChild(link)
    }

    const style = document.createElement('style')
    style.id = 'rp-rd-styles'
    style.textContent = `
      * { box-sizing:border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      @keyframes pulse { 0%,100%{opacity:0.5;}50%{opacity:1;} }
      .rd-register-btn:hover { background:#C9A84C !important; color:#1B2A4A !important; }
    `
    if (!document.getElementById('rp-rd-styles')) document.head.appendChild(style)

    const handleVisibility = () => {
      if (document.visibilityState==='visible' && pendingExternalNav.current) {
        pendingExternalNav.current = false
        if (!signedUp) setTimeout(() => setShowSignupBanner(true), 800)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { document.getElementById('rp-rd-styles')?.remove(); document.removeEventListener('visibilitychange', handleVisibility) }
  }, [id])

  const handleRegisterClick = (url) => {
    if (!signedUp) pendingExternalNav.current = true
    window.open(url, '_blank')
  }

  const handleSignupSave = ({ goal, specificTime }) => {
    setSignedUp(true); setShowSignupModal(false)
    try {
      const existing = JSON.parse(sessionStorage.getItem('rp_upcoming')||'[]')
      sessionStorage.setItem('rp_upcoming', JSON.stringify([{
        id:race.id, name:race.name, location:race.location, date:race.date,
        date_sort:race.date_sort, distance:race.distance,
        registration_url:race.registration_url, city:race.city, state:race.state,
        goal, specificTime, addedAt:Date.now()
      }, ...existing.filter(r=>r.id!==race.id)]))
    } catch(e) {}
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:t.bg }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  )
  if (!race) return null

  const colors = getDistanceColor(race.distance)
  const cleaned = (race.distance||'').replace(' mi','').replace(' miles','')
  const registrationUrl = race.registration_url || race.website_url || `https://runsignup.com/Race/${id}`
  const p = isMobile ? '16px' : '40px'

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", overflowX:'hidden' }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:500, background:t.navBg, backdropFilter:'blur(8px)', borderBottom:`1px solid ${t.navBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:`0 ${p}`, height:'52px' }}>
        <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {isMobile ? '' : 'Back'}
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile?'14px':'16px', letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {signedUp && (
            <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'4px 10px', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'20px' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, color:'#C9A84C' }}>Registered</span>
            </div>
          )}
          <button className="rd-register-btn" onClick={() => handleRegisterClick(registrationUrl)}
            style={{ padding: isMobile?'5px 12px':'7px 20px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}>
            Register
          </button>
        </div>
      </div>

      {/* HERO */}
      <div style={{ height: isMobile?'240px':'380px', position:'relative', background:'#1B2A4A', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background:'#C9A84C', zIndex:2 }} />

        {raceLogoUrl ? (
          /* Logo hero — centered on dark navy */
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#1B2A4A', padding: isMobile ? '40px 80px' : '60px 160px' }}>
            <img src={raceLogoUrl} alt={race.name}
              style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', filter:'drop-shadow(0 8px 32px rgba(0,0,0,0.6))' }}
              onError={e => e.target.style.display='none'} />
          </div>
        ) : (
          /* City photo fallback */
          <>
            <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.75))' }} />
          </>
        )}

        {/* Stamp — top right */}
        <div style={{ position:'absolute', top: isMobile?'16px':'24px', right: isMobile?'16px':'24px', zIndex:3 }}>
          <DistanceStamp distance={race.distance} size={isMobile?70:100} />
        </div>

        {/* Race name + location — bottom left */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding: isMobile?'16px':'28px 40px', zIndex:2, background: raceLogoUrl ? 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' : 'none' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize: isMobile?'11px':'13px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.7)', textTransform:'uppercase', marginBottom:'6px' }}>
            {race.date} · {race.city || race.location}
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile?'clamp(22px,6vw,32px)':'clamp(32px,5vw,60px)', color:'#fff', letterSpacing:'1.5px', lineHeight:1 }}>{race.name}</div>
        </div>
      </div>

      {/* RACE IDENTITY BAR — only fields we have */}
      <div style={{ background:t.isDark?t.surface:'#fff', borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:'flex', overflowX: isMobile?'auto':'visible', padding:`0 ${p}` }}>
          {[
            race.distance && { label:'Distance', value:race.distance },
            race.date     && { label:'Date',      value:race.date     },
            (race.city||race.state) && { label:'Location', value:[race.city,race.state].filter(Boolean).join(', ') },
          ].filter(Boolean).map((s,i,arr) => (
            <div key={s.label} style={{ padding: isMobile?'14px 16px 14px 0':'18px 32px 18px 0', flexShrink:0, borderRight:i<arr.length-1?`1px solid ${t.border}`:'none', paddingRight:'32px', marginRight:i<arr.length-1?'32px':0 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: isMobile?'18px':'22px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'3px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding: isMobile?'16px 16px 80px':'32px 40px 80px' }}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'2fr 1fr', gap:'24px', alignItems:'start' }}>

          {/* LEFT COLUMN */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* On mobile: CTA sidebar comes first */}
            {isMobile && <Sidebar />}

            {/* About */}
            {(race.description || detailLoading) && (
              <div style={{ background:t.isDark?t.surface:'#fff', borderRadius:'16px', padding:'24px', border:`1px solid ${t.border}`, animation:'fadeIn 0.3s ease both' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', marginBottom:'14px' }}>About This Race</div>
                {detailLoading && !race.description ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {[100,85,92,70].map((w,i) => <div key={i} style={{ height:'14px', background:t.border, borderRadius:'4px', width:`${w}%`, animation:'pulse 1.5s ease infinite' }} />)}
                  </div>
                ) : (
                  <>
                    <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:t.isDark?t.text:'#4a5568', lineHeight:1.8, fontWeight:300, margin:'0 0 12px' }}
                      dangerouslySetInnerHTML={{ __html: (race.description||'').replace(/<[^>]*>/g,'').slice(0,800)+((race.description||'').length>800?'...':'') }} />
                    <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                      {race.website_url && <a href={race.website_url} target="_blank" rel="noreferrer" style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textDecoration:'none', textTransform:'uppercase' }}>Race Website →</a>}
                      {race.course_map  && <a href={race.course_map}  target="_blank" rel="noreferrer" style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, textDecoration:'none', textTransform:'uppercase' }}>Course Map →</a>}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Events */}
            {events.length > 0 && (() => {
              // Filter to only real race events — skip volunteer, virtual, expo, training, kids, spectator
              const BAD_TYPES = ['volunteer','spectator']
              const BAD_NAMES = ['volunteer','spectator','expo','training','virtual','kids fun','tot trot','dog run','wheelchair','hand cycle']
              const realEvents = events.filter(ev => {
                const type = (ev.event_type||'').toLowerCase()
                const name = (ev.name||'').toLowerCase()
                if (BAD_TYPES.some(b => type.includes(b))) return false
                if (BAD_NAMES.some(b => name.includes(b))) return false
                if (ev.volunteer === 'T') return false
                return true
              })
              if (realEvents.length === 0) return null
              return (
              <div style={{ background:t.isDark?t.surface:'#fff', borderRadius:'16px', padding:'24px', border:`1px solid ${t.border}`, animation:'fadeIn 0.3s ease both' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', marginBottom:'14px' }}>Race Events</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {realEvents.map((ev,i) => {
                    const evc = getDistanceColor(ev.distance||race.distance)
                    const evcl = (ev.distance||'').replace(' mi','').replace(' miles','')
                    const evPrice = extractPrice(ev)
                    return (
                      <div key={i} style={{ padding:'12px 16px', background:t.surfaceAlt, borderRadius:'10px', border:`1px solid ${t.border}`, borderLeft:`3px solid ${evc.stampBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          {evcl && (
                            <div style={{ width:40, height:40, borderRadius:'50%', border:`2px solid ${evc.stampBorder}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
                              <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:`0.75px dashed ${evc.stampDash}` }} />
                              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:evcl.length>4?8:evcl.length>2?11:14, color:evc.stampText, position:'relative', zIndex:1 }}>{evcl}</span>
                            </div>
                          )}
                          <div>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text, letterSpacing:'0.5px' }}>{ev.name||ev.distance||'Event'}</div>
                            {ev.start_time && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>Start: {ev.start_time}</div>}
                          </div>
                        </div>
                        {evPrice && <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#C9A84C', flexShrink:0 }}>${evPrice}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
              )
            })()}

            {/* Apple Maps */}
            {race.lat && race.lng && (
              <div style={{ animation:'fadeIn 0.3s ease both' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', marginBottom:'12px' }}>Race Location</div>
                <AppleMapCard race={race} t={t} />
              </div>
            )}

            {/* Share */}
            <div style={{ animation:'fadeIn 0.3s ease both' }}>
              <ShareButton race={race} t={t} />
            </div>

            {/* Suggested gear (only when registered) */}
            {signedUp && <SuggestedGear race={race} t={t} />}
          </div>

          {/* RIGHT SIDEBAR — desktop only (mobile shown above) */}
          {!isMobile && <Sidebar />}
        </div>
      </div>

      {showSignupBanner && !signedUp && <SignupBanner race={race} onYes={() => { setShowSignupBanner(false); setShowSignupModal(true) }} onNo={() => setShowSignupBanner(false)} />}
      {showSignupModal && <SignupModal race={race} onSave={handleSignupSave} onClose={() => setShowSignupModal(false)} t={t} />}
    </div>
  )

  // Sidebar — extracted as inner function so it can use all state
  function Sidebar() {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

        {/* Countdown + date */}
        <CountdownCard race={race} price={price} t={t} />

        {/* Register CTA */}
        {signedUp ? (
          <div style={{ background:t.isDark?t.surface:'#fff', borderRadius:'14px', padding:'18px', border:`1px solid ${t.border}` }}>
            <div style={{ padding:'12px', borderRadius:'10px', background:'rgba(201,168,76,0.1)', border:'1.5px solid rgba(201,168,76,0.3)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase', textAlign:'center', marginBottom:'10px' }}>✓ You're Registered</div>
            {!showCancelConfirm ? (
              <button onClick={() => setShowCancelConfirm(true)} style={{ width:'100%', padding:'6px', border:'none', background:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, cursor:'pointer', textAlign:'center' }}
                onMouseEnter={e => e.currentTarget.style.color='#c53030'} onMouseLeave={e => e.currentTarget.style.color=t.textMuted}>Cancel registration</button>
            ) : (
              <div style={{ background:'rgba(197,48,48,0.06)', border:'1px solid rgba(197,48,48,0.2)', borderRadius:'10px', padding:'12px' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.text, marginBottom:'10px', textAlign:'center' }}>Remove this race?</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setShowCancelConfirm(false)} style={{ flex:1, padding:'8px', border:`1px solid ${t.border}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}>Keep</button>
                  <button onClick={handleCancelRegistration} style={{ flex:1, padding:'8px', border:'1px solid rgba(197,48,48,0.4)', borderRadius:'8px', background:'rgba(197,48,48,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#c53030', cursor:'pointer', textTransform:'uppercase' }}>Remove</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <button className="rd-register-btn" onClick={() => handleRegisterClick(registrationUrl)}
              style={{ width:'100%', padding:'15px', border:'none', borderRadius:'12px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'2px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}>
              Register on RunSignup →
            </button>
            {!showSignupBanner && (
              <button onClick={() => setShowSignupBanner(true)} style={{ width:'100%', padding:'6px', border:'none', background:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, cursor:'pointer', textAlign:'center' }}
                onMouseEnter={e => e.currentTarget.style.color=t.text} onMouseLeave={e => e.currentTarget.style.color=t.textMuted}>
                Already registered? Tap here →
              </button>
            )}
          </div>
        )}

        {/* Weather */}
        {weather && <WeatherCard weather={weather} t={t} />}

        {/* Source badge */}
        <div style={{ background:t.isDark?t.surface:'#fff', borderRadius:'12px', padding:'12px 14px', border:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:30, height:30, borderRadius:'8px', background:t.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'10px', color:'#2563EB', letterSpacing:'0.5px' }}>RS</span>
          </div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:t.text }}>{race.city || race.location}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted }}>via RunSignup</div>
          </div>
        </div>
      </div>
    )
  }
}
