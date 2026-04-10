import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchUnsplashPhoto } from '../lib/unsplash'
import { isDemo, DEMO_EMAIL } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

// Ryan's real race history — shown after the loading screen
const RYAN_IMPORT_RACES = [
  { id:'r1',  name:'Sole of the City 10K',          date:'Oct 2021', location:'Baltimore, MD',    city:'Baltimore',  distance:'10K',  time:'47:49', source:'RUNSIGNUP', selected:true },
  { id:'r2',  name:'Bay Bridge Run',                 date:'Nov 2021', location:'Annapolis, MD',    city:'Annapolis',  distance:'10K',  time:'50:57', source:'RUNSIGNUP', selected:true },
  { id:'r3',  name:'Baltimore Running Festival 10K', date:'Oct 2021', location:'Baltimore, MD',    city:'Baltimore',  distance:'10K',  time:'58:03', source:'RUNSIGNUP', selected:true },
  { id:'r4',  name:'Holiday Half Marathon',          date:'Dec 2021', location:'Annandale, VA',    city:'Annandale',  distance:'13.1', time:'2:19:05', source:'RUNSIGNUP', selected:true },
  { id:'r5',  name:'LA Marathon',                    date:'Mar 2023', location:'Los Angeles, CA',  city:'Los Angeles',distance:'26.2', time:'4:44:47', source:'RUNSIGNUP', selected:true },
  { id:'r6',  name:'Marine Corps Marathon',          date:'Oct 2023', location:'Washington, DC',   city:'Washington', distance:'26.2', time:'4:45:42', source:'RUNSIGNUP', selected:true },
  { id:'r7',  name:'Downtown Columbia Turkey Trot',  date:'Nov 2024', location:'Columbia, MD',     city:'Columbia',   distance:'5K',   time:'28:16', source:'RUNSIGNUP', selected:true },
  { id:'r8',  name:'Austin Half Marathon',           date:'Feb 2025', location:'Austin, TX',       city:'Austin',     distance:'13.1', time:'1:57:40', source:'RUNSIGNUP', selected:true },
  { id:'r9',  name:'IRONMAN 70.3 Eagleman',          date:'Jun 2025', location:'Cambridge, MD',    city:'Cambridge',  distance:'70.3', time:'6:32:08', source:'RUNSIGNUP', selected:true },
  { id:'r10', name:'Downtown Columbia Turkey Trot',  date:'Nov 2025', location:'Columbia, MD',     city:'Columbia',   distance:'5K',   time:'35:09', source:'RUNSIGNUP', selected:true },
]

function RaceCard({ race, selected, onToggle }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(null)
  const colors = getDistanceColor(race.distance)

  useEffect(() => {
    fetchUnsplashPhoto(`${race.city} city skyline`, 'running').then(url => setPhoto(url))
  }, [race.city])

  return (
    <div onClick={() => onToggle(race.id)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'10px', overflow:'hidden', border: selected ? `2.5px solid ${colors.primary}` : '1.5px solid #e2e6ed', background:'#fff', cursor:'pointer', transition:'border-color 0.15s, transform 0.2s', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', position:'relative' }}>
      {/* Checkmark */}
      <div style={{ position:'absolute', top:10, right:10, zIndex:10, width:24, height:24, borderRadius:'50%', background: selected ? colors.primary : 'rgba(255,255,255,0.9)', border: selected ? `2px solid ${colors.primary}` : '2px solid rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
        {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      {/* Source badge */}
      <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(0,0,0,0.55)', borderRadius:'4px', padding:'3px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>
        {race.source}
      </div>
      {/* Photo */}
      <div style={{ position:'relative', height:155, background:'#1B2A4A', overflow:'hidden' }}>
        {photo ? (
          <img src={photo} alt={race.city} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s', transform: hovered ? 'scale(1.06)' : 'scale(1)' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1B2A4A,#2a3f6a)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:28, height:28, border:`2.5px solid ${colors.dashed}`, borderTopColor:colors.primary, borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.45))' }} />
        {/* Hover: finish time */}
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity: hovered ? 1 : 0, transition:'opacity 0.2s' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'8px' }}>Finish Time</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'44px', color:colors.primary, letterSpacing:'2px', lineHeight:1 }}>{race.time}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.5)', letterSpacing:'1px', marginTop:'6px', textTransform:'uppercase' }}>{race.distance}</div>
        </div>
        {/* Stamp bottom-left */}
        <div style={{ position:'absolute', bottom:10, left:10, opacity: hovered ? 0 : 1, transition:'opacity 0.2s' }}>
          <div style={{ width:46, height:46, borderRadius:'50%', border:`2px solid ${colors.primary}`, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:`0.75px dashed ${colors.dashed}` }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: race.distance.length > 3 ? 9 : race.distance.length > 2 ? 11 : 14, color:colors.primary, letterSpacing:'0.5px', position:'relative', zIndex:1 }}>{race.distance.replace(' mi','')}</span>
          </div>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding:'11px 13px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', borderTop:`2px solid ${colors.primary}22` }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#6b7a8d', letterSpacing:'0.5px' }}>{race.location} · {race.date}</div>
        </div>
      </div>
    </div>
  )
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
  const [firstName, setFirstName] = useState('Ryan')

  useEffect(() => {
    const run = async () => {
      // Pull name
      let fn = locationState?.firstName || 'Ryan'
      if (user && !isDemo(user?.email)) {
        try {
          const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
          if (data?.full_name) fn = data.full_name.split(' ')[0] || fn
        } catch(e) {}
      }
      setFirstName(fn)

      // Animated loading steps
      const steps = [
        { msg: `Connecting to RunSignup...`, ms: 800 },
        { msg: `Searching race history for ${fn}...`, ms: 1000 },
        { msg: 'Matching race registrations...', ms: 900 },
        { msg: 'Pulling finish times & results...', ms: 700 },
        { msg: 'Building your passport...', ms: 600 },
      ]
      for (const s of steps) {
        setLoadingStatus(s.msg)
        await new Promise(r => setTimeout(r, s.ms))
      }

      // Load races
      const raceList = locationState?.dummyRaces || RYAN_IMPORT_RACES
      setRaces(raceList)
      const init = {}
      raceList.forEach(r => { init[r.id] = r.selected !== false })
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
      .source-tab { padding:7px 16px; border-radius:20px; border:1.5px solid #e2e6ed; background:#fff; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; color:#9aa5b4; }
      .source-tab.active { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .rp-primary { width:100%; padding:15px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s; border-radius:8px; }
      .rp-primary:hover:not(:disabled) { background:#C9A84C; }
      .rp-primary:disabled { opacity:0.5; cursor:not-allowed; }
      .cards-grid { animation:fadeIn 0.5s ease both; }
    `
    if (!document.getElementById('rp-ri-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-ri-styles')?.remove()
  }, [user])

  const toggleRace = id => setSelected(p => ({ ...p, [id]: !p[id] }))
  const selectedCount = Object.values(selected).filter(Boolean).length
  const allSelected = races.length > 0 && selectedCount === races.length
  const toggleAll = () => { const n = {}; races.forEach(r => { n[r.id] = !allSelected }); setSelected(n) }
  const filteredRaces = activeSource === 'ALL' ? races : races.filter(r => r.source === activeSource)

  const handleConfirm = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    navigate('/home', { state: { imported: selectedCount } })
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
          <div style={{ height:'3px', width:'40px', background:'#e2e6ed', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
        </div>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 14px', textTransform:'uppercase' }}>Step 2 of 2 — Import Your Races</p>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'20px', padding:'5px 16px', marginBottom:'14px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>{races.length} Races Found on RunSignup</span>
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,48px)', color:'#1B2A4A', margin:'0 0 12px', letterSpacing:'1.5px', lineHeight:1 }}>ARE THESE YOUR RACES?</h1>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:'0 auto', fontWeight:300, lineHeight:1.7, maxWidth:'480px' }}>
          We found your race history on RunSignup, {firstName}. Uncheck anything you don't want on your Race Passport.
        </p>
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:'1000px', margin:'0 auto', padding:'0 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 12px' }}>
          <div style={{ display:'flex', gap:'8px' }}>
            <button className={`source-tab ${activeSource==='ALL'?'active':''}`} onClick={() => setActiveSource('ALL')}>All {races.length}</button>
            <button className={`source-tab ${activeSource==='RUNSIGNUP'?'active':''}`} onClick={() => setActiveSource('RUNSIGNUP')}>RunSignup {races.filter(r=>r.source==='RUNSIGNUP').length}</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{selectedCount} of {races.length} selected</span>
            <button onClick={toggleAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', padding:0 }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        <div className="cards-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'16px', marginBottom:'20px' }}>
          {filteredRaces.map(race => <RaceCard key={race.id} race={race} selected={!!selected[race.id]} onToggle={toggleRace} />)}
        </div>

        <div style={{ border:'1.5px dashed #e2e6ed', borderRadius:'8px', padding:'14px 16px', marginBottom:'20px', background:'rgba(255,255,255,0.9)' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Missing a race?</div>
          <p style={{ fontSize:'13px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6 }}>
            Don't see something that should be here?{' '}
            <span style={{ color:'#C9A84C', fontWeight:600, cursor:'pointer' }}>Add it manually</span>
            {' '}after confirming.
          </p>
        </div>

        <button className="rp-primary" onClick={handleConfirm} disabled={saving || selectedCount === 0}>
          {saving ? 'Saving to your Passport...' : `Add ${selectedCount} Race${selectedCount !== 1 ? 's' : ''} to My Passport →`}
        </button>

        <p onClick={() => navigate('/home')} style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'14px', cursor:'pointer', letterSpacing:'0.5px' }}>
          Skip import — I'll add races later
        </p>
      </div>
    </div>
  )
}
