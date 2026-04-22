import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'
import { loadRacePhoto, PHOTO_PLACEHOLDER } from '../lib/photos'
import { useStrava } from '../lib/useStrava'

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
const DISTANCES = ['5K','10K','10 mi','13.1','26.2','50K','70.3','140.6','Ultra','Other']

// ── Confidence Badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ score }) {
  const labels = {
    3: { text:'Strong match',   color:'#16a34a', bg:'rgba(22,163,74,0.08)',   border:'rgba(22,163,74,0.2)'   },
    2: { text:'Likely match',   color:'#C9A84C', bg:'rgba(201,168,76,0.08)', border:'rgba(201,168,76,0.2)' },
    1: { text:'Possible match', color:'#9aa5b4', bg:'rgba(154,165,180,0.08)', border:'rgba(154,165,180,0.2)' },
  }
  const l = labels[score] || labels[1]
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', background:l.bg, border:`1px solid ${l.border}`, borderRadius:'10px' }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:l.color }} />
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:l.color, textTransform:'uppercase' }}>{l.text}</span>
    </div>
  )
}

// ── Add Race Manually Modal ───────────────────────────────────────────────────
function AddManualRaceModal({ onAdd, onClose }) {
  const [name, setName]     = useState('')
  const [distance, setDist] = useState('')
  const [time, setTime]     = useState('')
  const inp = { width:'100%', padding:'14px 16px', borderRadius:'10px', border:'1.5px solid #e2e6ed', background:'#fafbfc', color:'#1B2A4A', fontSize:'16px', fontFamily:"'Barlow',sans-serif", outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 24px 48px', width:'100%', maxWidth:'560px', boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'#e2e6ed', margin:'0 auto 24px' }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'4px' }}>Add a Race</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#9aa5b4', marginBottom:'24px' }}>This race will be added to your Passport.</div>
        <div style={{ marginBottom:'16px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Race Name <span style={{ color:'#C9A84C' }}>*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cherry Blossom 10 Miler" style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
        </div>
        <div style={{ marginBottom:'16px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Distance <span style={{ color:'#C9A84C' }}>*</span></label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
            {DISTANCES.map(d => (
              <button key={d} onClick={() => setDist(d)}
                style={{ padding:'9px 14px', borderRadius:'8px', border:`1.5px solid ${distance===d?'#1B2A4A':'#e2e6ed'}`, background:distance===d?'#1B2A4A':'#fafbfc', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:distance===d?'#fff':'#9aa5b4', cursor:'pointer' }}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'28px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Finish Time <span style={{ fontWeight:400, color:'#b0b8c4' }}>(optional)</span></label>
          <input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 1:57:40" style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'14px', border:'1.5px solid #e2e6ed', borderRadius:'12px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>Cancel</button>
          <button onClick={() => { if (name.trim() && distance) onAdd({ id:`manual_${Date.now()}`, name:name.trim(), distance, time:time.trim(), date:'', date_sort:null, location:'', city:'', state:'', source:'MANUAL', confidence:3 }) }}
            disabled={!name.trim() || !distance}
            style={{ flex:2, padding:'14px', border:'none', borderRadius:'12px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#fff', cursor:'pointer', textTransform:'uppercase', opacity:(!name.trim()||!distance)?0.5:1 }}
            onMouseEnter={e => { if(name.trim()&&distance) e.currentTarget.style.background='#C9A84C' }}
            onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
            Add to My List →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Not Mine Modal ────────────────────────────────────────────────────────────
function NotMineModal({ race, onConfirm, onCancel }) {
  const colors = getDistanceColor(race.distance)
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 24px 48px', width:'100%', maxWidth:'560px', boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'#e2e6ed', margin:'0 auto 20px' }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#1B2A4A', marginBottom:'4px' }}>Not Your Race?</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#9aa5b4', marginBottom:'16px' }}>This will be removed from your list.</div>
        <div style={{ background:'#f8f9fb', border:`1.5px solid ${colors.stampBorder}`, borderLeft:`4px solid ${colors.stampBorder}`, borderRadius:'10px', padding:'14px 16px', marginBottom:'20px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', marginBottom:'3px' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4' }}>{race.location}{race.date ? ` · ${race.date}` : ''}</div>
          <div style={{ display:'flex', gap:'12px', marginTop:'8px' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:colors.stampBorder, background:`${colors.stampBorder}15`, padding:'3px 8px', borderRadius:'4px' }}>{race.distance}</span>
            {race.time && <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A' }}>{race.time}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onCancel} style={{ flex:1, padding:'14px', border:'1.5px solid #e2e6ed', borderRadius:'12px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>Keep It</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'14px', border:'none', borderRadius:'12px', background:'rgba(197,48,48,0.9)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#fff', cursor:'pointer', textTransform:'uppercase' }}
            onMouseEnter={e => e.currentTarget.style.background='#c53030'} onMouseLeave={e => e.currentTarget.style.background='rgba(197,48,48,0.9)'}>
            Yes, Remove It
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Undo Toast ────────────────────────────────────────────────────────────────
function UndoToast({ raceName, onUndo, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 5000); return () => clearTimeout(t) }, [])
  return (
    <div style={{ position:'fixed', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:400, background:'#1B2A4A', borderRadius:'12px', padding:'14px 20px', display:'flex', alignItems:'center', gap:'16px', boxShadow:'0 8px 32px rgba(0,0,0,0.25)', whiteSpace:'nowrap' }}>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>
        Removed <strong style={{ color:'#fff' }}>{raceName.length > 24 ? raceName.slice(0,24)+'...' : raceName}</strong>
      </span>
      <button onClick={onUndo} style={{ padding:'5px 14px', border:'1.5px solid rgba(201,168,76,0.5)', borderRadius:'6px', background:'rgba(201,168,76,0.1)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>Undo</button>
    </div>
  )
}

// ── Race Card ─────────────────────────────────────────────────────────────────
function RaceCard({ race, selected, onToggle, onNotMine }) {
  const [hovered, setHovered]         = useState(false)
  const [photo, setPhoto]             = useState(PHOTO_PLACEHOLDER)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const colors  = getDistanceColor(race.distance)
  const cleaned = (race.distance||'').replace(' mi','').replace(' miles','')
  const fs      = cleaned.length > 4 ? 8 : cleaned.length > 2 ? 11 : 14

  useEffect(() => {
    loadRacePhoto(race).then(url => { if (url) { setPhoto(url); setPhotoLoaded(true) } })
  }, [race.id])

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'12px', overflow:'hidden', border:selected?`2.5px solid #1B2A4A`:'1.5px solid #e2e6ed', background:'#fff', transition:'border-color 0.15s, transform 0.2s', transform:hovered?'translateY(-3px)':'none', position:'relative', cursor:'pointer' }}
      onClick={() => onToggle(race.id)}>
      <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(0,0,0,0.55)', borderRadius:'4px', padding:'3px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>{race.source}</div>
      <div style={{ position:'absolute', top:10, right:10, zIndex:10, width:26, height:26, borderRadius:'50%', background:selected?'#1B2A4A':'rgba(255,255,255,0.9)', border:selected?'2px solid #1B2A4A':'2px solid rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
        {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div style={{ position:'relative', height:160, background:'#1B2A4A', overflow:'hidden' }}>
        <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s, opacity 0.4s', transform:hovered?'scale(1.06)':'scale(1)', opacity:photoLoaded?1:0 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.45))' }} />
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity:hovered?1:0, transition:'opacity 0.2s', zIndex:5 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'8px' }}>Finish Time</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'40px', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>{race.time || '—'}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.5)', marginTop:'8px', textTransform:'uppercase' }}>{race.distance}</div>
        </div>
        <div style={{ position:'absolute', bottom:10, left:10, opacity:hovered?0:1, transition:'opacity 0.2s' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', border:'2px solid #1B2A4A', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:'0.75px dashed rgba(27,42,74,0.6)' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:'#fff', position:'relative', zIndex:1 }}>{cleaned}</span>
          </div>
        </div>
      </div>
      <div style={{ padding:'12px 14px', borderTop:'2px solid rgba(27,42,74,0.08)' }}>
        <div style={{ marginBottom:'8px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#6b7a8d' }}>{race.location}{race.date ? ` · ${race.date}` : ''}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <ConfidenceBadge score={race.confidence} />
          <button onClick={e => { e.stopPropagation(); onNotMine(race) }}
            style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:'6px' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(197,48,48,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="#c53030" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#c53030', textTransform:'uppercase' }}>Not mine</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RaceImport() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()

  const [step, setStep]           = useState('search') // 'search' | 'loading' | 'review'
  const [profile, setProfile]     = useState(null)
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [loadingStatus, setLoadingStatus] = useState('')
  const [races, setRaces]         = useState([])
  const [selected, setSelected]   = useState({})
  const [activeSource, setActiveSource] = useState('ALL')
  const [saving, setSaving]       = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [notMineRace, setNotMineRace]     = useState(null)
  const [undoRace, setUndoRace]           = useState(null)
  const [undoSelected, setUndoSelected]   = useState(null)

  const { connected: stravaConnected, getActivities } = useStrava(profile, user?.id)
  const [stravaScanning, setStravaScanning]   = useState(false)
  const [stravaScanned, setStravaScanned]     = useState(false)
  const [stravaCandidates, setStravaCandidates] = useState([])
  const [showStravaCandidates, setShowStravaCandidates] = useState(false)

  // Init — load profile, pre-fill name
  useEffect(() => {
    const init = async () => {
      if (locationState?.firstName) setFirstName(locationState.firstName)
      if (!user || isDemo(user?.email)) { setFirstName('Ryan'); return }
      try {
        const { data } = await supabase.from('profiles')
          .select('full_name,strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
          .eq('id', user.id).single()
        if (data) {
          setProfile(data)
          const parts = (data.full_name||'').trim().split(' ')
          if (parts[0] && !locationState?.firstName) setFirstName(parts[0])
          if (parts.length > 1) setLastName(parts.slice(1).join(' '))
        }
      } catch(e) {}
    }
    init()

    const style = document.createElement('style')
    style.id = 'rp-ri-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);}to{transform:translateX(-50%);} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
      @keyframes pulse { 0%,100%{opacity:0.3;}50%{opacity:1;} }
      @keyframes spin { to{transform:rotate(360deg);} }
      .source-tab { padding:8px 18px; border-radius:20px; border:1.5px solid #e2e6ed; background:#fff; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; color:#9aa5b4; }
      .source-tab.active { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      div::-webkit-scrollbar { display:none; }
    `
    if (!document.getElementById('rp-ri-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-ri-styles')?.remove()
  }, [user])

  useEffect(() => {
    if (stravaConnected && !stravaScanned && step === 'review') scanStrava()
  }, [stravaConnected, step])

  // ── Athlinks search ───────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!firstName.trim() || !lastName.trim()) return
    setStep('loading')
    const statuses = [
      `Searching Athlinks for ${firstName}...`,
      'Scanning race databases...',
      'Pulling finish times & results...',
      'Matching registrations...',
      'Ordering by confidence...',
    ]
    let idx = 0
    setLoadingStatus(statuses[0])
    const iv = setInterval(() => { idx = Math.min(idx+1, statuses.length-1); setLoadingStatus(statuses[idx]) }, 900)

    try {
      const q = new URLSearchParams({ action:'search_results', name:`${firstName.trim()} ${lastName.trim()}`, ...(birthYear.trim() ? { birth_year:birthYear.trim() } : {}) })
      const resp = await fetch(`/api/athlinks?${q}`)
      const data = await resp.json()
      clearInterval(iv)
      const results = data.results || []
      setRaces(results)
      const init = {}
      results.forEach(r => { init[r.id] = r.confidence >= 2 })
      setSelected(init)
    } catch(e) {
      clearInterval(iv)
      setRaces([])
      setSelected({})
    }
    setStep('review')
  }

  // ── Strava scan ───────────────────────────────────────────────────────────
  const isLikelyRace = a => {
    const type = (a.type||a.sport_type||'').toLowerCase()
    const distMi = (a.distance||0)/1609.34
    const name = (a.name||'').toLowerCase()
    if (!['run','virtualrun'].includes(type)) return false
    const DISTS = [3.1,6.2,9.3,10,13.1,26.2,31,50]
    const byDist = DISTS.some(d => Math.abs(distMi-d)/d <= 0.01)
    const WORDS = ['race','5k','10k','half marathon','marathon','trot','triathlon','ironman','70.3','140.6','miler']
    return byDist || WORDS.some(w => name.includes(w))
  }

  const scanStrava = async () => {
    if (stravaScanning || stravaScanned) return
    setStravaScanning(true)
    try {
      const ago = Math.floor((Date.now() - 3*365*24*3600*1000)/1000)
      const [p1,p2,p3] = await Promise.all([
        getActivities({ per_page:60, page:1, after:ago }),
        getActivities({ per_page:60, page:2, after:ago }),
        getActivities({ per_page:60, page:3, after:ago }),
      ])
      const all = [...p1,...p2,...p3].filter(isLikelyRace)
      const existKeys = new Set(races.map(r => {
        const d = r.date_sort ? new Date(r.date_sort) : null
        return d && !isNaN(d) ? `${d.getMonth()}-${d.getFullYear()}` : ''
      }))
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const candidates = all
        .filter(a => { const d = new Date(a.start_date_local); return !existKeys.has(`${d.getMonth()}-${d.getFullYear()}`) })
        .map(a => {
          const d = new Date(a.start_date_local)
          const mi = (a.distance||0)/1609.34
          let dist = `${mi.toFixed(1)} mi`
          if (Math.abs(mi-3.1)<=0.1) dist='5K'
          else if (Math.abs(mi-6.2)<=0.15) dist='10K'
          else if (Math.abs(mi-13.1)<=0.2) dist='13.1'
          else if (Math.abs(mi-26.2)<=0.3) dist='26.2'
          const s=a.moving_time||0, h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60
          const time = h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`
          return { id:`strava_${a.id}`, name:a.name||'Strava Activity', date:`${MONTHS[d.getMonth()]} ${d.getFullYear()}`, date_sort:d.toISOString().split('T')[0], location:'', city:'', state:'', distance:dist, time, source:'STRAVA', confidence:2 }
        })
      setStravaCandidates(candidates)
      setStravaScanned(true)
    } catch(e) {}
    setStravaScanning(false)
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleRace    = id => setSelected(p => ({ ...p, [id]:!p[id] }))
  const toggleAll     = () => { const n={}; races.forEach(r => { n[r.id]=!allSelected }); setSelected(n) }
  const confirmNotMine = () => {
    if (!notMineRace) return
    setUndoRace(notMineRace); setUndoSelected({...selected})
    setRaces(p => p.filter(r => r.id!==notMineRace.id))
    setSelected(p => { const n={...p}; delete n[notMineRace.id]; return n })
    setNotMineRace(null)
  }
  const handleUndo = () => {
    if (!undoRace) return
    setRaces(p => [...p, undoRace].sort((a,b) => b.confidence-a.confidence))
    setSelected(undoSelected)
    setUndoRace(null); setUndoSelected(null)
  }
  const handleAddManual = r => { setRaces(p => [r,...p]); setSelected(p => ({...p,[r.id]:true})); setShowAddManual(false) }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (userId) {
        const toInsert = races.filter(r => selected[r.id]).map(r => ({
          user_id:userId, name:r.name, date:r.date, date_sort:r.date_sort||null,
          location:r.location||'', city:r.city||'', state:r.state||'',
          distance:r.distance, time:r.time||'', source:r.source, confidence:r.confidence||2,
        }))
        if (toInsert.length > 0) {
          await supabase.from('passport_races').upsert(toInsert, { onConflict:'user_id,name,date', ignoreDuplicates:true })
        }
      }
    } catch(e) { console.error('Save error:', e) }
    setSaving(false)
    navigate('/build-passport', { state:{ imported:selectedCount, firstName } })
  }

  const selectedCount  = Object.values(selected).filter(Boolean).length
  const allSelected    = races.length > 0 && selectedCount === races.length
  const filteredRaces  = activeSource==='ALL' ? races : races.filter(r => r.source===activeSource)
  const sources        = [...new Set(races.map(r => r.source))]

  // ── Input style helper ────────────────────────────────────────────────────
  const inputStyle = {
    width:'100%', padding:'16px 18px', borderRadius:'14px', border:'2px solid #e2e6ed',
    background:'#fafbfc', color:'#1B2A4A', fontSize:'18px', fontFamily:"'Barlow',sans-serif",
    outline:'none', boxSizing:'border-box', transition:'border-color 0.2s',
    WebkitAppearance:'none',
  }

  // ── Ticker background ─────────────────────────────────────────────────────
  const TickerBg = () => (
    <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
      <div style={{ display:'inline-flex', animation:'tickerScroll 60s linear infinite' }}>
        {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.04)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
      </div>
    </div>
  )

  // ── Loading screen ────────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
      <TickerBg />
      <div style={{ position:'relative', zIndex:10, textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'20px' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,48px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'2px' }}>SEARCHING FOR YOUR RACES</h1>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', letterSpacing:'1.5px', color:'#9aa5b4', margin:'0 0 32px', textTransform:'uppercase' }}>{loadingStatus}</p>
        <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
          {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C', animation:`pulse 1.1s ease-in-out ${i*0.37}s infinite` }} />)}
        </div>
      </div>
    </div>
  )

  // ── Search screen ─────────────────────────────────────────────────────────
  if (step === 'search') return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Barlow',sans-serif", position:'relative', overflow:'hidden' }}>
      <TickerBg />
      <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'40px 0' }}>
        <div style={{ maxWidth:'480px', width:'100%', padding:'0 24px', animation:'fadeIn 0.4s ease both' }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:'40px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', marginBottom:'20px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', letterSpacing:'3px', color:'#9aa5b4' }}>RACE PASSPORT</span>
            </div>
            <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'16px' }}>
              <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
              <div style={{ height:'3px', width:'36px', background:'#C9A84C', borderRadius:'2px' }} />
              <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
            </div>
            <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 16px', textTransform:'uppercase' }}>Step 2 of 3 — Import Your Races</p>
            <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,8vw,52px)', color:'#1B2A4A', margin:'0 0 12px', letterSpacing:'1.5px', lineHeight:1 }}>
              FIND YOUR<br/>RACE HISTORY
            </h1>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.7 }}>
              We'll search Athlinks for your race results. Enter your name as it appears on race bibs.
            </p>
          </div>

          {/* Inputs */}
          <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginBottom:'28px' }}>
            <div>
              <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ryan" style={inputStyle}
                onFocus={e => { e.target.style.borderColor='#1B2A4A'; e.target.style.boxShadow='0 0 0 3px rgba(27,42,74,0.08)' }}
                onBlur={e => { e.target.style.borderColor='#e2e6ed'; e.target.style.boxShadow='none' }}
                autoCapitalize="words" autoCorrect="off" />
            </div>
            <div>
              <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Groene" style={inputStyle}
                onFocus={e => { e.target.style.borderColor='#1B2A4A'; e.target.style.boxShadow='0 0 0 3px rgba(27,42,74,0.08)' }}
                onBlur={e => { e.target.style.borderColor='#e2e6ed'; e.target.style.boxShadow='none' }}
                autoCapitalize="words" autoCorrect="off" />
            </div>
            <div>
              <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>
                Birth Year <span style={{ fontWeight:400, color:'#b0b8c4', letterSpacing:0, textTransform:'none' }}>(helps narrow results)</span>
              </label>
              <input value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1990" style={inputStyle}
                onFocus={e => { e.target.style.borderColor='#1B2A4A'; e.target.style.boxShadow='0 0 0 3px rgba(27,42,74,0.08)' }}
                onBlur={e => { e.target.style.borderColor='#e2e6ed'; e.target.style.boxShadow='none' }}
                inputMode="numeric" maxLength={4} />
            </div>
          </div>

          <button onClick={handleSearch} disabled={!firstName.trim() || !lastName.trim()}
            style={{ width:'100%', padding:'18px', border:'none', borderRadius:'14px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, letterSpacing:'2px', color:'#fff', cursor:'pointer', textTransform:'uppercase', opacity:(!firstName.trim()||!lastName.trim())?0.5:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}
            onMouseEnter={e => { if(firstName.trim()&&lastName.trim()) e.currentTarget.style.background='#C9A84C' }}
            onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
            Find My Races →
          </button>

          <p style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'16px', lineHeight:1.6 }}>
            We only read your public race results. Nothing is posted or modified.
          </p>

          <p onClick={() => navigate('/build-passport', { state:{ firstName } })}
            style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'8px', cursor:'pointer' }}>
            Skip — I'll add races later
          </p>
        </div>
      </div>
    </div>
  )

  // ── Review screen ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Barlow',sans-serif", paddingBottom:'40px', position:'relative', overflow:'hidden' }}>
      <TickerBg />

      {/* Header */}
      <div style={{ position:'relative', zIndex:1, background:'#fff', padding:'28px 20px 24px', borderBottom:'3px solid #C9A84C', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'8px' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', letterSpacing:'3px', color:'#9aa5b4' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'12px' }}>
          <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'36px', background:'#C9A84C', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
        </div>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 12px', textTransform:'uppercase' }}>Step 2 of 3 — Import Your Races</p>

        {races.length > 0 ? (
          <>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'20px', padding:'5px 16px', marginBottom:'14px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>{races.length} Races Found on Athlinks</span>
            </div>
            <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,48px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'1.5px', lineHeight:1 }}>ARE THESE YOUR RACES?</h1>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:'0 auto', fontWeight:300, lineHeight:1.7, maxWidth:'480px' }}>
              Uncheck anything that isn't yours, or tap <strong style={{ color:'#c53030' }}>✕ Not mine</strong> to remove it completely.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,5vw,44px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'1.5px', lineHeight:1 }}>NO RESULTS FOUND</h1>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:'0 auto 14px', fontWeight:300, lineHeight:1.7, maxWidth:'480px' }}>
              We couldn't find races for <strong>{firstName} {lastName}</strong> on Athlinks. Connect Strava or add races manually below.
            </p>
            <button onClick={() => setStep('search')}
              style={{ padding:'8px 20px', border:'1.5px solid #1B2A4A', borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase' }}>
              ← Try Different Name
            </button>
          </>
        )}
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:'1000px', margin:'0 auto', padding:'0 20px' }}>

        {races.length > 0 && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 12px', gap:'12px', flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <button className={`source-tab ${activeSource==='ALL'?'active':''}`} onClick={() => setActiveSource('ALL')}>All {races.length}</button>
                {sources.map(src => (
                  <button key={src} className={`source-tab ${activeSource===src?'active':''}`} onClick={() => setActiveSource(src)}>
                    {src} {races.filter(r=>r.source===src).length}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{selectedCount} of {races.length} selected</span>
                <button onClick={toggleAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', padding:0 }}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Confidence:</span>
              {[{text:'Strong match',color:'#16a34a'},{text:'Likely match',color:'#C9A84C'},{text:'Possible match',color:'#9aa5b4'}].map(l => (
                <div key={l.text} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:l.color }} />
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4' }}>{l.text}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'16px', marginBottom:'24px', animation:'fadeIn 0.5s ease both' }}>
              {filteredRaces.map(race => (
                <RaceCard key={race.id} race={race} selected={!!selected[race.id]} onToggle={toggleRace} onNotMine={r => setNotMineRace(r)} />
              ))}
            </div>
          </>
        )}

        {/* Strava / add more banner */}
        <div style={{ background:'#fff', borderRadius:'14px', padding:'20px 24px', marginBottom: stravaCandidates.length>0&&showStravaCandidates ? 0 : '24px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap', border:'1.5px solid #e2e6ed', borderBottomLeftRadius:stravaCandidates.length>0&&showStravaCandidates?0:'14px', borderBottomRightRadius:stravaCandidates.length>0&&showStravaCandidates?0:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px', flex:1 }}>
            <div style={{ width:44, height:44, borderRadius:'10px', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', letterSpacing:'1px', lineHeight:1, marginBottom:'4px' }}>
                {stravaScanned && stravaCandidates.length > 0 ? `${stravaCandidates.length} More Found on Strava` : 'Missing a Race?'}
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#6b7a8d' }}>
                {stravaScanned && stravaCandidates.length > 0 ? 'Tap any activity below to add it.'
                  : stravaScanned ? 'No additional races found in Strava.'
                  : 'Connect Strava or add races manually.'}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
            {stravaConnected ? (
              stravaScanning
                ? <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 16px', border:'1.5px solid rgba(252,76,2,0.3)', borderRadius:'8px', background:'rgba(252,76,2,0.05)' }}><div style={{ width:10, height:10, borderRadius:'50%', border:'2px solid #FC4C02', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} /><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#FC4C02', textTransform:'uppercase' }}>Scanning...</span></div>
                : <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 14px', border:'1.5px solid rgba(252,76,2,0.25)', borderRadius:'8px', background:'rgba(252,76,2,0.05)' }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2" stroke="#FC4C02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#FC4C02', textTransform:'uppercase' }}>Connected</span></div>
            ) : (
              <button onClick={async () => {
                  const uid = user?.id
                  sessionStorage.setItem('strava_return_to', '/race-import')
                  if (uid) sessionStorage.setItem('strava_user_id', uid)
                  const r = await fetch(`/api/strava?action=auth_url${uid?`&user_id=${uid}`:''}`)
                  const d = await r.json()
                  if (d.url) window.location.href = d.url
                }} style={{ padding:'9px 18px', border:'none', borderRadius:'8px', background:'#FC4C02', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}>
                Connect Strava
              </button>
            )}
            {stravaScanned && stravaCandidates.length > 0 && (
              <button onClick={() => setShowStravaCandidates(v => !v)}
                style={{ padding:'9px 16px', border:`1.5px solid #1B2A4A`, borderRadius:'8px', background:showStravaCandidates?'#1B2A4A':'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:showStravaCandidates?'#fff':'#1B2A4A', cursor:'pointer', textTransform:'uppercase' }}>
                {showStravaCandidates ? 'Hide' : `Review ${stravaCandidates.length} →`}
              </button>
            )}
            <button onClick={() => setShowAddManual(true)}
              style={{ padding:'9px 16px', border:'1.5px solid #e2e6ed', borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#6b7a8d', cursor:'pointer', textTransform:'uppercase' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#1B2A4A'; e.currentTarget.style.color='#1B2A4A' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e6ed'; e.currentTarget.style.color='#6b7a8d' }}>
              + Add Manually
            </button>
          </div>
        </div>

        {stravaCandidates.length > 0 && showStravaCandidates && (
          <div style={{ background:'rgba(27,42,74,0.04)', border:'1px solid rgba(27,42,74,0.1)', borderTop:'none', borderRadius:'0 0 14px 14px', padding:'16px', marginBottom:'24px' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'12px' }}>Tap to add to your list</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {stravaCandidates.map(r => (
                <div key={r.id}
                  onClick={() => { setRaces(p => [r,...p]); setSelected(p => ({...p,[r.id]:true})); setStravaCandidates(p => p.filter(c => c.id!==r.id)) }}
                  style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 14px', background:'#fff', borderRadius:'10px', border:'1.5px solid #e2e6ed', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#FC4C02'; e.currentTarget.style.background='rgba(252,76,2,0.02)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e6ed'; e.currentTarget.style.background='#fff' }}>
                  <div style={{ width:36, height:36, borderRadius:'8px', background:'rgba(252,76,2,0.08)', border:'1px solid rgba(252,76,2,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A', marginBottom:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#6b7a8d' }}>{r.date} · {r.distance} · {r.time}</div>
                  </div>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#FC4C02', flexShrink:0 }}>+ Add →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleConfirm} disabled={saving || selectedCount === 0}
          style={{ width:'100%', padding:'17px', border:'none', borderRadius:'12px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'2px', color:'#fff', cursor:'pointer', textTransform:'uppercase', opacity:selectedCount===0?0.5:1, transition:'background 0.2s' }}
          onMouseEnter={e => { if(selectedCount>0&&!saving) e.currentTarget.style.background='#C9A84C' }}
          onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
          {saving ? 'Saving to your Passport...' : `Add ${selectedCount} Race${selectedCount!==1?'s':''} to My Passport →`}
        </button>

        <p onClick={() => navigate('/build-passport', { state:{ firstName } })}
          style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'14px', cursor:'pointer' }}>
          Skip — I'll add races later
        </p>
      </div>

      {showAddManual && <AddManualRaceModal onAdd={handleAddManual} onClose={() => setShowAddManual(false)} />}
      {notMineRace   && <NotMineModal race={notMineRace} onConfirm={confirmNotMine} onCancel={() => setNotMineRace(null)} />}
      {undoRace      && <UndoToast raceName={undoRace.name} onUndo={handleUndo} onDismiss={() => { setUndoRace(null); setUndoSelected(null) }} />}
    </div>
  )
}
