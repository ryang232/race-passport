import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchUnsplashPhoto, getFallback } from '../lib/unsplash'
import { isDemo, DEMO_EMAIL } from '../lib/demo'

function isGoldDistance(dist) {
  const d = dist.toLowerCase().replace(/\s/g,'')
  if (['26.2','marathon','50k','50m','100k','100m','70.3','140.6'].includes(d)) return true
  const n = parseFloat(d); return !isNaN(n) && n >= 26.2
}

// Normalize distance string from RunSignup event names
function normalizeDistance(event) {
  const name = (event?.name || event?.event_name || '').toLowerCase()
  const dist = (event?.distance || '').toString().toLowerCase()

  if (name.includes('marathon') && !name.includes('half') && !name.includes('mini')) return '26.2'
  if (name.includes('half marathon') || name.includes('half-marathon')) return '13.1'
  if (name.includes('ironman 70.3') || name.includes('70.3')) return '70.3'
  if (name.includes('ironman') || name.includes('140.6')) return '140.6'
  if (name.includes('10k') || dist.includes('10k')) return '10K'
  if (name.includes('5k') || dist.includes('5k')) return '5K'
  if (name.includes('10 mile') || name.includes('10-mile') || name.includes('10mi')) return '10 mi'
  if (name.includes('15k') || dist.includes('15k')) return '15K'
  if (name.includes('50k') || dist.includes('50k')) return '50K'
  if (name.includes('ultra')) return 'Ultra'

  // Fall back to raw distance if available
  if (dist) return dist.toUpperCase()
  return 'Race'
}

function formatTime(seconds) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

function Stamp({ distance, size = 52 }) {
  const gold = isGoldDistance(distance)
  const color = gold ? '#C9A84C' : '#1B2A4A'
  const bg = gold ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.95)'
  const cleaned = distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 10 : cleaned.length > 2 ? 13 : 17
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${color}`, background:bg, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:`0.75px dashed ${gold ? 'rgba(201,168,76,0.35)' : 'rgba(27,42,74,0.2)'}` }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color, lineHeight:1, letterSpacing:'0.04em', position:'relative', zIndex:1, textAlign:'center', padding:'0 3px' }}>{cleaned}</div>
    </div>
  )
}

function RaceCard({ race, selected, onToggle }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    const query = race.city
      ? `${race.city} ${race.state || ''} city running race`
      : 'running race road city'
    fetchUnsplashPhoto(query, 'running').then(url => setPhoto(url))
  }, [race.city, race.state])

  return (
    <div onClick={() => onToggle(race.id)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'10px', overflow:'hidden', border: selected ? '2.5px solid #C9A84C' : '1.5px solid #e2e6ed', background:'#fff', cursor:'pointer', transition:'border-color 0.15s,transform 0.2s', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', position:'relative' }}>
      <div style={{ position:'absolute', top:10, right:10, zIndex:10, width:24, height:24, borderRadius:'50%', background: selected ? '#C9A84C' : 'rgba(255,255,255,0.9)', border: selected ? '2px solid #C9A84C' : '2px solid rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
        {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(0,0,0,0.55)', borderRadius:'4px', padding:'3px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>
        {race.source}
      </div>
      <div style={{ position:'relative', height:160, background:'#1B2A4A', overflow:'hidden' }}>
        {photo ? (
          <img src={photo} alt={race.location} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1B2A4A,#2a3f6a)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:28, height:28, border:'2.5px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.4))' }} />
        {/* Hover finish time */}
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity: hovered ? 1 : 0, transition:'opacity 0.2s ease' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'8px' }}>Finish Time</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'48px', color: race.time ? '#C9A84C' : 'rgba(255,255,255,0.3)', letterSpacing:'2px', lineHeight:1 }}>{race.time || 'N/A'}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.5)', letterSpacing:'1px', marginTop:'8px', textTransform:'uppercase' }}>{race.distance}</div>
        </div>
      </div>
      <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#6b7a8d', letterSpacing:'0.5px' }}>{race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#b0b8c4', letterSpacing:'0.5px', marginTop:'1px' }}>{race.date}</div>
        </div>
        <Stamp distance={race.distance} size={52} />
      </div>
    </div>
  )
}

// Parse RunSignup results response into our race format
function parseRunSignupResults(data) {
  const results = data?.results || data?.race_results || []
  return results.map((r, idx) => {
    const event = r.event || {}
    const race = r.race || {}
    const result = r.result || r

    const city = race.address?.city || result.city || ''
    const state = race.address?.state || result.state || ''

    return {
      id: `rs-${r.race_id || idx}-${r.event_id || idx}`,
      name: race.name || result.race_name || 'Unknown Race',
      date: r.start_time ? new Date(r.start_time).toLocaleDateString('en-US', { month:'short', year:'numeric' }) : (result.date || ''),
      location: [city, state].filter(Boolean).join(', ') || 'Unknown',
      city,
      state,
      distance: normalizeDistance(event),
      time: result.clock_time ? formatTime(parseInt(result.clock_time)) : (result.chip_time || result.time || null),
      source: 'RUNSIGNUP',
      race_id: r.race_id,
      event_id: r.event_id,
    }
  }).filter(r => r.name !== 'Unknown Race')
}

export default function RaceImport() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState('Connecting to RunSignup...')
  const [races, setRaces] = useState([])
  const [selected, setSelected] = useState({})
  const [activeSource, setActiveSource] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadAndSearch = async () => {
      // Pull name from location state (passed from BuildPassport) or profile
      let fn = locationState?.firstName || 'Ryan'
      let ln = ''

      if (user && !isDemo(user?.email)) {
        try {
          const { data } = await supabase.from('profiles').select('full_name,date_of_birth').eq('id', user.id).single()
          if (data) {
            const parts = (data.full_name || '').trim().split(' ')
            fn = parts[0] || fn
            ln = parts.slice(1).join(' ') || ln
            setDob(data.date_of_birth || '')
          }
        } catch(e) {}
      }

      setFirstName(fn)
      setLastName(ln)

      // Show animated loading steps, then reveal dummy races
      const steps = [
        { msg: `Searching RunSignup for ${fn}${ln ? ' ' + ln : ''}...`, delay: 900 },
        { msg: 'Matching race registrations...', delay: 900 },
        { msg: 'Pulling finish times...', delay: 700 },
        { msg: 'Building your passport...', delay: 600 },
      ]

      for (const step of steps) {
        setLoadingStatus(step.msg)
        await new Promise(r => setTimeout(r, step.delay))
      }

      // Use dummy races passed from BuildPassport, or fall back to defaults
      const dummy = locationState?.dummyRaces || [
        { id:'d1', name:'Marine Corps Marathon', date:'Oct 29, 2023', location:'Arlington, VA', distance:'26.2', time:'4:12:08', source:'RUNSIGNUP', city:'Arlington', state:'VA', selected:true },
        { id:'d2', name:"Rock 'N' Roll Nashville Half", date:'Apr 30, 2022', location:'Nashville, TN', distance:'13.1', time:'1:58:44', source:'RUNSIGNUP', city:'Nashville', state:'TN', selected:true },
        { id:'d3', name:'Broad Street Run', date:'May 1, 2022', location:'Philadelphia, PA', distance:'10K', time:'1:01:22', source:'ATHLINKS', city:'Philadelphia', state:'PA', selected:true },
        { id:'d4', name:'Turkey Trot 5K', date:'Nov 24, 2022', location:'Chicago, IL', distance:'5K', time:'26:14', source:'RUNSIGNUP', city:'Chicago', state:'IL', selected:false },
      ]

      setRaces(dummy)
      const init = {}
      dummy.forEach(r => { init[r.id] = r.selected !== false })
      setSelected(init)
      setLoading(false)
    }

    loadAndSearch()

    const style = document.createElement('style')
    style.id = 'rp-ri-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
      @keyframes pulse { 0%,100%{opacity:0.3;} 50%{opacity:1;} }
      @keyframes spin { to{transform:rotate(360deg);} }
      .source-tab { padding:7px 16px; border-radius:20px; border:1.5px solid #e2e6ed; background:#fff; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; color:#9aa5b4; }
      .source-tab.active { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .rp-primary { width:100%; padding:15px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s; border-radius:8px; }
      .rp-primary:hover:not(:disabled) { background:#C9A84C; }
      .rp-primary:disabled { opacity:0.5; cursor:not-allowed; }
      .cards-grid { animation:fadeIn 0.4s ease both; }
    `
    if (!document.getElementById('rp-ri-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-ri-styles')?.remove()
  }, [user])

  const toggleRace = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  const selectedCount = Object.values(selected).filter(Boolean).length
  const allSelected = races.length > 0 && selectedCount === races.length
  const toggleAll = () => {
    const next = {}
    races.forEach(r => { next[r.id] = !allSelected })
    setSelected(next)
  }

  const filteredRaces = activeSource === 'ALL' ? races : races.filter(r => r.source === activeSource)
  const runSignupCount = races.filter(r => r.source === 'RUNSIGNUP').length
  const athlinksCount = races.filter(r => r.source === 'ATHLINKS').length

  const handleConfirm = async () => {
    setSaving(true)
    // TODO: save selected races to race_history table in Supabase
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    navigate('/home', { state: { imported: selectedCount } })
  }

  const formatDob = (d) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${dt.getFullYear()}`
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
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'42px', color:'#1B2A4A', margin:'0 0 8px', letterSpacing:'2px', lineHeight:1 }}>SEARCHING FOR YOUR RACES</h1>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', letterSpacing:'1.5px', color:'#9aa5b4', margin:'0 0 28px', textTransform:'uppercase' }}>{loadingStatus}</p>
          <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
            {[0,1,2].map(i => <div key={i} style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C', animation:`pulse 1.1s ease-in-out ${i*0.37}s infinite` }} />)}
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
          <div style={{ height:'3px', width:'40px', background:'#e2e6ed', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
        </div>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 12px', textTransform:'uppercase' }}>Step 2 of 2 — Import Your Races</p>

        <>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'20px', padding:'5px 14px', marginBottom:'14px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>{races.length} Races Found on RunSignup</span>
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'48px', color:'#1B2A4A', margin:'0 0 12px', letterSpacing:'1.5px', lineHeight:1 }}>ARE THESE YOUR RACES?</h1>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.7, maxWidth:'480px', marginLeft:'auto', marginRight:'auto' }}>
            We searched using <strong style={{ color:'#1B2A4A', fontWeight:500 }}>{firstName} {lastName}</strong>.
            {' '}Uncheck anything you don't recognize, or don't want to include on your Race Passport.
          </p>
        </>
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:'960px', margin:'0 auto', padding:'0 20px' }}>

        {races.length > 0 && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 12px' }}>
              <div style={{ display:'flex', gap:'8px' }}>
                <button className={`source-tab ${activeSource === 'ALL' ? 'active' : ''}`} onClick={() => setActiveSource('ALL')}>All {races.length}</button>
                {runSignupCount > 0 && <button className={`source-tab ${activeSource === 'RUNSIGNUP' ? 'active' : ''}`} onClick={() => setActiveSource('RUNSIGNUP')}>RunSignup {runSignupCount}</button>}
                {athlinksCount > 0 && <button className={`source-tab ${activeSource === 'ATHLINKS' ? 'active' : ''}`} onClick={() => setActiveSource('ATHLINKS')}>Athlinks {athlinksCount}</button>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{selectedCount} of {races.length} selected</span>
                <button onClick={toggleAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', padding:0 }}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div className="cards-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'16px', marginBottom:'20px' }}>
              {filteredRaces.map(race => <RaceCard key={race.id} race={race} selected={!!selected[race.id]} onToggle={toggleRace} />)}
            </div>
          </>
        )}

        <div style={{ border:'1.5px dashed #e2e6ed', borderRadius:'8px', padding:'14px 16px', marginBottom:'20px', background:'rgba(255,255,255,0.9)' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Missing a race?</div>
          <p style={{ fontSize:'13px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6 }}>
            Don't see something that should be here?{' '}
            <span style={{ color:'#C9A84C', fontWeight:600, cursor:'pointer' }}>Search again with a different name</span>
            {' '}or{' '}
            <span style={{ color:'#C9A84C', fontWeight:600, cursor:'pointer' }}>add it manually</span>
            {' '}after confirming.
          </p>
        </div>

        {races.length > 0 && (
          <button className="rp-primary" onClick={handleConfirm} disabled={saving || selectedCount === 0}>
            {saving ? 'Saving...' : `Confirm My Races (${selectedCount}) →`}
          </button>
        )}

        <p onClick={() => navigate('/home')} style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'14px', cursor:'pointer', letterSpacing:'0.5px' }}>
          Skip import — I'll add races later
        </p>
      </div>
    </div>
  )
}
