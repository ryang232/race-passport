import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'
import { loadRacePhoto, PHOTO_PLACEHOLDER } from '../lib/photos'

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

function RaceCard({ race, selected, onToggle, onRemove }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto]     = useState(PHOTO_PLACEHOLDER)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const colors = getDistanceColor(race.distance)

  useEffect(() => {
    loadRacePhoto(race).then(url => { if (url) { setPhoto(url); setPhotoLoaded(true) } })
  }, [race.id])

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'10px', overflow:'hidden', border:selected?`2.5px solid ${colors.stampBorder}`:'1.5px solid #e2e6ed', background:'#fff', transition:'border-color 0.15s, transform 0.2s', transform:hovered?'translateY(-3px)':'translateY(0)', position:'relative', cursor:'pointer' }}
      onClick={() => onToggle(race.id)}>

      {/* Source badge */}
      <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(0,0,0,0.55)', borderRadius:'4px', padding:'3px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>
        {race.source}
      </div>

      {/* Checkmark */}
      <div style={{ position:'absolute', top:10, right:10, zIndex:10, width:24, height:24, borderRadius:'50%', background:selected?colors.stampBorder:'rgba(255,255,255,0.9)', border:selected?`2px solid ${colors.stampBorder}`:'2px solid rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
        {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>

      {/* Photo */}
      <div style={{ position:'relative', height:150, background:'#1B2A4A', overflow:'hidden' }}>
        <img src={photo} alt={race.city} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s, opacity 0.4s', transform:hovered?'scale(1.06)':'scale(1)', opacity:photoLoaded?1:0 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.45))' }} />
        {/* Hover overlay — finish time */}
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity:hovered?1:0, transition:'opacity 0.2s' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'8px' }}>Finish Time</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'40px', color:colors.stampBorder, letterSpacing:'2px', lineHeight:1 }}>{race.time}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.5)', letterSpacing:'1px', marginTop:'6px', textTransform:'uppercase' }}>{race.distance}</div>
        </div>
        {/* Distance stamp — hides on hover */}
        <div style={{ position:'absolute', bottom:10, left:10, opacity:hovered?0:1, transition:'opacity 0.2s' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${colors.stampBorder}`, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:`0.75px dashed ${colors.stampDash}` }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:race.distance.length>3?9:race.distance.length>2?11:14, color:colors.stampBorder, letterSpacing:'0.5px', position:'relative', zIndex:1 }}>{race.distance.replace(' mi','')}</span>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div style={{ padding:'10px 12px 12px', borderTop:`2px solid ${colors.stampBorder}22` }}>
        <div style={{ marginBottom:'6px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#6b7a8d' }}>{race.location} · {race.date}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <ConfidenceBadge score={race.confidence} />
          {/* "Not my race" button */}
          <button
            onClick={e => { e.stopPropagation(); onRemove(race.id) }}
            style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:'pointer', padding:'3px 6px', borderRadius:'4px', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(197,48,48,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}
            title="Not my race">
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
  const [loadingStatus, setLoadingStatus] = useState('Connecting to RunSignup...')
  const [races, setRaces]               = useState([])
  const [selected, setSelected]         = useState({})
  const [activeSource, setActiveSource] = useState('ALL')
  const [saving, setSaving]             = useState(false)
  const [firstName, setFirstName]       = useState('Ryan')

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

      const steps = [
        { msg:`Connecting to RunSignup...`,          ms:800 },
        { msg:`Searching race history for ${fn}...`, ms:1000 },
        { msg:'Matching race registrations...',      ms:900 },
        { msg:'Pulling finish times & results...',   ms:700 },
        { msg:'Checking Athlinks for results...',    ms:800 },
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
  const removeRace  = id => setRaces(p => p.filter(r => r.id !== id))
  const selectedCount = Object.values(selected).filter(Boolean).length
  const allSelected   = races.length > 0 && selectedCount === races.length
  const toggleAll     = () => { const n = {}; races.forEach(r => { n[r.id] = !allSelected }); setSelected(n) }
  const filteredRaces = activeSource === 'ALL' ? races : races.filter(r => r.source === activeSource)

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
            <RaceCard key={race.id} race={race} selected={!!selected[race.id]} onToggle={toggleRace} onRemove={removeRace} />
          ))}
        </div>

        {/* Missing a race */}
        <div style={{ border:'1.5px dashed #e2e6ed', borderRadius:'8px', padding:'14px 16px', marginBottom:'20px', background:'rgba(255,255,255,0.9)' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Missing a race?</div>
          <p style={{ fontSize:'13px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6 }}>
            Don't see something that should be here?{' '}
            <span style={{ color:'#C9A84C', fontWeight:600, cursor:'pointer' }}>Add it manually</span>
            {' '}after confirming, or connect Strava below.
          </p>
        </div>

        {/* Strava connect banner */}
        <div style={{ background:'#1B2A4A', borderRadius:'12px', padding:'18px 20px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'16px', animation:'stravaSlide 0.5s ease 0.3s both' }}>
          <div style={{ width:40, height:40, borderRadius:'10px', background:'rgba(252,76,2,0.15)', border:'1px solid rgba(252,76,2,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:'#fff', letterSpacing:'0.5px', marginBottom:'3px' }}>Connect Strava as your safety net</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>We'll scan your Strava activities to find any races we may have missed and unlock deeper insights.</div>
          </div>
          <button
            style={{ padding:'9px 18px', border:'1.5px solid rgba(252,76,2,0.5)', borderRadius:'8px', background:'rgba(252,76,2,0.1)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#FC4C02', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0 }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(252,76,2,0.2)'; e.currentTarget.style.borderColor='#FC4C02' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(252,76,2,0.1)'; e.currentTarget.style.borderColor='rgba(252,76,2,0.5)' }}>
            Connect Strava
          </button>
        </div>

        {/* Confirm CTA */}
        <button className="rp-primary" onClick={handleConfirm} disabled={saving || selectedCount === 0}>
          {saving ? 'Saving to your Passport...' : `Add ${selectedCount} Race${selectedCount !== 1?'s':''} to My Passport →`}
        </button>

        <p onClick={() => navigate('/build-passport', { state:{ firstName } })}
          style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'14px', cursor:'pointer', letterSpacing:'0.5px' }}>
          Skip import — I'll add races later
        </p>
      </div>
    </div>
  )
}
