import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { loadRacePhoto, PHOTO_PLACEHOLDER } from '../lib/photos'
import { getDistanceColor } from '../lib/colors'
import { supabase } from '../lib/supabase'

// ── "Did you sign up?" banner ─────────────────────────────────────────────────
function SignupBanner({ race, onYes, onNo }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:200, padding:'0 24px 24px', pointerEvents:'none' }}>
      <div style={{ maxWidth:'560px', margin:'0 auto', pointerEvents:'all', transition:'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)', transform:visible?'translateY(0)':'translateY(120%)' }}>
        <div style={{ background:'#1B2A4A', borderRadius:'16px', padding:'18px 22px', boxShadow:'0 8px 40px rgba(0,0,0,0.35)', border:'1px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'rgba(255,255,255,0.55)', letterSpacing:'0.5px' }}>Welcome back!</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, color:'#fff', lineHeight:1.2 }}>Did you register for <span style={{ color:'#C9A84C' }}>{race.name}</span>?</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
            <button onClick={onNo}
              style={{ padding:'7px 14px', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'rgba(255,255,255,0.5)', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.4)'; e.currentTarget.style.color='#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; e.currentTarget.style.color='rgba(255,255,255,0.5)' }}>
              Not yet
            </button>
            <button onClick={onYes}
              style={{ padding:'7px 18px', border:'none', borderRadius:'8px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='#e0c060'}
              onMouseLeave={e => e.currentTarget.style.background='#C9A84C'}>
              Yes! 🎉
            </button>
          </div>
          <button onClick={onNo} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.25)', cursor:'pointer', fontSize:'18px', lineHeight:1, padding:0, flexShrink:0 }}>✕</button>
        </div>
      </div>
    </div>
  )
}

// ── Signup confirmation modal ─────────────────────────────────────────────────
function SignupModal({ race, onSave, onClose, t }) {
  const [goal, setGoal]           = useState('')
  const [specificTime, setSpecificTime] = useState('')
  const [saving, setSaving]       = useState(false)

  const GOALS = [
    { key:'pr',    label:'Go for a PR 🏆' },
    { key:'time',  label:'Hit a specific time 🎯' },
    { key:'fun',   label:'Have fun 🎉' },
    { key:'finish',label:'Just finish strong 💪' },
    { key:'cause', label:'Support a cause ❤️' },
  ]

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    onSave({ goal, specificTime })
    setSaving(false)
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:t.surface, borderRadius:'20px', padding:'32px', width:'100%', maxWidth:'420px', boxShadow:'0 24px 64px rgba(0,0,0,0.35)', border:`1px solid ${t.border}` }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(201,168,76,0.12)', border:'1.5px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>🎉</div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>You're In!</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'2px' }}>{race.name} · {race.date}</div>
          </div>
        </div>

        {/* Single question */}
        <div style={{ marginBottom:'24px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'12px' }}>What's your goal for this race?</label>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {GOALS.map(g => (
              <button key={g.key} onClick={() => setGoal(goal===g.key?'':g.key)}
                style={{ padding:'10px 16px', borderRadius:'10px', border:`1.5px solid ${goal===g.key?'#C9A84C':t.border}`, background:goal===g.key?'rgba(201,168,76,0.1)':t.inputBg, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'0.5px', color:goal===g.key?'#C9A84C':t.textMuted, cursor:'pointer', transition:'all 0.15s', textAlign:'left' }}>
                {g.label}
              </button>
            ))}
          </div>
          {/* Specific time input — only shows when "Hit a specific time" is selected */}
          {goal === 'time' && (
            <div style={{ marginTop:'12px' }}>
              <input value={specificTime} onChange={e => setSpecificTime(e.target.value)} placeholder="e.g. 1:55:00"
                style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:`1.5px solid ${t.border}`, background:t.inputBg, color:t.text, fontFamily:"'Barlow',sans-serif", fontSize:'14px', outline:'none', transition:'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor=t.border} />
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted, marginTop:'4px' }}>Enter your target finish time (HH:MM:SS)</div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'11px', border:`1.5px solid ${t.border}`, borderRadius:'10px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}>
            Skip
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:2, padding:'11px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s', opacity:saving?0.7:1 }}
            onMouseEnter={e => { if(!saving) e.currentTarget.style.background='#C9A84C' }}
            onMouseLeave={e => { if(!saving) e.currentTarget.style.background='#1B2A4A' }}>
            {saving ? 'Adding...' : 'Add to My Races →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RaceDetail() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const { t, isDark } = useTheme()

  const [race, setRace]               = useState(null)
  const [photo, setPhoto]             = useState(PHOTO_PLACEHOLDER)
  const [loading, setLoading]         = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeTab, setActiveTab]     = useState('overview')
  const [showSignupBanner, setShowSignupBanner] = useState(false)
  const [showSignupModal, setShowSignupModal]   = useState(false)
  const [signedUp, setSignedUp]                 = useState(false)
  const pendingExternalNav = useRef(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('races').select('*').eq('id', id).single()
        if (error || !data) { navigate('/discover'); return }
        setRace(data)
        loadRacePhoto(data).then(url => { if (url) setPhoto(url) })
        if (!data.detail_fetched) {
          setDetailLoading(true)
          try {
            const res  = await fetch(`/api/runsignup?action=get_race_detail&race_id=${id}`)
            const json = await res.json()
            if (json.race) {
              setRace(prev => ({
                ...prev,
                description:   json.race.description        || prev.description,
                website_url:   json.race.url                || prev.website_url,
                events_detail: json.race.events             || [],
                course_map:    json.race.course_map         || prev.course_map,
                charity:       json.race.beneficiary_name   || prev.charity,
                cutoff_time:   json.race.time_limit         || prev.cutoff_time,
                logo:          json.race.race_logo || json.race.logo_url || json.race.profile_image_url || prev.logo,
                location:      json.race.address            || prev.location,
              }))
            }
          } catch(e) { console.warn('Could not fetch race detail:', e.message) }
          setDetailLoading(false)
        }
      } catch(e) { console.error('Error loading race:', e); navigate('/discover') }
      setLoading(false)
    }
    load()

    const style = document.createElement('style')
    style.id = 'rp-rd-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing:border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      @keyframes pulse { 0%,100%{opacity:0.5;}50%{opacity:1;} }
      .rd-tab { padding:12px 24px;border:none;background:none;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;border-bottom:2px solid transparent;transition:all 0.15s; }
      .detail-skeleton { height:16px;border-radius:4px;animation:pulse 1.5s ease infinite; }
      .rd-register-btn { transition:background 0.15s !important; }
      .rd-register-btn:hover { background:#C9A84C !important; color:#1B2A4A !important; }
    `
    if (!document.getElementById('rp-rd-styles')) document.head.appendChild(style)

    // Detect return from RunSignup tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && pendingExternalNav.current) {
        pendingExternalNav.current = false
        setTimeout(() => setShowSignupBanner(true), 800)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { document.getElementById('rp-rd-styles')?.remove(); document.removeEventListener('visibilitychange', handleVisibility) }
  }, [id])

  const handleRegisterClick = (url) => {
    if (!signedUp) pendingExternalNav.current = true
    window.open(url, '_blank')
  }

  const handleSignupSave = ({ goal, specificTime }) => {
    setSignedUp(true)
    setShowSignupModal(false)
    try {
      const existing = JSON.parse(sessionStorage.getItem('rp_upcoming') || '[]')
      const entry = {
        id: race.id, name: race.name, location: race.location,
        date: race.date, date_sort: race.date_sort,
        distance: race.distance, registration_url: race.registration_url,
        city: race.city, state: race.state,
        goal, specificTime, addedAt: Date.now()
      }
      sessionStorage.setItem('rp_upcoming', JSON.stringify([entry, ...existing.filter(r => r.id !== race.id)]))
    } catch(e) {}
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:t.bg }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  )
  if (!race) return null

  const colors = getDistanceColor(race.distance)
  const cleaned = (race.distance || '').replace(' mi','').replace(' miles','')
  const registrationUrl = race.registration_url || race.website_url || `https://runsignup.com/Race/${id}`

  const trainingWeeks = () => {
    const d = race.distance || ''
    if (d==='5K') return 4; if (d==='10K') return 6; if (d==='13.1') return 10
    if (d==='26.2') return 16; if (d==='70.3') return 20
    if (d.includes('140')||d.toLowerCase().includes('ironman')) return 30
    if (d.includes('50')||d.toLowerCase().includes('ultra')) return 24
    return 8
  }

  const card   = { bg:t.isDark?t.surface:'#fff', border:t.isDark?t.border:'#e8eaed' }
  const detail = { bg:t.isDark?t.surfaceAlt:'#f8f9fb' }

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s' }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:500, background:t.navBg, backdropFilter:'blur(8px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', height:'56px', transition:'background 0.25s' }}>
        <button onClick={() => navigate(-1)}
          style={{ display:'flex', alignItems:'center', gap:'8px', background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:0, transition:'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color=t.text} onMouseLeave={e => e.currentTarget.style.color=t.textMuted}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Back
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {signedUp && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 12px', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'20px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C' }}>Registered</span>
            </div>
          )}
          <button className="rd-register-btn" onClick={() => handleRegisterClick(registrationUrl)}
            style={{ padding:'7px 20px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}>
            Register Now
          </button>
        </div>
      </div>

      {/* HERO */}
      <div style={{ height:'420px', position:'relative', background:'#1B2A4A', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background:'#C9A84C', zIndex:2 }} />
        <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.1) 20%,rgba(0,0,0,0.78))' }} />
        {detailLoading && (
          <div style={{ position:'absolute', top:24, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.6)', borderRadius:'8px', padding:'6px 16px', display:'flex', alignItems:'center', gap:'8px', zIndex:3 }}>
            <div style={{ width:12, height:12, border:'2px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.7)', letterSpacing:'1px' }}>Loading race details...</span>
          </div>
        )}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'32px 40px' }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'24px' }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', marginBottom:'8px' }}>{race.date} · {race.location}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,60px)', color:'#fff', letterSpacing:'1.5px', lineHeight:1 }}>{race.name}</div>
            </div>
            <div style={{ width:100, height:100, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder}`, background:'rgba(0,0,0,0.45)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0, backdropFilter:'blur(4px)' }}>
              <div style={{ position:'absolute', inset:7, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:cleaned.length>3?18:cleaned.length>2?22:30, color:colors.stampText, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1 }}>{cleaned}</div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div style={{ background:card.bg, borderBottom:`1px solid ${card.border}`, transition:'background 0.25s' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(5,1fr)', padding:'0 40px' }}>
          {[
            { label:'Entry Fee',      value:race.price_raw || race.price || 'TBD' },
            { label:'Terrain',        value:race.terrain   || 'Road'               },
            { label:'Distance',       value:race.distance  || '—'                  },
            { label:'Est. Finishers', value:race.est_finishers ? race.est_finishers.toLocaleString() : '—' },
            { label:'Elevation',      value:race.elevation || '—'                  },
          ].map((s,i) => (
            <div key={i} style={{ padding:'20px 0', textAlign:'center', borderRight:i<4?`1px solid ${card.border}`:'none' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ background:card.bg, borderBottom:`1px solid ${card.border}`, position:'sticky', top:'56px', zIndex:40, transition:'background 0.25s' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 40px', display:'flex' }}>
          {['overview','events','training','results'].map(tab => (
            <button key={tab} className="rd-tab"
              style={{ color:activeTab===tab?t.text:t.textMuted, borderBottomColor:activeTab===tab?'#C9A84C':'transparent' }}
              onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase()+tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'32px 40px 80px' }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'28px', alignItems:'start' }}>
              <div>
                <div style={{ background:card.bg, borderRadius:'16px', padding:'28px', border:`1px solid ${card.border}`, marginBottom:'24px', transition:'background 0.25s' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'16px' }}>About This Race</div>
                  {detailLoading ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      {[100,85,92,70].map((w,i) => <div key={i} className="detail-skeleton" style={{ width:`${w}%`, background:t.border }} />)}
                    </div>
                  ) : race.description ? (
                    <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:t.isDark?t.text:'#4a5568', lineHeight:1.8, fontWeight:300, margin:0 }}
                      dangerouslySetInnerHTML={{ __html: race.description.replace(/<[^>]*>/g,'').slice(0,800)+(race.description.length>800?'...':'') }} />
                  ) : (
                    <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:t.textMuted, lineHeight:1.8, margin:0 }}>Visit the race website for full details about this event.</p>
                  )}
                  {race.website_url && <a href={race.website_url} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'6px', marginTop:'16px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textDecoration:'none', textTransform:'uppercase' }}>Visit Race Website →</a>}
                  {race.course_map  && <a href={race.course_map}  target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'6px', marginTop:'10px', marginLeft:race.website_url?'20px':0, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:t.text, textDecoration:'none', textTransform:'uppercase' }}>View Course Map →</a>}
                </div>
                <div style={{ background:card.bg, borderRadius:'16px', padding:'28px', border:`1px solid ${card.border}`, transition:'background 0.25s' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'16px' }}>Race Details</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    {[
                      { label:'Distance',    value:race.distance    || '—'   },
                      { label:'Date',        value:race.date        || '—'   },
                      { label:'Location',    value:race.location    || '—'   },
                      { label:'Entry Fee',   value:race.price_raw || race.price || 'TBD' },
                      { label:'Terrain',     value:race.terrain     || 'Road' },
                      { label:'Elevation',   value:race.elevation   || '—'   },
                      { label:'Cutoff Time', value:race.cutoff_time || '—'   },
                      { label:'Charity',     value:race.charity     || '—'   },
                    ].map(item => (
                      <div key={item.label} style={{ padding:'14px 16px', background:detail.bg, borderRadius:'8px', border:`1px solid ${card.border}`, borderLeft:'3px solid #C9A84C', transition:'background 0.25s' }}>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'5px' }}>{item.label}</div>
                        {detailLoading && ['Cutoff Time','Charity'].includes(item.label) ? (
                          <div className="detail-skeleton" style={{ width:'60%', height:'14px', background:t.border }} />
                        ) : (
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text }}>{item.value}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div>
                <div style={{ background:'#1B2A4A', borderRadius:'16px', padding:'28px', marginBottom:'18px', textAlign:'center' }}>
                  <div style={{ width:80, height:80, borderRadius:'50%', border:`2.5px solid ${colors.stampBorder}`, background:'rgba(201,168,76,0.08)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', position:'relative' }}>
                    <div style={{ position:'absolute', inset:6, borderRadius:'50%', border:`1px dashed ${colors.stampDash}` }} />
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:cleaned.length>3?16:cleaned.length>2?20:28, color:colors.stampText, position:'relative', zIndex:1 }}>{cleaned}</span>
                  </div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:'#C9A84C', letterSpacing:'1px', marginBottom:'4px' }}>{race.price_raw || (race.price?`$${race.price}`:'TBD')}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.4)', letterSpacing:'1px', marginBottom:'20px' }}>Registration fee</div>
                  {signedUp ? (
                    <div style={{ padding:'13px', borderRadius:'10px', background:'rgba(201,168,76,0.1)', border:'1.5px solid rgba(201,168,76,0.3)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase' }}>✓ You're Registered</div>
                  ) : (
                    <button className="rd-register-btn" onClick={() => handleRegisterClick(registrationUrl)}
                      style={{ width:'100%', padding:'13px', border:'none', borderRadius:'10px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'2px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase' }}>
                      Register on RunSignup →
                    </button>
                  )}
                </div>
                <div style={{ background:card.bg, borderRadius:'12px', padding:'20px', border:`1px solid ${card.border}`, borderTop:'3px solid #C9A84C', marginBottom:'18px', transition:'background 0.25s' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>Est. Training Time</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'40px', color:t.text, letterSpacing:'1px', lineHeight:1 }}>{trainingWeeks()} Weeks</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'6px', lineHeight:1.5 }}>Based on distance and typical preparation time</div>
                </div>
                <div style={{ background:card.bg, borderRadius:'12px', padding:'14px 16px', border:`1px solid ${card.border}`, display:'flex', alignItems:'center', gap:'10px', transition:'background 0.25s' }}>
                  <div style={{ width:32, height:32, borderRadius:'8px', background:detail.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'10px', color:'#2563EB', letterSpacing:'0.5px' }}>RS</span>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:t.text }}>{race.city || race.location}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted }}>via RunSignup</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS */}
        {activeTab === 'events' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ background:card.bg, borderRadius:'16px', padding:'28px', border:`1px solid ${card.border}`, transition:'background 0.25s' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px', marginBottom:'20px' }}>Race Events</div>
              {detailLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[1,2,3].map(i => <div key={i} className="detail-skeleton" style={{ height:'60px', borderRadius:'8px', background:t.border }} />)}
                </div>
              ) : race.events_detail && race.events_detail.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {race.events_detail.map((ev,i) => {
                    const evc = getDistanceColor(ev.distance || race.distance)
                    const evcl = (ev.distance||'').replace(' mi','').replace(' miles','')
                    return (
                      <div key={i} style={{ padding:'16px 20px', background:detail.bg, borderRadius:'10px', border:`1px solid ${card.border}`, borderLeft:`3px solid ${evc.stampBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                          {evcl && <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${evc.stampBorder}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
                            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:`0.75px dashed ${evc.stampDash}` }} />
                            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:evcl.length>3?9:evcl.length>2?11:14, color:evc.stampText, position:'relative', zIndex:1 }}>{evcl}</span>
                          </div>}
                          <div>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:t.text, letterSpacing:'0.5px' }}>{ev.name || ev.distance || 'Event'}</div>
                            {ev.distance && ev.name && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, marginTop:'2px' }}>{ev.distance}</div>}
                            {ev.start_time && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginTop:'2px' }}>Start: {ev.start_time}</div>}
                          </div>
                        </div>
                        {ev.fee && <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#C9A84C', letterSpacing:'0.5px', flexShrink:0 }}>${ev.fee}</div>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'32px', color:t.textMuted }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px' }}>Event details will appear here once loaded.</div>
                  <button className="rd-register-btn" onClick={() => handleRegisterClick(registrationUrl)}
                    style={{ marginTop:'16px', padding:'8px 20px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>
                    View on RunSignup →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRAINING */}
        {activeTab === 'training' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ background:card.bg, borderRadius:'16px', padding:'48px', border:`1px solid ${card.border}`, textAlign:'center', transition:'background 0.25s' }}>
              <div style={{ width:72, height:72, borderRadius:'16px', background:'rgba(201,168,76,0.08)', border:'1.5px solid rgba(201,168,76,0.35)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:t.text, letterSpacing:'1px', marginBottom:'10px' }}>Personalized Training Plan</div>
              <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', color:t.textMuted, lineHeight:1.7, maxWidth:'440px', margin:'0 auto 24px' }}>Training plans powered by Runna — personalized to your fitness level, current mileage, and race goal.</p>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 18px', background:detail.bg, border:`1px solid ${card.border}`, borderRadius:'8px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C' }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Coming Soon — Runna Integration</span>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {activeTab === 'results' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ background:card.bg, borderRadius:'16px', padding:'48px', border:`1px solid ${card.border}`, textAlign:'center', transition:'background 0.25s' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:t.text, letterSpacing:'1px', marginBottom:'10px' }}>Past Results</div>
              <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', color:t.textMuted, lineHeight:1.7, maxWidth:'440px', margin:'0 auto 24px' }}>Historical results will be pulled from RunSignup and Athlinks once your account is connected.</p>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 18px', background:detail.bg, border:`1px solid ${card.border}`, borderRadius:'8px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C' }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Requires RunSignup Connection</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* BANNERS / MODALS */}
      {showSignupBanner && !signedUp && (
        <SignupBanner race={race} onYes={() => { setShowSignupBanner(false); setShowSignupModal(true) }} onNo={() => setShowSignupBanner(false)} />
      )}
      {showSignupModal && (
        <SignupModal race={race} onSave={handleSignupSave} onClose={() => setShowSignupModal(false)} t={t} />
      )}

    </div>
  )
}
