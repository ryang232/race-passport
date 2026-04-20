import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const SUGGESTED_RACES = {
  '5K': [
    { id:'d2', name:'Suds & Soles 5K', date:'Jun 13, 2026', location:'Rockville, MD', price:'$35', distance:'5K' },
    { id:'d6', name:'Frederick Festival 5K', date:'May 2, 2026', location:'Frederick, MD', price:'$30', distance:'5K' },
  ],
  '10K': [
    { id:'d4', name:'Annapolis Bay Bridge Run', date:'Oct 12, 2026', location:'Annapolis, MD', price:'$55', distance:'10K' },
    { id:'d3', name:'Baltimore 10 Miler', date:'Jun 6, 2026', location:'Baltimore, MD', price:'$65', distance:'10 mi' },
  ],
  'Half Marathon': [
    { id:'d1', name:'Parks Half Marathon', date:'Sep 21, 2026', location:'Bethesda, MD', price:'$95', distance:'13.1' },
    { id:'d5', name:'DC Half Marathon', date:'Mar 15, 2027', location:'Washington, DC', price:'$110', distance:'13.1' },
    { id:'d4', name:'Annapolis Bay Bridge Run', date:'Oct 12, 2026', location:'Annapolis, MD', price:'$55', distance:'10K' },
  ],
  'Marathon': [
    { id:'101', name:'Marine Corps Marathon', date:'Oct 26, 2026', location:'Arlington, VA', price:'$140', distance:'26.2' },
    { id:'d8', name:'Richmond Marathon', date:'Nov 15, 2026', location:'Richmond, VA', price:'$110', distance:'26.2' },
  ],
  '70.3': [
    { id:'102', name:'IRONMAN 70.3 Atlantic City', date:'Sep 13, 2026', location:'Atlantic City, NJ', price:'$350', distance:'70.3' },
  ],
  '140.6': [
    { id:'103', name:'IRONMAN Maryland', date:'Oct 4, 2026', location:'Cambridge, MD', price:'$650', distance:'140.6' },
  ],
  'Ultra': [
    { id:'d9', name:'Seneca Creek 50K', date:'Mar 21, 2026', location:'Gaithersburg, MD', price:'$85', distance:'50K' },
  ],
}

const SEARCH_RACES = [
  { id:'101', name:'Marine Corps Marathon', date:'Oct 26, 2026', location:'Arlington, VA', price:'$140', distance:'26.2' },
  { id:'d1', name:'Parks Half Marathon', date:'Sep 21, 2026', location:'Bethesda, MD', price:'$95', distance:'13.1' },
  { id:'d5', name:'DC Half Marathon', date:'Mar 15, 2027', location:'Washington, DC', price:'$110', distance:'13.1' },
  { id:'102', name:'IRONMAN 70.3 Atlantic City', date:'Sep 13, 2026', location:'Atlantic City, NJ', price:'$350', distance:'70.3' },
  { id:'d3', name:'Baltimore 10 Miler', date:'Jun 6, 2026', location:'Baltimore, MD', price:'$65', distance:'10 mi' },
  { id:'d2', name:'Suds & Soles 5K', date:'Jun 13, 2026', location:'Rockville, MD', price:'$35', distance:'5K' },
  { id:'103', name:'Cherry Blossom 10 Miler', date:'Apr 8, 2026', location:'Washington, DC', price:'$110', distance:'10 mi' },
  { id:'d4', name:'Annapolis Bay Bridge Run', date:'Oct 12, 2026', location:'Annapolis, MD', price:'$55', distance:'10K' },
]

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
const DISTANCES = ['5K','10K','Half Marathon','Marathon','70.3','140.6','Ultra']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEARS = ['2026','2027','2028']

function distanceToLabel(d) {
  if (d === 'Half Marathon') return '13.1'
  if (d === 'Marathon') return '26.2'
  if (d === 'Ultra') return '50K'
  return d
}

function distanceToColor(d) {
  if (d === 'Marathon' || d === '26.2') return '#C9A84C'
  if (['70.3','140.6'].includes(d)) return '#B83232'
  if (d === 'Ultra' || d === '50K') return '#9C7C4A'
  return '#1E5FA8'
}

export default function GoalRaces() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()
  const firstName = locationState?.firstName || 'Ryan'

  const [mode, setMode] = useState('distance') // 'distance' | 'race'
  const [selectedDistance, setSelectedDistance] = useState('')
  const [targetMonth, setTargetMonth] = useState('')
  const [targetYear, setTargetYear] = useState('')
  const [currentMileage, setCurrentMileage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRace, setSelectedRace] = useState(null)
  const [selectedSuggestedRace, setSelectedSuggestedRace] = useState(null)
  const [saving, setSaving] = useState(false)

  const searchResults = searchQuery.length > 1
    ? SEARCH_RACES.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_RACES.slice(0, 4)

  const suggestedRaces = selectedDistance ? (SUGGESTED_RACES[selectedDistance] || []) : []

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-gr-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);}to{transform:translateX(-50%);} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
      .gr-mode-btn { padding:16px; border-radius:10px; cursor:pointer; text-align:center; transition:all 0.15s; border:1.5px solid; }
      .gr-dist-pill { padding:8px 16px; border-radius:20px; border:1.5px solid; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.15s; }
      .gr-sug-card { border:1.5px solid #e8eaed; border-radius:10px; overflow:hidden; cursor:pointer; transition:all 0.15s; }
      .gr-sug-card:hover { border-color:#C9A84C; transform:translateY(-2px); }
      .gr-sug-card.selected { border-color:#C9A84C; background:rgba(201,168,76,0.04); }
      .gr-race-result { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1.5px solid #e8eaed; border-radius:10px; margin-bottom:8px; cursor:pointer; transition:all 0.15s; }
      .gr-race-result:hover { border-color:#1B2A4A; }
      .gr-race-result.selected { border-color:#C9A84C; background:rgba(201,168,76,0.04); }
      .gr-select { width:100%; padding:10px 14px; border-radius:8px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:14px; font-family:'Barlow',sans-serif; outline:none; appearance:none; cursor:pointer; transition:border-color 0.15s; }
      .gr-select:focus { border-color:#C9A84C; }
      .gr-primary { width:100%; padding:18px; background:#1B2A4A; color:#fff; font-family:'Bebas Neue',sans-serif; font-size:20px; letter-spacing:2px; border:none; border-radius:8px; cursor:pointer; transition:background 0.2s; }
      .gr-primary:hover:not(:disabled) { background:#C9A84C; }
      .gr-primary:disabled { opacity:0.5; cursor:not-allowed; }
    `
    if (!document.getElementById('rp-gr-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-gr-styles')?.remove()
  }, [])

  const handleConfirm = async () => {
    setSaving(true)

    const goalData = mode === 'distance'
      ? {
          goal_type: 'distance',
          goal_distance: selectedDistance,
          goal_target_month: targetMonth,
          goal_target_year: targetYear,
          goal_current_mileage: currentMileage,
          goal_race_id: selectedSuggestedRace?.id || null,
          goal_race_name: selectedSuggestedRace?.name || null,
        }
      : {
          goal_type: 'race',
          goal_distance: selectedRace?.distance || null,
          goal_race_id: selectedRace?.id || null,
          goal_race_name: selectedRace?.name || null,
          goal_target_month: null,
          goal_target_year: null,
          goal_current_mileage: currentMileage,
        }

    if (user && !isDemo(user?.email)) {
      try {
        await supabase.from('profiles').update(goalData).eq('id', user.id)
      } catch (e) {}
    }

    setSaving(false)
    navigate('/home', { state: { goalsSet: true, firstName } })
  }

  const canContinue = mode === 'distance' ? !!selectedDistance : !!selectedRace
  const accentColor = mode === 'distance' && selectedDistance
    ? distanceToColor(selectedDistance)
    : mode === 'race' && selectedRace
    ? distanceToColor(selectedRace.distance)
    : '#C9A84C'

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Barlow',sans-serif", paddingBottom:'60px', position:'relative', overflow:'hidden' }}>

      {/* Ghost ticker */}
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
        {/* Step progress bars */}
        <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'12px' }}>
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
        </div>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 14px', textTransform:'uppercase' }}>Step 3 of 3 — Set Your Goals</p>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,52px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'1.5px', lineHeight:1 }}>
          ANY GOAL RACES OR DISTANCES?
        </h1>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:'0 auto', fontWeight:300, lineHeight:1.7, maxWidth:'480px' }}>
          Tell us what you're chasing, {firstName} — we'll help you get there.
        </p>
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:'640px', margin:'0 auto', padding:'28px 20px 0' }}>

        {/* Mode toggle */}
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'10px' }}>What kind of goal do you have?</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'24px' }}>
          {[
            { key:'distance', label:'A Distance Goal', sub:'I want to run a half marathon by spring' },
            { key:'race', label:'A Specific Race', sub:'I want to run the NYC Marathon' },
          ].map(opt => (
            <div key={opt.key} className="gr-mode-btn"
              onClick={() => setMode(opt.key)}
              style={{
                background: mode === opt.key ? '#1B2A4A' : '#fff',
                borderColor: mode === opt.key ? '#1B2A4A' : '#e2e6ed',
              }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color: mode === opt.key ? '#fff' : '#1B2A4A', letterSpacing:'1px', marginBottom:'4px' }}>{opt.label}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color: mode === opt.key ? 'rgba(255,255,255,0.45)' : '#9aa5b4', letterSpacing:'0.5px' }}>{opt.sub}</div>
            </div>
          ))}
        </div>

        {/* DISTANCE MODE */}
        {mode === 'distance' && (
          <div style={{ animation:'fadeIn 0.25s ease both' }}>
            <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:'12px', padding:'20px', marginBottom:'16px' }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'10px' }}>Goal Distance</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'20px' }}>
                {DISTANCES.map(d => {
                  const color = distanceToColor(d)
                  const isActive = selectedDistance === d
                  return (
                    <div key={d} className="gr-dist-pill"
                      onClick={() => { setSelectedDistance(d); setSelectedSuggestedRace(null) }}
                      style={{
                        background: isActive ? color : `${color}10`,
                        borderColor: color,
                        color: isActive ? '#fff' : color,
                      }}>
                      {d}
                    </div>
                  )
                })}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Target Month</div>
                  <select className="gr-select" value={targetMonth} onChange={e => setTargetMonth(e.target.value)}>
                    <option value="">Month</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Target Year</div>
                  <select className="gr-select" value={targetYear} onChange={e => setTargetYear(e.target.value)}>
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop:'12px' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Where Are You Now?</div>
                <select className="gr-select" value={currentMileage} onChange={e => setCurrentMileage(e.target.value)}>
                  <option value="">Select your current fitness...</option>
                  <option value="beginner">Just starting out / mostly inactive</option>
                  <option value="low">Running occasionally, under 10 mi/week</option>
                  <option value="mid">Running 10–20 mi/week</option>
                  <option value="high">Running 20–30 mi/week</option>
                  <option value="advanced">Running 30+ mi/week</option>
                </select>
              </div>
            </div>

            {/* Suggested races */}
            {selectedDistance && suggestedRaces.length > 0 && (
              <div style={{ animation:'fadeIn 0.2s ease both' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Suggested Races Near You</div>
                <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#b0b8c4', marginBottom:'12px', letterSpacing:'0.5px' }}>
                  {selectedDistance} races near Maryland{targetMonth && targetYear ? ` — ${targetMonth} ${targetYear}` : ''}
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'10px', marginBottom:'16px' }}>
                  {suggestedRaces.map(race => {
                    const colors = getDistanceColor(race.distance)
                    const cleaned = race.distance.replace(' mi','')
                    const isSelected = selectedSuggestedRace?.id === race.id
                    return (
                      <div key={race.id} className={`gr-sug-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSuggestedRace(isSelected ? null : race)}>
                        <div style={{ height:'3px', background:colors.primary }} />
                        <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:38, height:38, borderRadius:'50%', border:`2px solid ${colors.primary}`, background:colors.light, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: cleaned.length > 3 ? 9 : cleaned.length > 2 ? 11 : 14, color:colors.primary }}>{cleaned}</span>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'2px' }}>{race.name}</div>
                            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4' }}>{race.date} · {race.price}</div>
                          </div>
                          {isSelected && (
                            <div style={{ width:18, height:18, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="gr-sug-card" onClick={() => navigate('/discover')}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px dashed #e2e6ed', minHeight:'72px' }}>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C' }}>Browse All Races →</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RACE MODE */}
        {mode === 'race' && (
          <div style={{ animation:'fadeIn 0.25s ease both' }}>
            <div style={{ background:'#fff', border:'1.5px solid #e8eaed', borderRadius:'12px', padding:'20px', marginBottom:'16px' }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Search for your race</div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', background:'#f4f5f7', border:'1.5px solid #e2e6ed', borderRadius:'10px', padding:'10px 14px', marginBottom:'14px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="#9aa5b4" strokeWidth="1.3"/><path d="M10 10l2.5 2.5" stroke="#9aa5b4" strokeWidth="1.3" strokeLinecap="round"/></svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search race name, city, or state..."
                  style={{ border:'none', background:'transparent', fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#1B2A4A', outline:'none', flex:1 }}
                />
                {searchQuery && <span onClick={() => setSearchQuery('')} style={{ color:'#9aa5b4', cursor:'pointer', fontSize:'18px', lineHeight:1 }}>×</span>}
              </div>

              <div style={{ maxHeight:'300px', overflowY:'auto' }}>
                {searchResults.map(race => {
                  const colors = getDistanceColor(race.distance)
                  const cleaned = race.distance.replace(' mi','')
                  const isSelected = selectedRace?.id === race.id
                  return (
                    <div key={race.id} className={`gr-race-result ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedRace(isSelected ? null : race)}>
                      <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${colors.primary}`, background:colors.light, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: cleaned.length > 3 ? 9 : cleaned.length > 2 ? 11 : 14, color:colors.primary }}>{cleaned}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'2px' }}>{race.name}</div>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{race.date} · {race.location} · {race.price}</div>
                      </div>
                      {isSelected && (
                        <div style={{ width:20, height:20, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {selectedRace && (
                <div style={{ marginTop:'14px' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Where Are You Now?</div>
                  <select className="gr-select" value={currentMileage} onChange={e => setCurrentMileage(e.target.value)}>
                    <option value="">Select your current fitness...</option>
                    <option value="beginner">Just starting out / mostly inactive</option>
                    <option value="low">Running occasionally, under 10 mi/week</option>
                    <option value="mid">Running 10–20 mi/week</option>
                    <option value="high">Running 20–30 mi/week</option>
                    <option value="advanced">Running 30+ mi/week</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Runna integration card */}
        <div style={{ background:'#1B2A4A', borderRadius:'12px', padding:'20px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ width:48, height:48, borderRadius:'10px', background:'rgba(201,168,76,0.12)', border:'1.5px solid rgba(201,168,76,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 3L5 14h7l-1 7 8-11h-7l1-7z" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#fff', letterSpacing:'1px', lineHeight:1, marginBottom:'4px' }}>Train with Runna</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.4)', letterSpacing:'0.5px', lineHeight:1.5 }}>Personalized training plans built around your goal race or distance — coming to Race Passport soon.</div>
          </div>
          <div style={{ background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'6px', padding:'5px 12px', flexShrink:0 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', whiteSpace:'nowrap' }}>Coming Soon</span>
          </div>
        </div>

        {/* Passport preview — only show when something is selected */}
        {canContinue && (
          <div style={{ border:'1.5px solid #e8eaed', borderRadius:'12px', overflow:'hidden', marginBottom:'20px', animation:'fadeIn 0.25s ease both' }}>
            <div style={{ background:'#1B2A4A', padding:'14px 18px', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#C9A84C' }} />
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginBottom:'2px' }}>Preview</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#fff', letterSpacing:'1px' }}>HOW THIS APPEARS ON YOUR PASSPORT</div>
              </div>
            </div>
            <div style={{ padding:'16px 18px' }}>
              {(() => {
                const dist = mode === 'distance' ? selectedDistance : selectedRace?.distance
                const label = mode === 'distance' ? distanceToLabel(selectedDistance) : selectedRace?.distance.replace(' mi','')
                const color = distanceToColor(dist || '')
                const raceName = mode === 'distance' ? (selectedSuggestedRace?.name || null) : selectedRace?.name
                const raceDate = mode === 'distance' ? (selectedSuggestedRace?.date || null) : selectedRace?.date
                const goalLabel = mode === 'distance' ? selectedDistance : selectedRace?.name
                const subLabel = mode === 'distance'
                  ? `${targetMonth && targetYear ? `Target: ${targetMonth} ${targetYear}` : 'Target date TBD'}${raceName ? ` · ${raceName}` : ''}`
                  : `${selectedRace?.date} · ${selectedRace?.location}`
                return (
                  <div style={{ border:`1.5px solid ${color}`, borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'14px', background:`${color}08` }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', border:`2px solid ${color}`, background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                      <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:`1px dashed ${color}55` }} />
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: (label||'').length > 3 ? 10 : (label||'').length > 2 ? 13 : 17, color, position:'relative', zIndex:1 }}>{label}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'3px' }}>Active Goal</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'3px' }}>{goalLabel}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{subLabel}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px', alignItems:'flex-end' }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1px', color, cursor:'pointer', whiteSpace:'nowrap' }}>View Races →</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>Train w/ Runna →</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        <button className="gr-primary" onClick={handleConfirm} disabled={saving || !canContinue}>
          {saving ? 'SAVING...' : canContinue ? 'ADD TO MY PASSPORT →' : 'SELECT A GOAL TO CONTINUE'}
        </button>

        <p onClick={() => navigate('/home')} style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'14px', cursor:'pointer', letterSpacing:'0.5px' }}>
          Skip — I'll set goals later
        </p>

      </div>
    </div>
  )
}
