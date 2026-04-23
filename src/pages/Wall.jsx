import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../lib/useIsMobile'

export const WallIcon = ({ width=18, height=18 }) => (
  <svg width={width} height={height} viewBox="0 0 20 20" fill="none">
    <path d="M10 2c0 4-5 6-5 10a5 5 0 0 0 10 0c0-4-5-6-5-10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 14a1.5 1.5 0 0 1-1.5-1.5c0-1 1.5-2 1.5-2s1.5 1 1.5 2A1.5 1.5 0 0 1 10 14z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>
)

// Eagleman Strava activity with per-sport map data
const RYAN_STORY = {
  id: 'seed_ryan_1',
  author_name: 'Ryan Groene',
  initials: 'RG',
  is_anonymous: false,
  title: "My dad lost nearly 100 pounds and finished a 5K. That's my why.",
  body: `When I hit the halfway point of Eagleman 70.3 — a 1.2-mile swim, 56-mile bike, and 13.1-mile run in the June Maryland heat — I was suffering. The run felt impossible. My legs were already spent from the bike, the sun was brutal, and every part of me wanted to walk.

And then I thought about my dad.

He didn't care about his time. He didn't care about his place. He just wanted to finish. Over the course of a year he changed everything about how he lived — what he ate, how he moved, who he was becoming — and lost nearly 100 pounds. On race day, he stood at the start line of a 5K. Not a triathlon. Not a marathon. A 5K. And it took more courage than anything I've ever done.

He finished. And watching him cross that line changed me.

So when my body tells me to stop, I think about what it took for him to even sign up. That's always been enough to keep me going. That's my why.`,
  race_name: 'IRONMAN 70.3 Eagleman',
  race_distance: '70.3',
  race_date: 'Jun 2025',
  strava_activity: {
    id: 11234567890,
    name: 'Eagleman 70.3 Triathlon',
    type: 'Triathlon',
    distance: '70.3 mi',
    moving_time: '6:32:08',
    date: 'Jun 8, 2025',
    kudos: 47,
    // Per-sport splits and map embed URLs (Strava embed uses activity ID)
    sports: [
      { key:'swim',  label:'Swim',   distance:'1.2 mi', time:'38:14', pace:'2:04/100m', color:'#3b82f6' },
      { key:'bike',  label:'Bike',   distance:'56 mi',  time:'2:58:22', pace:'18.8 mph', color:'#f59e0b' },
      { key:'run',   label:'Run',    distance:'13.1 mi',time:'2:47:30', pace:'12:47/mi', color:'#10b981' },
    ],
    // Strava embed URL — uses the activity ID; shows the full triathlon route
    embed_url: 'https://www.strava.com/activities/11234567890/embed/abc123',
  },
  hearts: 847, flames: 412, likes: 203,
  created_at: 'April 22, 2026',
  read_mins: 3,
}

// ── Reaction Button ───────────────────────────────────────────────────────────
function ReactionBtn({ type, count, active, onClick, t }) {
  const icons = {
    heart: (on) => <svg width="15" height="15" viewBox="0 0 24 24" fill={on?'#e24b4a':'none'} stroke={on?'#e24b4a':'currentColor'} strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    flame: (on) => <svg width="15" height="15" viewBox="0 0 20 20" fill={on?'#FC4C02':'none'} stroke={on?'#FC4C02':'currentColor'} strokeWidth="1.5" strokeLinejoin="round"><path d="M10 2c0 4-5 6-5 10a5 5 0 0 0 10 0c0-4-5-6-5-10z"/><path d="M10 14a1.5 1.5 0 0 1-1.5-1.5c0-1 1.5-2 1.5-2s1.5 1 1.5 2A1.5 1.5 0 0 1 10 14z"/></svg>,
    like:  (on) => <svg width="15" height="15" viewBox="0 0 24 24" fill={on?'#1B2A4A':'none'} stroke={on?'#1B2A4A':'currentColor'} strokeWidth="1.8"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>,
  }
  const activeColor = type==='heart'?'#e24b4a':type==='flame'?'#FC4C02':'#1B2A4A'
  return (
    <button onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:'5px', background:'none', border:'none', cursor:'pointer', padding:'6px 10px', borderRadius:'20px', transition:'background 0.15s', color:active?activeColor:t.textMuted }}
      onMouseEnter={e => e.currentTarget.style.background = t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      {icons[type](active)}
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:active?600:400 }}>
        {count >= 1000 ? `${(count/1000).toFixed(1)}k` : count}
      </span>
    </button>
  )
}

// ── Strava Card with sport switcher + map ─────────────────────────────────────
function StravaCard({ activity, t }) {
  const [activeSport, setActiveSport] = useState(null) // null = overview

  return (
    <div style={{ background:t.isDark?'rgba(252,76,2,0.07)':'rgba(252,76,2,0.04)', border:`1px solid ${t.isDark?'rgba(252,76,2,0.2)':'rgba(252,76,2,0.12)'}`, borderRadius:'12px', overflow:'hidden', marginBottom:'20px' }}>
      {/* Header row */}
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', borderBottom:`1px solid ${t.isDark?'rgba(252,76,2,0.15)':'rgba(252,76,2,0.1)'}` }}>
        <div style={{ width:34, height:34, borderRadius:'8px', background:'#FC4C02', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:t.text, letterSpacing:'0.5px' }}>{activity.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{activity.distance} · {activity.moving_time} · {activity.date}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#FC4C02"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#FC4C02', fontWeight:600 }}>{activity.kudos}</span>
        </div>
      </div>

      {/* Sport switcher tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)'}`, background:t.isDark?'rgba(0,0,0,0.15)':'rgba(27,42,74,0.02)' }}>
        <button onClick={()=>setActiveSport(null)}
          style={{ flex:1, padding:'8px 4px', background:'none', border:'none', borderBottom:`2px solid ${activeSport===null?'#FC4C02':'transparent'}`, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:activeSport===null?'#FC4C02':t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}>
          Overview
        </button>
        {activity.sports.map(s => (
          <button key={s.key} onClick={()=>setActiveSport(s.key)}
            style={{ flex:1, padding:'8px 4px', background:'none', border:'none', borderBottom:`2px solid ${activeSport===s.key?s.color:'transparent'}`, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:activeSport===s.key?s.color:t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content — overview or per-sport */}
      {activeSport === null ? (
        <div style={{ padding:'14px 16px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
          {activity.sports.map(s => (
            <div key={s.key} onClick={()=>setActiveSport(s.key)}
              style={{ textAlign:'center', padding:'10px 8px', borderRadius:'8px', background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.04)', border:`1px solid ${t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)'}`, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=s.color}
              onMouseLeave={e=>e.currentTarget.style.borderColor=t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.07)'}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:s.color, textTransform:'uppercase', marginBottom:'4px' }}>{s.label}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:t.text, letterSpacing:'0.5px', lineHeight:1 }}>{s.time}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted, marginTop:'2px' }}>{s.distance}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding:'14px 16px' }}>
          {/* Sport detail */}
          {activity.sports.filter(s=>s.key===activeSport).map(s => (
            <div key={s.key}>
              <div style={{ display:'flex', gap:'12px', marginBottom:'12px' }}>
                {[{label:'Distance',value:s.distance},{label:'Time',value:s.time},{label:'Pace',value:s.pace}].map(stat => (
                  <div key={stat.label} style={{ flex:1, textAlign:'center', padding:'8px', borderRadius:'8px', background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.04)' }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'3px' }}>{stat.label}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:s.color, letterSpacing:'0.5px' }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              {/* Map placeholder — real Strava embed would go here */}
              <div style={{ height:160, borderRadius:'8px', background:t.isDark?'rgba(255,255,255,0.04)':'rgba(27,42,74,0.06)', border:`1px solid ${t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.08)'}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, textTransform:'uppercase' }}>{s.label} Route Map</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted, opacity:0.6 }}>Cambridge, MD · {s.distance}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Story Card ────────────────────────────────────────────────────────────────
function StoryCard({ story, t, isMobile }) {
  const [reactions, setReactions] = useState({ heart:story.hearts, flame:story.flames, like:story.likes })
  const [active, setActive]       = useState({ heart:false, flame:false, like:false })
  const [expanded, setExpanded]   = useState(false)
  const PREVIEW = 320

  const toggle = (type) => {
    setActive(p => {
      const next = { ...p, [type]:!p[type] }
      setReactions(r => ({ ...r, [type]:r[type]+(next[type]?1:-1) }))
      return next
    })
  }

  const bodyDisplay = story.body.length > PREVIEW && !expanded
    ? story.body.slice(0, PREVIEW).trimEnd() + '…'
    : story.body

  // Text color: always high contrast — white in dark mode, navy in light
  const textColor = t.isDark ? '#fff' : '#1B2A4A'

  return (
    <div style={{ borderBottom:`1px solid ${t.borderLight}`, paddingBottom:'40px', marginBottom:'40px' }}>
      {/* Author */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'18px' }}>
        <div style={{ width:42, height:42, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', color:'#C9A84C', letterSpacing:'1px' }}>{story.initials}</span>
        </div>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:t.text, letterSpacing:'0.5px' }}>{story.author_name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
            {story.created_at}{story.race_name ? ` · ${story.race_name}${story.race_distance?` (${story.race_distance})`:'' }` : ''}
          </div>
        </div>
      </div>

      {/* Title */}
      <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:isMobile?'24px':'34px', color:t.text, letterSpacing:'1px', lineHeight:1.2, margin:'0 0 18px' }}>
        {story.title}
      </h2>

      {/* Strava */}
      {story.strava_activity && <StravaCard activity={story.strava_activity} t={t} />}

      {/* Body — always high contrast */}
      <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:isMobile?'14px':'16px', color:textColor, lineHeight:1.85, marginBottom:'10px', whiteSpace:'pre-line' }}>
        {bodyDisplay}
      </div>
      {story.body.length > PREVIEW && (
        <button onClick={()=>setExpanded(p=>!p)}
          style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', cursor:'pointer', padding:'0 0 16px', textTransform:'uppercase' }}>
          {expanded?'Show less':'Read more →'}
        </button>
      )}

      {/* Race tag */}
      {story.race_name && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:t.isDark?'rgba(201,168,76,0.08)':'rgba(201,168,76,0.1)', border:`1px solid ${t.isDark?'rgba(201,168,76,0.2)':'rgba(201,168,76,0.3)'}`, borderRadius:'20px', padding:'4px 12px', marginBottom:'18px' }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#C9A84C', fontWeight:600 }}>
            {story.race_name}{story.race_date ? ` · ${story.race_date}` : ''}
          </span>
        </div>
      )}

      {/* Reactions */}
      <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
        <ReactionBtn type="heart" count={reactions.heart} active={active.heart} onClick={()=>toggle('heart')} t={t} />
        <ReactionBtn type="flame" count={reactions.flame} active={active.flame} onClick={()=>toggle('flame')} t={t} />
        <ReactionBtn type="like"  count={reactions.like}  active={active.like}  onClick={()=>toggle('like')}  t={t} />
        <span style={{ marginLeft:'auto', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{story.read_mins} min read</span>
      </div>
    </div>
  )
}

// ── Attachment Panel ──────────────────────────────────────────────────────────
function AttachmentPanel({ type, onClose, t, passportRaces }) {
  const [photoMode, setPhotoMode]         = useState('upload') // 'upload' | 'passport'
  const [selectedRace, setSelectedRace]   = useState(null)
  const [raceFields, setRaceFields]       = useState({ name:true, date:true, distance:true, time:true })
  const [passportOption, setPassportOption] = useState('link') // 'link' | 'stamps' | 'stats' | 'pr'
  const [stravaView, setStravaView]       = useState('overview') // 'overview' | 'swim' | 'bike' | 'run'

  const panelBg = t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(27,42,74,0.03)'
  const panelBorder = t.border

  if (type === 'photo') return (
    <div style={{ background:panelBg, border:`1px solid ${panelBorder}`, borderRadius:'12px', padding:'16px', marginTop:'8px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Add Photo</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'16px', lineHeight:1 }}>✕</button>
      </div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
        {['upload','passport'].map(m => (
          <button key={m} onClick={()=>setPhotoMode(m)}
            style={{ flex:1, padding:'8px', border:`1.5px solid ${photoMode===m?'#1B2A4A':panelBorder}`, borderRadius:'8px', background:photoMode===m?'#1B2A4A':'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'0.5px', color:photoMode===m?'#fff':t.textMuted, cursor:'pointer', textTransform:'capitalize', transition:'all 0.15s' }}>
            {m==='upload'?'Upload New':'From Passport'}
          </button>
        ))}
      </div>
      {photoMode==='upload' ? (
        <div style={{ border:`2px dashed ${panelBorder}`, borderRadius:'10px', padding:'28px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A84C'}
          onMouseLeave={e=>e.currentTarget.style.borderColor=panelBorder}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="1.5" style={{ margin:'0 auto 8px', display:'block' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text, marginBottom:'4px' }}>Click to upload or drag & drop</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>JPG, PNG or HEIC · Max 10MB</div>
        </div>
      ) : (
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginBottom:'10px' }}>Pick a race photo from your Passport library</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'6px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ aspectRatio:'1', borderRadius:'6px', background:t.isDark?'rgba(255,255,255,0.06)':'rgba(27,42,74,0.08)', cursor:'pointer', border:`2px solid transparent`, transition:'border-color 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A84C'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'} />
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (type === 'race') return (
    <div style={{ background:panelBg, border:`1px solid ${panelBorder}`, borderRadius:'12px', padding:'16px', marginTop:'8px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Link a Race Page</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'16px', lineHeight:1 }}>✕</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px' }}>
        {(passportRaces.length > 0 ? passportRaces : [
          { id:'r1', name:'IRONMAN 70.3 Eagleman', distance:'70.3', date:'Jun 2025' },
          { id:'r2', name:'Austin Half Marathon', distance:'13.1', date:'Feb 2025' },
          { id:'r3', name:'Marine Corps Marathon', distance:'26.2', date:'Oct 2023' },
        ]).map(race => (
          <div key={race.id} onClick={()=>setSelectedRace(race.id)}
            style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'8px', border:`1.5px solid ${selectedRace===race.id?'#1B2A4A':panelBorder}`, background:selectedRace===race.id?'rgba(27,42,74,0.06)':'none', cursor:'pointer', transition:'all 0.15s' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', border:`2px solid ${selectedRace===race.id?'#1B2A4A':t.textMuted}`, background:selectedRace===race.id?'#1B2A4A':'none', flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{race.distance}{race.date?` · ${race.date}`:''}</div>
            </div>
          </div>
        ))}
      </div>
      {selectedRace && (
        <>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>Show these fields</div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {Object.entries(raceFields).map(([key, on]) => (
              <button key={key} onClick={()=>setRaceFields(p=>({...p,[key]:!p[key]}))}
                style={{ padding:'5px 12px', borderRadius:'20px', border:`1.5px solid ${on?'#1B2A4A':panelBorder}`, background:on?'#1B2A4A':'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:on?'#fff':t.textMuted, cursor:'pointer', textTransform:'capitalize', transition:'all 0.15s' }}>
                {key}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  if (type === 'passport') return (
    <div style={{ background:panelBg, border:`1px solid ${panelBorder}`, borderRadius:'12px', padding:'16px', marginTop:'8px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>My Passport</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'16px', lineHeight:1 }}>✕</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        {[
          { key:'link',   label:'Link to My Passport',       desc:'Readers can tap to view your full public passport' },
          { key:'stamps', label:'Show My Stamps',            desc:'Display a row of your race stamps with this post' },
          { key:'stats',  label:'Show My Stats',             desc:'Total races, miles, and top PRs' },
          { key:'pr',     label:'Show a Specific PR',        desc:'Highlight one personal record relevant to this story' },
        ].map(opt => (
          <div key={opt.key} onClick={()=>setPassportOption(opt.key)}
            style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 12px', borderRadius:'8px', border:`1.5px solid ${passportOption===opt.key?'#1B2A4A':panelBorder}`, background:passportOption===opt.key?'rgba(27,42,74,0.06)':'none', cursor:'pointer', transition:'all 0.15s' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', border:`2px solid ${passportOption===opt.key?'#1B2A4A':t.textMuted}`, background:passportOption===opt.key?'#1B2A4A':'none', flexShrink:0, marginTop:3 }} />
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text }}>{opt.label}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>{opt.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (type === 'strava') return (
    <div style={{ background:panelBg, border:`1px solid ${panelBorder}`, borderRadius:'12px', padding:'16px', marginTop:'8px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase' }}>Strava Activity</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'16px', lineHeight:1 }}>✕</button>
      </div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted, marginBottom:'10px' }}>Choose what to show with your story</div>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {[
          { key:'overview', label:'Overview' },
          { key:'map',      label:'Route Map' },
          { key:'splits',   label:'Splits' },
          { key:'heartrate',label:'Heart Rate' },
          { key:'photos',   label:'Activity Photos' },
        ].map(v => (
          <button key={v.key} onClick={()=>setStravaView(v.key)}
            style={{ padding:'6px 14px', borderRadius:'20px', border:`1.5px solid ${stravaView===v.key?'#FC4C02':panelBorder}`, background:stravaView===v.key?'rgba(252,76,2,0.1)':'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:stravaView===v.key?'#FC4C02':t.textMuted, cursor:'pointer', transition:'all 0.15s' }}>
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )

  return null
}

// ── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal({ onClose, t, isMobile, passportRaces }) {
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [isAnon, setIsAnon]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activePanel, setActivePanel] = useState(null) // 'photo' | 'race' | 'passport' | 'strava'
  const [linkedRace, setLinkedRace]   = useState('')

  const inp = (extra={}) => ({
    width:'100%', padding:'12px 14px', borderRadius:'10px',
    border:`1.5px solid ${t.border}`, background:t.isDark?'rgba(255,255,255,0.04)':'#fafbfc',
    color:t.text, fontFamily:"'Barlow',sans-serif", outline:'none',
    boxSizing:'border-box', transition:'border-color 0.15s', fontSize:'14px', ...extra
  })

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1800))
    setSubmitting(false)
    setSubmitted(true)
  }

  const ATTACH = [
    { key:'photo',   label:'Photo',          icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> },
    { key:'race',    label:'Race Page',       icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="6.5"/><circle cx="10" cy="10" r="2.5"/></svg> },
    { key:'passport',label:'My Passport',     icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg> },
    { key:'strava',  label:'Strava Activity', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg> },
  ]

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:300, display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding:isMobile?0:'24px' }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:t.surface, borderRadius:isMobile?'20px 20px 0 0':'20px', padding:isMobile?'24px 20px 48px':'36px', width:'100%', maxWidth:'560px', maxHeight:isMobile?'92vh':'90vh', overflowY:'auto', boxShadow:'0 -8px 48px rgba(0,0,0,0.25)' }}>

        {isMobile && <div style={{ width:36, height:4, borderRadius:2, background:t.border, margin:'0 auto 24px' }} />}

        {submitted ? (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(201,168,76,0.1)', border:'1.5px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'30px', color:t.text, letterSpacing:'1px', marginBottom:'8px' }}>Story Submitted</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'28px', lineHeight:1.7 }}>Pacer reviewed your story and it's been added to The Wall. Thank you for sharing your why.</div>
            <button onClick={onClose} style={{ padding:'13px 36px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'30px', color:t.text, letterSpacing:'1px', marginBottom:'4px' }}>Share Your Story</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'24px', lineHeight:1.5 }}>What's your why? What keeps you going when everything says stop?</div>

            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'6px' }}>Title <span style={{ color:'#C9A84C' }}>*</span></label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What's your why?" style={inp()} onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=t.border} />
            </div>

            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'6px' }}>Your Story <span style={{ color:'#C9A84C' }}>*</span></label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Tell your story. Who or what keeps you going?" rows={6}
                style={{ ...inp(), resize:'vertical', lineHeight:1.7 }}
                onFocus={e=>e.target.style.borderColor='#C9A84C'} onBlur={e=>e.target.style.borderColor=t.border} />
            </div>

            {/* Attach section */}
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>
                Attach <span style={{ fontWeight:400, letterSpacing:0, textTransform:'none' }}>(optional)</span>
              </label>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom: activePanel ? '0' : '0' }}>
                {ATTACH.map(a => (
                  <button key={a.key} onClick={()=>setActivePanel(activePanel===a.key?null:a.key)}
                    style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 12px', border:`1.5px solid ${activePanel===a.key?'#1B2A4A':t.border}`, borderRadius:'20px', background:activePanel===a.key?'rgba(27,42,74,0.08)':'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'0.5px', color:activePanel===a.key?t.text:t.textMuted, cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e=>{ if(activePanel!==a.key){ e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.color='#C9A84C' }}}
                    onMouseLeave={e=>{ if(activePanel!==a.key){ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.color=t.textMuted }}}>
                    {a.icon}{a.label}
                  </button>
                ))}
              </div>
              {activePanel && (
                <AttachmentPanel type={activePanel} onClose={()=>setActivePanel(null)} t={t} passportRaces={passportRaces} />
              )}
            </div>

            {/* Link a Race — dropdown */}
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'6px' }}>
                Link a Race <span style={{ fontWeight:400, letterSpacing:0, textTransform:'none' }}>(optional)</span>
              </label>
              <select value={linkedRace} onChange={e=>setLinkedRace(e.target.value)}
                style={{ ...inp(), cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239aa5b4' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center', paddingRight:'36px' }}>
                <option value=''>Select a race from your Passport…</option>
                {(passportRaces.length > 0 ? passportRaces : [
                  { id:'r1', name:'IRONMAN 70.3 Eagleman', distance:'70.3', date:'Jun 2025' },
                  { id:'r2', name:'Austin Half Marathon', distance:'13.1', date:'Feb 2025' },
                  { id:'r3', name:'Marine Corps Marathon', distance:'26.2', date:'Oct 2023' },
                  { id:'r4', name:'Turkey Trot 5K', distance:'5K', date:'Nov 2024' },
                  { id:'r5', name:'LA Marathon', distance:'26.2', date:'Mar 2023' },
                ]).map(r => (
                  <option key={r.id} value={r.id}>{r.name} · {r.distance}{r.date?` · ${r.date}`:''}</option>
                ))}
              </select>
            </div>

            {/* Anonymous toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', padding:'12px 14px', background:t.isDark?'rgba(255,255,255,0.03)':'rgba(27,42,74,0.03)', borderRadius:'10px', border:`1px solid ${t.borderLight}` }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text }}>Post Anonymously</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>Your name won't appear on this story</div>
              </div>
              <button onClick={()=>setIsAnon(p=>!p)}
                style={{ width:42, height:24, borderRadius:'12px', border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s', background:isAnon?'#C9A84C':t.border, padding:0, flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:isAnon?'calc(100% - 21px)':'3px', width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
              </button>
            </div>

            {/* Pacer note */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'24px', padding:'10px 12px', background:t.isDark?'rgba(201,168,76,0.06)':'rgba(201,168,76,0.07)', borderRadius:'8px', border:`1px solid ${t.isDark?'rgba(201,168,76,0.15)':'rgba(201,168,76,0.2)'}` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginTop:2, flexShrink:0 }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.isDark?'rgba(201,168,76,0.8)':'#8a6d1e', lineHeight:1.5 }}>Pacer will review your story before it goes live on The Wall.</span>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={onClose} style={{ flex:1, padding:'13px', border:`1.5px solid ${t.border}`, borderRadius:'10px', background:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!title.trim()||!body.trim()||submitting}
                style={{ flex:2, padding:'13px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#fff', cursor:'pointer', textTransform:'uppercase', opacity:(!title.trim()||!body.trim())?0.5:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'background 0.2s' }}
                onMouseEnter={e=>{ if(title.trim()&&body.trim()) e.currentTarget.style.background='#C9A84C' }}
                onMouseLeave={e=>e.currentTarget.style.background='#1B2A4A'}>
                {submitting
                  ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Pacer Reviewing…</>
                  : 'Share Your Story →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Wall() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()
  const { t, isDark, toggleTheme } = useTheme()
  const isMobile  = useIsMobile()
  const [profile, setProfile]             = useState(null)
  const [passportRaces, setPassportRaces] = useState([])
  const [showDropdown, setShowDropdown]   = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const [activeTab, setActiveTab]         = useState('all')
  const dropdownRef = useRef(null)

  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'The Wall', path:'/wall',     icon:<WallIcon /> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:'/profile',  icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
    : 'RG'

  const handleSignOut = () => navigate('/login')

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-wall-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      @keyframes slideDown { from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);} }
      .rp-nav-tab { display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 24px;height:64px;justify-content:center;cursor:pointer;border:none;background:none;transition:color 0.15s;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid transparent;white-space:nowrap; }
      .rp-dropdown-item { display:block;width:100%;padding:10px 18px;background:none;border:none;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;transition:background 0.1s; }
      div::-webkit-scrollbar { display:none; }
      select option { background: #1B2A4A; color: #fff; }
    `
    if (!document.getElementById('rp-wall-styles')) document.head.appendChild(style)

    if (user) {
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
      supabase.from('passport_races').select('id,name,distance,date').eq('user_id', user.id).order('date_sort', { ascending:false })
        .then(({ data }) => { if (data) setPassportRaces(data) })
    }

    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.getElementById('rp-wall-styles')?.remove()
      document.removeEventListener('mousedown', handleClick)
    }
  }, [user])

  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s', overflowX:'hidden' }}>

      {/* ── MOBILE NAV ── */}
      {isMobile ? (
        <>
          <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <img src={isDark?'/icon-dark-1024.png':'/icon-light-1024.png'} alt="Race Passport"
                  style={{ width:36, height:36, borderRadius:'10px', objectFit:'cover', flexShrink:0 }} />
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'2.5px', color:t.text }}>RACE PASSPORT</div>
              </div>
              <button onClick={()=>{ setShowMobileMenu(!showMobileMenu); setShowDropdown(false) }}
                style={{ width:40, height:40, borderRadius:'8px', background:'transparent', border:`1.5px solid ${t.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px', cursor:'pointer', padding:'8px', flexShrink:0 }}>
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', transition:'all 0.2s', transform:showMobileMenu?'rotate(45deg) translateY(7px)':'none' }} />
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', opacity:showMobileMenu?0:1, transition:'opacity 0.15s' }} />
                <div style={{ width:18, height:2, background:t.text, borderRadius:'1px', transition:'all 0.2s', transform:showMobileMenu?'rotate(-45deg) translateY(-7px)':'none' }} />
              </button>
            </div>
            {showMobileMenu && (
              <div style={{ borderTop:`1px solid ${t.border}`, animation:'slideDown 0.2s ease' }}>
                {NAV_TABS.map(tab => (
                  <button key={tab.path}
                    style={{ width:'100%', padding:'16px 20px', background:location.pathname===tab.path?t.surfaceAlt:'transparent', border:'none', borderLeft:location.pathname===tab.path?`3px solid #C9A84C`:'3px solid transparent', display:'flex', alignItems:'center', gap:'12px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, letterSpacing:'1px', color:location.pathname===tab.path?t.text:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}
                    onClick={()=>{ navigate(tab.path); setShowMobileMenu(false) }}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderTop:`1px solid ${t.navBorder}`, display:'flex', alignItems:'center', justifyContent:'space-around', height:64 }}>
            {NAV_TABS.map(tab => (
              <button key={tab.path} className="rp-nav-tab"
                style={{ color:location.pathname===tab.path?'#C9A84C':t.textMuted, borderBottom:'none', flex:1, height:64 }}
                onClick={()=>navigate(tab.path)}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* ── DESKTOP NAV ── */
        <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, transition:'background 0.25s, border-color 0.25s' }}>
          <div style={{ width:'100%', padding:'0 40px', display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:t.text, transition:'color 0.25s' }}>RACE PASSPORT</span>
            </div>
            <div style={{ display:'flex', alignItems:'stretch' }}>
              {NAV_TABS.map(tab => (
                <button key={tab.path} className="rp-nav-tab"
                  style={{ color:location.pathname===tab.path?t.text:t.textMuted, borderBottomColor:location.pathname===tab.path?'#C9A84C':'transparent' }}
                  onClick={()=>navigate(tab.path)}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div ref={dropdownRef} style={{ position:'relative' }}>
                <div onClick={()=>setShowDropdown(!showDropdown)}
                  style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A84C'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=t.border}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C', letterSpacing:'1px' }}>{initials}</span>
                </div>
                {showDropdown && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'200px', overflow:'hidden', zIndex:100, transition:'background 0.25s' }}>
                    <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{profile?.full_name||'Ryan Groene'}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>racepassportapp.com</div>
                    </div>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={()=>{ navigate('/passport'); setShowDropdown(false) }} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>My Passport</button>
                    <button className="rp-dropdown-item" style={{ color:t.text }} onClick={()=>{ navigate('/profile'); setShowDropdown(false) }} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Settings</button>
                    <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text }}>Dark Mode</span>
                      <button onClick={toggleTheme} style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s', background:isDark?'#C9A84C':'#d0d7e0', padding:0, flexShrink:0 }}>
                        <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s' }} />
                      </button>
                    </div>
                    <div style={{ height:'1px', background:t.borderLight }} />
                    <button className="rp-dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut} onMouseEnter={e=>e.currentTarget.style.background=t.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Log Out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO — full width, matches Home greeting ── */}
      {!isMobile && (
        <div style={{ position:'relative', zIndex:10, background:t.greetingBg, backdropFilter:'blur(2px)', borderBottom:`3px solid #C9A84C`, padding:'40px 40px 36px', transition:'background 0.25s' }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'32px' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(48px,6vw,80px)', color:t.text, letterSpacing:'2px', lineHeight:1, marginBottom:'10px', transition:'color 0.25s' }}>THE WALL</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(18px,2vw,26px)', color:t.textMuted, letterSpacing:'1.5px', lineHeight:1.4, transition:'color 0.25s' }}>
                That moment when your body says stop
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(18px,2vw,26px)', color:t.textMuted, letterSpacing:'1.5px', lineHeight:1.4, transition:'color 0.25s' }}>
                and everything in you wants to quit.
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(18px,2vw,26px)', color:t.textMuted, letterSpacing:'1.5px', lineHeight:1.4, marginTop:'6px', transition:'color 0.25s' }}>
                It's not a finish line. It's a test of why you started.{' '}
                <span style={{ color:'#C9A84C' }}>What's your why?</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <div style={{ padding:'28px 20px 0', background:t.greetingBg, borderBottom:`3px solid #C9A84C` }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'52px', color:t.text, letterSpacing:'2px', lineHeight:1, marginBottom:'8px' }}>THE WALL</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.textMuted, letterSpacing:'1px', lineHeight:1.5, marginBottom:'20px' }}>
            It's not a finish line. It's a test of why you started.{' '}
            <span style={{ color:'#C9A84C' }}>What's your why?</span>
          </div>
        </div>
      )}

      {/* ── TABS + SHARE BUTTON ── */}
      <div style={{ background:t.isDark?'rgba(27,42,74,0.25)':'rgba(27,42,74,0.04)', borderBottom:`1px solid ${t.borderLight}`, padding:'0 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex' }}>
          {['all','featured'].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'17px', letterSpacing:'2px', color:activeTab===tab?t.text:t.textMuted, padding:'18px 28px', background:'none', border:'none', borderBottom:activeTab===tab?'3px solid #C9A84C':'3px solid transparent', cursor:'pointer', transition:'all 0.15s' }}>
              {tab==='all'?'All Stories':'Featured'}
            </button>
          ))}
        </div>
        {/* Share button lives here — right-aligned in the tab bar, tidy and purposeful */}
        <button onClick={()=>setShowModal(true)}
          style={{ padding:'9px 20px', border:`1.5px solid #1B2A4A`, borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Bebas Neue',sans-serif", fontSize:'15px', letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', transition:'background 0.2s', whiteSpace:'nowrap' }}
          onMouseEnter={e=>{ e.currentTarget.style.background='#C9A84C'; e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.color='#fff' }}
          onMouseLeave={e=>{ e.currentTarget.style.background='#1B2A4A'; e.currentTarget.style.borderColor='#1B2A4A'; e.currentTarget.style.color='#C9A84C' }}>
          Share Your Story
        </button>
      </div>

      {/* ── FEED ── */}
      <div style={{ width:'100%', padding:isMobile?'32px 20px 100px':'40px 40px 80px', animation:'fadeIn 0.4s ease both' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
          {[RYAN_STORY].map(story => (
            <StoryCard key={story.id} story={story} t={t} isMobile={isMobile} />
          ))}
        </div>
      </div>

      {showModal && <ShareModal onClose={()=>setShowModal(false)} t={t} isMobile={isMobile} passportRaces={passportRaces} />}
    </div>
  )
}
