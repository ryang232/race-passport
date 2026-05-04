import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
const DISTANCES = ['5K','10K','10 mi','13.1','26.2','50K','70.3','140.6','Ultra','Other']

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

function TickerBg() {
  return (
    <div style={{position:'fixed',top:'50%',transform:'translateY(-55%)',left:0,whiteSpace:'nowrap',pointerEvents:'none',zIndex:0}}>
      <div style={{display:'inline-flex',animation:'tickerScroll 60s linear infinite'}}>
        {TICKER.map((d,i)=><span key={i} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(160px,22vw,300px)',color:'transparent',WebkitTextStroke:'1px rgba(27,42,74,0.04)',lineHeight:1,padding:'0 40px',userSelect:'none',flexShrink:0}}>{d}</span>)}
      </div>
    </div>
  )
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

function PacerThinking() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'16px 20px',background:'rgba(201,168,76,0.06)',border:'1.5px solid rgba(201,168,76,0.2)',borderRadius:'14px',animation:'shimmer 1.2s ease infinite'}}>
      <span style={{fontSize:'20px'}}>⚡</span>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',letterSpacing:'1.5px',color:'#C9A84C',textTransform:'uppercase'}}>Pacer is looking this up...</span>
      <div style={{display:'flex',gap:'5px',marginLeft:'auto'}}>
        {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C',animation:`pulse 1s ease-in-out ${i*0.3}s infinite`}}/>)}
      </div>
    </div>
  )
}

// ── Shared editable race form (used both in Pacer result card and edit-in-place) ──
function RaceEditForm({ initial, onSave, onCancel, saveLabel='Add to My Passport →', isNew=true }) {
  const [name, setName] = useState(initial.name||'')
  const [date, setDate] = useState(initial.date||'')
  const [location, setLocation] = useState(initial.location||'')
  const [distance, setDistance] = useState(initial.distance||'')
  const [time, setTime] = useState(initial.time||'')
  const nameRef = useRef(null)

  useEffect(() => { if (isNew && nameRef.current) nameRef.current.focus() }, [])

  const inp = (extra={}) => ({
    width:'100%', padding:'12px 14px', borderRadius:'10px', border:'1.5px solid #e2e6ed',
    background:'#fafbfc', color:'#1B2A4A', fontSize:'16px', fontFamily:"'Barlow',sans-serif",
    outline:'none', boxSizing:'border-box', transition:'border-color 0.15s',
    ...extra
  })

  const c = getDistanceColor(distance)
  const confidenceLabel = initial.confidence===3 ? 'Pacer Found It' : initial.confidence===2 ? 'Best Guess — Please Verify' : 'Add Your Details'
  const confidenceColor = initial.confidence===3 ? '#16a34a' : initial.confidence===2 ? '#C9A84C' : '#9aa5b4'

  return (
    <div style={{background:'#fff',border:`2px solid ${initial.confidence===3?'rgba(22,163,74,0.3)':'rgba(201,168,76,0.35)'}`,borderRadius:'16px',overflow:'hidden',animation:'slideDown 0.3s ease both',boxShadow:'0 4px 24px rgba(27,42,74,0.08)'}}>
      {/* Header */}
      <div style={{background:initial.confidence===3?'rgba(22,163,74,0.05)':'rgba(201,168,76,0.06)',borderBottom:`1px solid ${initial.confidence===3?'rgba(22,163,74,0.12)':'rgba(201,168,76,0.12)'}`,padding:'11px 18px',display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{fontSize:'16px'}}>⚡</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'2px',color:confidenceColor,textTransform:'uppercase'}}>{confidenceLabel}</span>
        {onCancel && <button onClick={onCancel} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#9aa5b4',fontSize:'20px',lineHeight:1,padding:'0 2px'}}>×</button>}
      </div>

      <div style={{padding:'18px'}}>
        {/* Race name — full visible input */}
        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
            Race Name <span style={{color:'#C9A84C'}}>*</span>
          </label>
          <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g. Cherry Blossom 10 Miler"
            style={inp({fontSize:'18px',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600})}
            onFocus={e=>e.target.style.borderColor='#C9A84C'}
            onBlur={e=>e.target.style.borderColor='#e2e6ed'}/>
        </div>

        {/* Distance picker */}
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

        {/* Date + Location row */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
          <div>
            <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
              Date <span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
            </label>
            <input value={date} onChange={e=>setDate(e.target.value)} placeholder="e.g. Oct 2023"
              style={inp()}
              onFocus={e=>e.target.style.borderColor='#C9A84C'}
              onBlur={e=>e.target.style.borderColor='#e2e6ed'}/>
          </div>
          <div>
            <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
              Location <span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
            </label>
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="City, ST"
              style={inp()}
              onFocus={e=>e.target.style.borderColor='#C9A84C'}
              onBlur={e=>e.target.style.borderColor='#e2e6ed'}/>
          </div>
        </div>

        {/* Finish time */}
        <div style={{marginBottom:'18px'}}>
          <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
            Finish Time <span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
          </label>
          <input value={time} onChange={e=>setTime(e.target.value)} placeholder="e.g. 1:57:40 or 28:16"
            style={inp({fontSize:'18px',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:'0.5px'})}
            onFocus={e=>e.target.style.borderColor='#C9A84C'}
            onBlur={e=>e.target.style.borderColor='#e2e6ed'}/>
        </div>

        {/* Buttons */}
        <div style={{display:'flex',gap:'10px'}}>
          {onCancel && (
            <button onClick={onCancel}
              style={{flex:1,padding:'13px',border:'1.5px solid #e2e6ed',borderRadius:'12px',background:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,color:'#9aa5b4',cursor:'pointer',textTransform:'uppercase'}}>
              Cancel
            </button>
          )}
          <button
            onClick={()=>{ if(!name.trim()||!distance) return; onSave({ name:name.trim(), date, date_sort:initial.date_sort||null, location, city:initial.city||'', state:initial.state||'', distance, time, confidence:initial.confidence||2 }) }}
            disabled={!name.trim()||!distance}
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

// ── Added race row (tap to expand and edit) ───────────────────────────────────
function RaceRow({ race, onRemove, onUpdate, index }) {
  const [editing, setEditing] = useState(false)
  const c = getDistanceColor(race.distance)

  if (editing) return (
    <div style={{animation:'slideDown 0.25s ease both',animationDelay:`${index*0.05}s`}}>
      <RaceEditForm
        initial={race}
        isNew={false}
        saveLabel="Save Changes →"
        onSave={updated=>{ onUpdate(race.id, updated); setEditing(false) }}
        onCancel={()=>setEditing(false)}
      />
    </div>
  )

  return (
    <div className="ri-row" onClick={()=>setEditing(true)}
      style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:'#fff',borderRadius:'14px',border:`1.5px solid ${c.stampBorder}25`,borderLeft:`4px solid ${c.stampBorder}`,animationDelay:`${index*0.05}s`,position:'relative'}}>
      <MiniStamp distance={race.distance} size={46}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'19px',color:'#1B2A4A',letterSpacing:'0.5px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.1}}>{race.name}</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#9aa5b4',marginTop:'2px'}}>
          {[race.location,race.date].filter(Boolean).join(' · ')}
          {race.time&&<span style={{color:c.stampBorder,marginLeft:'8px',fontWeight:600}}>{race.time}</span>}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RaceImport() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [pacerResult, setPacerResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [races, setRaces] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    injectStyles()
    const init = async () => {
      if (locationState?.firstName) setFirstName(locationState.firstName)
      if (!user || isDemo(user?.email)) { setFirstName('Ryan'); return }
      try {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (data?.full_name) {
          const parts = data.full_name.trim().split(' ')
          if (parts[0] && !locationState?.firstName) setFirstName(parts[0])
        }
      } catch(e) {}
    }
    init()
    return () => document.getElementById('rp-ri2-styles')?.remove()
  }, [user])

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    setPacerResult(null)
    try {
      const resp = await fetch('/api/pacer', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ action:'race_lookup', query:query.trim() })
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
    }, ...p])
    setQuery('')
    setPacerResult(null)
    setSearchError('')
    setTimeout(()=>inputRef.current?.focus(), 100)
  }

  const handleUpdateRace = (id, updated) => {
    setRaces(p => p.map(r => r.id===id ? {...r, ...updated} : r))
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

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Barlow',sans-serif",position:'relative',overflow:'hidden'}}>
      <TickerBg/>

      <div style={{position:'relative',zIndex:1,maxWidth:'560px',margin:'0 auto',padding:'0 20px 160px'}}>

        {/* Header */}
        <div style={{textAlign:'center',padding:'44px 0 28px',animation:'fadeIn 0.4s ease both'}}>
          {/* Back button */}
          <button onClick={()=>navigate('/build-passport',{state:{firstName}})}
            style={{display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'20px',padding:0}}
            onMouseEnter={e=>e.currentTarget.style.color='#1B2A4A'}
            onMouseLeave={e=>e.currentTarget.style.color='#9aa5b4'}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to Profile Setup
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
            Type any race name — Pacer will look it up<br/>and fill in the details instantly.
          </p>
        </div>

        {/* Search bar */}
        <div style={{marginBottom:'16px',animation:'fadeIn 0.4s ease 0.1s both'}}>
          <div style={{display:'flex',gap:'10px'}}>
            <div style={{flex:1,position:'relative'}}>
              <div style={{position:'absolute',left:'15px',top:'50%',transform:'translateY(-50%)',fontSize:'20px',pointerEvents:'none',zIndex:1}}>⚡</div>
              <input ref={inputRef} value={query}
                onChange={e=>{ setQuery(e.target.value); if(pacerResult){setPacerResult(null);setSearchError('')} }}
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
        {searching&&<div style={{marginBottom:'16px'}}><PacerThinking/></div>}

        {/* Pacer result — full editable form */}
        {pacerResult&&!searching&&(
          <div style={{marginBottom:'24px'}}>
            <RaceEditForm
              initial={pacerResult}
              isNew={true}
              saveLabel="Add to My Passport →"
              onSave={handleAddRace}
              onCancel={()=>{setPacerResult(null);setSearchError('');setQuery('')}}
            />
          </div>
        )}

        {/* Added races list */}
        {races.length>0&&(
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
              Your races will appear here as you add them.<br/>
              Start by typing a race name above.
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
