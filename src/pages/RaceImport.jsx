import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// Verified Unsplash city photos
const CITY_PHOTOS = {
  'Baltimore':         'https://images.unsplash.com/photo-1609868824796-e2a99d2a6b9f?w=600&q=80&fit=crop',
  'Annapolis':         'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600&q=80&fit=crop',
  'Washington DC':     'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=600&q=80&fit=crop',
  'Frederick Maryland':'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80&fit=crop',
  'Arlington Virginia':'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=600&q=80&fit=crop',
  'Maryland running':  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80&fit=crop',
}

// Distances >= 26.2 miles get gold stamps
const isGoldDistance = (dist) => {
  const d = dist.toLowerCase().replace(/\s/g,'')
  if (d === '26.2' || d === '26.2mi' || d === 'marathon') return true
  if (d === '50k' || d === '50m' || d === '100k' || d === '100m') return true
  if (d === '70.3' || d === '140.6') return true
  const num = parseFloat(d)
  return !isNaN(num) && num >= 26.2
}

function Stamp({ distance, size = 52 }) {
  const gold = isGoldDistance(distance)
  const color = gold ? '#C9A84C' : '#1B2A4A'
  const bg = gold ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.95)'
  const cleaned = distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 10 : cleaned.length > 2 ? 13 : 17
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${color}`, background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
      <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:`0.75px dashed ${gold ? 'rgba(201,168,76,0.35)' : 'rgba(27,42,74,0.2)'}` }} />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color, lineHeight:1, letterSpacing:'0.04em', position:'relative', zIndex:1, textAlign:'center', padding:'0 3px' }}>{cleaned}</div>
    </div>
  )
}

const MOCK_RACES = [
  { id:1, name:'Baltimore Running Festival 10K', date:'Oct 2024', location:'Baltimore, MD', city:'Baltimore', distance:'10K', time:'58:42', source:'RUNSIGNUP' },
  { id:2, name:'Bay Bridge Run', date:'Apr 2024', location:'Annapolis, MD', city:'Annapolis', distance:'10K', time:'57:14', source:'RUNSIGNUP' },
  { id:3, name:'Marine Corps Marathon', date:'Oct 2023', location:'Washington, DC', city:'Washington DC', distance:'26.2', time:'4:12:08', source:'ATHLINKS' },
  { id:4, name:'Frederick Running Festival 5K', date:'May 2023', location:'Frederick, MD', city:'Frederick Maryland', distance:'5K', time:'24:33', source:'RUNSIGNUP' },
  { id:5, name:'Cherry Blossom 10 Miler', date:'Apr 2023', location:'Washington, DC', city:'Washington DC', distance:'10 mi', time:'1:38:55', source:'ATHLINKS' },
  { id:6, name:'9/11 Memorial 5K', date:'Sept 2022', location:'Arlington, VA', city:'Arlington Virginia', distance:'5K', time:'23:11', source:'ATHLINKS' },
  { id:7, name:'Hot Cider Hustle 5K', date:'Nov 2022', location:'Washington, DC', city:'Washington DC', distance:'5K', time:'24:02', source:'RUNSIGNUP' },
  { id:8, name:'Suds & Soles 5K', date:'Jun 2022', location:'Rockville, MD', city:'Maryland running', distance:'5K', time:'25:44', source:'RUNSIGNUP' },
]

function getPhoto(city) {
  return CITY_PHOTOS[city] || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80&fit=crop'
}

function RaceCard({ race, selected, onToggle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={() => onToggle(race.id)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius:'10px', overflow:'hidden', border: selected ? '2.5px solid #C9A84C' : '1.5px solid #e2e6ed', background:'#fff', cursor:'pointer', transition:'border-color 0.15s,transform 0.2s', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', position:'relative' }}>

      <div style={{ position:'absolute', top:10, right:10, zIndex:10, width:24, height:24, borderRadius:'50%', background: selected ? '#C9A84C' : 'rgba(255,255,255,0.9)', border: selected ? '2px solid #C9A84C' : '2px solid rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
        {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>

      <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(0,0,0,0.55)', borderRadius:'4px', padding:'3px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>{race.source}</div>

      <div style={{ position:'relative', height:160, background:'#1B2A4A', overflow:'hidden' }}>
        <img src={getPhoto(race.city)} alt={race.location}
          style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.4))' }} />
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity: hovered ? 1 : 0, transition:'opacity 0.2s ease' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'8px' }}>Finish Time</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'48px', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>{race.time}</div>
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

export default function RaceImport() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState({})
  const [activeSource, setActiveSource] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState('Ryan')
  const [lastName, setLastName] = useState('Groene')
  const [dob, setDob] = useState('')

  useEffect(() => {
    const loadAndSearch = async () => {
      if (user) {
        try {
          const { data } = await supabase.from('profiles').select('full_name,date_of_birth').eq('id', user.id).single()
          if (data) {
            const parts = (data.full_name || '').trim().split(' ')
            setFirstName(parts[0] || 'Ryan')
            setLastName(parts.slice(1).join(' ') || '')
            setDob(data.date_of_birth || '')
          }
        } catch(e) {}
      }
      setTimeout(() => {
        const init = {}
        MOCK_RACES.forEach(r => { init[r.id] = true })
        setSelected(init)
        setLoading(false)
      }, 2800)
    }
    loadAndSearch()

    const style = document.createElement('style')
    style.id = 'rp-ri-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
      @keyframes pulse { 0%,100%{opacity:0.3;} 50%{opacity:1;} }
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
  const allSelected = selectedCount === MOCK_RACES.length
  const toggleAll = () => {
    const next = {}
    MOCK_RACES.forEach(r => { next[r.id] = !allSelected })
    setSelected(next)
  }

  const filteredRaces = activeSource === 'ALL' ? MOCK_RACES : MOCK_RACES.filter(r => r.source === activeSource)
  const runSignupCount = MOCK_RACES.filter(r => r.source === 'RUNSIGNUP').length
  const athlinksCount = MOCK_RACES.filter(r => r.source === 'ATHLINKS').length

  const handleConfirm = async () => {
    setSaving(true)
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
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', letterSpacing:'1.5px', color:'#9aa5b4', margin:'0 0 28px', textTransform:'uppercase' }}>Searching RunSignup + Athlinks</p>
          <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
            {[0,1,2].map(i => <div key={i} style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C', animation:`pulse 1.1s ease-in-out ${i*0.37}s infinite` }} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Barlow',sans-serif", paddingBottom:'40px', position:'relative', overflow:'hidden' }}>

      {/* Ghost ticker */}
      <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.04)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>

      {/* White header with navy text */}
      <div style={{ position:'relative', zIndex:1, background:'#fff', padding:'28px 20px 24px', borderBottom:'3px solid #C9A84C', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'8px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', letterSpacing:'3px', color:'#9aa5b4' }}>RACE PASSPORT</span>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'12px' }}>
          <div style={{ height:'3px', width:'40px', background:'#e2e6ed', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
        </div>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 12px', textTransform:'uppercase' }}>Step 2 of 2 — Import Your Races</p>

        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'20px', padding:'5px 14px', marginBottom:'14px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>{MOCK_RACES.length} Races Found</span>
        </div>

        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'48px', color:'#1B2A4A', margin:'0 0 12px', letterSpacing:'1.5px', lineHeight:1 }}>ARE THESE YOUR RACES?</h1>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.7, maxWidth:'480px', marginLeft:'auto', marginRight:'auto' }}>
          We searched using <strong style={{ color:'#1B2A4A', fontWeight:500 }}>{firstName} {lastName}</strong>
          {dob && <span> with DOB <strong style={{ color:'#1B2A4A', fontWeight:500 }}>{formatDob(dob)}</strong></span>}.
          {' '}Uncheck anything you don't recognize, or don't want to include on your Race Passport. You can add them back later if you change your mind!
        </p>
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:'960px', margin:'0 auto', padding:'0 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 12px' }}>
          <div style={{ display:'flex', gap:'8px' }}>
            {[
              { key:'ALL', label:'All', count:MOCK_RACES.length },
              { key:'RUNSIGNUP', label:'RunSignup', count:runSignupCount },
              { key:'ATHLINKS', label:'Athlinks', count:athlinksCount },
            ].map(tab => (
              <button key={tab.key} className={`source-tab ${activeSource === tab.key ? 'active' : ''}`} onClick={() => setActiveSource(tab.key)}>
                {tab.label} {tab.count}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{selectedCount} of {MOCK_RACES.length} selected</span>
            <button onClick={toggleAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', padding:0 }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        <div className="cards-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'16px', marginBottom:'20px' }}>
          {filteredRaces.map(race => <RaceCard key={race.id} race={race} selected={!!selected[race.id]} onToggle={toggleRace} />)}
        </div>

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

        <button className="rp-primary" onClick={handleConfirm} disabled={saving || selectedCount === 0}>
          {saving ? 'Saving...' : `Confirm My Races (${selectedCount}) →`}
        </button>
        <p onClick={() => navigate('/home')} style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'14px', cursor:'pointer', letterSpacing:'0.5px' }}>
          Skip import — I'll add races later
        </p>
      </div>
    </div>
  )
}
