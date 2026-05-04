import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'
import { loadRacePhoto, PHOTO_PLACEHOLDER } from '../lib/photos'
import { useStrava } from '../lib/useStrava'

const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
const DISTANCES = ['5K','10K','10 mi','13.1','26.2','50K','70.3','140.6','Ultra','Other']

// ── Inject styles ─────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('rp-ri-styles')) return
  const style = document.createElement('style')
  style.id = 'rp-ri-styles'
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
    @keyframes tickerScroll { from{transform:translateX(0);}to{transform:translateX(-50%);} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);} }
    @keyframes pulse { 0%,100%{opacity:0.3;}50%{opacity:1;} }
    @keyframes spin { to{transform:rotate(360deg);} }
    @keyframes shimmer { 0%{background-position:-200% 0;}100%{background-position:200% 0;} }
    .source-tab { padding:8px 18px; border-radius:20px; border:1.5px solid #e2e6ed; background:#fff; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; color:#9aa5b4; }
    .source-tab.active { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
    .import-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
    .import-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(27,42,74,0.12); }
    div::-webkit-scrollbar { display:none; }
  `
  document.head.appendChild(style)
}

// ── Ticker background ─────────────────────────────────────────────────────────
function TickerBg() {
  return (
    <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
      <div style={{ display:'inline-flex', animation:'tickerScroll 60s linear infinite' }}>
        {TICKER.map((d,i) => (
          <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.04)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>
        ))}
      </div>
    </div>
  )
}

// ── Confidence Badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ score, source }) {
  if (source === 'RUNSIGNUP') return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:'10px' }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:'#16a34a' }} />
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#16a34a', textTransform:'uppercase' }}>Registered</span>
    </div>
  )
  if (source === 'STRAVA') return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', background:'rgba(252,76,2,0.08)', border:'1px solid rgba(252,76,2,0.2)', borderRadius:'10px' }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:'#FC4C02' }} />
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#FC4C02', textTransform:'uppercase' }}>Strava</span>
    </div>
  )
  const labels = {
    3: { text:'Strong match',   color:'#16a34a', bg:'rgba(22,163,74,0.08)',   border:'rgba(22,163,74,0.2)'   },
    2: { text:'Likely match',   color:'#C9A84C', bg:'rgba(201,168,76,0.08)', border:'rgba(201,168,76,0.2)' },
    1: { text:'Possible match', color:'#9aa5b4', bg:'rgba(154,165,180,0.08)', border:'rgba(154,165,180,0.2)' },
  }
  const l = labels[score] || labels[1]
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', background:l.bg, border:`1px solid ${l.border}`, borderRadius:'10px' }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:l.color }} />
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:l.color, textTransform:'uppercase' }}>{l.text}</span>
    </div>
  )
}

// ── Race Card ─────────────────────────────────────────────────────────────────
function RaceCard({ race, selected, onToggle, onNotMine }) {
  const [hovered, setHovered] = useState(false)
  const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const colors = getDistanceColor(race.distance)
  const cleaned = (race.distance||'').replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 8 : cleaned.length > 2 ? 11 : 14

  useEffect(() => {
    loadRacePhoto(race).then(url => { if (url) { setPhoto(url); setPhotoLoaded(true) } })
  }, [race.id])

  return (
    <div
      className="import-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onToggle(race.id)}
      style={{ borderRadius:'12px', overflow:'hidden', border:selected?`2.5px solid #1B2A4A`:'1.5px solid #e2e6ed', background:'#fff', position:'relative', cursor:'pointer' }}>
      {/* Source badge */}
      <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(0,0,0,0.55)', borderRadius:'4px', padding:'3px 7px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', textTransform:'uppercase' }}>{race.source}</div>
      {/* Checkbox */}
      <div style={{ position:'absolute', top:10, right:10, zIndex:10, width:26, height:26, borderRadius:'50%', background:selected?'#1B2A4A':'rgba(255,255,255,0.9)', border:selected?'2px solid #1B2A4A':'2px solid rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
        {selected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      {/* Image */}
      <div style={{ position:'relative', height:140, background:'#1B2A4A', overflow:'hidden' }}>
        <img src={photo} alt={race.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s, opacity 0.4s', transform:hovered?'scale(1.06)':'scale(1)', opacity:photoLoaded?1:0 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.45))' }} />
        {/* Hover overlay */}
        <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity:hovered?1:0, transition:'opacity 0.2s', zIndex:5 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'8px' }}>Finish Time</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'36px', color:'#C9A84C', letterSpacing:'2px', lineHeight:1 }}>{race.time || '—'}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.5)', marginTop:'8px', textTransform:'uppercase' }}>{race.distance}</div>
        </div>
        {/* Stamp mini */}
        <div style={{ position:'absolute', bottom:10, left:10, opacity:hovered?0:1, transition:'opacity 0.2s' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', border:'2px solid #1B2A4A', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:'0.75px dashed rgba(27,42,74,0.6)' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:'#fff', position:'relative', zIndex:1 }}>{cleaned}</span>
          </div>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding:'10px 12px', borderTop:'2px solid rgba(27,42,74,0.08)' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{race.name}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#6b7a8d', marginBottom:'8px' }}>{race.location}{race.date ? ` · ${race.date}` : ''}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <ConfidenceBadge score={race.confidence} source={race.source} />
          <button onClick={e => { e.stopPropagation(); onNotMine(race) }}
            style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:'6px' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(197,48,48,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="#c53030" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#c53030', textTransform:'uppercase' }}>Not mine</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pacer Manual Entry Modal ──────────────────────────────────────────────────
function PacerManualModal({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [distance, setDist] = useState('')
  const [time, setTime] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [enriched, setEnriched] = useState(null)
  const [error, setError] = useState('')

  const inp = {
    width:'100%', padding:'13px 15px', borderRadius:'10px', border:'1.5px solid #e2e6ed',
    background:'#fafbfc', color:'#1B2A4A', fontSize:'15px', fontFamily:"'Barlow',sans-serif",
    outline:'none', boxSizing:'border-box', transition:'border-color 0.15s'
  }

  const handlePacerLookup = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    setEnriched(null)
    try {
      const prompt = `You are a race data assistant. The user entered: Race name: "${name.trim()}"${distance ? `, Distance: ${distance}` : ''}${year ? `, Year: ${year}` : ''}.

Look up this race and return ONLY a JSON object (no markdown, no explanation) with these exact fields:
{
  "name": "full official race name",
  "date": "Month YYYY format e.g. Oct 2024",
  "date_sort": "YYYY-MM-DD format of race date, use 01 for day if unknown",
  "location": "City, State",
  "city": "city name",
  "state": "2-letter state code",
  "distance": "normalized distance: 5K or 10K or 10 mi or 13.1 or 26.2 or 50K or 70.3 or 140.6 or Ultra or Other",
  "confidence": 3
}

If you cannot identify the specific race, still return your best guess with "confidence": 2. Never return an error — always return valid JSON.`

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await resp.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      // Override distance if user selected one
      if (distance) parsed.distance = distance
      if (time) parsed.time = time
      setEnriched(parsed)
    } catch(e) {
      setError('Could not look up race. Fill in details manually.')
    }
    setLoading(false)
  }

  const handleAdd = () => {
    if (!name.trim() || !distance) return
    const base = enriched || {}
    onAdd({
      id: `manual_${Date.now()}`,
      name: base.name || name.trim(),
      date: base.date || (year ? `${year}` : ''),
      date_sort: base.date_sort || null,
      location: base.location || '',
      city: base.city || '',
      state: base.state || '',
      distance: distance || base.distance || 'Other',
      time: time.trim() || '',
      source: 'MANUAL',
      confidence: base.confidence || 3,
    })
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 24px 48px', width:'100%', maxWidth:'560px', boxShadow:'0 -8px 40px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'#e2e6ed', margin:'0 auto 20px' }} />

        {/* Pacer header */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
          <div style={{ width:32, height:32, borderRadius:'8px', background:'linear-gradient(135deg,#1B2A4A,#2d4a7a)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:'16px' }}>⚡</span>
          </div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px', lineHeight:1 }}>Add a Race</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#C9A84C', letterSpacing:'1px' }}>PACER WILL FILL IN THE DETAILS</div>
          </div>
        </div>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'13px', color:'#9aa5b4', marginBottom:'20px', lineHeight:1.5 }}>
          Enter a race name and Pacer will look up the date, location, and distance automatically.
        </p>

        {/* Race name + lookup */}
        <div style={{ marginBottom:'14px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Race Name <span style={{ color:'#C9A84C' }}>*</span></label>
          <div style={{ display:'flex', gap:'8px' }}>
            <input value={name} onChange={e => { setName(e.target.value); setEnriched(null) }}
              placeholder="e.g. Cherry Blossom 10 Miler 2024"
              style={{ ...inp, flex:1 }}
              onFocus={e => e.target.style.borderColor='#C9A84C'}
              onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            <button onClick={handlePacerLookup} disabled={!name.trim() || loading}
              style={{ padding:'0 16px', border:'none', borderRadius:'10px', background:loading?'#e2e6ed':'#C9A84C', color:loading?'#9aa5b4':'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', cursor:(!name.trim()||loading)?'not-allowed':'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
              {loading ? '...' : '⚡ Look Up'}
            </button>
          </div>
        </div>

        {/* Pacer enrichment result */}
        {enriched && (
          <div style={{ background:'rgba(201,168,76,0.06)', border:'1.5px solid rgba(201,168,76,0.25)', borderRadius:'10px', padding:'12px 14px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
              <span style={{ fontSize:'12px' }}>⚡</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>Pacer Found It</span>
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', marginBottom:'3px' }}>{enriched.name}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#6b7a8d' }}>
              {[enriched.location, enriched.date, enriched.distance].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background:'rgba(197,48,48,0.06)', border:'1px solid rgba(197,48,48,0.2)', borderRadius:'8px', padding:'10px 12px', marginBottom:'14px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#c53030' }}>
            {error}
          </div>
        )}

        {/* Distance */}
        <div style={{ marginBottom:'14px' }}>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Distance <span style={{ color:'#C9A84C' }}>*</span></label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
            {DISTANCES.map(d => (
              <button key={d} onClick={() => setDist(d)}
                style={{ padding:'7px 12px', borderRadius:'8px', border:`1.5px solid ${distance===d?'#1B2A4A':'#e2e6ed'}`, background:distance===d?'#1B2A4A':'#fafbfc', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:distance===d?'#fff':'#9aa5b4', cursor:'pointer' }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Year + Time row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'24px' }}>
          <div>
            <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Year <span style={{ fontWeight:400, color:'#b0b8c4' }}>(optional)</span></label>
            <input value={year} onChange={e => setYear(e.target.value)} placeholder="2024" style={inp}
              onFocus={e => e.target.style.borderColor='#C9A84C'}
              onBlur={e => e.target.style.borderColor='#e2e6ed'} />
          </div>
          <div>
            <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'6px' }}>Finish Time <span style={{ fontWeight:400, color:'#b0b8c4' }}>(optional)</span></label>
            <input value={time} onChange={e => setTime(e.target.value)} placeholder="1:57:40" style={inp}
              onFocus={e => e.target.style.borderColor='#C9A84C'}
              onBlur={e => e.target.style.borderColor='#e2e6ed'} />
          </div>
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'13px', border:'1.5px solid #e2e6ed', borderRadius:'12px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>Cancel</button>
          <button onClick={handleAdd}
            disabled={!name.trim() || !distance}
            style={{ flex:2, padding:'13px', border:'none', borderRadius:'12px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#fff', cursor:(!name.trim()||!distance)?'not-allowed':'pointer', textTransform:'uppercase', opacity:(!name.trim()||!distance)?0.5:1 }}
            onMouseEnter={e => { if(name.trim()&&distance) e.currentTarget.style.background='#C9A84C' }}
            onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
            Add to My List →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Not Mine Modal ────────────────────────────────────────────────────────────
function NotMineModal({ race, onConfirm, onCancel }) {
  const colors = getDistanceColor(race.distance)
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 24px 48px', width:'100%', maxWidth:'560px', boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'#e2e6ed', margin:'0 auto 20px' }} />
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#1B2A4A', marginBottom:'4px' }}>Not Your Race?</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#9aa5b4', marginBottom:'16px' }}>This will be removed from your list.</div>
        <div style={{ background:'#f8f9fb', border:`1.5px solid ${colors.stampBorder}`, borderLeft:`4px solid ${colors.stampBorder}`, borderRadius:'10px', padding:'14px 16px', marginBottom:'20px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', marginBottom:'3px' }}>{race.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4' }}>{race.location}{race.date ? ` · ${race.date}` : ''}</div>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onCancel} style={{ flex:1, padding:'14px', border:'1.5px solid #e2e6ed', borderRadius:'12px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>Keep It</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'14px', border:'none', borderRadius:'12px', background:'rgba(197,48,48,0.9)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#fff', cursor:'pointer', textTransform:'uppercase' }}>Yes, Remove It</button>
        </div>
      </div>
    </div>
  )
}

// ── Undo Toast ────────────────────────────────────────────────────────────────
function UndoToast({ raceName, onUndo, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 5000); return () => clearTimeout(t) }, [])
  return (
    <div style={{ position:'fixed', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:400, background:'#1B2A4A', borderRadius:'12px', padding:'14px 20px', display:'flex', alignItems:'center', gap:'16px', boxShadow:'0 8px 32px rgba(0,0,0,0.25)', whiteSpace:'nowrap' }}>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>
        Removed <strong style={{ color:'#fff' }}>{raceName.length > 24 ? raceName.slice(0,24)+'...' : raceName}</strong>
      </span>
      <button onClick={onUndo} style={{ padding:'5px 14px', border:'1.5px solid rgba(201,168,76,0.5)', borderRadius:'6px', background:'rgba(201,168,76,0.1)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>Undo</button>
    </div>
  )
}

// ── Source Connect Card (on search screen) ────────────────────────────────────
function SourceCard({ icon, title, subtitle, badge, buttonLabel, buttonColor, buttonTextColor, onClick, connected, connectedLabel, delay }) {
  return (
    <div className="import-card"
      style={{ background:'#fff', borderRadius:'16px', border:'1.5px solid #e2e6ed', padding:'20px', display:'flex', flexDirection:'column', gap:'14px', animation:`fadeInUp 0.5s ease ${delay}s both` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
        <div style={{ width:48, height:48, borderRadius:'12px', background:'#f4f6f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#1B2A4A', letterSpacing:'0.5px' }}>{title}</div>
            {badge && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'4px', padding:'2px 6px', textTransform:'uppercase' }}>{badge}</span>}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#6b7a8d', lineHeight:1.4 }}>{subtitle}</div>
        </div>
      </div>
      {connected ? (
        <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 14px', borderRadius:'10px', background:'rgba(22,163,74,0.06)', border:'1px solid rgba(22,163,74,0.2)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, color:'#16a34a', textTransform:'uppercase', letterSpacing:'1px' }}>{connectedLabel || 'Connected'}</span>
        </div>
      ) : (
        <button onClick={onClick}
          style={{ width:'100%', padding:'12px', border:'none', borderRadius:'10px', background:buttonColor||'#1B2A4A', color:buttonTextColor||'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity='1'}>
          {buttonLabel}
        </button>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RaceImport() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const { user } = useAuth()

  const [step, setStep] = useState('connect') // 'connect' | 'loading' | 'review'
  const [profile, setProfile] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loadingStatus, setLoadingStatus] = useState('')
  const [loadingSource, setLoadingSource] = useState('')
  const [races, setRaces] = useState([])
  const [selected, setSelected] = useState({})
  const [activeSource, setActiveSource] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [notMineRace, setNotMineRace] = useState(null)
  const [undoRace, setUndoRace] = useState(null)
  const [undoSelected, setUndoSelected] = useState(null)
  const [runSignupConnected, setRunSignupConnected] = useState(false)
  const [runSignupLoading, setRunSignupLoading] = useState(false)

  const { connected: stravaConnected, getActivities } = useStrava(profile, user?.id)
  const [stravaScanning, setStravaScanning] = useState(false)
  const [stravaScanned, setStravaScanned] = useState(false)

  useEffect(() => {
    injectStyles()
    const init = async () => {
      if (locationState?.firstName) setFirstName(locationState.firstName)
      if (!user || isDemo(user?.email)) { setFirstName('Ryan'); setLastName('Groene'); return }
      try {
        const { data } = await supabase.from('profiles')
          .select('full_name,strava_access_token,strava_refresh_token,strava_expires_at,strava_athlete_id,strava_connected')
          .eq('id', user.id).single()
        if (data) {
          setProfile(data)
          const parts = (data.full_name||'').trim().split(' ')
          if (parts[0] && !locationState?.firstName) setFirstName(parts[0])
          if (parts.length > 1) setLastName(parts.slice(1).join(' '))
        }
      } catch(e) {}
    }
    init()

    // Check for RunSignup OAuth callback
    const params = new URLSearchParams(window.location.search)
    const rsCode = params.get('rs_code')
    const rsToken = sessionStorage.getItem('runsignup_access_token')
    if (rsToken) { setRunSignupConnected(true) }
    if (rsCode) { handleRunSignupCallback(rsCode) }

    return () => document.getElementById('rp-ri-styles')?.remove()
  }, [user])

  // ── RunSignup OAuth ───────────────────────────────────────────────────────
  const connectRunSignup = async () => {
    const uid = user?.id
    if (uid) sessionStorage.setItem('runsignup_user_id', uid)
    sessionStorage.setItem('runsignup_return_to', '/race-import')
    try {
      const r = await fetch(`/api/runsignup-oauth?action=auth_url${uid ? `&user_id=${uid}` : ''}`)
      const d = await r.json()
      if (d.code_verifier) sessionStorage.setItem('runsignup_code_verifier', d.code_verifier)
      if (d.url) window.location.href = d.url
    } catch(e) { console.error('RunSignup auth error:', e) }
  }

  const handleRunSignupCallback = async (code) => {
    setRunSignupLoading(true)
    try {
      const verifier = sessionStorage.getItem('runsignup_code_verifier') || ''
      const r = await fetch(`/api/runsignup-oauth?action=exchange&code=${encodeURIComponent(code)}&code_verifier=${encodeURIComponent(verifier)}`)
      const d = await r.json()
      if (d.access_token) {
        sessionStorage.setItem('runsignup_access_token', d.access_token)
        if (d.refresh_token) sessionStorage.setItem('runsignup_refresh_token', d.refresh_token)
        sessionStorage.removeItem('runsignup_code_verifier')
        setRunSignupConnected(true)
        window.history.replaceState({}, '', '/race-import')
      }
    } catch(e) { console.error('RunSignup callback error:', e) }
    setRunSignupLoading(false)
  }

  const fetchRunSignupRaces = async () => {
    const token = sessionStorage.getItem('runsignup_access_token')
    if (!token) return []
    try {
      const r = await fetch(`/api/runsignup-oauth?action=registered_races&access_token=${encodeURIComponent(token)}`)
      const d = await r.json()
      return d.races || []
    } catch(e) { return [] }
  }

  // ── Strava scan ───────────────────────────────────────────────────────────
  const isLikelyRace = a => {
    const type = (a.type||a.sport_type||'').toLowerCase()
    const distMi = (a.distance||0)/1609.34
    const name = (a.name||'').toLowerCase()
    if (!['run','virtualrun'].includes(type)) return false
    const DISTS = [3.1,6.2,9.3,10,13.1,26.2,31,50]
    const byDist = DISTS.some(d => Math.abs(distMi-d)/d <= 0.01)
    const WORDS = ['race','5k','10k','half marathon','marathon','trot','triathlon','ironman','70.3','140.6','miler']
    return byDist || WORDS.some(w => name.includes(w))
  }

  const scanStrava = async () => {
    if (stravaScanning || stravaScanned) return []
    setStravaScanning(true)
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    try {
      const ago = Math.floor((Date.now() - 3*365*24*3600*1000)/1000)
      const [p1,p2,p3] = await Promise.all([
        getActivities({ per_page:60, page:1, after:ago }),
        getActivities({ per_page:60, page:2, after:ago }),
        getActivities({ per_page:60, page:3, after:ago }),
      ])
      const all = [...p1,...p2,...p3].filter(isLikelyRace)
      const results = all.map(a => {
        const d = new Date(a.start_date_local)
        const mi = (a.distance||0)/1609.34
        let dist = `${mi.toFixed(1)} mi`
        if (Math.abs(mi-3.1)<=0.1) dist='5K'
        else if (Math.abs(mi-6.2)<=0.15) dist='10K'
        else if (Math.abs(mi-13.1)<=0.2) dist='13.1'
        else if (Math.abs(mi-26.2)<=0.3) dist='26.2'
        const s=a.moving_time||0, h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60
        const time = h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`
        return {
          id:`strava_${a.id}`, name:a.name||'Strava Activity',
          date:`${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
          date_sort:d.toISOString().split('T')[0],
          location:'', city:'', state:'', distance:dist, time,
          source:'STRAVA', confidence:2
        }
      })
      setStravaScanned(true)
      setStravaScanning(false)
      return results
    } catch(e) {
      setStravaScanning(false)
      return []
    }
  }

  // ── Import all sources ────────────────────────────────────────────────────
  const handleImportAll = async () => {
    setStep('loading')
    const allRaces = []

    // RunSignup
    if (runSignupConnected) {
      setLoadingSource('RunSignup')
      setLoadingStatus('Pulling your registered races from RunSignup...')
      const rsRaces = await fetchRunSignupRaces()
      allRaces.push(...rsRaces)
    }

    // Strava
    if (stravaConnected) {
      setLoadingSource('Strava')
      setLoadingStatus('Scanning your Strava activities for races...')
      const stravaRaces = await scanStrava()
      // Dedupe against runsignup by month+year
      const existKeys = new Set(allRaces.map(r => {
        const d = r.date_sort ? new Date(r.date_sort) : null
        return d && !isNaN(d) ? `${d.getMonth()}-${d.getFullYear()}` : ''
      }))
      const newStrava = stravaRaces.filter(r => {
        const d = r.date_sort ? new Date(r.date_sort) : null
        return !d || !existKeys.has(`${d.getMonth()}-${d.getFullYear()}`)
      })
      allRaces.push(...newStrava)
    }

    setLoadingStatus('Sorting by confidence...')
    await new Promise(r => setTimeout(r, 800))

    const sorted = allRaces.sort((a,b) => {
      const sourceOrder = { RUNSIGNUP:3, STRAVA:2, MANUAL:1 }
      return (sourceOrder[b.source]||0) - (sourceOrder[a.source]||0)
    })

    setRaces(sorted)
    const init = {}
    sorted.forEach(r => { init[r.id] = true })
    setSelected(init)
    setStep('review')
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleRace = id => setSelected(p => ({ ...p, [id]:!p[id] }))
  const toggleAll = () => { const n={}; races.forEach(r => { n[r.id]=!allSelected }); setSelected(n) }

  const confirmNotMine = () => {
    if (!notMineRace) return
    setUndoRace(notMineRace); setUndoSelected({...selected})
    setRaces(p => p.filter(r => r.id!==notMineRace.id))
    setSelected(p => { const n={...p}; delete n[notMineRace.id]; return n })
    setNotMineRace(null)
  }
  const handleUndo = () => {
    if (!undoRace) return
    setRaces(p => [...p, undoRace].sort((a,b) => b.confidence-a.confidence))
    setSelected(undoSelected)
    setUndoRace(null); setUndoSelected(null)
  }
  const handleAddManual = r => {
    setRaces(p => [r,...p])
    setSelected(p => ({...p,[r.id]:true}))
    setShowManual(false)
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (userId) {
        const toInsert = races.filter(r => selected[r.id]).map(r => ({
          user_id:userId, name:r.name, date:r.date||'', date_sort:r.date_sort||null,
          location:r.location||'', city:r.city||'', state:r.state||'',
          distance:r.distance, time:r.time||'', source:r.source, confidence:r.confidence||2,
        }))
        if (toInsert.length > 0) {
          await supabase.from('passport_races').upsert(toInsert, { onConflict:'user_id,name,date', ignoreDuplicates:true })
        }
      }
    } catch(e) { console.error('Save error:', e) }
    setSaving(false)
    navigate('/build-passport', { state:{ imported:selectedCount, firstName } })
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const allSelected = races.length > 0 && selectedCount === races.length
  const filteredRaces = activeSource==='ALL' ? races : races.filter(r => r.source===activeSource)
  const sources = [...new Set(races.map(r => r.source))]
  const anyConnected = runSignupConnected || stravaConnected

  // ── Loading screen ────────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
      <TickerBg />
      <div style={{ position:'relative', zIndex:10, textAlign:'center', padding:'0 24px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'20px' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,48px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'2px' }}>FINDING YOUR RACES</h1>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', letterSpacing:'1.5px', color:'#9aa5b4', margin:'0 0 32px', textTransform:'uppercase' }}>{loadingStatus}</p>
        <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
          {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C', animation:`pulse 1.1s ease-in-out ${i*0.37}s infinite` }} />)}
        </div>
      </div>
    </div>
  )

  // ── Connect screen ────────────────────────────────────────────────────────
  if (step === 'connect') return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Barlow',sans-serif", position:'relative', overflow:'hidden' }}>
      <TickerBg />
      <div style={{ position:'relative', zIndex:1, maxWidth:'520px', margin:'0 auto', padding:'48px 24px 120px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'36px', animation:'fadeIn 0.4s ease both' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', letterSpacing:'3px', color:'#9aa5b4' }}>RACE PASSPORT</span>
          </div>
          <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'14px' }}>
            <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
            <div style={{ height:'3px', width:'36px', background:'#C9A84C', borderRadius:'2px' }} />
            <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
          </div>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 14px', textTransform:'uppercase' }}>Step 2 of 3 — Import Your Races</p>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(36px,8vw,52px)', color:'#1B2A4A', margin:'0 0 12px', letterSpacing:'1.5px', lineHeight:1 }}>
            BUILD YOUR<br/>PASSPORT
          </h1>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.7 }}>
            Connect your accounts and we'll pull in your race history automatically.
          </p>
        </div>

        {/* Source cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'24px' }}>

          {/* RunSignup */}
          <SourceCard
            delay={0.1}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#1B2A4A"/><path d="M8 12l3 3 5-5" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            title="RunSignup"
            subtitle="Pull your full registration history — every race you've ever signed up for."
            badge="Most Races"
            buttonLabel={runSignupLoading ? 'Connecting...' : 'Connect RunSignup →'}
            buttonColor="#1B2A4A"
            onClick={connectRunSignup}
            connected={runSignupConnected}
            connectedLabel="RunSignup Connected"
          />

          {/* Strava */}
          <SourceCard
            delay={0.2}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>}
            title="Strava"
            subtitle="We'll scan your activities and identify races from your training history."
            buttonLabel="Connect Strava →"
            buttonColor="#FC4C02"
            onClick={async () => {
              const uid = user?.id
              sessionStorage.setItem('strava_return_to', '/race-import')
              if (uid) sessionStorage.setItem('strava_user_id', uid)
              const r = await fetch(`/api/strava?action=auth_url${uid ? `&user_id=${uid}` : ''}`)
              const d = await r.json()
              if (d.url) window.location.href = d.url
            }}
            connected={stravaConnected}
            connectedLabel="Strava Connected"
          />

          {/* Manual */}
          <div className="import-card"
            style={{ background:'#fafbfc', borderRadius:'16px', border:'1.5px dashed #e2e6ed', padding:'20px', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer', animation:'fadeInUp 0.5s ease 0.3s both' }}
            onClick={() => setShowManual(true)}>
            <div style={{ width:48, height:48, borderRadius:'12px', background:'#fff', border:'1.5px solid #e2e6ed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#9aa5b4" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', letterSpacing:'0.5px' }}>Add a Race Manually</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4' }}>Type a race name and Pacer will fill in the details.</div>
            </div>
          </div>
        </div>

        {/* Import button */}
        {anyConnected && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <button onClick={handleImportAll}
              style={{ width:'100%', padding:'17px', border:'none', borderRadius:'14px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, letterSpacing:'2px', color:'#fff', cursor:'pointer', textTransform:'uppercase', marginBottom:'12px' }}
              onMouseEnter={e => e.currentTarget.style.background='#C9A84C'}
              onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
              Import My Races →
            </button>
          </div>
        )}

        <p onClick={() => navigate('/build-passport', { state:{ firstName } })}
          style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'8px', cursor:'pointer' }}>
          Skip — I'll add races later
        </p>
      </div>

      {showManual && <PacerManualModal onAdd={handleAddManual} onClose={() => setShowManual(false)} />}
    </div>
  )

  // ── Review screen ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Barlow',sans-serif", paddingBottom:'40px', position:'relative', overflow:'hidden' }}>
      <TickerBg />

      {/* Header */}
      <div style={{ position:'relative', zIndex:1, background:'#fff', padding:'28px 20px 24px', borderBottom:'3px solid #C9A84C', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'8px' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', letterSpacing:'3px', color:'#9aa5b4' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'12px' }}>
          <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'36px', background:'#C9A84C', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'36px', background:'#e2e6ed', borderRadius:'2px' }} />
        </div>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 12px', textTransform:'uppercase' }}>Step 2 of 3 — Import Your Races</p>

        {races.length > 0 ? (
          <>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:'20px', padding:'5px 16px', marginBottom:'14px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase' }}>{races.length} Races Found</span>
            </div>
            <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,48px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'1.5px', lineHeight:1 }}>ARE THESE YOUR RACES?</h1>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:'0 auto', fontWeight:300, lineHeight:1.7, maxWidth:'480px' }}>
              Uncheck anything that isn't yours, or tap <strong style={{ color:'#c53030' }}>✕ Not mine</strong> to remove it.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,5vw,44px)', color:'#1B2A4A', margin:'0 0 10px', letterSpacing:'1.5px', lineHeight:1 }}>NO RACES FOUND</h1>
            <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#6b7a8d', margin:'0 auto 14px', fontWeight:300, lineHeight:1.7, maxWidth:'480px' }}>
              We didn't find any races. Add them manually below.
            </p>
            <button onClick={() => setStep('connect')}
              style={{ padding:'8px 20px', border:'1.5px solid #1B2A4A', borderRadius:'8px', background:'transparent', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase' }}>
              ← Back
            </button>
          </>
        )}
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:'1000px', margin:'0 auto', padding:'0 20px' }}>

        {races.length > 0 && (
          <>
            {/* Filter tabs */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 12px', gap:'12px', flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <button className={`source-tab ${activeSource==='ALL'?'active':''}`} onClick={() => setActiveSource('ALL')}>All {races.length}</button>
                {sources.map(src => (
                  <button key={src} className={`source-tab ${activeSource===src?'active':''}`} onClick={() => setActiveSource(src)}>
                    {src} {races.filter(r=>r.source===src).length}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{selectedCount} of {races.length} selected</span>
                <button onClick={toggleAll} style={{ background:'none', border:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', textTransform:'uppercase', cursor:'pointer', padding:0 }}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Race grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'14px', marginBottom:'24px', animation:'fadeIn 0.5s ease both' }}>
              {filteredRaces.map(race => (
                <RaceCard key={race.id} race={race} selected={!!selected[race.id]} onToggle={toggleRace} onNotMine={r => setNotMineRace(r)} />
              ))}
            </div>
          </>
        )}

        {/* Add more row */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
          <button onClick={() => setStep('connect')}
            style={{ padding:'10px 18px', border:'1.5px solid #e2e6ed', borderRadius:'10px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#6b7a8d', cursor:'pointer', textTransform:'uppercase' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#1B2A4A'; e.currentTarget.style.color='#1B2A4A' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e6ed'; e.currentTarget.style.color='#6b7a8d' }}>
            ← Connect More Sources
          </button>
          <button onClick={() => setShowManual(true)}
            style={{ padding:'10px 18px', border:'1.5px solid #e2e6ed', borderRadius:'10px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#6b7a8d', cursor:'pointer', textTransform:'uppercase' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.color='#C9A84C' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e6ed'; e.currentTarget.style.color='#6b7a8d' }}>
            + Add Race Manually
          </button>
        </div>

        {/* Confirm button */}
        <button onClick={handleConfirm} disabled={saving || selectedCount === 0}
          style={{ width:'100%', padding:'17px', border:'none', borderRadius:'12px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, letterSpacing:'2px', color:'#fff', cursor:selectedCount===0?'not-allowed':'pointer', textTransform:'uppercase', opacity:selectedCount===0?0.5:1, transition:'background 0.2s' }}
          onMouseEnter={e => { if(selectedCount>0&&!saving) e.currentTarget.style.background='#C9A84C' }}
          onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
          {saving ? 'Saving to your Passport...' : `Add ${selectedCount} Race${selectedCount!==1?'s':''} to My Passport →`}
        </button>

        <p onClick={() => navigate('/build-passport', { state:{ firstName } })}
          style={{ textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginTop:'14px', cursor:'pointer' }}>
          Skip — I'll add races later
        </p>
      </div>

      {showManual && <PacerManualModal onAdd={handleAddManual} onClose={() => setShowManual(false)} />}
      {notMineRace && <NotMineModal race={notMineRace} onConfirm={confirmNotMine} onCancel={() => setNotMineRace(null)} />}
      {undoRace && <UndoToast raceName={undoRace.name} onUndo={handleUndo} onDismiss={() => { setUndoRace(null); setUndoSelected(null) }} />}
    </div>
  )
}
