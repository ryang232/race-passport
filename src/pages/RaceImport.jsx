import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'
import { loadRacePhoto, PHOTO_PLACEHOLDER } from '../lib/photos'
import { useStrava } from '../lib/useStrava'

// Confidence score 1-3: 3 = very confident, 1 = less certain
// Higher confidence races appear first
const RYAN_IMPORT_RACES = [
  { id:'r9',  name:'IRONMAN 70.3 Eagleman',          date:'Jun 2025', location:'Cambridge, MD',   city:'Cambridge',   state:'MD', distance:'70.3', time:'6:32:08',source:'ATHLINKS',  confidence:3 },
  { id:'r8',  name:'Austin Half Marathon',            date:'Feb 2025', location:'Austin, TX',      city:'Austin',      state:'TX', distance:'13.1', time:'1:57:40',source:'RUNSIGNUP', confidence:3 },
  { id:'r7',  name:'Downtown Columbia Turkey Trot',   date:'Nov 2024', location:'Columbia, MD',    city:'Columbia',    state:'MD', distance:'5K',   time:'28:16',  source:'RUNSIGNUP', confidence:3 },
  { id:'r5',  name:'Marine Corps Marathon',           date:'Oct 2023', location:'Washington, DC',  city:'Washington',  state:'DC', distance:'26.2', time:'4:45:42',source:'RUNSIGNUP', confidence:3 },
  { id:'r6',  name:'LA Marathon',                     date:'Mar 2022', location:'Los Angeles, CA', city:'Los Angeles', state:'CA', distance:'26.2', time:'4:44:47',source:'RUNSIGNUP', confidence:3 },
  { id:'r1',  name:'Sole of the City 10K',            date:'Oct 2021', location:'Baltimore, MD',   city:'Baltimore',   state:'MD', distance:'10K',  time:'47:49',  source:'RUNSIGNUP', confidence:3 },
  { id:'r2',  name:'Bay Bridge Run',                  date:'Nov 2021', location:'Annapolis, MD',   city:'Annapolis',   state:'MD', distance:'10K',  time:'50:57',  source:'RUNSIGNUP', confidence:2 },
  { id:'r3',  name:'Baltimore Running Festival 10K',  date:'Oct 2021', location:'Baltimore, MD',   city:'Baltimore',   state:'MD', distance:'10K',  time:'58:03',  source:'RUNSIGNUP', confidence:2 },
  { id:'r4',  name:'Holiday Half Marathon',           date:'Dec 2021', location:'Annandale, VA',   city:'Annandale',   state:'VA', distance:'13.1', time:'2:19:05',source:'RUNSIGNUP', confidence:2 },
  { id:'r10', name:'Downtown Columbia Turkey Trot',   date:'Nov 2025', location:'Columbia, MD',    city:'Columbia',    state:'MD', distance:'5K',   time:'35:09',  source:'ATHLINKS',  confidence:1 },
]

function ConfidenceBadge({ score }) {
  const labels = { 3:{ text:'Strong match', color:'#16a34a', bg:'rgba(22,163,74,0.08)', border:'rgba(22,163,74,0.2)' }, 2:{ text:'Likely match', color:'#C9A84C', bg:'rgba(201,168,76,0.08)', border:'rgba(201,168,76,0.2)' }, 1:{ text:'Possible match', color:'#9aa5b4', bg:'rgba(154,165,180,0.08)', border:'rgba(154,165,180,0.2)' } }
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
  const DISTANCES = ['5K','10K','10 Mile','13.1','26.2','70.3','140.6','Ultra','Other']
  const inp = { width:'100%', padding:'10px 13px', borderRadius:'6px', border:'1.5px solid #e2e6ed', background:'#fafbfc', color:'#1B2A4A', fontSize:'14px', fontFamily:"'Barlow',sans-serif", outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'400px', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'4px' }}>Add a Race Manually</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginBottom:'20px' }}>This race will be added to your Passport.</div>
        <div style={{ marginBottom:'12px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'5px' }}>Race Name <span style={{ color:'#C9A84C' }}>*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cherry Blossom 10 Miler" style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'5px' }}>Distance <span style={{ color:'#C9A84C' }}>*</span></label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
            {DISTANCES.map(d => (
              <button key={d} onClick={() => setDist(d)}
                style={{ padding:'7px 12px', borderRadius:'6px', border:`1.5px solid ${distance===d?'#1B2A4A':'#e2e6ed'}`, background:distance===d?'#1B2A4A':'#fafbfc', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:distance===d?'#fff':'#9aa5b4', cursor:'pointer', transition:'all 0.15s' }}>{d}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'24px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'5px' }}>Finish Time <span style={{ fontWeight:400, color:'#b0b8c4', textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
          <input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 1:57:40" style={inp} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', border:'1.5px solid #e2e6ed', borderRadius:'10px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>Cancel</button>
          <button onClick={() => { if (name.trim() && distance) onAdd({ id:`manual_${Date.now()}`, name:name.trim(), distance, time:time.trim(), date:'', location:'', city:'', state:'', source:'MANUAL', confidence:3 }) }}
            disabled={!name.trim() || !distance}
            style={{ flex:2, padding:'11px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s', opacity:(!name.trim()||!distance)?0.5:1 }}
            onMouseEnter={e => { if(name.trim()&&distance) e.currentTarget.style.background='#C9A84C' }}
            onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
            Add to My List →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Not Mine Confirmation Modal ───────────────────────────────────────────────
function NotMineModal({ race, onConfirm, onCancel }) {
  const colors = getDistanceColor(race.distance)
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'380px', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'4px' }}>Not Your Race?</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginBottom:'16px' }}>Double-check this is the one you want to remove:</div>
        {/* Race summary */}
        <div style={{ background:'#f8f9fb', border:`1.5px solid ${colors.stampBorder}`, borderRadius:'10px', padding:'14px 16px', marginBottom:'20px', borderLeft:`4px solid ${colors.stampBorder}` }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', letterSpacing:'0.5px', marginBottom:'3px' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4' }}>{race.location}{race.date ? ` · ${race.date}` : ''}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginTop:'8px' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:colors.stampBorder, background:`${colors.stampBorder}15`, padding:'3px 8px', borderRadius:'4px' }}>{race.distance}</span>
            {race.time && <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A' }}>{race.time}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onCancel} style={{ flex:1, padding:'11px', border:'1.5px solid #e2e6ed', borderRadius:'10px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>Keep It</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'11px', border:'none', borderRadius:'10px', background:'rgba(197,48,48,0.9)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#c53030'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(197,48,48,0.9)'}>
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
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:400, background:'#1B2A4A', borderRadius:'10px', padding:'12px 20px', display:'flex', alignItems:'center', gap:'16px', boxShadow:'0 8px 32px rgba(0,0,0,0.25)', animation:'fadeIn 0.3s ease', whiteSpace:'nowrap' }}>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>
        Removed <strong style={{ color:'#fff' }}>{raceName.length > 24 ? raceName.slice(0,24)+'...' : raceName}</strong>
      </span>
      <button onClick={onUndo} style={{ padding:'5px 14px', border:'1.5px solid rgba(201,168,76,0.5)', borderRadius:'6px', background:'rgba(201,168,76,0.1)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(201,168,76,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(201,168,76,0.1)' }}>
        Undo
      </button>
    </div>
  )
}

function RaceCard({ race, selected, onToggle, onNotMine }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto]     = useState(PHOTO_PLACEHOLDER)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const colors = getDistanceColor(race.distance)

  useEffect(() => {
    loadRacePhoto(race).then(url => { if (url) { setPhoto(url); setPhotoLoaded(true) } })
  }, [race.id])

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'10px', overflow:'hidden', border:selected?`2.5px solid #1B2A4A`:'1.5px solid #e2e6ed', background:'#fff', transition:'border-color 0.15s, transform 0.2s', transform:hovered?'translateY(-3px)':'translateY(0)', position:'relative', cursor:'pointer' }}
      onClick={() => onToggle(race.id)}>

      {/* Source badge */}
      <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(0,0,0,0.55)', borderRadius:'4px', padding:'3px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>
        {race.source}
      </div>

      {/* Navy checkmark */}
      <div style={{ position:'absolute', top:10, right:10, zIndex:10, width:24, height:24, borderRadius:'50%', background:selected?'#1B2A4A':'rgba(255,255,255,0.9)', border:selected?'2px solid #1B2A4A':'2px solid rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
        {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>

      {/* Photo */}
      <div style={{ position:'relative', height:150, background:'#1B2A4A', overflow:'hidden' }}>
        <img src={photo} alt={race.city} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s, opacity 0.4s', transform:hovered?'scale(1.06)':'scale(1)', opacity:photoLoaded?1:0 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.45))' }} />
        {/* Hover overlay — gold finish time */}
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity:hovered?1:0, transition:'opacity 0.2s' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'8px' }}>Finish Time</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'40px', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>{race.time || '—'}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.5)', letterSpacing:'1px', marginTop:'6px', textTransform:'uppercase' }}>{race.distance}</div>
        </div>
        {/* Distance stamp — hides on hover */}
        <div style={{ position:'absolute', bottom:10, left:10, opacity:hovered?0:1, transition:'opacity 0.2s' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', border:'2px solid #1B2A4A', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:'0.75px dashed rgba(27,42,74,0.6)' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:race.distance.length>3?9:race.distance.length>2?11:14, color:'#fff', letterSpacing:'0.5px', position:'relative', zIndex:1 }}>{race.distance.replace(' mi','')}</span>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div style={{ padding:'10px 12px 12px', borderTop:'2px solid rgba(27,42,74,0.08)' }}>
        <div style={{ marginBottom:'6px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#6b7a8d' }}>{race.location}{race.date ? ` · ${race.date}` : ''}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <ConfidenceBadge score={race.confidence} />
          {/* "Not my race" button */}
          <button
            onClick={e => { e.stopPropagation(); onNotMine(race) }}
            style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:'pointer', padding:'3px 6px', borderRadius:'4px', transition:'background 0.15s' }}
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

export default function RaceImport() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()
  const [loading, setLoading]           = useState(true)
  const [loadingStatus, setLoadingStatus] = useState('Connecting to Athlinks...')
  const [races, setRaces]               = useState([])
  const [selected, setSelected]         = useState({})
  const [activeSource, setActiveSource] = useState('ALL')
  const [saving, setSaving]             = useState(false)
  const [firstName, setFirstName]       = useState('Ryan')
  const [profile, setProfile]           = useState(null)
  const [showAddManual, setShowAddManual]   = useState(false)
  const [notMineRace, setNotMineRace]       = useState(null)
  const [undoRace, setUndoRace]             = useState(null)
  const [undoSelected, setUndoSelected]     = useState(null)

  const { connected: stravaConnected, connectStrava, getActivities } = useStrava(profile, user?.id)
  const [stravaScanning, setStravaScanning]   = useState(false)
  const [stravaScanned, setStravaScanned]     = useState(false)
  const [stravaCandidates, setStravaCandidates] = useState([])
  const [showStravaCandidates, setShowStravaCandidates] = useState(false)

  useEffect(() => {
    const run = async () => {
      let fn = locationState?.firstName || 'Ryan'
      if (user && !isDemo(user?.email)) {
        try {
          const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
          if (data?.full_name) fn = data.full_name.split(' ')[0] || fn
        } catch(e) {}
      }
      setFirstName(fn)
      // Load profile for Strava token access
      if (user && !isDemo(user?.email)) {
        try {
          const { data: prof } = await supabase.from('profiles')
            .select('strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
            .eq('id', user.id).single()
          if (prof) setProfile(prof)
        } catch(e) {}
      }

      const steps = [
        { msg:`Connecting to Athlinks...`,           ms:800 },
        { msg:`Searching race history for ${fn}...`, ms:1000 },
        { msg:'Matching race registrations...',      ms:900 },
        { msg:'Pulling finish times & results...',   ms:700 },
        { msg:'Ordering by confidence...',           ms:400 },
      ]
      for (const s of steps) { setLoadingStatus(s.msg); await new Promise(r => setTimeout(r, s.ms)) }

      // Sort by confidence descending
      const sorted = [...RYAN_IMPORT_RACES].sort((a,b) => b.confidence - a.confidence)
      setRaces(sorted)
      const init = {}
      sorted.forEach(r => { init[r.id] = true })
      setSelected(init)
      setLoading(false)
    }
    run()

    const style = document.createElement('style')
    style.id = 'rp-ri-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);}to{transform:translateX(-50%);} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
      @keyframes pulse { 0%,100%{opacity:0.3;}50%{opacity:1;} }
      @keyframes spin { to{transform:rotate(360deg);} }
      @keyframes stravaSlide { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
      .source-tab { padding:7px 16px; border-radius:20px; border:1.5px solid #e2e6ed; background:#fff; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; color:#9aa5b4; }
      .source-tab.active { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .rp-primary { width:100%; padding:15px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s; border-radius:8px; }
      .rp-primary:hover:not(:disabled) { background:#C9A84C; }
      .rp-primary:disabled { opacity:0.5; cursor:not-allowed; }
      .cards-grid { animation:fadeIn 0.5s ease both; }
      div::-webkit-scrollbar { display:none; }
    `
    if (!document.getElementById('rp-ri-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-ri-styles')?.remove()
  }, [user])

  const toggleRace  = id => setSelected(p => ({ ...p, [id]: !p[id] }))

  const handleNotMine = (race) => setNotMineRace(race)

  const confirmNotMine = () => {
    if (!notMineRace) return
    // Snapshot for undo
    setUndoRace(notMineRace)
    setUndoSelected({ ...selected })
    setRaces(p => p.filter(r => r.id !== notMineRace.id))
    setSelected(p => { const n = {...p}; delete n[notMineRace.id]; return n })
    setNotMineRace(null)
  }

  const handleUndo = () => {
    if (!undoRace) return
    setRaces(p => {
      // Re-insert in original position by confidence
      const withBack = [...p, undoRace].sort((a,b) => b.confidence - a.confidence)
      return withBack
    })
    setSelected(undoSelected)
    setUndoRace(null); setUndoSelected(null)
  }

  const handleAddManual = (newRace) => {
    setRaces(p => [{ ...newRace, selected:true }, ...p])
    setSelected(p => ({ ...p, [newRace.id]: true }))
    setShowAddManual(false)
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const allSelected   = races.length > 0 && selectedCount === races.length
  const toggleAll     = () => { const n = {}; races.forEach(r => { n[r.id] = !allSelected }); setSelected(n) }
  const filteredRaces = activeSource === 'ALL' ? races : races.filter(r => r.source === activeSource)

  // Strict race detection for import scanning — much tighter than looksLikeRace
  const isLikelyRace = (a) => {
    const type = (a.type || a.sport_type || '').toLowerCase()
    if (!['run', 'virtualrun'].includes(type)) return false

    const distMi = (a.distance || 0) / 1609.34
    const name   = (a.name || '').toLowerCase()

    // Must match a known race distance within 1% tolerance
    const RACE_DISTANCES = [3.1, 6.2, 9.3, 10, 13.1, 26.2, 31, 50, 70.3, 140.6]
    const exactDist = RACE_DISTANCES.some(d => Math.abs(distMi - d) / d <= 0.01)

    // OR name strongly suggests a race
    const RACE_WORDS = ['race', '5k', '10k', 'half marathon', 'marathon', 'trot', 'triathlon', 'ironman', '70.3', '140.6', 'mile run', 'miler']
    const hasRaceName = RACE_WORDS.some(w => name.includes(w))

    return exactDist || hasRaceName
  }

  // Scan Strava — surfaces candidates for manual review, doesn't auto-add
  const scanStrava = async () => {
    if (stravaScanning || stravaScanned) return
    setStravaScanning(true)
    try {
      // Fetch up to 3 years back
      const threeYearsAgo = Math.floor((Date.now() - 3 * 365 * 24 * 3600 * 1000) / 1000)
      const [page1, page2, page3] = await Promise.all([
        getActivities({ per_page: 60, page: 1, after: threeYearsAgo }),
        getActivities({ per_page: 60, page: 2, after: threeYearsAgo }),
        getActivities({ per_page: 60, page: 3, after: threeYearsAgo }),
      ])
      const allActs = [...page1, ...page2, ...page3]

      // Strict filter
      const raceActs = allActs.filter(isLikelyRace)

      // Deduplicate against existing races by month+year
      const existingKeys = new Set(races.map(r => {
        if (!r.date) return ''
        const d = new Date(r.date)
        return isNaN(d) ? r.date : `${d.getMonth()}-${d.getFullYear()}`
      }))

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

      const candidates = raceActs
        .filter(a => {
          const d = new Date(a.start_date_local)
          return !existingKeys.has(`${d.getMonth()}-${d.getFullYear()}`)
        })
        .map(a => {
          const d     = new Date(a.start_date_local)
          const distMi = (a.distance || 0) / 1609.34
          let distance = `${distMi.toFixed(1)} mi`
          if (Math.abs(distMi - 3.1)   <= 0.1)  distance = '5K'
          else if (Math.abs(distMi - 6.2)  <= 0.15) distance = '10K'
          else if (Math.abs(distMi - 13.1) <= 0.2)  distance = '13.1'
          else if (Math.abs(distMi - 26.2) <= 0.3)  distance = '26.2'
          else if (Math.abs(distMi - 70.3) <= 1)    distance = '70.3'
          else if (Math.abs(distMi - 140.6)<= 2)    distance = '140.6'

          const secs = a.moving_time || 0
          const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60
          const time = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`

          return {
            id:         `strava_${a.id}`,
            name:       a.name || 'Strava Activity',
            date:       `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
            location:   '',
            city:       '',
            state:      '',
            distance,
            time,
            source:     'STRAVA',
            confidence: 2,
          }
        })

      setStravaCandidates(candidates)
      setStravaScanned(true)
    } catch(e) {}
    setStravaScanning(false)
  }

  // Auto-scan when Strava connected and main load is done
  useEffect(() => {
    if (stravaConnected && !stravaScanned && !loading) scanStrava()
  }, [stravaConnected, loading])

  const handleConfirm = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    navigate('/build-passport', { state:{ imported: selectedCount, firstName } })
  }

  const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily:"'Barlow',sans-serif" }}>
        <div style={{ position:'absolute', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
          <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
            {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.055)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
          </div>
        </div>
        <div style={{ position:'relative', zIndex:10, textAlign:'center' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'20px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,48px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'2px', lineHeight:1 }}>SEARCHING FOR YOUR RACES</h1>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', letterSpacing:'1.5px', color:'#9aa5b4', margin:'0 0 32px', textTransform:'uppercase' }}>{loadingStatus}</p>
          <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
            {[0,1,2].map(i => <div key={i} style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#C9A84C', animation:`pulse 1.1s ease-in-out ${i*0.37}s infinite` }} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Barlow',sans-serif", paddingBottom:'40px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.04)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>

      {/* Header */}
      <div style={{ position:'relative', zIndex:1, background:'#fff', padding:'28px 20px 24px', borderBottom:'3px solid #C9A84C', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'8px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', letterSpacing:'3px', color:'#9aa5b4' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'12px' }}>
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
        </div>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 12px', textTransform:'uppercase' }}>Step 2 of 3 — Import Your Races</p>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'20px', padding:'5px 16px', marginBottom:'14px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>{races.length} Races Found</span>
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,48px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'1.5px', lineHeight:1 }}>ARE THESE YOUR RACES?</h1>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:'0 auto', fontWeight:300, lineHeight:1.7, maxWidth:'480px' }}>
          We found your race history, {firstName}. Uncheck anything you don't want, or hit <strong style={{ color:'#c53030' }}>✕ Not mine</strong> to fully remove a card.
        </p>
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:'1000px', margin:'0 auto', padding:'0 20px' }}>
        {/* Filter + select all */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 12px' }}>
          <div style={{ display:'flex', gap:'8px' }}>
            <button className={`source-tab ${activeSource==='ALL'?'active':''}`} onClick={() => setActiveSource('ALL')}>All {races.length}</button>
            <button className={`source-tab ${activeSource==='RUNSIGNUP'?'active':''}`} onClick={() => setActiveSource('RUNSIGNUP')}>RunSignup {races.filter(r=>r.source==='RUNSIGNUP').length}</button>
            <button className={`source-tab ${activeSource==='ATHLINKS'?'active':''}`} onClick={() => setActiveSource('ATHLINKS')}>Athlinks {races.filter(r=>r.source==='ATHLINKS').length}</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{selectedCount} of {races.length} selected</span>
            <button onClick={toggleAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', padding:0 }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Confidence legend */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Ordered by:</span>
          {[{text:'Strong match',color:'#16a34a'},{text:'Likely match',color:'#C9A84C'},{text:'Possible match',color:'#9aa5b4'}].map(l => (
            <div key={l.text} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:l.color }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4' }}>{l.text}</span>
            </div>
          ))}
        </div>

        {/* Cards grid */}
        <div className="cards-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'16px', marginBottom:'24px' }}>
          {filteredRaces.map(race => (
            <RaceCard key={race.id} race={race} selected={!!selected[race.id]} onToggle={toggleRace} onNotMine={handleNotMine} />
          ))}
        </div>

        {/* Combined Missing Race + Strava banner */}
        <div style={{ background:'linear-gradient(135deg,#1B2A4A,#2a3f6a)', borderRadius:'14px', padding:'22px 24px', marginBottom: stravaCandidates.length > 0 ? '0' : '24px', display:'flex', alignItems:'center', gap:'20px', animation:'stravaSlide 0.5s ease 0.3s both', borderBottomLeftRadius: stravaCandidates.length > 0 ? 0 : '14px', borderBottomRightRadius: stravaCandidates.length > 0 ? 0 : '14px' }}>
          <div style={{ width:44, height:44, borderRadius:'10px', background:'rgba(252,76,2,0.15)', border:'1px solid rgba(252,76,2,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, color:'#fff', letterSpacing:'0.5px', marginBottom:'4px' }}>Missing a Race?</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'rgba(255,255,255,0.55)', lineHeight:1.5 }}>
              {stravaScanned && stravaCandidates.length > 0
                ? `Found ${stravaCandidates.length} possible race${stravaCandidates.length !== 1 ? 's' : ''} in your Strava history — review below.`
                : stravaScanned
                ? 'No additional races found in your Strava history.'
                : 'Connect Strava to scan your activities for races you may have missed.'}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', flexShrink:0 }}>
            {stravaConnected ? (
              stravaScanning ? (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px', border:'1.5px solid rgba(252,76,2,0.4)', borderRadius:'8px', background:'rgba(252,76,2,0.08)' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', border:'2px solid #FC4C02', borderTopColor:'transparent', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#FC4C02', textTransform:'uppercase' }}>Scanning...</span>
                </div>
              ) : stravaScanned ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', border:'1.5px solid rgba(252,76,2,0.4)', borderRadius:'8px', background:'rgba(252,76,2,0.08)' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2" stroke="#FC4C02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#FC4C02', textTransform:'uppercase' }}>Strava Scanned</span>
                  </div>
                  {stravaCandidates.length > 0 && (
                    <button onClick={() => setShowStravaCandidates(v => !v)}
                      style={{ padding:'8px 16px', border:'1.5px solid rgba(255,255,255,0.3)', borderRadius:'8px', background:'rgba(255,255,255,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,0.8)', cursor:'pointer', textTransform:'uppercase' }}>
                      {showStravaCandidates ? 'Hide Results' : `Review ${stravaCandidates.length} Found`}
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={scanStrava}
                  style={{ padding:'8px 16px', border:'1.5px solid rgba(252,76,2,0.5)', borderRadius:'8px', background:'rgba(252,76,2,0.1)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#FC4C02', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', whiteSpace:'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(252,76,2,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(252,76,2,0.1)'}>
                  Scan Strava
                </button>
              )
            ) : (
              <button onClick={async () => {
                  const uid = user?.id || profile?.id
                  sessionStorage.setItem('strava_return_to', '/race-import')
                  if (uid) sessionStorage.setItem('strava_user_id', uid)
                  const r = await fetch(`/api/strava?action=auth_url${uid ? `&user_id=${uid}` : ''}`)
                  const d = await r.json()
                  if (d.url) window.location.href = d.url
                }}
                style={{ padding:'8px 16px', border:'1.5px solid rgba(252,76,2,0.5)', borderRadius:'8px', background:'rgba(252,76,2,0.1)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#FC4C02', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', whiteSpace:'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(252,76,2,0.22)'; e.currentTarget.style.borderColor='#FC4C02' }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(252,76,2,0.1)'; e.currentTarget.style.borderColor='rgba(252,76,2,0.5)' }}>
                Connect Strava
              </button>
            )}
            <button onClick={() => setShowAddManual(true)}
              style={{ padding:'8px 16px', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:'8px', background:'rgba(255,255,255,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.7)', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', whiteSpace:'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}>
              Add Manually
            </button>
          </div>
        </div>

        {/* Strava candidates — collapsible review section */}
        {stravaCandidates.length > 0 && showStravaCandidates && (
          <div style={{ background:'rgba(27,42,74,0.04)', border:'1px solid rgba(27,42,74,0.1)', borderTop:'none', borderRadius:'0 0 14px 14px', padding:'16px', marginBottom:'24px' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'12px' }}>
              Tap any activity to add it to your list
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {stravaCandidates.map(r => (
                <div key={r.id} onClick={() => {
                    setRaces(prev => [r, ...prev])
                    setSelected(prev => ({ ...prev, [r.id]: true }))
                    setStravaCandidates(prev => prev.filter(c => c.id !== r.id))
                  }}
                  style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 14px', background:'#fff', borderRadius:'10px', border:'1.5px solid #e2e6ed', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#FC4C02'; e.currentTarget.style.background='rgba(252,76,2,0.02)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e6ed'; e.currentTarget.style.background='#fff' }}>
                  <div style={{ width:36, height:36, borderRadius:'8px', background:'rgba(252,76,2,0.08)', border:'1px solid rgba(252,76,2,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A', letterSpacing:'0.5px', marginBottom:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#6b7a8d' }}>{r.date} · {r.distance} · {r.time}</div>
                  </div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#FC4C02', whiteSpace:'nowrap' }}>+ Add →</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {stravaCandidates.length > 0 && !showStravaCandidates && <div style={{ marginBottom:'24px' }} />}

        {/* Confirm CTA */}
        <button className="rp-primary" onClick={handleConfirm} disabled={saving || selectedCount === 0}>
          {saving ? 'Saving to your Passport...' : `Add ${selectedCount} Race${selectedCount !== 1?'s':''} to My Passport →`}
        </button>

        <p onClick={() => navigate('/build-passport', { state:{ firstName } })}
          style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'14px', cursor:'pointer', letterSpacing:'0.5px' }}>
          Skip import — I'll add races later
        </p>
      </div>

      {/* Modals + toast */}
      {showAddManual && <AddManualRaceModal onAdd={handleAddManual} onClose={() => setShowAddManual(false)} />}
      {notMineRace && <NotMineModal race={notMineRace} onConfirm={confirmNotMine} onCancel={() => setNotMineRace(null)} />}
      {undoRace && <UndoToast raceName={undoRace.name} onUndo={handleUndo} onDismiss={() => { setUndoRace(null); setUndoSelected(null) }} />}
    </div>
  )
}
