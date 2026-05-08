import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { getDistanceColor } from '../lib/colors'
import { isDemo } from '../lib/demo'

// ── Runner Archetype Engine ───────────────────────────────────────────────────
// Reads real race data — assigns archetype based on HOW you race, not just what
function computeRunnerArchetype(races) {
  if (!races || races.length === 0) return null
  const parseTime = (t) => {
    if (!t) return null
    const p = t.split(':').map(Number)
    if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2]
    if (p.length === 2) return p[0]*60 + p[1]
    return null
  }
  const racedRaces = races.filter(r => r.time && r.distance)
  if (racedRaces.length === 0) return null

  const hasTri = races.some(r => ['70.3','140.6'].some(d => (r.distance||'').includes(d)) || (r.distance||'').toLowerCase().includes('ironman') || (r.distance||'').toLowerCase().includes('triathlon'))
  const hasUltra = races.some(r => ['50K','50k','50M','100K','100M'].some(d => (r.distance||'').includes(d)) || (r.distance||'').toLowerCase().includes('ultra'))
  const hasMarathon = races.some(r => (r.distance||'').includes('26.2') || (r.distance||'').toLowerCase() === 'marathon')
  const totalRaces = races.length

  // PR progression — getting faster?
  const byDistance = {}
  racedRaces.forEach(r => {
    if (!byDistance[r.distance]) byDistance[r.distance] = []
    const t = parseTime(r.time)
    if (t) byDistance[r.distance].push({ time:t, sort:r.date_sort||r.date||'' })
  })
  let prProgression = 0
  Object.values(byDistance).forEach(arr => {
    if (arr.length < 2) return
    const sorted = [...arr].sort((a,b) => a.sort.localeCompare(b.sort))
    if (sorted[sorted.length-1].time < sorted[0].time) prProgression++
  })

  // Consistency — pace variance
  const paceVariances = []
  Object.values(byDistance).forEach(arr => {
    if (arr.length < 3) return
    const times = arr.map(r => r.time)
    const avg = times.reduce((s,t) => s+t, 0) / times.length
    const variance = times.reduce((s,t) => s + Math.pow(t-avg,2), 0) / times.length
    paceVariances.push(Math.sqrt(variance) / avg)
  })
  const avgVariance = paceVariances.length ? paceVariances.reduce((s,v)=>s+v,0)/paceVariances.length : null

  // Distance growth over time
  const distMiles = {'5K':3.1,'5k':3.1,'10K':6.2,'10k':6.2,'13.1':13.1,'26.2':26.2,'70.3':70.3,'140.6':140.6,'50K':31,'100M':100}
  const dOverTime = racedRaces.map(r => ({ m:distMiles[r.distance]||null, s:r.date_sort||'' })).filter(r=>r.m).sort((a,b)=>a.s.localeCompare(b.s))
  let distGrowth = false
  if (dOverTime.length >= 3) {
    const h = Math.floor(dOverTime.length/2)
    const a1 = dOverTime.slice(0,h).reduce((s,r)=>s+r.m,0)/h
    const a2 = dOverTime.slice(h).reduce((s,r)=>s+r.m,0)/(dOverTime.length-h)
    distGrowth = a2 > a1 * 1.2
  }
  const hasPRs = races.some(r => r.is_pr)

  // Comeback — long gap then PRs
  const sortedByDate = [...races].sort((a,b) => (a.date_sort||'').localeCompare(b.date_sort||''))
  let comeback = false
  for (let i = 1; i < sortedByDate.length && !comeback; i++) {
    const prev = sortedByDate[i-1].date_sort||'', curr = sortedByDate[i].date_sort||''
    if (prev && curr) {
      const months = (new Date(curr)-new Date(prev)) / (1000*60*60*24*30)
      if (months > 18 && hasPRs) comeback = true
    }
  }

  // Archetype decision tree
  if (hasTri || hasUltra) return { title:'The Iron Soul', desc:'Iron-distance or ultra history. You race where others spectate.', color:'#B83232' }
  if (distGrowth && hasMarathon) return { title:'The Distance Hunter', desc:'Always chasing the next longer challenge.', color:'#1E5FA8' }
  if (avgVariance !== null && avgVariance < 0.04 && racedRaces.length >= 3) return { title:'The Pacer', desc:'Metronomic consistency. You race with surgical precision.', color:'#C9A84C' }
  if (prProgression >= 2 && hasPRs) return { title:'The Strong Finisher', desc:'Your times keep dropping. Each race builds on the last.', color:'#4ade80' }
  if (comeback) return { title:'The Comeback Kid', desc:'You stepped away and came back stronger. That takes character.', color:'#C9A84C' }
  if (totalRaces >= 10) return { title:'The Grinder', desc:'High volume, relentless. You show up to every start line.', color:'#9aa5b4' }
  const shortRaces = racedRaces.filter(r => ['5K','5k','10K','10k'].some(d=>(r.distance||'').includes(d)))
  if (shortRaces.length >= 2 && prProgression >= 1) return { title:'The Speedster', desc:'Built for pace. You thrive at the sharp end of the field.', color:'#1E5FA8' }
  if (totalRaces <= 3) return { title:'The Contender', desc:'Your passport is just getting started. The best is ahead.', color:'#C9A84C' }
  if (hasMarathon) return { title:'The Marathoner', desc:'The classic distance, run seriously.', color:'#C9A84C' }
  return { title:'The Road Runner', desc:'Consistent, committed, always moving forward.', color:'#9aa5b4' }
}

function computeCareerScore(races) {
  if (!races || !races.length) return null
  const scored = races.filter(r => r.pacer_score)
  if (scored.length) return Math.round(scored.reduce((s,r)=>s+r.pacer_score,0)/scored.length)
  const distMap = {}
  races.forEach(r => { distMap[r.distance]=(distMap[r.distance]||0)+1 })
  const hasTri = races.some(r=>(r.distance||'').includes('70.3')||(r.distance||'').includes('140'))
  const hasMarathon = races.some(r=>(r.distance||'').includes('26.2'))
  return Math.min(98, 60+Math.min(20,races.length*3)+Math.min(10,Object.keys(distMap).length*2)+(hasTri?6:0)+(hasMarathon?3:0))
}

function gradeFromScore(s) {
  if (s>=97) return 'A+'; if (s>=93) return 'A'; if (s>=90) return 'A-'
  if (s>=87) return 'B+'; if (s>=83) return 'B'; if (s>=80) return 'B-'
  if (s>=77) return 'C+'; if (s>=73) return 'C'; if (s>=70) return 'C-'
  return 'D'
}

function StampPrev({ distance, name, month, year, size=110, onClick }) {
  const c = getDistanceColor(distance)
  const cleaned = (distance||'').replace(' mi','').replace(' miles','')
  const fs = cleaned.length>4?16:cleaned.length>2?20:28
  return (
    <div onClick={onClick} style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid ${c.stampBorder}`, background:'rgba(255,255,255,0.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0, cursor:onClick?'pointer':'default', transition:'transform 0.2s' }}
      onMouseEnter={e => { if(onClick) e.currentTarget.style.transform='scale(1.07)' }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)' }}>
      <div style={{ position:'absolute', inset:5, borderRadius:'50%', border:`0.75px dashed ${c.stampDash}` }} />
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:c.stampText, letterSpacing:'0.5px', lineHeight:1, position:'relative', zIndex:1 }}>{cleaned}</span>
      {name && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8, fontWeight:600, letterSpacing:'0.1em', color:c.stampText, textTransform:'uppercase', textAlign:'center', padding:'0 8px', marginTop:2, lineHeight:1.2, position:'relative', zIndex:1, maxWidth:size*0.8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name.split(' ').slice(0,2).join(' ')}</span>}
      {(month||year) && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:7, color:'rgba(27,42,74,0.3)', marginTop:2, letterSpacing:'0.15em', position:'relative', zIndex:1 }}>{month&&year?month+' '+year:month||year}</span>}
    </div>
  )
}

export default function HomePreview() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, isDark } = useTheme()
  const [races, setRaces] = useState(null)
  const [profile, setProfile] = useState(null)
  const [pacerData, setPacerData] = useState(null)
  const [loadingPacer, setLoadingPacer] = useState(false)
  const [countdown, setCountdown] = useState({ days:0, hours:0, mins:0, secs:0 })

  const firstName = profile?.full_name?.split(' ')[0] || ''
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  useEffect(() => {
    if (!user) return
    const load = async () => {
      if (isDemo(user.email)) { setRaces([]); setProfile({ full_name:'Demo Runner' }); return }
      const uid = user.id
      const [{ data:praces }, { data:prof }] = await Promise.all([
        supabase.from('passport_races').select('*').eq('user_id',uid).order('date_sort',{ascending:false}),
        supabase.from('profiles').select('*').eq('user_id',uid).single(),
      ])
      setRaces(praces||[])
      setProfile(prof||{})
    }
    load()
  }, [user])

  useEffect(() => {
    if (!profile || !races) return
    if (!races.length) {
      setPacerData({ insight:'Every champion starts somewhere. Import your races to unlock your Pacer grade and career score.', next_step:'Import your race history to get started.' })
      return
    }
    const key = 'pacer_preview_' + (profile.full_name||'') + '_' + races.length
    const cached = sessionStorage.getItem(key)
    if (cached) { try { setPacerData(JSON.parse(cached)); return } catch(e){} }
    setLoadingPacer(true)
    fetch('/api/pacer', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'insight', races:races.slice(0,15), profile:{ first_name:firstName, state:profile?.state, favorite_distance:profile?.favorite_distance } })
    })
    .then(r=>r.json())
    .then(d => {
      const pd = d?.insight ? d : { insight:races.length+' races in your passport. Your racing story is taking shape.', next_step:'Explore your race pages for full details.' }
      setPacerData(pd); sessionStorage.setItem(key,JSON.stringify(pd)); setLoadingPacer(false)
    })
    .catch(() => { setPacerData({ insight:'Your Race Passport is building something special.', next_step:'Add more races to unlock deeper insights.' }); setLoadingPacer(false) })
  }, [profile?.full_name, races?.length])

  const archetype = useMemo(() => computeRunnerArchetype(races), [races])
  const careerScore = useMemo(() => computeCareerScore(races), [races])
  const careerGrade = careerScore ? gradeFromScore(careerScore) : null
  const gradedRaces = useMemo(() => (races||[]).filter(r=>r.pacer_grade), [races])
  const upcomingRace = useMemo(() => {
    if (!races) return null
    const today = new Date().toISOString().split('T')[0]
    return races.find(r=>r.date_sort&&r.date_sort>=today)||null
  }, [races])
  const totalMiles = useMemo(() => {
    if (!races) return 0
    const dist = {'5K':3.1,'5k':3.1,'10K':6.2,'10k':6.2,'13.1':13.1,'26.2':26.2,'70.3':70.3,'140.6':140.6,'50K':31,'100M':100}
    return Math.round(races.reduce((s,r)=>s+(dist[r.distance]||0),0))
  }, [races])

  useEffect(() => {
    if (!upcomingRace?.date_sort) return
    const calc = () => {
      const diff = new Date(upcomingRace.date_sort)-new Date()
      if (diff<=0) return
      setCountdown({ days:Math.floor(diff/86400000), hours:Math.floor((diff%86400000)/3600000), mins:Math.floor((diff%3600000)/60000), secs:Math.floor((diff%60000)/1000) })
    }
    calc(); const ti=setInterval(calc,1000); return ()=>clearInterval(ti)
  }, [upcomingRace?.date_sort])

  const greetingLine2 = upcomingRace ? 'YOUR NEXT RACE IS WAITING.' : gradedRaces.length>0 ? 'YOUR GRADES ARE IN.' : 'THE START LINE IS CALLING.'
  const navyCard = isDark ? '#111827' : '#1B2A4A'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'
  const pageBg = isDark ? '#0f1623' : '#eef0f5'
  const loading = races === null

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500&family=Barlow+Condensed:wght@300;400;600;700&display=swap');
    @keyframes hpFade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
    @keyframes hpPulse{0%,100%{opacity:0.3;}50%{opacity:1;}}
    @keyframes hpSpin{to{transform:rotate(360deg);}}
    .hp-tab{padding:0 16px;border:none;background:transparent;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:600;letter-spacing:2px;text-transform:uppercase;cursor:pointer;height:52px;border-bottom:2px solid transparent;transition:all 0.15s;}
    .hp-grade-pill{display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:10px 14px;border-radius:12px;cursor:pointer;transition:all 0.2s;min-width:68px;border:1.5px solid;}
    .hp-grade-pill:hover{transform:translateY(-2px);border-color:#C9A84C !important;}
    .hp-milestone{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid;}
    .pv-banner{position:fixed;bottom:0;left:0;right:0;z-index:100;background:rgba(27,42,74,0.96);border-top:2px solid #C9A84C;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(8px);}
    .pv-banner-text{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.15em;color:rgba(255,255,255,0.6);text-transform:uppercase;}
    .pv-banner-text span{color:#C9A84C;}
    .pv-banner-back{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;cursor:pointer;background:none;border:none;}
    .pv-banner-back:hover{color:#fff;}
  `

  if (!user) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:pageBg }}><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, color:'#9aa5b4' }}>Please log in to view this preview</span></div>

  return (
    <div style={{ minHeight:'100vh', background:pageBg, fontFamily:"'Barlow',sans-serif", paddingBottom:80 }}>
      <style>{css}</style>

      {/* PREVIEW BANNER */}
      <div className="pv-banner">
        <div className="pv-banner-text">Preview: <span>Home Page Redesign</span> — your live /home is unchanged</div>
        <button className="pv-banner-back" onClick={() => navigate('/home')}>Back to Live Home</button>
      </div>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:isDark?'rgba(15,21,38,0.96)':'rgba(255,255,255,0.96)', backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}` }}>
        <div style={{ padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 0' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</span>
          </div>
          <div style={{ display:'flex', alignItems:'stretch' }}>
            {[{l:'Home',p:'/home-preview'},{l:'Discover',p:'/discover'},{l:'Passport',p:'/passport'},{l:'Profile',p:'/profile'}].map(tab => (
              <button key={tab.p} className="hp-tab" style={{ color:tab.p==='/home-preview'?t.text:t.textMuted, borderBottomColor:tab.p==='/home-preview'?'#C9A84C':'transparent' }} onClick={() => navigate(tab.p)}>{tab.l}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center' }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}` }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:'#C9A84C' }}>{firstName?firstName[0].toUpperCase():'U'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GREETING HEADER with identity summary */}
      <div style={{ background:isDark?'rgba(27,42,74,0.3)':'rgba(27,42,74,0.04)', backdropFilter:'blur(2px)', borderBottom:`1px solid ${t.navBorder}`, padding:'32px 40px 28px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,4.5vw,58px)', color:t.text, letterSpacing:'2px', lineHeight:1, marginBottom:4 }}>
              {greeting}{firstName?`, ${firstName.toUpperCase()}`+'.':'.'}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,4.5vw,58px)', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>
              {greetingLine2}
            </div>
          </div>
          {!loading && (careerScore || archetype) && (
            <div style={{ display:'flex', alignItems:'center', gap:16, flexShrink:0, flexWrap:'wrap' }}>
              {careerScore && (
                <div style={{ textAlign:'center' }}>
                  <div style={{ position:'relative', width:76, height:76 }}>
                    <svg viewBox="0 0 76 76" width="76" height="76">
                      <circle cx="38" cy="38" r="32" fill="none" stroke={isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.1)'} strokeWidth="6"/>
                      <circle cx="38" cy="38" r="32" fill="none" stroke="#C9A84C" strokeWidth="6"
                        strokeDasharray={((careerScore/100)*201.1).toFixed(2)+' 201.1'}
                        strokeLinecap="round" transform="rotate(-90 38 38)"/>
                    </svg>
                    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:21, color:t.text, lineHeight:1 }}>{careerScore}</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:'#C9A84C', lineHeight:1 }}>{careerGrade}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:4 }}>Career Score</div>
                </div>
              )}
              {archetype && (
                <div style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:10, padding:'10px 14px', maxWidth:180 }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'2px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:3 }}>Pacer Says</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:'#C9A84C', letterSpacing:'0.5px', lineHeight:1, marginBottom:4 }}>{archetype.title}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:t.textMuted, lineHeight:1.5 }}>{archetype.desc}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div style={{ padding:'28px 28px 60px', maxWidth:1400, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.7fr) minmax(0,0.8fr)', gap:20, alignItems:'start' }}>

          {/* LEFT COLUMN */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* 1. PACER — 2 clear zones */}
            <div style={{ borderRadius:16, background:isDark?'rgba(201,168,76,0.07)':'#FFFDF5', borderLeft:'3px solid #C9A84C', padding:'22px 24px', animation:'hpFade 0.4s ease 0.1s both' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18 }}>{'⚡'}</div>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:'3px', color:'#C9A84C', lineHeight:1 }}>PACER</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Your AI Race Intelligence</div>
                </div>
              </div>
              {/* Zone A: insight */}
              {loadingPacer ? (
                <div>{[0.7,0.45].map((w,i) => <div key={i} style={{ height:i===0?14:12, borderRadius:6, background:isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)', marginBottom:10, width:(w*100)+'%', animation:'hpPulse 1.5s ease infinite' }} />)}</div>
              ) : pacerData && (
                <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:15, color:t.text, margin:'0 0 16px', lineHeight:1.75, fontWeight:400 }}>{pacerData.insight}</p>
              )}
              {/* Zone B: grades — directly below, no divider */}
              {gradedRaces.length > 0 && (
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase', marginBottom:10 }}>Your Race Grades</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {gradedRaces.slice(0,6).map(rc => {
                      const partial = rc.pacer_score_partial !== false
                      const gc = partial ? t.textMuted : (rc.pacer_grade?.startsWith('A')?'#16a34a':rc.pacer_grade?.startsWith('B')?'#C9A84C':'#9aa5b4')
                      const bc = partial ? t.border : 'rgba(201,168,76,0.25)'
                      return (
                        <div key={rc.id} className="hp-grade-pill"
                          onClick={() => navigate('/race/'+rc.id)}
                          style={{ background:partial?(isDark?'rgba(255,255,255,0.05)':'rgba(27,42,74,0.04)'):'rgba(201,168,76,0.1)', borderColor:bc }}>
                          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:gc, letterSpacing:'1px', lineHeight:1 }}>{partial?'~':''}{rc.pacer_grade}</span>
                          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, color:t.textMuted, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'center' }}>{(rc.name||'').split(' ').slice(0,2).join(' ')}</span>
                          {partial && <span style={{ fontSize:8, color:t.textMuted }}>partial</span>}
                        </div>
                      )
                    })}
                  </div>
                  {gradedRaces.some(r => r.pacer_score_partial!==false) && (
                    <div style={{ marginTop:12, padding:'10px 14px', background:isDark?'rgba(27,42,74,0.5)':'rgba(27,42,74,0.05)', borderRadius:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, color:t.textMuted }}>Grade completeness</span>
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#C9A84C', fontWeight:600 }}>40%</span>
                      </div>
                      <div style={{ height:4, background:isDark?'rgba(255,255,255,0.08)':'rgba(27,42,74,0.1)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:'40%', background:'#C9A84C', borderRadius:99 }} />
                      </div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:t.textMuted, marginTop:6, lineHeight:1.5 }}>Link Strava and add training on your race page to unlock your full grade — training counts for 60% of your score.</div>
                    </div>
                  )}
                </div>
              )}
              {!loading && races?.length===0 && (
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:14, background:isDark?'rgba(201,168,76,0.06)':'rgba(201,168,76,0.08)', borderRadius:10, border:'1px solid rgba(201,168,76,0.2)' }}>
                  <span style={{ fontSize:20 }}>{'🏁'}</span>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, color:t.text, marginBottom:2 }}>Import your first race to unlock your Pacer grade and career score.</div>
                    <button onClick={() => navigate('/race-import')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1px', color:'#C9A84C', background:'none', border:'none', cursor:'pointer', padding:0, textTransform:'uppercase' }}>Import races</button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. NEXT RACE / STATE-BASED */}
            {upcomingRace ? (
              <div style={{ borderRadius:16, background:navyCard, overflow:'hidden', animation:'hpFade 0.4s ease 0.2s both' }}>
                <div style={{ padding:'22px 24px', background:'linear-gradient(135deg,#1B2A4A,#243657)', borderBottom:'2px solid #C9A84C', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, right:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:100, color:'rgba(201,168,76,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>GO</div>
                  <div style={{ position:'relative', zIndex:1 }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:4 }}>Next Race</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(20px,3vw,36px)', color:'#fff', letterSpacing:'1px', lineHeight:1, marginBottom:4 }}>{upcomingRace.name}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'rgba(255,255,255,0.45)' }}>
                      {upcomingRace.location&&upcomingRace.location+' · '}{upcomingRace.date||upcomingRace.date_sort} · {upcomingRace.distance}
                    </div>
                  </div>
                </div>
                <div style={{ padding:'18px 24px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {[{v:countdown.days,l:'Days'},{v:countdown.hours,l:'Hrs'},{v:countdown.mins,l:'Min'},{v:countdown.secs,l:'Sec'}].map((u,i) => (
                    <div key={i} style={{ textAlign:'center', background:'rgba(255,255,255,0.05)', borderRadius:8, padding:'10px 6px' }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'#C9A84C', lineHeight:1 }}>{String(u.v).padStart(2,'0')}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.3)', marginTop:3, textTransform:'uppercase' }}>{u.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding:'0 24px 18px', display:'flex', gap:10 }}>
                  <button onClick={() => navigate('/race/'+upcomingRace.id)} style={{ flex:1, padding:10, fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', background:'#C9A84C', color:'#1B2A4A', border:'none', borderRadius:8, cursor:'pointer' }}>View Race Page</button>
                  <button onClick={() => navigate('/discover')} style={{ flex:1, padding:10, fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'none', borderRadius:8, cursor:'pointer' }}>Discover More</button>
                </div>
              </div>
            ) : !loading && (
              <div style={{ borderRadius:16, background:cardBg, padding:'22px 24px', border:`1px solid ${t.border}`, animation:'hpFade 0.4s ease 0.2s both' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:3 }}>What's Next</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:t.text, letterSpacing:'0.5px', marginBottom:12 }}>Ready for Your Next Race?</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:t.textMuted, marginBottom:16, lineHeight:1.6 }}>Browse thousands of upcoming races on the discover map and find your next start line.</div>
                <button onClick={() => navigate('/discover')} style={{ padding:'10px 22px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', background:'#1B2A4A', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>Find Your Next Race</button>
              </div>
            )}

            {/* 3. RACE TIMELINE */}
            {races && races.length > 0 && (() => {
              const sorted = [...races].sort((a,b)=>(a.date_sort||'').localeCompare(b.date_sort||''))
              const DOT_SPACING = 200, totalW = Math.max(sorted.length*DOT_SPACING+200,600)
              const firstYear = sorted[0]?.date_sort?.split('-')[0]||''
              const lastYear = sorted[sorted.length-1]?.date_sort?.split('-')[0]||''
              const spanLabel = firstYear&&lastYear&&firstYear!==lastYear ? (parseInt(lastYear)-parseInt(firstYear))+' years' : ''
              return (
                <div style={{ borderRadius:16, background:navyCard, padding:'24px 28px', position:'relative', overflow:'hidden', animation:'hpFade 0.4s ease 0.3s both' }}>
                  <div style={{ position:'absolute', top:'50%', right:-20, transform:'translateY(-50%)', fontFamily:"'Bebas Neue',sans-serif", fontSize:100, color:'rgba(201,168,76,0.04)', userSelect:'none', pointerEvents:'none', lineHeight:1 }}>TIMELINE</div>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, position:'relative', zIndex:1 }}>
                    <div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:3 }}>Race Timeline</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:'#fff', letterSpacing:'1px', lineHeight:1 }}>
                        {spanLabel&&totalMiles>0?spanLabel+'. '+totalMiles+' miles.':sorted.length+' '+(sorted.length===1?'race':'races')+'. All right here.'}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'rgba(255,255,255,0.3)' }}>
                        {(sorted[0]?.date||sorted[0]?.date_sort||'').slice(0,7)} to {(sorted[sorted.length-1]?.date||sorted[sorted.length-1]?.date_sort||'').slice(0,7)}
                      </div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:'#C9A84C' }}>{sorted.length} {sorted.length===1?'Race':'Races'}</div>
                    </div>
                  </div>
                  <div style={{ overflowX:'auto', cursor:'grab', position:'relative', zIndex:1 }}>
                    <div style={{ position:'relative', width:totalW, height:155, minWidth:'100%' }}>
                      {sorted.map((race,i) => (
                        <div key={'lbl'+i} style={{ position:'absolute', bottom:4, left:80+i*DOT_SPACING, transform:'translateX(-50%)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'rgba(255,255,255,0.28)', whiteSpace:'nowrap' }}>
                          {(race.date||race.date_sort||'').slice(0,7)}
                        </div>
                      ))}
                      <div style={{ position:'absolute', top:'50%', left:0, right:0, height:5, background:'rgba(201,168,76,0.12)', borderRadius:3, transform:'translateY(-50%)' }}>
                        <div style={{ height:'100%', background:'linear-gradient(to right,rgba(201,168,76,0.3),#C9A84C)', borderRadius:3, width:sorted.length>1?((sorted.length-1)*DOT_SPACING+80)/totalW*100+'%':'25%', marginLeft:80 }} />
                      </div>
                      {sorted.map((race,i) => {
                        const c = getDistanceColor(race.distance), x = 80+i*DOT_SPACING
                        return (
                          <div key={race.id||i} style={{ position:'absolute', top:'50%', left:x, transform:'translate(-50%,-50%)', zIndex:3 }}>
                            <div style={{ position:'absolute', bottom:'calc(100% + 14px)', left:'50%', transform:'translateX(-50%)', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:7, padding:'5px 10px', whiteSpace:'nowrap' }}>
                              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:'#fff', lineHeight:1.1 }}>{(race.name||'').length>22?(race.name||'').slice(0,22)+'...':race.name||''}</div>
                              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:'rgba(201,168,76,0.7)' }}>{race.time||race.distance}</div>
                            </div>
                            <div style={{ position:'absolute', bottom:'calc(100% + 2px)', left:'50%', transform:'translateX(-50%)', width:1.5, height:10, background:'rgba(201,168,76,0.25)' }} />
                            <div onClick={() => navigate('/race/'+race.id)}
                              style={{ width:38, height:38, borderRadius:'50%', background:c.stampBorder, border:'2.5px solid rgba(255,255,255,0.2)', boxShadow:`0 0 0 2px ${c.stampBorder}, 0 0 16px ${c.stampBorder}50`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'transform 0.2s' }}
                              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.35)'}
                              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:8, color:'#fff', textAlign:'center', lineHeight:1 }}>{(race.distance||'').replace(' mi','').slice(0,4)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', position:'relative', zIndex:1 }}>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'rgba(255,255,255,0.2)' }}>drag to scroll</span>
                    <button onClick={() => navigate('/race-import')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', padding:0 }}>+ Add Another Race</button>
                  </div>
                </div>
              )
            })()}

            {/* 4. STAMPS — main column, larger */}
            <div style={{ borderRadius:16, background:cardBg, padding:'22px', border:`1px solid ${t.border}`, animation:'hpFade 0.4s ease 0.35s both' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:2 }}>Passport</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:t.text, letterSpacing:'1px', lineHeight:1 }}>Your Stamps</div>
                </div>
                <button onClick={() => navigate('/passport')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', border:'none', background:'none', cursor:'pointer', padding:0 }}>Your Passport</button>
              </div>
              {loading ? (
                <div style={{ display:'flex', gap:16, paddingBottom:8 }}>
                  {[1,2,3].map(i=><div key={i} style={{ width:110, height:110, borderRadius:'50%', background:isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)', animation:'hpPulse 1.5s ease infinite', flexShrink:0 }} />)}
                </div>
              ) : races?.length===0 ? (
                <div style={{ borderRadius:12, border:`1.5px dashed ${t.border}`, padding:'28px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{'🏅'}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:t.text, letterSpacing:'0.5px', marginBottom:6 }}>Your First Stamp Awaits</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:t.textMuted, marginBottom:14 }}>Import your race history to earn your first stamp and start building your passport.</div>
                  <button onClick={() => navigate('/race-import')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', background:'#1B2A4A', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>Import Races</button>
                </div>
              ) : (
                <div style={{ overflowX:'auto', scrollbarWidth:'none' }}>
                  <div style={{ display:'flex', gap:16, paddingBottom:8, paddingTop:4, minWidth:'min-content' }}>
                    {races.slice(0,8).map(s=>(
                      <StampPrev key={s.id} distance={s.distance} name={s.name} month={s.month||s.date?.split(' ')[0]} year={s.year||s.date?.split(' ')[1]} size={110} onClick={() => navigate('/race/'+s.id)} />
                    ))}
                    <div onClick={() => navigate('/passport')} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
                      <div style={{ width:110, height:110, borderRadius:'50%', border:`1.5px dashed ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.transform='scale(1.06)'}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.transform='scale(1)'}}>
                        <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, color:'#C9A84C' }}>More</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* 1. GOAL */}
            <div style={{ borderRadius:16, background:cardBg, padding:'20px', border:`1px solid ${t.border}`, animation:'hpFade 0.4s ease 0.2s both' }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:2 }}>Your Goal</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:t.text, letterSpacing:'0.5px', marginBottom:14 }}>Next Race Goal</div>
              {profile?.goal_distance ? (
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#C9A84C', letterSpacing:'0.5px', marginBottom:4 }}>{profile.goal_distance}</div>
                  {profile.goal_date&&<div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:t.textMuted }}>{profile.goal_date}</div>}
                </div>
              ) : (
                <div style={{ borderRadius:10, border:`1.5px dashed ${t.border}`, padding:'20px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:20, marginBottom:8 }}>{'🎯'}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:t.textMuted, marginBottom:12, lineHeight:1.6 }}>Set your next race goal and let Pacer guide you there.</div>
                  <button onClick={() => navigate('/profile')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', background:'#1B2A4A', color:'#fff', border:'none', borderRadius:7, padding:'7px 16px', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#C9A84C'} onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>Set a Goal</button>
                </div>
              )}
            </div>

            {/* 2. MILESTONES */}
            {races && races.length > 0 && (() => {
              const ms = []
              const sorted = [...races].sort((a,b)=>(a.date_sort||'').localeCompare(b.date_sort||''))
              if (sorted[0]) ms.push({ icon:'🎯', title:'First Race!', sub:sorted[0].name, color:'#C9A84C' })
              const df = {}
              sorted.forEach(r=>{ if(!df[r.distance]){df[r.distance]=r; if(r!==sorted[0]) ms.push({ icon:'🏅', title:'First '+r.distance+'!', sub:r.name, color:'#1E5FA8' })} })
              sorted.filter(r=>r.is_pr).forEach(r=>ms.push({ icon:'⚡', title:'New '+r.distance+' PR!', sub:r.time+' · '+r.date, color:'#C9A84C' }))
              ;[5,10,25].forEach(n=>{ if(sorted.length>=n) ms.push({ icon:'🔥', title:n+' Race Club!', sub:n+' total races', color:'#B83232' }) })
              if (!ms.length) return null
              return (
                <div style={{ borderRadius:16, background:isDark?'rgba(201,168,76,0.08)':'#FFF8E7', padding:'20px', border:`1px solid ${isDark?'rgba(201,168,76,0.15)':'rgba(201,168,76,0.2)'}`, animation:'hpFade 0.4s ease 0.3s both' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:2 }}>Your Journey</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:t.text, letterSpacing:'0.5px', marginBottom:12 }}>Milestones</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:250, overflowY:'auto', scrollbarWidth:'none' }}>
                    {ms.reverse().slice(0,6).map((m,i)=>(
                      <div key={i} className="hp-milestone" style={{ background:isDark?'rgba(27,42,74,0.5)':'rgba(255,255,255,0.85)', borderColor:isDark?'rgba(255,255,255,0.06)':'rgba(201,168,76,0.18)' }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:m.color+'20', border:`1px solid ${m.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:15 }}>{m.icon}</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:t.text, letterSpacing:'0.5px', lineHeight:1.1 }}>{m.title}</div>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:t.textMuted, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* 3. THE WALL */}
            <div style={{ borderRadius:16, background:cardBg, padding:'20px', border:`1px solid ${t.border}`, animation:'hpFade 0.4s ease 0.4s both' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:2 }}>Featured Story</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:t.text, letterSpacing:'0.5px', lineHeight:1 }}>The Wall</div>
                </div>
                <button onClick={() => navigate('/wall')} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textTransform:'uppercase', border:'none', background:'none', cursor:'pointer', padding:0 }}>See All</button>
              </div>
              <div onClick={() => navigate('/wall')}
                style={{ border:`1px solid ${isDark?'rgba(255,255,255,0.08)':'rgba(27,42,74,0.1)'}`, borderRadius:11, padding:14, cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.background=isDark?'rgba(201,168,76,0.05)':'rgba(201,168,76,0.03)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=isDark?'rgba(255,255,255,0.08)':'rgba(27,42,74,0.1)';e.currentTarget.style.background='transparent'}}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:10, color:'#C9A84C' }}>RG</span>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:600, color:t.text, lineHeight:1 }}>Ryan Groene</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:t.textMuted }}>IRONMAN 70.3 Eagleman · Jun 2025</div>
                  </div>
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:t.text, letterSpacing:'0.4px', lineHeight:1.3, marginBottom:9 }}>My dad lost nearly 100 pounds and finished a 5K. That is my why.</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:t.textMuted }}>{'❤️'} 847</span>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:t.textMuted, marginLeft:'auto' }}>3 min read</span>
                </div>
              </div>
            </div>

            {/* 4. CAREER SUMMARY */}
            {races && races.length > 0 && (
              <div style={{ borderRadius:16, background:cardBg, padding:'20px', border:`1px solid ${t.border}`, animation:'hpFade 0.4s ease 0.45s both' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:600, letterSpacing:'2.5px', color:'#C9A84C', textTransform:'uppercase', marginBottom:2 }}>Career Summary</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:t.text, letterSpacing:'0.5px', marginBottom:14 }}>Your Numbers</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { label:'Total Races', value:races.length },
                    { label:'Total Miles', value:totalMiles||'—' },
                    { label:'Distances', value:[...new Set(races.map(r=>r.distance).filter(Boolean))].length },
                    { label:'PRs Set', value:races.filter(r=>r.is_pr).length||'0' },
                  ].map((s,i)=>(
                    <div key={i} style={{ background:isDark?'rgba(255,255,255,0.03)':'rgba(27,42,74,0.03)', borderRadius:10, padding:'12px 14px', border:`1px solid ${t.border}` }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:t.text, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginTop:3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
