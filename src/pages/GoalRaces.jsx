import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'

const DISTANCES = ['5K','10K','10 mi','13.1','26.2','50K','70.3','140.6','Ultra']
const GOAL_SESSION_KEY = 'rp_goal_race_state'
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR + i))

function injectStyles() {
  if (document.getElementById('rp-gr3-styles')) return
  const s = document.createElement('style')
  s.id = 'rp-gr3-styles'
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
    @keyframes tickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
    .gr-dist-btn{padding:9px 16px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.12s;border:1.5px solid #e2e6ed;background:#fafbfc;color:#9aa5b4;white-space:nowrap}
    .gr-dist-btn.sel{background:#1B2A4A;color:#fff;border-color:#1B2A4A}
    .gr-dist-btn:hover:not(.sel){border-color:#1B2A4A;color:#1B2A4A;background:#fff}
    .gr-pill-btn{padding:7px 14px;border-radius:20px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.12s;border:1.5px solid #e2e6ed;background:#fafbfc;color:#9aa5b4;white-space:nowrap}
    .gr-pill-btn.sel{background:#C9A84C;color:#1B2A4A;border-color:#C9A84C}
    .gr-pill-btn:hover:not(.sel){border-color:#C9A84C;color:#1B2A4A;background:rgba(201,168,76,0.08)}
    div::-webkit-scrollbar{display:none}
  `
  document.head.appendChild(s)
}

function TickerBg() {
  const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
  return (
    <div style={{position:'fixed',top:'50%',transform:'translateY(-55%)',left:0,whiteSpace:'nowrap',pointerEvents:'none',zIndex:0}}>
      <div style={{display:'inline-flex',animation:'tickerScroll 60s linear infinite'}}>
        {TICKER.map((d,i) => <span key={i} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(160px,22vw,300px)',color:'transparent',WebkitTextStroke:'1px rgba(27,42,74,0.04)',lineHeight:1,padding:'0 40px',userSelect:'none',flexShrink:0}}>{d}</span>)}
      </div>
    </div>
  )
}

function PacerThinking({ label='Pacer is looking this up...' }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'16px 20px',background:'rgba(201,168,76,0.06)',border:'1.5px solid rgba(201,168,76,0.2)',borderRadius:'14px',animation:'shimmer 1.2s ease infinite'}}>
      <span style={{fontSize:'20px'}}>⚡</span>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',letterSpacing:'1.5px',color:'#C9A84C',textTransform:'uppercase'}}>{label}</span>
      <div style={{display:'flex',gap:'5px',marginLeft:'auto'}}>
        {[0,1,2].map(i => <div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C',animation:`pulse 1s ease-in-out ${i*0.3}s infinite`}}/>)}
      </div>
    </div>
  )
}

export default function GoalRaces() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()

  const firstName   = locationState?.firstName || ''
  const importedCount = locationState?.imported || 0

  // Mode: 'distance' or 'specific'
  const [mode, setMode]                 = useState('specific')
  const [selectedDistance, setSelectedDistance] = useState('')
  const [targetMonth, setTargetMonth]   = useState('')
  const [targetYear, setTargetYear]     = useState(String(CURRENT_YEAR + 1))
  const [saving, setSaving]             = useState(false)

  // Specific race search
  const [raceQuery, setRaceQuery]       = useState('')
  const [searching, setSearching]       = useState(false)
  const [goalRaceResult, setGoalRaceResult] = useState(null)
  const [searchError, setSearchError]   = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    injectStyles()
    // Restore goal state from sessionStorage (back navigation)
    try {
      const saved = sessionStorage.getItem(GOAL_SESSION_KEY)
      if (saved) {
        const s = JSON.parse(saved)
        if (s.mode)             setMode(s.mode)
        if (s.raceQuery)        setRaceQuery(s.raceQuery)
        if (s.goalRaceResult)   setGoalRaceResult(s.goalRaceResult)
        if (s.selectedDistance) setSelectedDistance(s.selectedDistance)
        if (s.targetMonth)      setTargetMonth(s.targetMonth)
        if (s.targetYear)       setTargetYear(s.targetYear)
      }
    } catch(e) {}
    return () => document.getElementById('rp-gr3-styles')?.remove()
  }, [])

  const handleRaceSearch = async () => {
    if (!raceQuery.trim()) return
    setSearching(true)
    setSearchError('')
    setGoalRaceResult(null)
    try {
      const resp = await fetch('/api/pacer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'goal_race_lookup',
          query: raceQuery.trim(),
          month: targetMonth || '',
          year: targetYear || '',
        }),
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setGoalRaceResult(data)
    } catch(e) {
      setSearchError("Pacer couldn't find that race — try being more specific.")
      setGoalRaceResult({ name: raceQuery.trim(), confidence: 1, pacer_message: '' })
    }
    setSearching(false)
  }

  // Persist goal state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(GOAL_SESSION_KEY, JSON.stringify({
        mode, raceQuery, goalRaceResult, selectedDistance, targetMonth, targetYear
      }))
    } catch(e) {}
  }, [mode, raceQuery, goalRaceResult, selectedDistance, targetMonth, targetYear])

  const handleSaveAndContinue = async () => {
    setSaving(true)
    try {
      if (user && !isDemo(user?.email)) {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (uid) {
          const updates = {
            goal_target_month: targetMonth || null,
            goal_target_year:  targetYear || null,
          }
          if (mode === 'distance' && selectedDistance) {
            updates.goal_type     = 'distance'
            updates.goal_distance = selectedDistance
          } else if (mode === 'specific' && goalRaceResult) {
            updates.goal_type      = 'race'
            updates.goal_race_name = goalRaceResult.name || raceQuery
            updates.goal_distance  = goalRaceResult.distance || null
          }
          await supabase.from('profiles').update(updates).eq('id', uid)
        }
      }
    } catch(e) {}
    setSaving(false)
    sessionStorage.removeItem(GOAL_SESSION_KEY)
    navigate('/build-passport', { state: { imported: importedCount, firstName } })
  }

  const canContinue = mode === 'distance' ? !!selectedDistance : !!goalRaceResult

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Barlow',sans-serif",position:'relative',overflow:'hidden'}}>
      <TickerBg/>

      <div style={{position:'relative',zIndex:1,maxWidth:'560px',margin:'0 auto',padding:'0 20px 160px'}}>

        {/* Header */}
        <div style={{textAlign:'center',padding:'44px 0 28px',animation:'fadeIn 0.4s ease both'}}>
          <button onClick={() => navigate('/race-import', { state:{ firstName } })}
            style={{display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'20px',padding:0}}
            onMouseEnter={e => e.currentTarget.style.color='#1B2A4A'}
            onMouseLeave={e => e.currentTarget.style.color='#9aa5b4'}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>

          <div style={{display:'inline-flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C'}}/>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'11px',letterSpacing:'3px',color:'#9aa5b4'}}>RACE PASSPORT</span>
          </div>
          <div style={{display:'flex',gap:'6px',justifyContent:'center',marginBottom:'12px'}}>
            <div style={{height:'3px',width:'36px',background:'#C9A84C',borderRadius:'2px'}}/>
            <div style={{height:'3px',width:'36px',background:'#C9A84C',borderRadius:'2px'}}/>
            <div style={{height:'3px',width:'36px',background:'#C9A84C',borderRadius:'2px'}}/>
          </div>
          <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',letterSpacing:'2.5px',color:'#9aa5b4',margin:'0 0 12px',textTransform:'uppercase'}}>Step 3 of 3 — Set Your Goal</p>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(38px,9vw,56px)',color:'#1B2A4A',margin:'0 0 10px',letterSpacing:'1.5px',lineHeight:1}}>
            WHAT ARE YOU<br/>CHASING?
          </h1>
          <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'15px',color:'#6b7a8d',margin:0,fontWeight:300,lineHeight:1.7}}>
            {firstName ? `Tell Pacer what's next, ${firstName}.` : 'Tell Pacer what\'s next.'}{' '}
            Setting a goal is how great races start.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{display:'flex',gap:'8px',marginBottom:'20px',padding:'4px',background:'#f4f5f7',borderRadius:'12px',animation:'fadeIn 0.4s ease 0.05s both'}}>
          {[
            { key:'specific', label:'Specific Race' },
            { key:'distance', label:'A Distance' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              style={{flex:1,padding:'11px',border:'none',borderRadius:'9px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',cursor:'pointer',transition:'all 0.15s',
                background: mode === m.key ? '#fff' : 'transparent',
                color: mode === m.key ? '#1B2A4A' : '#9aa5b4',
                boxShadow: mode === m.key ? '0 1px 6px rgba(27,42,74,0.1)' : 'none',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Specific Race mode ─────────────────────────────────────────── */}
        {mode === 'specific' && (
          <div style={{animation:'fadeIn 0.25s ease both'}}>

            {/* Search bar */}
            <div style={{marginBottom:'12px'}}>
              <div style={{display:'flex',gap:'10px'}}>
                <div style={{flex:1,position:'relative'}}>
                  <div style={{position:'absolute',left:'15px',top:'50%',transform:'translateY(-50%)',fontSize:'18px',pointerEvents:'none',zIndex:1}}>⚡</div>
                  <input ref={inputRef} value={raceQuery}
                    onChange={e => { setRaceQuery(e.target.value); if(goalRaceResult){setGoalRaceResult(null);setSearchError('')} }}
                    onKeyDown={e => e.key==='Enter' && handleRaceSearch()}
                    placeholder="e.g. Chicago Marathon, NYC Marathon..."
                    autoCapitalize="words" autoCorrect="off"
                    style={{width:'100%',padding:'16px 16px 16px 46px',borderRadius:'14px',border:'2px solid #e2e6ed',background:'#fafbfc',color:'#1B2A4A',fontSize:'16px',fontFamily:"'Barlow',sans-serif",outline:'none',boxSizing:'border-box',transition:'border-color 0.2s,box-shadow 0.2s'}}
                    onFocus={e=>{e.target.style.borderColor='#1B2A4A';e.target.style.boxShadow='0 0 0 3px rgba(27,42,74,0.06)'}}
                    onBlur={e=>{e.target.style.borderColor='#e2e6ed';e.target.style.boxShadow='none'}}/>
                </div>
                <button onClick={handleRaceSearch} disabled={!raceQuery.trim()||searching}
                  style={{padding:'0 20px',border:'none',borderRadius:'14px',background:raceQuery.trim()&&!searching?'#C9A84C':'#e2e6ed',color:raceQuery.trim()&&!searching?'#1B2A4A':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'14px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',cursor:raceQuery.trim()&&!searching?'pointer':'not-allowed',transition:'all 0.15s',flexShrink:0}}
                  onMouseEnter={e=>{if(raceQuery.trim()&&!searching)e.currentTarget.style.background='#b8913a'}}
                  onMouseLeave={e=>{if(raceQuery.trim()&&!searching)e.currentTarget.style.background='#C9A84C'}}>
                  {searching?'...':'Find It'}
                </button>
              </div>

              {/* Optional month/year */}
              <div style={{marginTop:'10px',display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'2px'}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#b0b8c4',letterSpacing:'1px',textTransform:'uppercase',flexShrink:0,lineHeight:'32px'}}>Target:</span>
                {MONTHS.map(m => (
                  <button key={m} className={`gr-pill-btn${targetMonth===m?' sel':''}`}
                    onClick={() => setTargetMonth(prev => prev===m?'':m)}>
                    {m}
                  </button>
                ))}
              </div>
              <div style={{marginTop:'8px',display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'2px'}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'#b0b8c4',letterSpacing:'1px',textTransform:'uppercase',flexShrink:0,lineHeight:'32px'}}>Year:</span>
                {YEARS.map(y => (
                  <button key={y} className={`gr-pill-btn${targetYear===y?' sel':''}`}
                    onClick={() => setTargetYear(prev => prev===y?'':y)}>
                    {y}
                  </button>
                ))}
              </div>

              {!goalRaceResult && !searching && !searchError && (
                <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#b0b8c4',marginTop:'8px',textAlign:'center',marginBottom:0}}>
                  Type a race name and tap Find It — Pacer will look it up for you
                </p>
              )}
              {searchError && (
                <div style={{marginTop:'10px',padding:'11px 15px',background:'rgba(197,48,48,0.05)',border:'1px solid rgba(197,48,48,0.15)',borderRadius:'10px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#c53030'}}>
                  {searchError}
                </div>
              )}
            </div>

            {/* Searching */}
            {searching && <div style={{marginBottom:'16px'}}><PacerThinking label="Pacer is researching this race..."/></div>}

            {/* Result card */}
            {goalRaceResult && !searching && (
              <div style={{background:'#fff',border:'2px solid rgba(201,168,76,0.35)',borderRadius:'16px',overflow:'hidden',animation:'slideDown 0.3s ease both',boxShadow:'0 4px 24px rgba(27,42,74,0.08)',marginBottom:'16px'}}>
                {/* Header */}
                <div style={{background:'rgba(201,168,76,0.06)',borderBottom:'1px solid rgba(201,168,76,0.12)',padding:'11px 18px',display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{fontSize:'16px'}}>⚡</span>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',fontWeight:600,letterSpacing:'2px',color:goalRaceResult.confidence>=3?'#16a34a':'#C9A84C',textTransform:'uppercase'}}>
                    {goalRaceResult.confidence>=3?'Pacer Found It':'Best Match'}
                  </span>
                  <button onClick={()=>{setGoalRaceResult(null);setSearchError('');setTimeout(()=>inputRef.current?.focus(),100)}}
                    style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#9aa5b4',fontSize:'20px',lineHeight:1,padding:'0 2px'}}>×</button>
                </div>

                <div style={{padding:'18px'}}>
                  {/* Race name */}
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'28px',color:'#1B2A4A',letterSpacing:'1px',lineHeight:1.1,marginBottom:'4px'}}>
                    {goalRaceResult.name || raceQuery}
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#9aa5b4',marginBottom:'16px',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                    {goalRaceResult.location && <span>{goalRaceResult.location}</span>}
                    {goalRaceResult.distance && <span style={{color:'#C9A84C',fontWeight:600}}>{goalRaceResult.distance}</span>}
                    {goalRaceResult.typical_month && <span>Typically {goalRaceResult.typical_month}</span>}
                    {(targetMonth||targetYear) && <span style={{color:'#1B2A4A',fontWeight:600}}>Your goal: {[targetMonth,targetYear].filter(Boolean).join(' ')}</span>}
                  </div>

                  {/* Pacer message */}
                  {goalRaceResult.pacer_message && (
                    <div style={{padding:'14px 16px',background:'rgba(27,42,74,0.03)',border:'1.5px solid rgba(27,42,74,0.08)',borderRadius:'12px',borderLeft:'4px solid #C9A84C',marginBottom:'16px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'7px'}}>
                        <span style={{fontSize:'13px'}}>⚡</span>
                        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'2px',color:'#C9A84C',textTransform:'uppercase'}}>Pacer on this goal</span>
                      </div>
                      <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'14px',color:'#3d4f6b',lineHeight:1.65,margin:0,fontWeight:300}}>{goalRaceResult.pacer_message}</p>
                    </div>
                  )}

                  {goalRaceResult.website && (
                    <a href={goalRaceResult.website} target="_blank" rel="noopener noreferrer"
                      style={{display:'inline-flex',alignItems:'center',gap:'5px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'12px',color:'#C9A84C',textDecoration:'none',fontWeight:600,letterSpacing:'0.5px'}}>
                      Official Website ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Distance mode ──────────────────────────────────────────────── */}
        {mode === 'distance' && (
          <div style={{animation:'fadeIn 0.25s ease both'}}>
            <div style={{background:'#fff',border:'1.5px solid #e8eaed',borderRadius:'14px',padding:'20px',marginBottom:'16px'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'12px'}}>What distance are you chasing?</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'20px'}}>
                {DISTANCES.map(d => (
                  <button key={d} className={`gr-dist-btn${selectedDistance===d?' sel':''}`}
                    onClick={() => setSelectedDistance(prev => prev===d?'':d)}>
                    {d}
                  </button>
                ))}
              </div>

              {/* Target date */}
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'8px'}}>
                Target Month <span style={{fontWeight:400,color:'#b0b8c4'}}>(optional)</span>
              </div>
              <div style={{display:'flex',gap:'6px',overflowX:'auto',marginBottom:'14px',paddingBottom:'2px'}}>
                {MONTHS.map(m => (
                  <button key={m} className={`gr-pill-btn${targetMonth===m?' sel':''}`}
                    onClick={() => setTargetMonth(prev => prev===m?'':m)}>
                    {m}
                  </button>
                ))}
              </div>

              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'1.5px',color:'#9aa5b4',textTransform:'uppercase',marginBottom:'8px'}}>Target Year</div>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                {YEARS.map(y => (
                  <button key={y} className={`gr-pill-btn${targetYear===y?' sel':''}`}
                    onClick={() => setTargetYear(prev => prev===y?'':y)}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {selectedDistance && (
              <div style={{padding:'14px 16px',background:'rgba(27,42,74,0.03)',border:'1.5px solid rgba(27,42,74,0.1)',borderRadius:'12px',borderLeft:'4px solid #C9A84C',marginBottom:'16px',animation:'slideDown 0.2s ease both'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px'}}>
                  <span style={{fontSize:'13px'}}>⚡</span>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'10px',fontWeight:600,letterSpacing:'2px',color:'#C9A84C',textTransform:'uppercase'}}>Goal set</span>
                </div>
                <p style={{fontFamily:"'Barlow',sans-serif",fontSize:'14px',color:'#3d4f6b',lineHeight:1.5,margin:0,fontWeight:300}}>
                  A {selectedDistance}{targetMonth||targetYear ? ` in ${[targetMonth,targetYear].filter(Boolean).join(' ')}` : ''} — that's a real goal. Pacer will help you find the right race when you're ready to discover.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Runna card */}
        <div style={{background:'#1B2A4A',borderRadius:'12px',padding:'18px 20px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'16px',animation:'fadeIn 0.4s ease 0.1s both'}}>
          <div style={{width:44,height:44,borderRadius:'10px',background:'rgba(201,168,76,0.12)',border:'1.5px solid rgba(201,168,76,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 3L5 14h7l-1 7 8-11h-7l1-7z" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'18px',color:'#fff',letterSpacing:'1px',lineHeight:1,marginBottom:'3px'}}>Train with Runna</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'11px',color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>Personalized training plans built around your goal — coming to Race Passport soon.</div>
          </div>
          <div style={{background:'rgba(201,168,76,0.12)',border:'1px solid rgba(201,168,76,0.25)',borderRadius:'6px',padding:'4px 10px',flexShrink:0}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',color:'#C9A84C',textTransform:'uppercase',whiteSpace:'nowrap'}}>Coming Soon</span>
          </div>
        </div>

      </div>

      {/* Fixed bottom bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:10,padding:'16px 20px 36px',background:'linear-gradient(to top,#fff 65%,rgba(255,255,255,0))'}}>
        <div style={{maxWidth:'560px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'8px'}}>
          <button onClick={handleSaveAndContinue} disabled={saving}
            style={{width:'100%',padding:'17px',border:'none',borderRadius:'14px',background:canContinue?'#1B2A4A':'#e2e6ed',color:canContinue?'#fff':'#9aa5b4',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'15px',fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',cursor:canContinue&&!saving?'pointer':'default',transition:'background 0.2s'}}
            onMouseEnter={e=>{if(canContinue&&!saving)e.currentTarget.style.background='#C9A84C'}}
            onMouseLeave={e=>{if(canContinue)e.currentTarget.style.background='#1B2A4A'}}>
            {saving?'Saving...':(canContinue?'Set This Goal & Continue →':'Set a goal above to continue')}
          </button>
          <p onClick={() => navigate('/build-passport', { state:{ imported: importedCount, firstName } })}
            style={{textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'13px',color:'#b0b8c4',cursor:'pointer',margin:0,letterSpacing:'0.5px'}}>
            Skip — I'll set a goal later
          </p>
        </div>
      </div>
    </div>
  )
}
