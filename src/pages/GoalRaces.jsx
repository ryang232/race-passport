import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
const DISTANCES = ['5K','10K','Half Marathon','Marathon','70.3','140.6','Ultra']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEARS = ['2026','2027','2028']

// Map our distance labels to RunSignup distance params
const DISTANCE_TO_RUNSIGNUP = {
  '5K':           '5K',
  '10K':          '10K',
  'Half Marathon':'Half Marathon',
  'Marathon':     'Marathon',
  '70.3':         'Half Iron',
  '140.6':        'Full Iron',
  'Ultra':        '50K',
}

const DISTANCE_TO_PACER = {
  '5K':           '5K',
  '10K':          '10K',
  'Half Marathon':'13.1',
  'Marathon':     '26.2',
  '70.3':         '70.3',
  '140.6':        '140.6',
  'Ultra':        '50K+',
}

function distanceColor(d) {
  if (!d) return '#C9A84C'
  const c = getDistanceColor(DISTANCE_TO_PACER[d] || d)
  return c.stampBorder || '#C9A84C'
}

function MiniStamp({ distance, size = 44 }) {
  const label = DISTANCE_TO_PACER[distance] || distance
  const c = getDistanceColor(label)
  const fs = label.length > 4 ? 9 : label.length > 2 ? 12 : 16
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${c.stampBorder}`, background: `${c.stampBorder}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: `1px dashed ${c.stampBorder}55` }} />
      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: fs, color: c.stampBorder, position: 'relative', zIndex: 1 }}>{label}</span>
    </div>
  )
}

function RaceCard({ race, selected, onSelect }) {
  const c = getDistanceColor(race.distance || '')
  const isSelected = selected?.id === race.id
  return (
    <div onClick={() => onSelect(isSelected ? null : race)}
      style={{ border: `1.5px solid ${isSelected ? c.stampBorder : '#e2e6ed'}`, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', background: isSelected ? `${c.stampBorder}06` : '#fff', transform: isSelected ? 'translateY(-1px)' : 'none' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = c.stampBorder }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#e2e6ed' }}>
      <div style={{ height: '3px', background: c.stampBorder }} />
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <MiniStamp distance={race.display_distance || race.distance} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '15px', color: '#1B2A4A', letterSpacing: '0.5px', lineHeight: 1.2, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{race.name}</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '11px', color: '#9aa5b4' }}>
            {[race.date, race.city ? `${race.city}, ${race.state}` : race.location, race.price ? `$${race.price}` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
        {isSelected && (
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: c.stampBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GoalRaces() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()

  const firstName = locationState?.firstName || ''
  const importedCount = locationState?.imported || 0

  const [selectedDistance, setSelectedDistance] = useState('')
  const [targetMonth, setTargetMonth]           = useState('')
  const [targetYear, setTargetYear]             = useState('2026')
  const [currentMileage, setCurrentMileage]     = useState('')
  const [selectedRace, setSelectedRace]         = useState(null)
  const [saving, setSaving]                     = useState(false)

  // Suggested races state
  const [suggestedRaces, setSuggestedRaces]     = useState([])
  const [loadingRaces, setLoadingRaces]         = useState(false)
  const [racesError, setRacesError]             = useState('')
  const [userLat, setUserLat]                   = useState(null)
  const [userLng, setUserLng]                   = useState(null)
  const [userState, setUserState]               = useState('')

  const fetchRef = useRef(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-gr2-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);}to{transform:translateX(-50%);} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      @keyframes pulse { 0%,100%{opacity:0.4;}50%{opacity:1;} }
      .gr-dist-pill { padding:8px 16px; border-radius:20px; border:1.5px solid; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.12s; }
      .gr-select { width:100%; padding:11px 14px; border-radius:8px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:14px; font-family:'Barlow',sans-serif; outline:none; appearance:none; cursor:pointer; transition:border-color 0.15s; }
      .gr-select:focus { border-color:#C9A84C; }
    `
    if (!document.getElementById('rp-gr2-styles')) document.head.appendChild(style)

    // Load user location from profile
    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) return
      const { data } = await supabase.from('profiles')
        .select('signup_lat,signup_lng,state,zip_code,city')
        .eq('id', user.id).single()
      if (data?.signup_lat) { setUserLat(data.signup_lat); setUserLng(data.signup_lng) }
      if (data?.state) setUserState(data.state)
    }
    loadProfile()

    return () => document.getElementById('rp-gr2-styles')?.remove()
  }, [user])

  // Fetch races when distance + year changes
  useEffect(() => {
    if (!selectedDistance) { setSuggestedRaces([]); return }

    const token = Symbol()
    fetchRef.current = token

    const loadRaces = async () => {
      setLoadingRaces(true)
      setRacesError('')
      setSuggestedRaces([])
      setSelectedRace(null)

      try {
        // Build RunSignup API params — credentials injected server-side
        const params = new URLSearchParams({
          distance:        DISTANCE_TO_RUNSIGNUP[selectedDistance] || selectedDistance,
          results_per_page: 20,
          page:            1,
          sort:            'date ASC',
          start_date:      `${targetYear || '2026'}-01-01`,
          end_date:        `${targetYear || '2026'}-12-31`,
        })

        // Add radius if we have coordinates
        if (userLat && userLng) {
          params.set('lat', userLat)
          params.set('lon', userLng)
          params.set('radius', '50')
          params.set('radius_units', 'M')
        } else if (userState) {
          params.set('state', userState)
        }

        // If target month specified, narrow date range
        if (targetMonth && targetYear) {
          const monthIdx = MONTHS.indexOf(targetMonth) + 1
          const paddedMonth = String(monthIdx).padStart(2, '0')
          const lastDay = new Date(parseInt(targetYear), monthIdx, 0).getDate()
          params.set('start_date', `${targetYear}-${paddedMonth}-01`)
          params.set('end_date', `${targetYear}-${paddedMonth}-${lastDay}`)
        }

        const resp = await fetch(`/api/runsignup?${params}`)
        if (fetchRef.current !== token) return

        const data = await resp.json()
        const races = (data.races || []).slice(0, 20).map(r => {
          const race = r.race || r
          const event = race.next_date || (race.events && race.events[0]) || {}
          return {
            id:       String(race.race_id || race.id || Math.random()),
            name:     race.name,
            date:     event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (race.next_date_utc || ''),
            city:     race.address?.city || '',
            state:    race.address?.state || '',
            distance: DISTANCE_TO_PACER[selectedDistance] || selectedDistance,
            display_distance: selectedDistance,
            price:    event.registration_closes ? null : null,
            url:      race.url || '',
          }
        }).filter(r => r.name)

        if (fetchRef.current !== token) return

        if (races.length === 0) {
          setRacesError('No races found for this distance and date range.')
          setLoadingRaces(false)
          return
        }

        // Ask Pacer to pick the best 3
        try {
          const pacerResp = await fetch('/api/pacer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'goal_race_suggestions',
              distance: DISTANCE_TO_PACER[selectedDistance] || selectedDistance,
              month: targetMonth || null,
              year: targetYear || '2026',
              location: userState || null,
              races: races.slice(0, 15).map(r => ({ id: r.id, name: r.name, date: r.date, city: r.city, state: r.state })),
            })
          })
          const pacerData = await pacerResp.json()
          if (fetchRef.current !== token) return

          if (pacerData.top_race_ids?.length > 0) {
            const topIds = new Set(pacerData.top_race_ids.map(String))
            const top = races.filter(r => topIds.has(r.id))
            const rest = races.filter(r => !topIds.has(r.id))
            setSuggestedRaces([...top, ...rest].slice(0, 6))
          } else {
            setSuggestedRaces(races.slice(0, 6))
          }
        } catch(e) {
          if (fetchRef.current !== token) return
          setSuggestedRaces(races.slice(0, 6))
        }
      } catch(e) {
        if (fetchRef.current !== token) return
        setRacesError('Could not load races. Check your connection and try again.')
      }
      if (fetchRef.current === token) setLoadingRaces(false)
    }

    loadRaces()
  }, [selectedDistance, targetMonth, targetYear, userLat, userLng, userState])

  const handleSaveAndContinue = async () => {
    setSaving(true)

    if (user && !isDemo(user?.email)) {
      try {
        await supabase.from('profiles').update({
          goal_type:            selectedDistance ? 'distance' : null,
          goal_distance:        selectedDistance || null,
          goal_target_month:    targetMonth || null,
          goal_target_year:     targetYear || null,
          goal_current_mileage: currentMileage || null,
          goal_race_id:         selectedRace?.id || null,
          goal_race_name:       selectedRace?.name || null,
        }).eq('id', user.id)
      } catch(e) {}
    }

    setSaving(false)
    navigate('/build-passport', { state: { imported: importedCount, firstName } })
  }

  const handleSkip = () => {
    navigate('/build-passport', { state: { imported: importedCount, firstName } })
  }

  const accentColor = selectedDistance ? distanceColor(selectedDistance) : '#C9A84C'

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Barlow',sans-serif", paddingBottom: '60px', position: 'relative', overflow: 'hidden' }}>

      {/* Ghost ticker */}
      <div style={{ position: 'fixed', top: '50%', transform: 'translateY(-55%)', left: 0, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', animation: 'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d, i) => <span key={i} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(180px,24vw,340px)', color: 'transparent', WebkitTextStroke: '1px rgba(27,42,74,0.04)', lineHeight: 1, padding: '0 40px', userSelect: 'none', flexShrink: 0 }}>{d}</span>)}
        </div>
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, background: '#fff', padding: '28px 20px 24px', borderBottom: `3px solid ${accentColor}`, textAlign: 'center', transition: 'border-color 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '11px', letterSpacing: '3px', color: '#9aa5b4' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
          <div style={{ height: '3px', width: '40px', background: '#C9A84C', borderRadius: '2px' }} />
          <div style={{ height: '3px', width: '40px', background: '#C9A84C', borderRadius: '2px' }} />
          <div style={{ height: '3px', width: '40px', background: accentColor, borderRadius: '2px', transition: 'background 0.3s' }} />
        </div>
        <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '10px', letterSpacing: '2.5px', color: '#9aa5b4', margin: '0 0 14px', textTransform: 'uppercase' }}>Step 3 of 4 — Set Your Goal</p>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(28px,5vw,48px)', color: '#1B2A4A', margin: '0 0 8px', letterSpacing: '1.5px', lineHeight: 1 }}>
          ANY GOAL RACES OR DISTANCES?
        </h1>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: '14px', color: '#6b7a8d', margin: '0 auto', fontWeight: 300, lineHeight: 1.7, maxWidth: '480px' }}>
          {firstName ? `Tell us what you're chasing, ${firstName} —` : "Tell us what you're chasing —"} Pacer will find races that fit.
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto', padding: '24px 20px 0' }}>

        {/* Goal Distance */}
        <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', color: '#9aa5b4', textTransform: 'uppercase', marginBottom: '12px' }}>What distance are you chasing?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {DISTANCES.map(d => {
              const color = distanceColor(d)
              const isActive = selectedDistance === d
              return (
                <button key={d} className="gr-dist-pill"
                  onClick={() => setSelectedDistance(d === selectedDistance ? '' : d)}
                  style={{ background: isActive ? color : `${color}12`, borderColor: color, color: isActive ? '#fff' : color }}>
                  {d}
                </button>
              )
            })}
          </div>

          {/* Target date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', color: '#9aa5b4', textTransform: 'uppercase', marginBottom: '6px' }}>Target Month <span style={{ fontWeight: 400, color: '#b0b8c4' }}>(optional)</span></div>
              <select className="gr-select" value={targetMonth} onChange={e => setTargetMonth(e.target.value)}>
                <option value="">Any month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', color: '#9aa5b4', textTransform: 'uppercase', marginBottom: '6px' }}>Target Year</div>
              <select className="gr-select" value={targetYear} onChange={e => setTargetYear(e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Current fitness */}
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', color: '#9aa5b4', textTransform: 'uppercase', marginBottom: '6px' }}>Where are you now? <span style={{ fontWeight: 400, color: '#b0b8c4' }}>(optional)</span></div>
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

        {/* Pacer Race Suggestions */}
        {selectedDistance && (
          <div style={{ marginBottom: '20px', animation: 'fadeIn 0.25s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: '#9aa5b4', textTransform: 'uppercase' }}>
                Pacer's Top Picks
              </span>
              {loadingRaces && (
                <div style={{ width: 12, height: 12, border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              )}
            </div>
            <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '12px', color: '#b0b8c4', marginBottom: '12px', margin: '0 0 12px' }}>
              {selectedDistance} races{userState ? ` near ${userState}` : ''}{targetMonth && targetYear ? ` · ${targetMonth} ${targetYear}` : ` · ${targetYear}`}
              {!userLat && !userState && ' · Add your location in Profile to see nearby races'}
            </p>

            {loadingRaces && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 72, borderRadius: '12px', background: '#f4f5f7', animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}

            {!loadingRaces && racesError && (
              <div style={{ padding: '16px', background: 'rgba(27,42,74,0.04)', border: '1.5px dashed #e2e6ed', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '13px', color: '#9aa5b4' }}>{racesError}</div>
                <button onClick={() => navigate('/discover')} style={{ marginTop: '10px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '12px', fontWeight: 600, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Browse Discover →
                </button>
              </div>
            )}

            {!loadingRaces && suggestedRaces.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {suggestedRaces.map(race => (
                  <RaceCard key={race.id} race={race} selected={selectedRace} onSelect={setSelectedRace} />
                ))}
                <button onClick={() => navigate('/discover')}
                  style={{ padding: '12px', border: '1.5px dashed #e2e6ed', borderRadius: '12px', background: 'none', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '1px', color: '#C9A84C', cursor: 'pointer', textTransform: 'uppercase', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e6ed'}>
                  Browse All Races on Discover →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Runna card */}
        <div style={{ background: '#1B2A4A', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(201,168,76,0.12)', border: '1.5px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 3L5 14h7l-1 7 8-11h-7l1-7z" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: '#fff', letterSpacing: '1px', lineHeight: 1, marginBottom: '3px' }}>Train with Runna</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Personalized training plans built around your goal — coming to Race Passport soon.</div>
          </div>
          <div style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '6px', padding: '4px 10px', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', color: '#C9A84C', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Coming Soon</span>
          </div>
        </div>

        {/* Goal preview */}
        {(selectedDistance || selectedRace) && (
          <div style={{ border: `1.5px solid ${accentColor}30`, borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', animation: 'fadeIn 0.2s ease both' }}>
            <div style={{ background: '#1B2A4A', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C' }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '9px', fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Your Goal Preview</span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <MiniStamp distance={selectedDistance || selectedRace?.display_distance} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '9px', fontWeight: 600, letterSpacing: '2px', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '3px' }}>Active Goal</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: '#1B2A4A', letterSpacing: '0.5px', lineHeight: 1.1, marginBottom: '2px' }}>
                  {selectedRace?.name || selectedDistance}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '11px', color: '#9aa5b4' }}>
                  {selectedRace
                    ? `${selectedRace.date}${selectedRace.city ? ` · ${selectedRace.city}, ${selectedRace.state}` : ''}`
                    : `${targetMonth && targetYear ? `${targetMonth} ${targetYear}` : targetYear || '2026'}`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <button onClick={handleSaveAndContinue} disabled={saving}
          style={{ width: '100%', padding: '16px', border: 'none', borderRadius: '10px', background: selectedDistance ? '#1B2A4A' : '#e2e6ed', color: selectedDistance ? '#fff' : '#9aa5b4', fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', letterSpacing: '2px', cursor: selectedDistance ? 'pointer' : 'default', transition: 'background 0.2s', marginBottom: '10px' }}
          onMouseEnter={e => { if (selectedDistance) e.currentTarget.style.background = '#C9A84C' }}
          onMouseLeave={e => { if (selectedDistance) e.currentTarget.style.background = '#1B2A4A' }}>
          {saving ? 'Saving...' : selectedDistance ? 'Set Goal & Continue →' : 'Select a Distance to Continue'}
        </button>

        <p onClick={handleSkip} style={{ textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '12px', color: '#9aa5b4', cursor: 'pointer', letterSpacing: '0.5px', margin: 0 }}>
          Skip — I&#39;ll set goals later
        </p>

      </div>
    </div>
  )
}
