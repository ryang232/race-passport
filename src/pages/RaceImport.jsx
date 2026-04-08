import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const MOCK_RACES = [
  { id: 1, name: 'Baltimore Running Festival 10K', date: 'Oct 2024', location: 'Baltimore, MD', distance: '10K', time: '58:42', source: 'RUNSIGNUP' },
  { id: 2, name: 'Bay Bridge Run', date: 'Apr 2024', location: 'Annapolis, MD', distance: '10K', time: '57:14', source: 'RUNSIGNUP' },
  { id: 3, name: 'Marine Corps Marathon', date: 'Oct 2023', location: 'Washington, DC', distance: '26.2 mi', time: '4:12:08', source: 'ATHLINKS' },
  { id: 4, name: 'Frederick Running Festival 5K', date: 'May 2023', location: 'Frederick, MD', distance: '5K', time: '24:33', source: 'RUNSIGNUP' },
  { id: 5, name: 'Cherry Blossom 10 Miler', date: 'Apr 2023', location: 'Washington, DC', distance: '10 mi', time: '1:38:55', source: 'ATHLINKS' },
  { id: 6, name: '9/11 Memorial 5K', date: 'Sept 2022', location: 'Arlington, VA', distance: '5K', time: '23:11', source: 'ATHLINKS' },
  { id: 7, name: 'Hot Cider Hustle 5K', date: 'Nov 2022', location: 'Washington, DC', distance: '5K', time: '24:02', source: 'RUNSIGNUP' },
  { id: 8, name: 'Suds & Soles 5K', date: 'Jun 2022', location: 'Rockville, MD', distance: '5K', time: '25:44', source: 'RUNSIGNUP' },
]

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
    // Try to load profile if logged in, but always proceed to results
    const loadAndSearch = async () => {
      if (user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, date_of_birth')
            .eq('id', user.id)
            .single()
          if (data) {
            const parts = (data.full_name || '').trim().split(' ')
            setFirstName(parts[0] || 'Ryan')
            setLastName(parts.slice(1).join(' ') || 'Groene')
            setDob(data.date_of_birth || '')
          }
        } catch (e) {
          // silently fail, use defaults
        }
      }

      // Always fire after 2.8s regardless of auth state
      setTimeout(() => {
        const initialSelected = {}
        MOCK_RACES.forEach(r => { initialSelected[r.id] = true })
        setSelected(initialSelected)
        setLoading(false)
      }, 2800)
    }

    loadAndSearch()

    const style = document.createElement('style')
    style.id = 'rp-ri-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes fadeIn { from { opacity:0; transform:translateY(16px);} to { opacity:1; transform:translateY(0);} }
      @keyframes pulse { 0%,100%{opacity:0.3;} 50%{opacity:1;} }
      .rp-race-row {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 14px; border-radius: 8px;
        border: 1.5px solid #e2e6ed; background: #fff;
        margin-bottom: 8px; cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
      }
      .rp-race-row:hover { border-color: #1B2A4A; }
      .rp-race-row.selected { border-color: #C9A84C; background: rgba(201,168,76,0.04); }
      .rp-check {
        width: 22px; height: 22px; border-radius: 50%;
        border: 1.5px solid #e2e6ed; background: #fff;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; transition: all 0.15s;
      }
      .rp-race-row.selected .rp-check { background: #C9A84C; border-color: #C9A84C; }
      .source-tab {
        padding: 7px 16px; border-radius: 20px;
        border: 1.5px solid #e2e6ed; background: #fff;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 12px; font-weight: 600; letter-spacing: 1.5px;
        text-transform: uppercase; cursor: pointer;
        transition: all 0.15s; color: #9aa5b4;
        display: flex; align-items: center; gap: 6px;
      }
      .source-tab.active { background: #1B2A4A; color: #fff; border-color: #1B2A4A; }
      .rp-primary {
        width: 100%; padding: 15px; border: none; background: #1B2A4A; color: #fff;
        font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 600;
        letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer;
        transition: background 0.2s; border-radius: 8px;
      }
      .rp-primary:hover:not(:disabled) { background: #C9A84C; }
      .rp-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .results-in { animation: fadeIn 0.4s ease both; }
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

  const filteredRaces = activeSource === 'ALL'
    ? MOCK_RACES
    : MOCK_RACES.filter(r => r.source === activeSource)

  const runSignupCount = MOCK_RACES.filter(r => r.source === 'RUNSIGNUP').length
  const athlinksCount = MOCK_RACES.filter(r => r.source === 'ATHLINKS').length

  const handleConfirm = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    navigate('/home', { state: { imported: selectedCount } })
  }

  const formatDob = (dob) => {
    if (!dob) return ''
    const d = new Date(dob)
    return `${String(d.getMonth() + 1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`
  }

  const TICKER = ['26.2', '13.1', '10K', '5K', '70.3', '140.6', '50K', '100M', '26.2', '13.1', '10K', '5K', '70.3', '140.6', '50K', '100M']

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-55%)', left: 0, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', animation: 'tickerScroll 60s linear infinite' }}>
            {TICKER.map((d, i) => (
              <span key={i} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(180px, 24vw, 340px)', color: 'transparent', WebkitTextStroke: '1px rgba(27,42,74,0.055)', lineHeight: 1, padding: '0 40px', userSelect: 'none', flexShrink: 0 }}>{d}</span>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', letterSpacing: '3.5px', color: '#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '42px', color: '#1B2A4A', margin: '0 0 8px', letterSpacing: '2px', lineHeight: 1 }}>BUILDING YOUR PASSPORT</h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', letterSpacing: '1.5px', color: '#9aa5b4', margin: '0 0 28px', textTransform: 'uppercase' }}>
            Searching RunSignup + Athlinks
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.1s ease-in-out ${i * 0.37}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: "'Barlow', sans-serif", padding: '0 0 40px' }}>

      <div style={{ background: '#1B2A4A', padding: '28px 20px 24px', borderBottom: '3px solid #C9A84C', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.5)' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#C9A84C', textTransform: 'uppercase' }}>{MOCK_RACES.length} Races Found</span>
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', color: '#fff', margin: '0 0 8px', letterSpacing: '1.5px', lineHeight: 1 }}>ARE THESE YOUR RACES?</h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 300, lineHeight: 1.6 }}>
          We searched using <strong style={{ color: '#fff', fontWeight: 500 }}>{firstName} {lastName}</strong>
          {dob && <span> with DOB <strong style={{ color: '#fff', fontWeight: 500 }}>{formatDob(dob)}</strong></span>}.
          <br />Uncheck anything that isn't yours.
        </p>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>

        <div style={{ display: 'flex', gap: '8px', padding: '16px 0 12px', justifyContent: 'center' }}>
          {[
            { key: 'ALL', label: 'All', count: MOCK_RACES.length },
            { key: 'RUNSIGNUP', label: 'RunSignup', count: runSignupCount },
            { key: 'ATHLINKS', label: 'Athlinks', count: athlinksCount },
          ].map(tab => (
            <button key={tab.key} className={`source-tab ${activeSource === tab.key ? 'active' : ''}`} onClick={() => setActiveSource(tab.key)}>
              {tab.label} <span style={{ opacity: 0.7 }}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={toggleAll} style={{ background: 'none', border: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#C9A84C', textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', color: '#9aa5b4', letterSpacing: '0.5px' }}>{selectedCount} of {MOCK_RACES.length} selected</span>
        </div>

        <div className="results-in">
          {filteredRaces.map(race => (
            <div key={race.id} className={`rp-race-row ${selected[race.id] ? 'selected' : ''}`} onClick={() => toggleRace(race.id)}>
              <div className="rp-check">
                {selected[race.id] && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: '#1B2A4A', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{race.name}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', color: '#9aa5b4', letterSpacing: '0.5px', marginTop: '1px' }}>
                  {race.date} · {race.location} · {race.distance}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: '#1B2A4A', letterSpacing: '0.5px' }}>{race.time}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', color: '#9aa5b4', textTransform: 'uppercase' }}>{race.source}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ border: '1.5px dashed #e2e6ed', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', marginTop: '4px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#9aa5b4', textTransform: 'uppercase', marginBottom: '4px' }}>Missing a race?</div>
          <p style={{ fontSize: '13px', color: '#6b7a8d', margin: 0, fontWeight: 300, lineHeight: 1.6 }}>
            Don't see something that should be here?{' '}
            <span style={{ color: '#C9A84C', fontWeight: 600, cursor: 'pointer' }}>Search again with a different name</span>
            {' '}or{' '}
            <span style={{ color: '#C9A84C', fontWeight: 600, cursor: 'pointer' }}>add it manually</span>
            {' '}after confirming.
          </p>
        </div>

        <button className="rp-primary" onClick={handleConfirm} disabled={saving || selectedCount === 0}>
          {saving ? 'Saving...' : `Confirm My Races (${selectedCount}) →`}
        </button>

        <p onClick={() => navigate('/home')} style={{ textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', color: '#9aa5b4', marginTop: '14px', cursor: 'pointer', letterSpacing: '0.5px' }}>
          Skip import — I'll add races later
        </p>
      </div>
    </div>
  )
}
