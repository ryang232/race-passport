import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRacePhoto } from '../lib/photos'
import { getDistanceColor } from '../lib/colors'
import { supabase } from '../lib/supabase'

const VERCEL_API = 'https://race-passport-70v7kb0fp-ryans-projects-29f7f58e.vercel.app/api/runsignup'

export default function RaceDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [race, setRace] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // First try to load from Supabase
        const { data, error } = await supabase
          .from('races')
          .select('*')
          .eq('id', id)
          .single()

        if (error || !data) {
          navigate('/discover')
          return
        }

        setRace(data)
        if (data.unsplash_query) {
          setPhoto(getRacePhoto(data.distance))
        }

        // If detail hasn't been fetched yet, fetch it now
        if (!data.detail_fetched) {
          setDetailLoading(true)
          try {
            const res = await fetch(`${VERCEL_API}?action=get_race_detail&race_id=${id}`)
            const json = await res.json()
            if (json.race) {
              setRace(json.race)
            }
          } catch (e) {
            console.warn('Could not fetch race detail:', e.message)
          }
          setDetailLoading(false)
        }
      } catch (e) {
        console.error('Error loading race:', e)
        navigate('/discover')
      }
      setLoading(false)
    }
    load()

    const style = document.createElement('style')
    style.id = 'rp-rd-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      @keyframes pulse { 0%,100%{opacity:0.5;}50%{opacity:1;} }
      .rd-tab { padding:12px 24px; border:none; background:none; cursor:pointer; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#9aa5b4; border-bottom:2px solid transparent; transition:all 0.15s; }
      .rd-tab.active { color:#1B2A4A; border-bottom-color:var(--rc); }
      .rd-tab:hover { color:#1B2A4A; }
      .detail-skeleton { height:16px; background:#e8eaed; border-radius:4px; animation:pulse 1.5s ease infinite; }
    `
    if (!document.getElementById('rp-rd-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-rd-styles')?.remove()
  }, [id])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f4f5f7' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  )

  if (!race) return null

  const colors = getDistanceColor(race.distance)
  const cleaned = (race.distance || '').replace(' mi','').replace(' miles','')

  // Difficulty color
  const difficultyColor = {
    'Beginner': '#2e7d32',
    'Easy': '#388e3c',
    'Moderate': '#f57c00',
    'Hard': '#c62828',
    'Expert': '#6a1b9a',
  }[race.difficulty] || '#9aa5b4'

  const registrationUrl = race.registration_url || race.website_url || `https://runsignup.com/Race/${id.replace('rs_','')}`

  return (
    <div style={{ minHeight:'100vh', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif", '--rc': colors.primary }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(8px)', borderBottom:'1px solid #e8eaed', boxShadow:'0 1px 8px rgba(27,42,74,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', height:'56px' }}>
        <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:'8px', background:'none', border:'none', cursor:'pointer', color:'#9aa5b4', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:0, transition:'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color='#1B2A4A'} onMouseLeave={e => e.currentTarget.style.color='#9aa5b4'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'2.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>
        <button onClick={() => window.open(registrationUrl, '_blank')}
          style={{ padding:'7px 20px', border:'none', borderRadius:'8px', background:colors.primary, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity='0.85'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
          Register Now
        </button>
      </div>

      {/* HERO */}
      <div style={{ height:'420px', position:'relative', background:'#1B2A4A', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background:colors.primary, zIndex:2 }} />
        {photo ? (
          <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1B2A4A,#2a3f6a)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:40, height:40, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.78))' }} />

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
              {race.difficulty && (
                <div style={{ marginTop:'10px', display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.4)', borderRadius:'6px', padding:'4px 12px' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:difficultyColor }} />
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>{race.difficulty}</span>
                </div>
              )}
            </div>
            <div style={{ width:100, height:100, borderRadius:'50%', border:`2.5px solid ${colors.primary}`, background:'rgba(0,0,0,0.45)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0, backdropFilter:'blur(4px)' }}>
              <div style={{ position:'absolute', inset:7, borderRadius:'50%', border:`1px dashed ${colors.dashed}` }} />
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: cleaned.length > 3 ? 18 : cleaned.length > 2 ? 22 : 30, color:colors.primary, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1 }}>{cleaned}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', fontWeight:600, letterSpacing:'1px', color:`${colors.primary}99`, textTransform:'uppercase', marginTop:'3px', position:'relative', zIndex:1 }}>{colors.label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(5,1fr)', padding:'0 40px' }}>
          {[
            { label:'Entry Fee',    value: race.price ? `$${race.price}` : 'TBD' },
            { label:'Terrain',      value: race.terrain || 'Road' },
            { label:'Difficulty',   value: race.difficulty || '—', color: difficultyColor },
            { label:'Distance',     value: race.distance || '—' },
            { label:'Est. Finishers', value: race.est_finishers ? race.est_finishers.toLocaleString() : '—' },
          ].map((s,i) => (
            <div key={i} style={{ padding:'20px 0', textAlign:'center', borderRight:i<4?'1px solid #e8eaed':'none' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'26px', color: s.color || '#1B2A4A', letterSpacing:'1px', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed', position:'sticky', top:'56px', zIndex:40 }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 40px', display:'flex' }}>
          {['overview','events','training','results'].map(tab => (
            <button key={tab} className={`rd-tab ${activeTab===tab?'active':''}`}
              style={{ borderBottomColor: activeTab===tab ? colors.primary : 'transparent', color: activeTab===tab ? '#1B2A4A' : '#9aa5b4' }}
              onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase()+tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'32px 40px 80px' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'28px', alignItems:'start' }}>
              <div>
                {/* About */}
                <div style={{ background:'#fff', borderRadius:'16px', padding:'28px', border:'1px solid #e8eaed', marginBottom:'24px' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'16px' }}>About This Race</div>
                  {detailLoading ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      {[100,85,92,70].map((w,i) => <div key={i} className="detail-skeleton" style={{ width:`${w}%` }} />)}
                    </div>
                  ) : race.description ? (
                    <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:'#4a5568', lineHeight:1.8, fontWeight:300 }}
                      dangerouslySetInnerHTML={{ __html: race.description.replace(/<[^>]*>/g,'').slice(0,800) + (race.description.length > 800 ? '...' : '') }} />
                  ) : (
                    <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:'#9aa5b4', lineHeight:1.8 }}>
                      Visit the race website for full details about this event.
                    </p>
                  )}
                  {race.website_url && (
                    <a href={race.website_url} target="_blank" rel="noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:'6px', marginTop:'16px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:colors.primary, textDecoration:'none', textTransform:'uppercase' }}>
                      Visit Race Website →
                    </a>
                  )}
                </div>

                {/* Race Details grid */}
                <div style={{ background:'#fff', borderRadius:'16px', padding:'28px', border:'1px solid #e8eaed' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'16px' }}>Race Details</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    {[
                      { label:'Distance',     value: race.distance || '—' },
                      { label:'Date',         value: race.date || '—' },
                      { label:'Location',     value: race.location || '—' },
                      { label:'Entry Fee',    value: race.price ? `$${race.price}` : 'TBD' },
                      { label:'Terrain',      value: race.terrain || 'Road' },
                      { label:'Difficulty',   value: race.difficulty || '—' },
                      { label:'Cutoff Time',  value: race.cutoff_time || '—' },
                      { label:'Charity',      value: race.charity || '—' },
                    ].map(item => (
                      <div key={item.label} style={{ padding:'14px 16px', background:'#f8f9fb', borderRadius:'8px', border:'1px solid #e8eaed', borderLeft:`3px solid ${colors.primary}` }}>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'5px' }}>{item.label}</div>
                        {detailLoading && ['Cutoff Time','Charity'].includes(item.label) ? (
                          <div className="detail-skeleton" style={{ width:'60%', height:'14px' }} />
                        ) : (
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:'#1B2A4A' }}>{item.value}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div>
                {/* Register CTA */}
                <div style={{ background:'#1B2A4A', borderRadius:'16px', padding:'28px', marginBottom:'18px', textAlign:'center' }}>
                  <div style={{ width:80, height:80, borderRadius:'50%', border:`2.5px solid ${colors.primary}`, background:colors.light, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', position:'relative' }}>
                    <div style={{ position:'absolute', inset:6, borderRadius:'50%', border:`1px dashed ${colors.dashed}` }} />
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:cleaned.length>3?16:cleaned.length>2?20:28, color:colors.primary, position:'relative', zIndex:1 }}>{cleaned}</span>
                  </div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:colors.primary, letterSpacing:'1px', marginBottom:'4px' }}>
                    {race.price ? `$${race.price}` : 'TBD'}
                  </div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.4)', letterSpacing:'1px', marginBottom:'8px' }}>Registration fee</div>
                  {race.reg_close_date && (
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.5)', marginBottom:'16px' }}>
                      Reg closes: {race.reg_close_date}
                    </div>
                  )}
                  <button onClick={() => window.open(registrationUrl, '_blank')}
                    style={{ width:'100%', padding:'13px', border:'none', borderRadius:'10px', background:colors.primary, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'2px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.85'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                    Register on RunSignup →
                  </button>
                </div>

                {/* Training estimate */}
                <div style={{ background:'#fff', borderRadius:'12px', padding:'20px', border:'1px solid #e8eaed', borderTop:`3px solid ${colors.primary}`, marginBottom:'18px' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Est. Training Time</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'40px', color:'#1B2A4A', letterSpacing:'1px', lineHeight:1 }}>
                    {race.distance === '5K' ? 4 : race.distance === '10K' ? 6 : race.distance === '13.1' ? 10 : race.distance === '26.2' ? 16 : race.distance === '70.3' ? 20 : race.distance?.includes('50') ? 24 : 8} Weeks
                  </div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4', marginTop:'6px', lineHeight:1.5 }}>Based on distance and typical preparation time</div>
                </div>

                {/* Source badge */}
                <div style={{ background:'#fff', borderRadius:'12px', padding:'14px 16px', border:'1px solid #e8eaed', display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:32, height:32, borderRadius:'8px', background:'#f4f5f7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#9aa5b4"/></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#1B2A4A' }}>{race.city || race.location}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4' }}>via RunSignup</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ background:'#fff', borderRadius:'16px', padding:'28px', border:'1px solid #e8eaed' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'20px' }}>Race Events</div>
              {detailLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[1,2,3].map(i => <div key={i} className="detail-skeleton" style={{ height:'60px', borderRadius:'8px' }} />)}
                </div>
              ) : race.events_detail && race.events_detail.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {race.events_detail.map((ev, i) => (
                    <div key={i} style={{ padding:'16px 20px', background:'#f8f9fb', borderRadius:'10px', border:'1px solid #e8eaed', borderLeft:`3px solid ${colors.primary}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', letterSpacing:'0.5px' }}>{ev.name || ev.distance || 'Event'}</div>
                        {ev.distance && ev.name && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'2px' }}>{ev.distance}</div>}
                        {ev.start_time && <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4', marginTop:'2px' }}>Start: {ev.start_time}</div>}
                      </div>
                      {ev.fee && (
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:colors.primary, letterSpacing:'0.5px' }}>${ev.fee}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'32px', color:'#9aa5b4' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px' }}>Event details will appear here once loaded.</div>
                  <button onClick={() => window.open(registrationUrl, '_blank')}
                    style={{ marginTop:'16px', padding:'8px 20px', border:`1.5px solid ${colors.primary}`, borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:colors.primary, cursor:'pointer', textTransform:'uppercase' }}>
                    View on RunSignup →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRAINING TAB */}
        {activeTab === 'training' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ background:'#fff', borderRadius:'16px', padding:'48px', border:'1px solid #e8eaed', textAlign:'center' }}>
              <div style={{ width:72, height:72, borderRadius:'16px', background:colors.light, border:`1.5px solid ${colors.dashed}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'10px' }}>Personalized Training Plan</div>
              <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', color:'#9aa5b4', lineHeight:1.7, maxWidth:'440px', margin:'0 auto 24px' }}>
                Training plans powered by Runna — personalized to your fitness level, current mileage, and race goal.
              </p>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 18px', background:'rgba(27,42,74,0.06)', border:'1px solid #e2e6ed', borderRadius:'8px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:colors.primary }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Coming Soon — Runna Integration</span>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS TAB */}
        {activeTab === 'results' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ background:'#fff', borderRadius:'16px', padding:'48px', border:'1px solid #e8eaed', textAlign:'center' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'10px' }}>Past Results</div>
              <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', color:'#9aa5b4', lineHeight:1.7, maxWidth:'440px', margin:'0 auto 24px' }}>
                Historical results will be pulled from RunSignup and Athlinks once your account is connected.
              </p>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 18px', background:'rgba(27,42,74,0.06)', border:'1px solid #e2e6ed', borderRadius:'8px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:colors.primary }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Requires RunSignup Connection</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
