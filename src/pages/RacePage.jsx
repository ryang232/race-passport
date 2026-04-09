import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const MOCK_RACE_DATA = {
  1: {
    id: 1, distance: '26.2', name: 'Marine Corps Marathon', location: 'Arlington, VA',
    month: 'Oct', year: '2024', date: 'October 29, 2024',
    time: '4:02:11', pace: '9:16/mi', place: '3,847 / 19,241',
    elevation: '912ft', weather: '48°F, Overcast', pr: true,
    hasStrava: true, stravaActivity: 'Morning Run · 26.3 mi · 4:02:45',
    story: "First marathon. Miles 18-22 were brutal but the crowd on 14th Street carried me home. Crossed the finish line under the Iwo Jima statue — a moment I'll never forget. Never again... until next year.",
    photos: [
      { id:1, url:'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=300&fit=crop', caption:'Start line at dawn' },
      { id:2, url:'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=300&fit=crop', caption:'Mile 13 — still smiling' },
      { id:3, url:'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop', caption:'Finish line!' },
    ],
    gear: [
      { id:1, category:'Shoes', brand:'Nike', model:'Alphafly 3', color:'White/Green', url:'https://nike.com', note:'PR shoes 🏅' },
      { id:2, category:'Watch', brand:'Garmin', model:'Forerunner 965', color:'Carbon Gray', url:'https://garmin.com', note:'' },
      { id:3, category:'Outfit', brand:'Tracksmith', model:'Session Short', color:'Navy', url:'https://tracksmith.com', note:'Boston kit' },
      { id:4, category:'Socks', brand:'Balega', model:'Hidden Comfort', color:'Black', url:'https://balega.com', note:'' },
    ],
    stickers: [],
    splits: [
      { label:'5K', time:'28:04' }, { label:'10K', time:'56:22' },
      { label:'Half', time:'2:00:11' }, { label:'30K', time:'2:52:34' },
      { label:'Finish', time:'4:02:11' },
    ],
  }
}

const GEAR_CATEGORIES = ['Shoes','Watch','Outfit','Socks','Sunglasses','Hat','Headphones','Belt/Vest','Other']
const STICKER_OPTIONS = ['🏅','🔥','💪','🎉','⚡','🏆','👟','💦','🌟','🎯','💯','🏃']

const GEAR_ICONS = {
  Shoes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 17c0-1.5 1.5-3 4-3h4l3-4h5c1.5 0 4 1 4 3v1c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1v-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 14l1-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Watch: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="7" y="6" width="10" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 6V4h6v2M9 18v2h6v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 9v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Outfit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 3l-4 4 3 1v10h10V8l3-1-4-4-4 2-4-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  Socks: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 4v10c0 2 1.5 4 4 5s6 0 7-2-1-4-3-4H14V4H9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  Sunglasses: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 10h3m15 0h-3M6 10a3 3 0 006 0M18 10a3 3 0 01-6 0M9 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Hat: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 14h16M12 4c-4 0-7 2-8 6h16c-1-4-4-6-8-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 14v2h16v-2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  Headphones: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 14v-4a8 8 0 0116 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="2" y="13" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="18" y="13" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  Other: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

function isGold(dist) {
  const d = dist.toLowerCase().replace(/\s/g,'')
  if (['26.2','marathon','50k','50m','100k','100m','70.3','140.6'].includes(d)) return true
  const n = parseFloat(d); return !isNaN(n) && n >= 26.2
}

function GearCard({ item, editMode, onRemove }) {
  const [hovered, setHovered] = useState(false)
  const icon = GEAR_ICONS[item.category] || GEAR_ICONS.Other
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? '#fafbfc' : '#fff', border: hovered ? '1.5px solid #C9A84C' : '1.5px solid #e8eaed', borderRadius: '12px', padding: '16px', transition: 'all 0.15s', position: 'relative', cursor: item.url ? 'pointer' : 'default' }}
      onClick={() => item.url && !editMode && window.open(item.url, '_blank')}>
      {editMode && (
        <button onClick={e => { e.stopPropagation(); onRemove(item.id) }} style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: 'rgba(197,48,48,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="#c53030" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#C9A84C' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', color: '#9aa5b4', textTransform: 'uppercase', marginBottom: '3px' }}>{item.category}</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '16px', color: '#1B2A4A', letterSpacing: '0.5px', lineHeight: 1.1, marginBottom: '2px' }}>{item.brand} {item.model}</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '11px', color: '#9aa5b4' }}>{item.color}</div>
          {item.note && <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#C9A84C', marginTop: '4px', fontStyle: 'italic' }}>{item.note}</div>}
        </div>
        {item.url && !editMode && (
          <div style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#1B2A4A', borderRadius: '6px' }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', color: '#fff', textTransform: 'uppercase' }}>Shop</span>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 6.5l5-5M6.5 6.5V1.5H1.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AddGearForm({ onAdd, onCancel }) {
  const [cat, setCat] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')

  const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:'6px', border:'1.5px solid #e2e6ed', background:'#fafbfc', color:'#1B2A4A', fontSize:'13px', fontFamily:"'Barlow',sans-serif", outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }

  return (
    <div style={{ background:'#f8f9fb', border:'1.5px solid #e2e6ed', borderRadius:'12px', padding:'20px', marginTop:'12px' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'14px' }}>Add Gear</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
        <div>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Category</label>
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inputStyle, appearance:'none', cursor:'pointer' }}
            onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'}>
            <option value="">Select...</option>
            {GEAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Brand</label>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Nike, Garmin..." style={inputStyle}
            onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
        </div>
        <div>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Model</label>
          <input value={model} onChange={e => setModel(e.target.value)} placeholder="Alphafly 3..." style={inputStyle}
            onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
        </div>
        <div>
          <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Color</label>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="White/Green..." style={inputStyle}
            onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
        </div>
      </div>
      <div style={{ marginBottom:'10px' }}>
        <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>
          Shop Link <span style={{ color:'#b0b8c4', fontWeight:400 }}>(optional — lets viewers buy it)</span>
        </label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://nike.com/..." style={inputStyle}
          onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
      </div>
      <div style={{ marginBottom:'16px' }}>
        <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'4px' }}>Note <span style={{ color:'#b0b8c4', fontWeight:400 }}>(optional)</span></label>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Race day go-to, broke them in at..." style={inputStyle}
          onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
      </div>
      <div style={{ display:'flex', gap:'10px' }}>
        <button onClick={() => { if (cat && brand && model) { onAdd({ id: Date.now(), category:cat, brand, model, color, url, note }); } }} disabled={!cat || !brand || !model}
          style={{ flex:1, padding:'10px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', opacity: (!cat||!brand||!model) ? 0.5 : 1 }}>
          Add to Page
        </button>
        <button onClick={onCancel} style={{ padding:'10px 20px', border:'1.5px solid #e2e6ed', borderRadius:'8px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function RacePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [editMode, setEditMode] = useState(false)
  const [race, setRace] = useState(null)
  const [story, setStory] = useState('')
  const [gear, setGear] = useState([])
  const [stickers, setStickers] = useState([])
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showSplits, setShowSplits] = useState(false)
  const [showAddGear, setShowAddGear] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activePhoto, setActivePhoto] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const data = MOCK_RACE_DATA[parseInt(id)] || MOCK_RACE_DATA[1]
    setRace(data)
    setStory(data.story || '')
    setGear(data.gear || [])
    setStickers(data.stickers || [])

    const style = document.createElement('style')
    style.id = 'rp-racepage-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      @keyframes spin { to { transform:rotate(360deg); } }
      .stat-pill { background:#f4f5f7; border-radius:8px; padding:10px 14px; text-align:center; }
      .edit-toolbar-btn { display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 16px; border:none; background:none; cursor:pointer; border-radius:8px; transition:background 0.15s; }
      .edit-toolbar-btn:hover { background:rgba(255,255,255,0.12); }
      .edit-toolbar-btn span { font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:600; letter-spacing:1px; color:rgba(255,255,255,0.5); text-transform:uppercase; }
      .photo-slot { border-radius:10px; overflow:hidden; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s; position:relative; aspect-ratio:4/3; }
      .photo-slot:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(27,42,74,0.15); }
      .sticker-chip { padding:6px 12px; border-radius:20px; border:1.5px solid #e2e6ed; background:#fff; cursor:pointer; font-size:18px; transition:transform 0.15s; }
      .sticker-chip:hover { transform:scale(1.2); }
      .privacy-toggle { display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:8px; border:1.5px solid #e2e6ed; background:#fff; cursor:pointer; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:1px; color:#9aa5b4; transition:all 0.15s; }
      .privacy-toggle.active { border-color:#1B2A4A; color:#1B2A4A; background:#f4f5f7; }
    `
    if (!document.getElementById('rp-racepage-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-racepage-styles')?.remove()
  }, [id])

  if (!race) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f4f5f7' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  )

  const gold = isGold(race.distance)
  const stampColor = gold ? '#C9A84C' : '#1B2A4A'
  const cleaned = race.distance.replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 22 : cleaned.length > 2 ? 28 : 40

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setEditMode(false)
  }

  const addSticker = (s) => {
    setStickers(prev => [...prev, { id:Date.now(), emoji:s, x:20+Math.random()*60, y:20+Math.random()*60 }])
    setShowStickerPicker(false)
  }

  const removeGear = (gearId) => setGear(prev => prev.filter(g => g.id !== gearId))
  const addGear = (item) => { setGear(prev => [...prev, item]); setShowAddGear(false) }

  return (
    <div style={{ minHeight:'100vh', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif" }}>

      {/* TOP NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#fff', borderBottom:'1px solid #e8eaed', boxShadow:'0 1px 8px rgba(27,42,74,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:'56px' }}>
        <button onClick={() => navigate('/passport')} style={{ display:'flex', alignItems:'center', gap:'8px', background:'none', border:'none', cursor:'pointer', color:'#9aa5b4', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:0, transition:'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color='#1B2A4A'} onMouseLeave={e => e.currentTarget.style.color='#9aa5b4'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Passport
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', letterSpacing:'2.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {!editMode ? (
            <>
              <button style={{ padding:'6px 16px', border:'1.5px solid #e2e6ed', borderRadius:'8px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#1B2A4A'; e.currentTarget.style.color='#1B2A4A' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e6ed'; e.currentTarget.style.color='#9aa5b4' }}>Share Page</button>
              <button onClick={() => setEditMode(true)} style={{ padding:'6px 18px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
                Edit Page
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditMode(false); setShowAddGear(false) }} style={{ padding:'6px 16px', border:'1.5px solid #e2e6ed', borderRadius:'8px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:'6px 18px', border:'none', borderRadius:'8px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Save Page'}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'32px 24px 80px' }}>

        {/* HERO */}
        <div style={{ background:'#1B2A4A', borderRadius:'20px', overflow:'hidden', marginBottom:'24px', animation:'fadeIn 0.4s ease both', position:'relative' }}>
          {stickers.length > 0 && (
            <div style={{ position:'absolute', inset:0, zIndex:5, pointerEvents:'none' }}>
              {stickers.map(s => <div key={s.id} style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`, fontSize:'28px', lineHeight:1, userSelect:'none' }}>{s.emoji}</div>)}
            </div>
          )}
          <div style={{ padding:'32px 32px 0', position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'20px', marginBottom:'24px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'rgba(201,168,76,0.6)', textTransform:'uppercase', marginBottom:'8px' }}>Race Passport · Page {id}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(32px,5vw,52px)', color:'#fff', letterSpacing:'1.5px', lineHeight:1, marginBottom:'6px' }}>{race.name}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', color:'rgba(255,255,255,0.5)', letterSpacing:'1px' }}>{race.date} · {race.location}</div>
                {race.pr && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', marginTop:'10px', background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'6px', padding:'4px 12px' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C' }} />
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:700, letterSpacing:'2px', color:'#C9A84C', textTransform:'uppercase' }}>Personal Best</span>
                  </div>
                )}
              </div>
              <div style={{ width:110, height:110, borderRadius:'50%', border:`3px solid ${stampColor}`, background:gold?'rgba(201,168,76,0.08)':'rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
                <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:`1px dashed ${gold?'rgba(201,168,76,0.3)':'rgba(255,255,255,0.2)'}` }} />
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:stampColor, letterSpacing:'0.04em', lineHeight:1, position:'relative', zIndex:1, textAlign:'center' }}>{cleaned}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', fontWeight:600, letterSpacing:'1.5px', color:gold?'rgba(201,168,76,0.5)':'rgba(255,255,255,0.3)', textTransform:'uppercase', marginTop:'3px', position:'relative', zIndex:1 }}>
                  {race.distance==='26.2'?'Marathon':race.distance==='13.1'?'Half':race.distance==='70.3'?'Triathlon':'Race'}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:'1px solid rgba(255,255,255,0.08)', position:'relative', zIndex:1 }}>
            {[{ label:'Finish Time', value:race.time },{ label:'Avg Pace', value:race.pace },{ label:'Overall Place', value:race.place||'—' },{ label:'Elevation', value:race.elevation }].map((s,i) => (
              <div key={i} style={{ padding:'18px 0', textAlign:'center', borderRight:i<3?'1px solid rgba(255,255,255,0.08)':'none' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#fff', letterSpacing:'1px', lineHeight:1 }}>{s.value}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          {race.weather && (
            <div style={{ padding:'10px 32px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'8px', position:'relative', zIndex:1 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="3" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/><path d="M6 1v1M6 10v1M1 6h1M10 6h1" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round"/></svg>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.3)', letterSpacing:'0.5px' }}>Race day: {race.weather}</span>
            </div>
          )}
          {editMode && (
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', padding:'8px 16px', display:'flex', alignItems:'center', gap:'4px', background:'rgba(0,0,0,0.2)', position:'relative', zIndex:6 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginRight:'8px' }}>Edit:</div>
              <button className="edit-toolbar-btn" onClick={() => setShowStickerPicker(!showStickerPicker)}>
                <span style={{ fontSize:'16px' }}>🏅</span><span>Sticker</span>
              </button>
              <button className="edit-toolbar-btn" onClick={() => setStickers([])}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                <span>Clear</span>
              </button>
              {showStickerPicker && (
                <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:'80px', background:'#fff', border:'1px solid #e2e6ed', borderRadius:'12px', padding:'12px', boxShadow:'0 8px 32px rgba(27,42,74,0.15)', display:'flex', flexWrap:'wrap', gap:'8px', maxWidth:'240px', zIndex:20 }}>
                  {STICKER_OPTIONS.map(s => <button key={s} className="sticker-chip" onClick={() => addSticker(s)}>{s}</button>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PHOTOS */}
        <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', marginBottom:'20px', border:'1px solid #e8eaed', animation:'fadeIn 0.4s ease 0.1s both' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px' }}>Race Photos</div>
            {editMode && (
              <button onClick={() => fileInputRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Upload
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display:'none' }} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px' }}>
            {race.photos?.map(photo => (
              <div key={photo.id} className="photo-slot" onClick={() => setActivePhoto(photo)}>
                <img src={photo.url} alt={photo.caption} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', padding:'20px 12px 10px' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.8)', letterSpacing:'0.5px' }}>{photo.caption}</div>
                </div>
              </div>
            ))}
            {editMode && (
              <div onClick={() => fileInputRef.current?.click()} style={{ border:'2px dashed #d0d7e0', borderRadius:'10px', aspectRatio:'4/3', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', cursor:'pointer', background:'#fafbfc' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'} onMouseLeave={e => e.currentTarget.style.borderColor='#d0d7e0'}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#C9A84C" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#C9A84C" strokeWidth="1.5"/></svg>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', textTransform:'uppercase' }}>Add Photo</span>
              </div>
            )}
          </div>
        </div>

        {/* STRAVA + STORY */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px', animation:'fadeIn 0.4s ease 0.15s both' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', border:'1px solid #e8eaed' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'16px' }}>Strava Activity</div>
            {race.hasStrava ? (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px', background:'#f4f5f7', borderRadius:'10px', marginBottom:'12px' }}>
                  <div style={{ width:36, height:36, borderRadius:'8px', background:'#FC4C02', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#1B2A4A' }}>{race.stravaActivity}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4', marginTop:'2px' }}>Connected</div>
                  </div>
                </div>
                <div style={{ background:'#f4f5f7', borderRadius:'10px', height:'140px', overflow:'hidden', position:'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 400 140" preserveAspectRatio="none">
                    <path d="M20,120 C80,80 120,100 160,70 C200,40 220,80 260,60 C300,40 340,70 380,40" stroke="#FC4C02" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <path d="M20,120 C80,80 120,100 160,70 C200,40 220,80 260,60 C300,40 340,70 380,40 L380,140 L20,140 Z" fill="rgba(252,76,2,0.06)"/>
                    <circle cx="20" cy="120" r="5" fill="#FC4C02"/><circle cx="380" cy="40" r="5" fill="#1B2A4A"/>
                  </svg>
                  <div style={{ position:'absolute', bottom:'10px', left:'14px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase' }}>Elevation Profile</div>
                </div>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'32px 16px' }}>
                <div style={{ width:48, height:48, borderRadius:'12px', background:'rgba(252,76,2,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                </div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginBottom:'12px' }}>Connect Strava to sync this activity</div>
                <button style={{ padding:'8px 20px', border:'none', background:'#FC4C02', borderRadius:'8px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}>Connect Strava</button>
              </div>
            )}
          </div>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', border:'1px solid #e8eaed' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'16px' }}>My Story</div>
            {editMode ? (
              <textarea value={story} onChange={e => setStory(e.target.value)} placeholder="What was race day like? How did you feel at mile 20?"
                style={{ width:'100%', minHeight:'180px', padding:'14px', border:'1.5px solid #e2e6ed', borderRadius:'10px', fontFamily:"'Barlow',sans-serif", fontSize:'14px', fontWeight:300, color:'#1B2A4A', lineHeight:1.7, resize:'vertical', outline:'none', background:'#fafbfc', transition:'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            ) : story ? (
              <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'14px', fontWeight:300, color:'#4a5568', lineHeight:1.8, fontStyle:'italic', borderLeft:'3px solid #C9A84C', paddingLeft:'16px' }}>"{story}"</div>
            ) : (
              <div style={{ textAlign:'center', padding:'32px 16px' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#e2e6ed', letterSpacing:'1px', marginBottom:'8px' }}>NO STORY YET</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginBottom:'12px' }}>Every race has a story worth telling.</div>
                <button onClick={() => setEditMode(true)} style={{ padding:'7px 18px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>Write It</button>
              </div>
            )}
          </div>
        </div>

        {/* GEAR SECTION */}
        <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', marginBottom:'20px', border:'1px solid #e8eaed', animation:'fadeIn 0.4s ease 0.2s both' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px', lineHeight:1 }}>Race Day Gear</div>
              {!editMode && gear.length > 0 && (
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4', marginTop:'3px' }}>Click any item to shop it</div>
              )}
            </div>
            {editMode && (
              <button onClick={() => setShowAddGear(!showAddGear)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Add Gear
              </button>
            )}
          </div>

          {gear.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'12px' }}>
              {gear.map(item => <GearCard key={item.id} item={item} editMode={editMode} onRemove={removeGear} />)}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'32px 16px', border:'2px dashed #e8eaed', borderRadius:'12px', background:'#fafbfc' }}>
              <div style={{ width:48, height:48, borderRadius:'12px', background:'#f4f5f7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 17c0-1.5 1.5-3 4-3h4l3-4h5c1.5 0 4 1 4 3v1c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1v-1z" stroke="#9aa5b4" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 14l1-4h4" stroke="#9aa5b4" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#d0d7e0', letterSpacing:'1px', marginBottom:'6px' }}>NO GEAR YET</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', marginBottom:'14px' }}>What did you race in? Add your shoes, watch, and outfit.</div>
              {!editMode && <button onClick={() => setEditMode(true)} style={{ padding:'7px 18px', border:'1.5px solid #C9A84C', borderRadius:'8px', background:'rgba(201,168,76,0.06)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase' }}>Add Gear</button>}
            </div>
          )}

          {showAddGear && <AddGearForm onAdd={addGear} onCancel={() => setShowAddGear(false)} />}
        </div>

        {/* SPLITS */}
        {race.splits && (
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', border:'1px solid #e8eaed', marginBottom:'20px', animation:'fadeIn 0.4s ease 0.25s both' }}>
            <button onClick={() => setShowSplits(!showSplits)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#1B2A4A', letterSpacing:'1px' }}>Splits</div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition:'transform 0.2s', transform:showSplits?'rotate(180deg)':'rotate(0)' }}>
                <path d="M4 6l4 4 4-4" stroke="#9aa5b4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showSplits && (
              <div style={{ marginTop:'16px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'10px' }}>
                {race.splits.map((split,i) => (
                  <div key={i} className="stat-pill">
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#1B2A4A', letterSpacing:'1px', lineHeight:1 }}>{split.time}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginTop:'4px' }}>{split.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PRIVACY */}
        <div style={{ background:'#fff', borderRadius:'16px', padding:'20px 24px', border:'1px solid #e8eaed', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px', animation:'fadeIn 0.4s ease 0.3s both' }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Privacy</div>
            <div style={{ display:'flex', gap:'8px' }}>
              {['Public','Hide Time','Private'].map(opt => (
                <button key={opt} className={`privacy-toggle ${opt==='Public'?'active':''}`}>{opt}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Stickers on Page</div>
            <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
              {stickers.slice(0,5).map(s => <span key={s.id} style={{ fontSize:'20px' }}>{s.emoji}</span>)}
              {stickers.length === 0 && <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#c8d0dc' }}>None yet</span>}
            </div>
          </div>
        </div>

      </div>

      {/* PHOTO LIGHTBOX */}
      {activePhoto && (
        <div onClick={() => setActivePhoto(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth:'800px', width:'100%', borderRadius:'16px', overflow:'hidden' }}>
            <img src={activePhoto.url} alt={activePhoto.caption} style={{ width:'100%', display:'block' }} />
            {activePhoto.caption && <div style={{ background:'#1B2A4A', padding:'14px 20px' }}><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', color:'rgba(255,255,255,0.7)' }}>{activePhoto.caption}</span></div>}
          </div>
          <button onClick={() => setActivePhoto(null)} style={{ position:'fixed', top:24, right:24, width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
