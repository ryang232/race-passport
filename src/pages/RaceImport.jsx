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
    @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}
    @keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
    .ri-dist-btn{padding:8px 14px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.12s;border:1.5px solid #e2e6ed;background:#fafbfc;color:#9aa5b4}
    .ri-dist-btn.sel{background:#1B2A4A;color:#fff;border-color:#1B2A4A}
    .ri-dist-btn:hover:not(.sel){border-color:#1B2A4A;color:#1B2A4A}
    .ri-row{animation:fadeIn 0.3s ease both}
    .ri-row:hover .ri-del{opacity:1!important}
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

function MiniStamp({ distance, size=42 }) {
  const c = getDistanceColor(distance)
  const t = (distance||'').replace(' mi','').replace(' miles','')
  const fs = t.length>4?8:t.length>2?11:14
  return (
    <div style={{width:size,height:size,borderRadius:'50%',border:`2px solid ${c.stampBorder}`,background:`${c.stampBorder}15`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',flexShrink:0}}>
      <div style={{position:'absolute',inset:3,borderRadius:'50%',border:`1px dashed ${c.stampDash}`}}/>
      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:fs,color:c.stampBorder,position:'relative',zIndex:1}}>{t||'?'}</span>
    </div>
  )
}

function PacerThinking() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px 18px',background:'rgba(201,168,76,0.06)',border:'1.5px solid rgba(201,168,76,0.2)',borderRadius:'12px',animation:'shimmer 1.2s ease infinite'}}>
      <span style={{fontSize:'16px'}}>⚡</span>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',letterSpacing:'1.5px',color:'#C9A84C',textTransform:'uppercase'}}>Pacer is looking this up...</span>
      <div style={{display:'flex',gap:'4px',marginLeft:'auto'}}>
        {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:'#C9A84C',animation:`pulse 1s ease-in-out ${i*0.3}s infinite`}}/>)}
      </div>
    </div>
  )
}

function PacerResultCard({ result, time, onTimeChange, distance, onDistanceChange, onAdd, onDismiss }) {
  const [localName, setLocalName] = useState(result.name||'')
  const [localDate, setLocalDate] = useState(result.date||'')
  const [localLocation, setLocalLocation] = useState(result.location||'')
  const [editingName, setEditingName] = useState(false)
  const c = getDistanceColor(distance||result.distance)

  const chipStyle = {
    display:'flex',alignItems:'center',gap:'4px',padding:'5px 10px',
    background:'#f4f6f9',borderRadius:'6px',cursor:'text',
    fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#6b7a8d',
    border:'1.5px solid transparent',transition:'border-color 0.15s'
  }
  const editInputStyle = {
    padding:'5px 10px',borderRadius:'6px',border:'1.5px solid #C9A84C',
    fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#1B2A4A',
    background:'#fff',outline:'none'
  }

  const confidenceLabel = result.confidence===3 ? 'Pacer Found It' : result.confidence===2 ? 'Best Guess — Please Verify' : 'Fill In Your Details'
  const confidenceColor = result.confidence===3 ? '#C9A84C' : result.confidence===2 ? '#f59e0b' : '#9aa5b4'

  return (
    <div style={{background:'#fff',border:'2px solid rgba(201,168,76,0.35)',borderRadius:'16px',overflow:'hidden',animation:'slideDown 0.3s ease both',boxShadow:'0 4px 24px rgba(201,168,76,0.1)'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.03))',borderBottom:'1px solid rgba(201,168,76,0.12)',padding:'10px 16px',display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{fontSize:'15px'}}>⚡</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'2px',color:confidenceColor,textTransform:'uppercase'}}>{confidenceLabel}</span>
        <button onClick={onDismiss} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#9aa5b4',fontSize:'18px',lineHeight:1,padding:'0 2px'}}>×</button>
      </div>

      <div style={{padding:'16px'}}>
        {/* Race name */}
        <div style={{marginBottom:'12px'}}>
          {editingName ? (
            <input value={localName} onChange={e=>setLocalName(e.target.value)}
              onBlur={()=>setEditingName(false)} autoFocus
              style={{width:'100%',fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',color:'#1B2A4A',letterSpacing:'0.5px',border:'none',borderBottom:'2px solid #C9A84C',outline:'none',background:'transparent',boxSizing:'border-box'}}/>
          ):(
            <div onClick={()=>setEditingName(true)} title="Click to edit"
              style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',color:'#1B2A4A',letterSpacing:'0.5px',lineHeight:1.1,cursor:'text',borderBottom:'2px solid transparent',transition:'border-color 0.15s',paddingBottom:'2px'}}
              onMouseEnter={e=>e.currentTarget.style.borderBottomColor='rgba(201,168,76,0.4)'}
              onMouseLeave={e=>e.currentTarget.style.borderBottomColor='transparent'}>
              {localName||'Unknown Race'} <span style={{fontSize:'10px',color:'#C9A84C',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'1px'}}>✎</span>
            </div>
          )}
        </div>

        {/* Editable meta chips */}
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
          <EditableChip icon="📅" value={localDate} placeholder="Add date" onChange={setLocalDate} />
          <EditableChip icon="📍" value={localLocation} placeholder="Add location" onChange={setLocalLocation} />
          {(distance||result.distance) && (
            <div style={{...chipStyle,background:`${c.stampBorder}12`,color:c.stampBorder,cursor:'default'}}>
              <span style={{fontWeight:600}}>{distance||result.distance}</span>
            </div>
          )}
        </div>

        {/* Distance picker */}
        <div style={{marginBottom:'14px'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'8px'}}>Distance</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {DISTANCES.map(d=>(
              <button key={d} className={`ri-dist-btn${(distance||result.distance)===d?' sel':''}`} onClick={()=>onDistanceChange(d)}>{d}</button>
            ))}
          </div>
        </div>

        {/* Finish time */}
        <div style={{marginBottom:'16px'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'6px'}}>
            Finish Time <span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
          </div>
          <input value={time} onChange={e=>onTimeChange(e.target.value)} placeholder="e.g. 1:57:40 or 28:16"
            style={{width:'100%',padding:'11px 14px',borderRadius:'10px',border:'1.5px solid #e2e6ed',background:'#fafbfc',color:'#1B2A4A',fontSize:'16px',fontFamily:"'Barlow',sans-serif",outline:'none',boxSizing:'border-box'}}
            onFocus={e=>e.target.style.borderColor='#C9A84C'}
            onBlur={e=>e.target.style.borderColor='#e2e6ed'}/>
        </div>

        {/* Add button */}
        <button
          onClick={()=>onAdd({
            name:localName||result.name, date:localDate||result.date,
            date_sort:result.date_sort, location:localLocation||result.location,
            city:result.city, state:result.state,
            distance:distance||result.distance||'Other',
            time, confidence:result.confidence||2
          })}
          disabled={!localName.trim()}
          style={{width:'100%',padding:'14px',border:'none',borderRadius:'12px',background:localName.trim()?'#1B2A4A':'#e2e6ed',color:localName.trim()?'#fff':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',cursor:localName.trim()?'pointer':'not-allowed',transition:'background 0.2s'}}
          onMouseEnter={e=>{if(localName.trim())e.currentTarget.style.background='#C9A84C'}}
          onMouseLeave={e=>{if(localName.trim())e.currentTarget.style.background='#1B2A4A'}}>
          Add to My Passport →
        </button>
      </div>
    </div>
  )
}

function EditableChip({ icon, value, placeholder, onChange }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value)
  useEffect(()=>setLocal(value),[value])
  if (editing) return (
    <input value={local} onChange={e=>setLocal(e.target.value)} autoFocus
      onBlur={()=>{ setEditing(false); onChange(local) }}
      onKeyDown={e=>e.key==='Enter'&&(setEditing(false),onChange(local))}
      placeholder={placeholder}
      style={{padding:'5px 10px',borderRadius:'6px',border:'1.5px solid #C9A84C',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#1B2A4A',background:'#fff',outline:'none',minWidth:'120px'}}/>
  )
  return (
    <div onClick={()=>setEditing(true)}
      style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 10px',background:value?'#f4f6f9':'rgba(201,168,76,0.06)',borderRadius:'6px',cursor:'text',border:`1.5px solid ${value?'transparent':'rgba(201,168,76,0.2)'}`,transition:'all 0.15s'}}
      onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A84C'}
      onMouseLeave={e=>e.currentTarget.style.borderColor=value?'transparent':'rgba(201,168,76,0.2)'}>
      <span style={{fontSize:'11px'}}>{icon}</span>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:value?'#6b7a8d':'#C9A84C'}}>{value||placeholder}</span>
    </div>
  )
}

function RaceRow({ race, onRemove, index }) {
  const c = getDistanceColor(race.distance)
  return (
    <div className="ri-row" style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',background:'#fff',borderRadius:'12px',border:`1.5px solid ${c.stampBorder}25`,borderLeft:`4px solid ${c.stampBorder}`,animationDelay:`${index*0.05}s`}}>
      <MiniStamp distance={race.distance} size={40}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'16px',color:'#1B2A4A',letterSpacing:'0.5px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{race.name}</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#9aa5b4'}}>
          {[race.location,race.date].filter(Boolean).join(' · ')}
          {race.time&&<span style={{color:c.stampBorder,marginLeft:'6px',fontWeight:600}}>{race.time}</span>}
        </div>
      </div>
      <button className="ri-del" onClick={()=>onRemove(race.id)}
        style={{opacity:0,background:'none',border:'none',cursor:'pointer',padding:'6px',borderRadius:'6px',color:'#c53030',fontSize:'18px',lineHeight:1,flexShrink:0,transition:'opacity 0.15s'}}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(197,48,48,0.08)';e.currentTarget.style.opacity='1'}}
        onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.opacity='0'}}>×</button>
    </div>
  )
}

export default function RaceImport() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [pacerResult, setPacerResult] = useState(null)
  const [resultDistance, setResultDistance] = useState('')
  const [resultTime, setResultTime] = useState('')
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
    setResultDistance('')
    setResultTime('')
    try {
      const resp = await fetch('/api/pacer', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ action:'race_lookup', query:query.trim() })
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setPacerResult(data)
      setResultDistance(data.distance||'')
    } catch(e) {
      setSearchError("Pacer couldn't find that race. Try being more specific — or fill in the details below.")
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
    setResultDistance('')
    setResultTime('')
    setSearchError('')
    setTimeout(()=>inputRef.current?.focus(), 100)
  }

  const handleSave = async () => {
    if (races.length === 0) {
      navigate('/build-passport', { state:{ firstName } })
      return
    }
    setSaving(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (userId) {
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

      <div style={{position:'relative',zIndex:1,maxWidth:'560px',margin:'0 auto',padding:'0 20px 140px'}}>

        {/* Header */}
        <div style={{textAlign:'center',padding:'44px 0 28px',animation:'fadeIn 0.4s ease both'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C'}}/>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'11px',letterSpacing:'3px',color:'#9aa5b4'}}>RACE PASSPORT</span>
          </div>
          <div style={{display:'flex',gap:'6px',justifyContent:'center',marginBottom:'12px'}}>
            <div style={{height:'3px',width:'36px',background:'#e2e6ed',borderRadius:'2px'}}/>
            <div style={{height:'3px',width:'36px',background:'#C9A84C',borderRadius:'2px'}}/>
            <div style={{height:'3px',width:'36px',background:'#e2e6ed',borderRadius:'2px'}}/>
          </div>
          <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',letterSpacing:'2.5px',color:'#9aa5b4',margin:'0 0 12px',textTransform:'uppercase'}}>Step 2 of 3 — Build Your Passport</p>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(38px,9vw,56px)',color:'#1B2A4A',margin:'0 0 10px',letterSpacing:'1.5px',lineHeight:1}}>
            ADD YOUR<br/>RACE HISTORY
          </h1>
          <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'15px',color:'#6b7a8d',margin:0,fontWeight:300,lineHeight:1.7}}>
            Type any race name — Pacer will look it up<br/>and fill in the details instantly.
          </p>
        </div>

        {/* Search */}
        <div style={{marginBottom:'16px',animation:'fadeIn 0.4s ease 0.1s both'}}>
          <div style={{display:'flex',gap:'10px'}}>
            <div style={{flex:1,position:'relative'}}>
              <div style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',fontSize:'18px',pointerEvents:'none',zIndex:1}}>⚡</div>
              <input ref={inputRef} value={query}
                onChange={e=>{ setQuery(e.target.value); if(pacerResult){setPacerResult(null);setSearchError('')} }}
                onKeyDown={e=>e.key==='Enter'&&handleSearch()}
                placeholder={firstName ? `e.g. Cherry Blossom 10 Miler 2023` : 'e.g. Marine Corps Marathon 2022'}
                autoCapitalize="words" autoCorrect="off"
                style={{width:'100%',padding:'16px 16px 16px 44px',borderRadius:'14px',border:'2px solid #e2e6ed',background:'#fafbfc',color:'#1B2A4A',fontSize:'16px',fontFamily:"'Barlow',sans-serif",outline:'none',boxSizing:'border-box',transition:'border-color 0.2s,box-shadow 0.2s'}}
                onFocus={e=>{e.target.style.borderColor='#1B2A4A';e.target.style.boxShadow='0 0 0 3px rgba(27,42,74,0.06)'}}
                onBlur={e=>{e.target.style.borderColor='#e2e6ed';e.target.style.boxShadow='none'}}/>
            </div>
            <button onClick={handleSearch} disabled={!query.trim()||searching}
              style={{padding:'0 22px',border:'none',borderRadius:'14px',background:query.trim()&&!searching?'#C9A84C':'#e2e6ed',color:query.trim()&&!searching?'#1B2A4A':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',cursor:query.trim()&&!searching?'pointer':'not-allowed',transition:'all 0.15s',flexShrink:0}}
              onMouseEnter={e=>{if(query.trim()&&!searching)e.currentTarget.style.background='#b8913a'}}
              onMouseLeave={e=>{if(query.trim()&&!searching)e.currentTarget.style.background='#C9A84C'}}>
              {searching?'...':'Look Up'}
            </button>
          </div>
          {!pacerResult&&!searching&&!searchError&&(
            <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#b0b8c4',marginTop:'8px',textAlign:'center',marginBottom:0}}>
              Include the year for best results · Press Enter or tap Look Up
            </p>
          )}
          {searchError&&!pacerResult&&(
            <div style={{marginTop:'10px',padding:'10px 14px',background:'rgba(197,48,48,0.05)',border:'1px solid rgba(197,48,48,0.15)',borderRadius:'10px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#c53030'}}>
              {searchError}
            </div>
          )}
        </div>

        {/* Pacer thinking */}
        {searching&&<div style={{marginBottom:'16px'}}><PacerThinking/></div>}

        {/* Pacer result */}
        {pacerResult&&!searching&&(
          <div style={{marginBottom:'24px'}}>
            <PacerResultCard
              result={pacerResult}
              time={resultTime} onTimeChange={setResultTime}
              distance={resultDistance} onDistanceChange={setResultDistance}
              onAdd={handleAddRace}
              onDismiss={()=>{setPacerResult(null);setSearchError('');setQuery('')}}/>
          </div>
        )}

        {/* Added races */}
        {races.length>0&&(
          <div style={{marginBottom:'24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#C9A84C'}}/>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'2px',color:'#9aa5b4',textTransform:'uppercase'}}>
                {races.length} Race{races.length!==1?'s':''} Added
              </span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {races.map((race,i)=><RaceRow key={race.id} race={race} onRemove={id=>setRaces(p=>p.filter(r=>r.id!==id))} index={i}/>)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {races.length===0&&!pacerResult&&!searching&&(
          <div style={{textAlign:'center',padding:'28px 20px',animation:'fadeIn 0.5s ease 0.2s both'}}>
            <div style={{display:'flex',justifyContent:'center',gap:'10px',marginBottom:'14px',opacity:0.25}}>
              {['5K','13.1','26.2'].map(d=><MiniStamp key={d} distance={d} size={46}/>)}
            </div>
            <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#b0b8c4',lineHeight:1.7,margin:0}}>
              Your races will appear here as you add them.<br/>
              Start by typing a race name above.
            </p>
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:10,padding:'16px 20px 32px',background:'linear-gradient(to top,#fff 65%,rgba(255,255,255,0))'}}>
        <div style={{maxWidth:'560px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'8px'}}>
          <button onClick={handleSave} disabled={saving}
            style={{width:'100%',padding:'16px',border:'none',borderRadius:'14px',background:races.length>0?'#1B2A4A':'#e2e6ed',color:races.length>0?'#fff':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',cursor:races.length>0&&!saving?'pointer':'default',transition:'background 0.2s'}}
            onMouseEnter={e=>{if(races.length>0&&!saving)e.currentTarget.style.background='#C9A84C'}}
            onMouseLeave={e=>{if(races.length>0)e.currentTarget.style.background='#1B2A4A'}}>
            {saving?'Saving...':`${races.length>0?`Save ${races.length} Race${races.length!==1?'s':''} to My Passport →`:'Add races above to continue'}`}
          </button>
          <p onClick={()=>navigate('/build-passport',{state:{firstName}})}
            style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#b0b8c4',cursor:'pointer',margin:0}}>
            Skip — I'll add races later
          </p>
        </div>
      </div>
    </div>
  )
}
