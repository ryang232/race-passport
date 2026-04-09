import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchUnsplashPhoto } from '../lib/unsplash'

// Mock discovery race data — in production pulled from RunSignup API
const MOCK_DISCOVERY_RACES = {
  'd1': { id:'d1', name:'Parks Half Marathon', date:'September 21, 2026', location:'Bethesda, MD', distance:'13.1', price:'$95', terrain:'Road', elevation:'180ft', estFinishers:1200, registrationUrl:'https://runsignup.com', query:'half marathon running race road crowd', description:'A fast, scenic half marathon through the trails and roads of Rock Creek Park and Bethesda. Certified course, chip timing, finisher medals.', categories:['Overall','M/F','Age Group'], cutoffTime:'3:30:00', charity:'Montgomery County Road Runners', weeks:10 },
  'd2': { id:'d2', name:'Suds & Soles 5K', date:'June 13, 2026', location:'Rockville, MD', distance:'5K', price:'$35', terrain:'Road', elevation:'85ft', estFinishers:400, registrationUrl:'https://runsignup.com', query:'5K running race community finish line street', description:'A fun community 5K followed by a post-race celebration. All ages and paces welcome. Finisher pint glass included.', categories:['Overall','M/F','Age Group'], cutoffTime:'1:00:00', charity:'Local Schools', weeks:4 },
  'd3': { id:'d3', name:'Baltimore 10 Miler', date:'June 6, 2026', location:'Baltimore, MD', distance:'10 mi', price:'$65', terrain:'Road', elevation:'210ft', estFinishers:800, registrationUrl:'https://runsignup.com', query:'Baltimore Inner Harbor waterfront running city', description:'A scenic tour through Baltimore\'s historic neighborhoods and waterfront. The iconic Inner Harbor finish makes this one of the region\'s most scenic races.', categories:['Overall','M/F','Age Group'], cutoffTime:'2:30:00', charity:'Baltimore Running Festival Foundation', weeks:8 },
  // Upcoming registered races
  '101': { id:'101', name:'Marine Corps Marathon', date:'October 29, 2026', location:'Washington, DC', distance:'26.2', price:'$140', terrain:'Road', elevation:'912ft', estFinishers:19000, registrationUrl:'https://marinemarathon.com', query:'Washington DC marathon runners National Mall crowd', description:'One of the largest marathons in the US, run through the monuments of the nation\'s capital. Finishers receive the iconic "Semper Fidelis" medal.', categories:['Overall','M/F','Age Group'], cutoffTime:'6:00:00', charity:'Marine Corps Scholarship Foundation', weeks:16, registered:true },
  '102': { id:'102', name:'IRONMAN 70.3 Atlantic City', date:'September 13, 2026', location:'Atlantic City, NJ', distance:'70.3', price:'$350', terrain:'Road/Water', elevation:'1200ft', estFinishers:2000, registrationUrl:'https://ironman.com', query:'triathlon ocean swim wetsuit athletes open water', description:'A full IRONMAN 70.3 featuring a 1.2-mile ocean swim, 56-mile bike through the New Jersey shore, and a 13.1-mile run along the boardwalk.', categories:['Overall','Age Group','Pro'], cutoffTime:'8:30:00', charity:'IRONMAN Foundation', weeks:20, registered:true },
  '103': { id:'103', name:'Cherry Blossom 10 Miler', date:'April 8, 2026', location:'Washington, DC', distance:'10 mi', price:'$110', terrain:'Road', elevation:'190ft', estFinishers:14000, registrationUrl:'https://cherryblossom.org', query:'cherry blossom Washington DC Tidal Basin spring pink', description:'The iconic DC spring race around the Tidal Basin as cherry blossoms peak. One of the most scenic and popular 10-mile races in the country.', categories:['Overall','M/F','Age Group'], cutoffTime:'2:30:00', charity:'American Liver Foundation', weeks:10, registered:true },
}

function isGold(dist) {
  const d = dist.toLowerCase().replace(/\s/g,'')
  if (['26.2','marathon','50k','50m','100k','100m','70.3','140.6'].includes(d)) return true
  const n = parseFloat(d); return !isNaN(n) && n >= 26.2
}

export default function RaceDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [race, setRace] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const data = MOCK_DISCOVERY_RACES[id]
    if (!data) { navigate('/home'); return }
    setRace(data)
    fetchUnsplashPhoto(data.query, 'running').then(url => setPhoto(url))

    const style = document.createElement('style')
    style.id = 'rp-rd-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      .rd-tab { padding:10px 20px; border:none; background:none; cursor:pointer; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#9aa5b4; border-bottom:2px solid transparent; transition:all 0.15s; }
      .rd-tab.active { color:#1B2A4A; border-bottom-color:#C9A84C; }
      .rd-tab:hover { color:#1B2A4A; }
      .stat-box { background:#f8f9fb; border-radius:10px; padding:16px; text-align:center; border:1px solid #e8eaed; }
    `
    if (!document.getElementById('rp-rd-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-rd-styles')?.remove()
  }, [id])

  if (!race) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f4f5f7' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  )

  const gold = isGold(race.distance)
  const stampColor = gold ? '#C9A84C' : '#1B2A4A'
  const cleaned = race.distance.replace(' mi','').replace(' miles','')

  return (
    <div style={{ minHeight:'100vh', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif" }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#fff', borderBottom:'1px solid #e8eaed', boxShadow:'0 1px 8px rgba(27,42,74,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:'56px' }}>
        <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:'8px', background:'none', border:'none', cursor:'pointer', color:'#9aa5b4', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:0, transition:'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color='#1B2A4A'} onMouseLeave={e => e.currentTarget.style.color='#9aa5b4'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'2.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>
        <button onClick={() => window.open(race.registrationUrl, '_blank')} style={{ padding:'6px 18px', border:'none', borderRadius:'8px', background:race.registered?'#22863a':'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background=race.registered?'#22863a':'#1B2A4A'}>
          {race.registered ? '✓ Registered' : 'Register Now'}
        </button>
      </div>

      {/* HERO IMAGE */}
      <div style={{ height:'340px', position:'relative', background:'#1B2A4A', overflow:'hidden' }}>
        {photo ? (
          <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1B2A4A,#2a3f6a)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:40, height:40, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.75))' }} />

        {race.registered && (
          <div style={{ position:'absolute', top:20, right:20, background:'rgba(34,134,58,0.9)', borderRadius:'8px', padding:'6px 14px', display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#6ee387' }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>You're Registered!</span>
          </div>
        )}

        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'24px 32px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'20px' }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', marginBottom:'6px' }}>{race.date} · {race.location}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,5vw,48px)', color:'#fff', letterSpacing:'1.5px', lineHeight:1 }}>{race.name}</div>
            </div>
            <div style={{ width:80, height:80, borderRadius:'50%', border:`2.5px solid ${stampColor}`, background:'rgba(0,0,0,0.4)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0, backdropFilter:'blur(4px)' }}>
              <div style={{ position:'absolute', inset:6, borderRadius:'50%', border:`1px dashed ${gold?'rgba(201,168,76,0.4)':'rgba(255,255,255,0.3)'}` }} />
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: cleaned.length > 3 ? 16 : cleaned.length > 2 ? 20 : 28, color:gold?'#C9A84C':'#fff', letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1 }}>{cleaned}</div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS ROW */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'0 24px' }}>
          {[
            { label:'Entry Fee', value:race.price },
            { label:'Terrain', value:race.terrain },
            { label:'Elevation', value:race.elevation },
            { label:'Est. Finishers', value:race.estFinishers?.toLocaleString() },
          ].map((s,i) => (
            <div key={i} style={{ padding:'18px 0', textAlign:'center', borderRight:i<3?'1px solid #e8eaed':'none' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed', position:'sticky', top:'56px', zIndex:40 }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', padding:'0 24px', display:'flex', gap:'0' }}>
          {['overview','training','results'].map(tab => (
            <button key={tab} className={`rd-tab ${activeTab===tab?'active':''}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase()+tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'28px 24px 80px' }}>

        {activeTab === 'overview' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'24px', alignItems:'start' }}>
              <div>
                <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', border:'1px solid #e8eaed', marginBottom:'20px' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'14px' }}>About This Race</div>
                  <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#4a5568', lineHeight:1.8, fontWeight:300 }}>{race.description}</p>
                </div>
                <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', border:'1px solid #e8eaed' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'14px' }}>Race Details</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    {[
                      { label:'Distance', value:race.distance },
                      { label:'Date', value:race.date },
                      { label:'Location', value:race.location },
                      { label:'Entry Fee', value:race.price },
                      { label:'Cutoff Time', value:race.cutoffTime },
                      { label:'Charity', value:race.charity },
                    ].map(item => (
                      <div key={item.label} style={{ padding:'12px 14px', background:'#f8f9fb', borderRadius:'8px', border:'1px solid #e8eaed' }}>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>{item.label}</div>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:'#1B2A4A' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                {/* Register CTA */}
                <div style={{ background:'#1B2A4A', borderRadius:'16px', padding:'24px', marginBottom:'16px', textAlign:'center' }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', border:`2px solid ${stampColor}`, background:gold?'rgba(201,168,76,0.1)':'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', position:'relative' }}>
                    <div style={{ position:'absolute', inset:5, borderRadius:'50%', border:`1px dashed ${gold?'rgba(201,168,76,0.3)':'rgba(255,255,255,0.2)'}` }} />
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:cleaned.length>3?14:cleaned.length>2?18:24, color:stampColor, position:'relative', zIndex:1 }}>{cleaned}</span>
                  </div>
                  {race.registered ? (
                    <>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(34,134,58,0.2)', border:'1px solid rgba(34,134,58,0.4)', borderRadius:'8px', padding:'6px 14px', marginBottom:'12px' }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#6ee387' }} />
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:700, letterSpacing:'2px', color:'#6ee387', textTransform:'uppercase' }}>You're In!</span>
                      </div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.45)', lineHeight:1.6 }}>Already registered. Check your email for confirmation details.</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#C9A84C', letterSpacing:'1px', marginBottom:'4px' }}>{race.price}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'rgba(255,255,255,0.4)', letterSpacing:'1px', marginBottom:'16px' }}>Registration fee</div>
                      <button onClick={() => window.open(race.registrationUrl, '_blank')} style={{ width:'100%', padding:'12px', border:'none', borderRadius:'10px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'2px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase', transition:'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity='0.9'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                        Register on RunSignup →
                      </button>
                    </>
                  )}
                </div>

                {/* Est training */}
                <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', border:'1px solid #e8eaed' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Est. Training Time</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:'#1B2A4A', letterSpacing:'1px', lineHeight:1 }}>{race.weeks} Weeks</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4', marginTop:'4px', lineHeight:1.5 }}>Based on your experience level and race history</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ background:'#fff', borderRadius:'16px', padding:'32px', border:'1px solid #e8eaed', textAlign:'center' }}>
              <div style={{ width:64, height:64, borderRadius:'16px', background:'rgba(201,168,76,0.08)', border:'1.5px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'8px' }}>Personalized Training Plan</div>
              <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', color:'#9aa5b4', lineHeight:1.7, maxWidth:'400px', margin:'0 auto 20px' }}>
                Training plans powered by Runna — personalized to your fitness level, current mileage, and race goal.
              </p>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 16px', background:'rgba(27,42,74,0.06)', border:'1px solid #e2e6ed', borderRadius:'8px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C' }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Coming Soon — Runna Integration</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ background:'#fff', borderRadius:'16px', padding:'32px', border:'1px solid #e8eaed', textAlign:'center' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'8px' }}>Past Results</div>
              <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', color:'#9aa5b4', lineHeight:1.7, maxWidth:'400px', margin:'0 auto 20px' }}>
                Historical results for this race will be pulled from RunSignup and Athlinks once your account is connected.
              </p>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 16px', background:'rgba(27,42,74,0.06)', border:'1px solid #e2e6ed', borderRadius:'8px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C' }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Requires RunSignup Connection</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
