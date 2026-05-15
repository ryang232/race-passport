// ── RaceReadinessCard — standalone component, imported into Home.jsx ──────────
// Drop this file at src/components/RaceReadinessCard.jsx
// In Home.jsx: import RaceReadinessCard from '../components/RaceReadinessCard'
// Then place <RaceReadinessCard ... /> at top of left main column

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const LOADING_MSGS = [
  'Pacer is analyzing your training',
  'Reviewing your race history',
  'Checking your goal race',
  'Calculating your readiness',
]

function DrillDown({ data, onClose }) {
  const { score, grade, insight, factors } = data
  const all = factors?.all || []
  const improving = factors?.improving || []
  const declining = factors?.declining || []

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(27,42,74,0.55)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'600px', maxHeight:'88vh', overflowY:'auto', paddingBottom:'40px' }}>
        {/* Handle */}
        <div style={{ width:36, height:4, background:'#e2e6ed', borderRadius:2, margin:'12px auto 0' }} />
        {/* Header */}
        <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid #f0f2f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#1B2A4A', letterSpacing:1 }}>Full Readiness Breakdown</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#9aa5b4', lineHeight:1, padding:'0 2px' }}>×</button>
        </div>
        <div style={{ padding:'20px' }}>
          {/* Score summary */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, padding:16, background:'#f8f9fb', borderRadius:14 }}>
            <div style={{ position:'relative', width:72, height:72, flexShrink:0 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform:'rotate(-90deg)' }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke="#f0f2f5" strokeWidth="6"/>
                <circle cx="36" cy="36" r="30" fill="none" stroke="#1B2A4A" strokeWidth="6"
                  strokeDasharray={`${(score/100*188.5).toFixed(1)} 188.5`} strokeLinecap="round"/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:'#1B2A4A', lineHeight:1 }}>{score}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, color:'#C9A84C' }}>{grade}</div>
              </div>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:'#1B2A4A', letterSpacing:0.5, marginBottom:4 }}>Race Readiness · Today</div>
              <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'#6b7a8d', lineHeight:1.6, fontWeight:300 }}>Based on your last 4 weeks of Strava activity</div>
            </div>
          </div>

          {/* Pacer insight */}
          <div style={{ padding:'14px 16px', background:'rgba(27,42,74,0.03)', border:'1.5px solid rgba(27,42,74,0.08)', borderRadius:12, borderLeft:'4px solid #C9A84C', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7 }}>
              <span style={{ fontSize:13 }}>⚡</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase' }}>Pacer's read</span>
            </div>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:14, color:'#3d4f6b', lineHeight:1.65, margin:0, fontWeight:300 }}>{insight}</p>
          </div>

          {/* What's strong */}
          {improving.length > 0 && (
            <>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:12 }}>What's strong</div>
              {improving.map(f => (
                <div key={f.key} style={{ padding:'14px 0', borderBottom:'1px solid #f0f2f5' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:600, color:'#1B2A4A' }}>{f.name}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:f.color }}>{f.val}</div>
                  </div>
                  <div style={{ height:5, background:'#f0f2f5', borderRadius:3 }}>
                    <div style={{ height:5, width:`${f.val}%`, background:f.color, borderRadius:3 }} />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* What needs work */}
          {declining.length > 0 && (
            <>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:12, marginTop:20 }}>What needs work</div>
              {declining.map(f => (
                <div key={f.key} style={{ padding:'14px 0', borderBottom:'1px solid #f0f2f5' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:600, color:'#1B2A4A' }}>{f.name}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:f.color }}>{f.val}</div>
                  </div>
                  <div style={{ height:5, background:'#f0f2f5', borderRadius:3 }}>
                    <div style={{ height:5, width:`${f.val}%`, background:f.color, borderRadius:3 }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FactorRow({ f }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, color:'#1B2A4A' }}>{f.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'2px 8px', borderRadius:10, color:f.color, background:f.bg }}>{f.label}</div>
        </div>
        <div style={{ height:4, background:'#f0f2f5', borderRadius:2 }}>
          <div style={{ height:4, width:`${f.val}%`, background:f.color, borderRadius:2 }} />
        </div>
      </div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:f.color, width:36, textAlign:'right', flexShrink:0 }}>{f.val}</div>
    </div>
  )
}

export default function RaceReadinessCard({ profile, passportRaces, stravaProfile, stravaConnected, t, isMobile, onConnectStrava }) {
  const [state, setState] = useState('loading') // loading | loaded | no-strava | new-user
  const [data, setData]   = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [showDrill, setShowDrill] = useState(false)
  const [msgIdx, setMsgIdx]   = useState(0)
  const [stampDown, setStampDown] = useState(false)
  const intervalRefs = useRef([])

  useEffect(() => {
    if (!stravaConnected) { setState('no-strava'); return }
    loadReadiness()
  }, [stravaConnected, profile?.id])

  // Loading animation
  useEffect(() => {
    if (state !== 'loading') {
      intervalRefs.current.forEach(clearInterval)
      return
    }
    const msgInt = setInterval(() => setMsgIdx(i => (i+1) % LOADING_MSGS.length), 2200)
    const stampInt = setInterval(() => setStampDown(d => !d), 700)
    intervalRefs.current = [msgInt, stampInt]
    return () => intervalRefs.current.forEach(clearInterval)
  }, [state])

  const loadReadiness = async () => {
    setState('loading')
    try {
      // Check cached score first
      if (profile?.race_readiness_score && profile?.race_readiness_updated_at) {
        const cachedAt = new Date(profile.race_readiness_updated_at)
        const ageHrs = (Date.now() - cachedAt.getTime()) / 3600000
        if (ageHrs < 24 && profile.race_readiness_factors) {
          setData({
            score:   profile.race_readiness_score,
            grade:   profile.race_readiness_grade,
            insight: profile.race_readiness_insight,
            factors: typeof profile.race_readiness_factors === 'string'
              ? JSON.parse(profile.race_readiness_factors)
              : profile.race_readiness_factors,
            has_data: true,
          })
          setState('loaded')
          return
        }
      }

      // Fetch last 4 weeks of Strava activities
      const token = stravaProfile?.strava_access_token
      if (!token) { setState('no-strava'); return }

      const afterTs = Math.floor((Date.now() - 28 * 24 * 60 * 60 * 1000) / 1000)
      const resp = await fetch(`/api/strava?action=activities&access_token=${token}&per_page=100&after=${afterTs}`)
      const activities = await resp.json()

      // Compute readiness via Pacer
      const pacerResp = await fetch('/api/pacer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'race_readiness',
          activities: Array.isArray(activities) ? activities : [],
          passport_races: passportRaces || [],
          profile: profile || {},
          goal_race: profile?.goal_race_name ? { name: profile.goal_race_name, goal_distance: profile.goal_distance } : null,
        }),
      })
      const result = await pacerResp.json()

      if (!result.has_data) {
        setState('new-user')
        return
      }

      setData(result)
      setState('loaded')

      // Cache to Supabase in background
      if (profile?.id) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          supabase.from('profiles').update({
            race_readiness_score:      result.score,
            race_readiness_grade:      result.grade,
            race_readiness_insight:    result.insight,
            race_readiness_factors:    JSON.stringify(result.factors),
            race_readiness_updated_at: new Date().toISOString(),
          }).eq('id', session.user.id).then(() => {})
        }
      }
    } catch(e) {
      setState('new-user')
    }
  }

  const factors = data?.factors || {}
  const tabFactors = activeTab === 'improving' ? (factors.improving || [])
    : activeTab === 'declining' ? (factors.declining || [])
    : (factors.all || [])

  // ── No Strava state ───────────────────────────────────────────────────────
  if (state === 'no-strava') return (
    <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e8eaed', overflow:'hidden' }}>
      <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid #f0f2f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:'2.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Race Passport · Pacer</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, color:'#1B2A4A', marginTop:2 }}>Race Readiness</div>
        </div>
      </div>
      <div style={{ padding:'28px 20px', textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:16, background:'rgba(252,76,2,0.06)', border:'1.5px solid rgba(252,76,2,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#1B2A4A', letterSpacing:1, marginBottom:8 }}>Connect Strava to unlock Race Readiness</div>
        <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'#9aa5b4', lineHeight:1.7, marginBottom:20, fontWeight:300 }}>Pacer needs your training data to calculate your readiness score and tell you what kind of racer you're becoming.</div>
        <button onClick={onConnectStrava}
          style={{ width:'100%', padding:13, border:'none', borderRadius:12, background:'#FC4C02', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          Connect Strava
        </button>
      </div>
    </div>
  )

  // ── Loading state ─────────────────────────────────────────────────────────
  if (state === 'loading') return (
    <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e8eaed', overflow:'hidden' }}>
      <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid #f0f2f5' }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:'2.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Race Passport · Pacer</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, color:'#1B2A4A', marginTop:2 }}>Race Readiness</div>
      </div>
      <div style={{ padding:'32px 20px', textAlign:'center' }}>
        <div style={{ width:72, height:72, margin:'0 auto 20px', borderRadius:'50%', border:`3px solid rgba(201,168,76,${stampDown?'0.6':'0.2'})`, background:`rgba(201,168,76,${stampDown?'0.14':'0.06'})`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.25s ease', transform:stampDown?'translateY(5px) scale(0.97)':'translateY(0) scale(1)' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, color:'#C9A84C', letterSpacing:1, textAlign:'center', lineHeight:1.2 }}>RACE<br/>PASSPORT</div>
        </div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', transition:'opacity 0.35s', minHeight:18 }}>
          {LOADING_MSGS[msgIdx]}
        </div>
        <div style={{ display:'flex', gap:5, justifyContent:'center', marginTop:14 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:5, height:5, borderRadius:'50%', background: i === msgIdx % 3 ? '#C9A84C' : '#e2e6ed', transition:'background 0.2s' }} />
          ))}
        </div>
      </div>
    </div>
  )

  // ── New user / no data state ──────────────────────────────────────────────
  if (state === 'new-user') return (
    <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e8eaed', overflow:'hidden' }}>
      <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid #f0f2f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:'2.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Race Passport · Pacer</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, color:'#1B2A4A', marginTop:2 }}>Race Readiness</div>
        </div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1px', padding:'4px 10px', borderRadius:20, textTransform:'uppercase', background:'#f4f5f7', color:'#9aa5b4' }}>Baseline</div>
      </div>
      <div style={{ padding:'18px 20px 20px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:18, marginBottom:16 }}>
          <div style={{ position:'relative', width:88, height:88, flexShrink:0 }}>
            <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="44" cy="44" r="37" fill="none" stroke="#f0f2f5" strokeWidth="7"/>
              <circle cx="44" cy="44" r="37" fill="none" stroke="#e2e6ed" strokeWidth="7"
                strokeDasharray="116 232.5" strokeLinecap="round"/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:'#9aa5b4', lineHeight:1 }}>75</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, color:'#b0b8c4' }}>C</div>
            </div>
          </div>
          <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'#4a5568', lineHeight:1.65, fontWeight:300, paddingTop:2 }}>
            <strong style={{ color:'#1B2A4A', fontWeight:600 }}>You're starting from a solid baseline.</strong> Pacer doesn't have enough training history yet to calculate a real score. Keep training and syncing Strava — in 4 weeks, this card will reflect exactly who you're becoming as a racer.
          </div>
        </div>
        <div style={{ background:'#f8f9fb', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:10, border:'1.5px solid #e8eaed' }}>
          <span style={{ fontSize:18, flexShrink:0 }}>⚡</span>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:'#6b7a8d', lineHeight:1.6 }}>Once Pacer has 4 weeks of activity data it will calculate your real sub-scores — consistency, volume trends, speed, recovery, and how you compare to your past PR cycles.</div>
        </div>
      </div>
    </div>
  )

  // ── Loaded state ──────────────────────────────────────────────────────────
  const { score, grade, insight } = data
  const dashOffset = ((1 - score / 100) * 232.5).toFixed(1)

  return (
    <>
      {showDrill && <DrillDown data={data} onClose={() => setShowDrill(false)} />}
      <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e8eaed', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid #f0f2f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:'2.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Race Passport · Pacer</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, color:'#1B2A4A', marginTop:2 }}>Race Readiness</div>
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1px', padding:'4px 10px', borderRadius:20, textTransform:'uppercase', background:'rgba(22,163,74,0.08)', color:'#16a34a' }}>Updated today</div>
        </div>

        <div style={{ padding:'18px 20px 20px' }}>
          {/* Score + insight — stacked on mobile, side by side on desktop */}
          <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap:18, marginBottom:18 }}>
            {/* Ring */}
            <div style={{ position:'relative', width:88, height:88, flexShrink:0 }}>
              <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform:'rotate(-90deg)' }}>
                <circle cx="44" cy="44" r="37" fill="none" stroke="#f0f2f5" strokeWidth="7"/>
                <circle cx="44" cy="44" r="37" fill="none" stroke="#1B2A4A" strokeWidth="7"
                  strokeDasharray={`${(score/100*232.5).toFixed(1)} 232.5`} strokeLinecap="round"/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:'#1B2A4A', lineHeight:1 }}>{score}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, color:'#C9A84C', letterSpacing:1 }}>{grade}</div>
              </div>
            </div>
            {/* Insight */}
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'#4a5568', lineHeight:1.65, fontWeight:300, textAlign: isMobile ? 'center' : 'left' }}>
              {insight}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {['all','improving','declining'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'5px 13px', borderRadius:20, border:'1.5px solid', cursor:'pointer', transition:'all 0.15s', background: activeTab===tab ? '#1B2A4A' : 'transparent', borderColor: activeTab===tab ? '#1B2A4A' : '#e2e6ed', color: activeTab===tab ? '#fff' : '#9aa5b4' }}>
                {tab === 'all' ? 'All' : tab === 'improving' ? 'Improving' : 'Declining'}
              </button>
            ))}
          </div>

          {/* Factors */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
            {tabFactors.length === 0
              ? <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'#9aa5b4', textAlign:'center', padding:'8px 0' }}>
                  {activeTab === 'declining' ? "Nothing declining — you're on a roll." : "Not enough data yet."}
                </div>
              : tabFactors.map(f => <FactorRow key={f.key} f={f} />)
            }
          </div>

          <div style={{ height:1, background:'#f0f2f5', marginBottom:16 }} />

          {/* Goal race strip */}
          {profile?.goal_race_name || profile?.goal_distance ? (
            <div onClick={() => setShowDrill(true)}
              style={{ background:'rgba(27,42,74,0.04)', border:'1.5px solid rgba(27,42,74,0.1)', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, marginBottom:14, cursor:'pointer', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(27,42,74,0.25)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(27,42,74,0.1)'}>
              <div style={{ width:38, height:38, borderRadius:'50%', border:'2px solid #C9A84C', background:'rgba(201,168,76,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:9, color:'#C9A84C', textAlign:'center', lineHeight:1.1, flexShrink:0, position:'relative' }}>
                <span style={{ position:'relative', zIndex:1 }}>
                  {profile.goal_race_name
                    ? profile.goal_race_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,3)
                    : profile.goal_distance}
                </span>
                <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:'1px dashed rgba(201,168,76,0.45)' }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, color:'#1B2A4A' }}>
                  {profile.goal_race_name || profile.goal_distance}
                </div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#9aa5b4', marginTop:1 }}>
                  Goal race{profile.goal_target_month || profile.goal_target_year ? ` · ${[profile.goal_target_month, profile.goal_target_year].filter(Boolean).join(' ')}` : ''}
                </div>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'#C9A84C', fontWeight:600 }}>→</div>
            </div>
          ) : (
            <div style={{ background:'rgba(27,42,74,0.03)', border:'1.5px dashed rgba(27,42,74,0.1)', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, marginBottom:14, opacity:0.6 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', border:'2px solid #e2e6ed', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:'#9aa5b4', flexShrink:0 }}>?</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, color:'#9aa5b4' }}>No goal race set</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#b0b8c4', marginTop:1 }}>Set a goal race to unlock race-specific readiness</div>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'#C9A84C', fontWeight:600 }}>→</div>
            </div>
          )}

          {/* Drill down button */}
          <button onClick={() => setShowDrill(true)}
            style={{ width:'100%', padding:12, border:'1.5px solid #e2e6ed', borderRadius:12, background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:'#1B2A4A', cursor:'pointer', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#1B2A4A'; e.currentTarget.style.background='rgba(27,42,74,0.03)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e6ed'; e.currentTarget.style.background='transparent' }}>
            Full Readiness Breakdown →
          </button>
        </div>
      </div>
    </>
  )
}
