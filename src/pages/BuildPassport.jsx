import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function DobPicker({ value, onChange }) {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 18 - i)
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')

  useEffect(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-')
      if (parts.length === 3) {
        setYear(parts[0])
        setMonth(String(parseInt(parts[1])))
        setDay(String(parseInt(parts[2])))
      }
    }
  }, [])

  const daysInMonth = month && year ? new Date(parseInt(year), parseInt(month), 0).getDate() : 31
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const handleChange = (newMonth, newDay, newYear) => {
    if (newMonth && newDay && newYear) {
      const m = String(newMonth).padStart(2, '0')
      const d = String(newDay).padStart(2, '0')
      onChange(`${newYear}-${m}-${d}`)
    }
  }

  const sel = {
    padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #e2e6ed',
    background: '#fafbfc', color: '#1B2A4A', fontSize: '14px',
    fontFamily: "'Barlow', sans-serif", outline: 'none',
    appearance: 'none', cursor: 'pointer', width: '100%',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.4fr', gap: '8px' }}>
      <select value={month} style={sel}
        onChange={e => { setMonth(e.target.value); handleChange(e.target.value, day, year) }}
        onFocus={e => e.target.style.borderColor='#C9A84C'}
        onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Month</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select value={day} style={sel}
        onChange={e => { setDay(e.target.value); handleChange(month, e.target.value, year) }}
        onFocus={e => e.target.style.borderColor='#C9A84C'}
        onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Day</option>
        {days.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={year} style={sel}
        onChange={e => { setYear(e.target.value); handleChange(month, day, e.target.value) }}
        onFocus={e => e.target.style.borderColor='#C9A84C'}
        onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Year</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {['Yes', 'No'].map(opt => (
        <button key={opt} onClick={() => onChange(opt === 'Yes')}
          style={{
            flex: 1, padding: '10px', border: '1.5px solid', borderRadius: '6px',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px',
            fontWeight: 600, letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.15s',
            background: (value === true && opt === 'Yes') || (value === false && opt === 'No') ? '#1B2A4A' : '#fafbfc',
            borderColor: (value === true && opt === 'Yes') || (value === false && opt === 'No') ? '#1B2A4A' : '#e2e6ed',
            color: (value === true && opt === 'Yes') || (value === false && opt === 'No') ? '#fff' : '#9aa5b4',
          }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function ErrorBox({ children }) {
  return (
    <div style={{ background: 'rgba(27,42,74,0.06)', border: '1px solid rgba(27,42,74,0.2)', borderRadius: '6px', padding: '12px 14px', fontSize: '13px', marginBottom: '16px', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{ color: '#e53e3e', fontSize: '15px', lineHeight: 1.3, flexShrink: 0, fontWeight: 700 }}>✕</span>
      <span style={{ color: '#1B2A4A' }}>{children}</span>
    </div>
  )
}

export default function BuildPassport() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState('United States')
  const [raceName, setRaceName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [shirtSize, setShirtSize] = useState('')
  const [experience, setExperience] = useState('')
  const [favoriteDistance, setFavoriteDistance] = useState('')
  const [doneMarathon, setDoneMarathon] = useState(null)
  const [doneIronman, setDoneIronman] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return
      setEmail(user.email || '')
      const meta = user.user_metadata || {}
      const metaFirst = meta.first_name || ''
      const metaLast = meta.last_name || ''
      const metaFull = meta.full_name || ''
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        if (metaFirst) { setFirstName(metaFirst); setLastName(metaLast) }
        else if (data.full_name) {
          const parts = data.full_name.trim().split(' ')
          setFirstName(parts[0] || ''); setLastName(parts.slice(1).join(' ') || '')
        } else if (metaFull) {
          const parts = metaFull.trim().split(' ')
          setFirstName(parts[0] || ''); setLastName(parts.slice(1).join(' ') || '')
        }
        setPhone(data.phone || ''); setDob(data.date_of_birth || ''); setGender(data.gender || '')
        setAddress(data.address || ''); setCity(data.city || ''); setState(data.state || '')
        setZip(data.zip_code || ''); setCountry(data.country || 'United States')
        setRaceName(data.race_name || ''); setContactName(data.emergency_contact_name || '')
        setContactPhone(data.emergency_contact_phone || ''); setShirtSize(data.shirt_size || '')
        setExperience(data.experience_level || ''); setFavoriteDistance(data.favorite_distance || '')
        if (data.done_marathon !== null && data.done_marathon !== undefined) setDoneMarathon(data.done_marathon)
        if (data.done_ironman !== null && data.done_ironman !== undefined) setDoneIronman(data.done_ironman)
      } else {
        if (metaFirst) { setFirstName(metaFirst); setLastName(metaLast) }
        else if (metaFull) {
          const parts = metaFull.trim().split(' ')
          setFirstName(parts[0] || ''); setLastName(parts.slice(1).join(' ') || '')
        }
      }
    }
    loadProfile()
  }, [user])

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-bp-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);}to{transform:translateX(-50%);} }
      .rp-input { width:100%; padding:11px 14px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:14px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; transition:border-color 0.15s, background 0.15s; }
      .rp-input:focus { border-color:#C9A84C; background:#fff; }
      .rp-input::placeholder { color:#b0b8c4; }
      .rp-input.readonly { background:#f4f5f7; color:#6b7a8d; cursor:default; border-color:#e8eaed; }
      .rp-select { width:100%; padding:11px 14px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:14px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; appearance:none; cursor:pointer; transition:border-color 0.15s; }
      .rp-select:focus { border-color:#C9A84C; background:#fff; }
      .rp-primary { width:100%; padding:13px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s, transform 0.1s; border-radius:6px; }
      .rp-primary:hover:not(:disabled) { background:#C9A84C; }
      .rp-primary:active:not(:disabled) { transform:scale(0.985); }
      .rp-primary:disabled { opacity:0.5; cursor:not-allowed; }
      .rp-secondary { width:100%; padding:12px; border:1.5px solid #e2e6ed; background:#fff; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:border-color 0.2s, background 0.2s; border-radius:6px; }
      .rp-secondary:hover { border-color:#1B2A4A; background:#f8f9fb; }
      .size-btn { padding:9px 0; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.15s; flex:1; }
      .size-btn:hover { border-color:#1B2A4A; }
      .size-btn.selected { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .dist-btn { padding:9px 0; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.15s; flex:1; text-align:center; }
      .dist-btn:hover { border-color:#1B2A4A; }
      .dist-btn.selected { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .section-header { font-family:'Bebas Neue',sans-serif; font-size:20px; color:#1B2A4A; letter-spacing:1px; padding:14px 0 8px; border-bottom:2px solid #1B2A4A; margin-bottom:14px; margin-top:8px; }
      .field-label { display:block; font-size:10px; font-weight:600; letter-spacing:1.5px; color:#9aa5b4; margin-bottom:5px; text-transform:uppercase; font-family:'Barlow Condensed',sans-serif; }
    `
    if (!document.getElementById('rp-bp-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-bp-styles')?.remove()
  }, [])

  const handleSaveAndContinue = async () => {
    setError(null)
    if (!firstName.trim() || !lastName.trim()) { setError('First name and last name are required.'); return }
    setSaving(true)
    try {
      await supabase.from('profiles').update({
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        race_name: raceName.trim() || null,
        phone: phone.trim() || null,
        emergency_contact_name: contactName.trim() || null,
        emergency_contact_phone: contactPhone.trim() || null,
        date_of_birth: dob || null,
        gender: gender || null,
        shirt_size: shirtSize || null,
        experience_level: experience || null,
        favorite_distance: favoriteDistance || null,
        done_marathon: doneMarathon,
        done_ironman: doneIronman,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip_code: zip.trim() || null,
        country: country.trim() || null,
      }).eq('id', user?.id)
    } catch (e) {}
    setSaving(false)
    navigate('/race-import', { state: { firstName: firstName.trim() } })
  }

  const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
  const SIZES = ['XS','S','M','L','XL','XXL','XXXL']
  const DISTANCES = ['5K','10K','10 Mile','Half Marathon','Marathon','Ultra','Triathlon']

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily:"'Barlow',sans-serif", padding:'40px 0' }}>
      <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.055)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>

      <div style={{ position:'relative', zIndex:10, background:'#fff', borderRadius:'4px', padding:'36px 36px 32px', width:'100%', maxWidth:'480px', margin:'20px', boxShadow:'0 2px 40px rgba(27,42,74,0.10), 0 0 0 1px rgba(27,42,74,0.07)' }}>
        <div style={{ textAlign:'center', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'34px', color:'#1B2A4A', margin:'0 0 4px', letterSpacing:'1.5px', lineHeight:1 }}>BUILD YOUR PASSPORT</h1>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 12px', textTransform:'uppercase' }}>Step 1 of 3 — Your Racing Profile</p>
          {/* 3-bar progress */}
          <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'14px' }}>
            <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
            <div style={{ height:'3px', width:'40px', background:'#e2e6ed', borderRadius:'2px' }} />
            <div style={{ height:'3px', width:'40px', background:'#e2e6ed', borderRadius:'2px' }} />
          </div>
          <p style={{ fontSize:'12px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6, textAlign:'left', background:'#f8f9fb', border:'1px solid #e2e6ed', borderRadius:'6px', padding:'12px 14px' }}>
            <strong style={{ color:'#1B2A4A' }}>Why do we ask for this?</strong> In a future version, you'll register for races directly inside Race Passport using these details — so we want them ready when that day comes.
          </p>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f8f9fb', border:'1px solid #e2e6ed', borderRadius:'6px', padding:'10px 14px', marginBottom:'16px' }}>
          <span style={{ fontSize:'12px', color:'#6b7a8d', fontWeight:300 }}>This can wait — explore Race Passport first.</span>
          <button onClick={() => navigate('/home')} style={{ background:'none', border:'none', color:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', cursor:'pointer', textTransform:'uppercase', padding:0, flexShrink:0, marginLeft:'12px' }}>Skip →</button>
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <div className="section-header">Your Race Passport Information</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          <div>
            <label className="field-label">First Name <span style={{ color:'#C9A84C' }}>*</span></label>
            <input className="rp-input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ryan" />
          </div>
          <div>
            <label className="field-label">Last Name <span style={{ color:'#C9A84C' }}>*</span></label>
            <input className="rp-input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Groene" />
          </div>
        </div>
        <div style={{ marginBottom:'10px' }}>
          <label className="field-label">Email <span style={{ fontWeight:400, color:'#b0b8c4' }}>(from your account)</span></label>
          <input className="rp-input readonly" type="email" value={email} readOnly tabIndex={-1} />
        </div>
        <div style={{ marginBottom:'10px' }}>
          <label className="field-label">Phone Number</label>
          <input className="rp-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          <div>
            <label className="field-label">Date of Birth</label>
            <DobPicker value={dob} onChange={setDob} />
          </div>
          <div>
            <label className="field-label">Gender</label>
            <select className="rp-select" value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Non-binary</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom:'10px' }}>
          <label className="field-label">Street Address</label>
          <input className="rp-input" type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          <div>
            <label className="field-label">City</label>
            <input className="rp-input" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Highland" />
          </div>
          <div>
            <label className="field-label">State</label>
            <input className="rp-input" type="text" value={state} onChange={e => setState(e.target.value)} placeholder="MD" />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
          <div>
            <label className="field-label">Zip Code</label>
            <input className="rp-input" type="text" value={zip} onChange={e => setZip(e.target.value)} placeholder="20777" />
          </div>
          <div>
            <label className="field-label">Country</label>
            <input className="rp-input" type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="United States" />
          </div>
        </div>

        <div className="section-header">Race Info</div>
        <div style={{ marginBottom:'16px' }}>
          <label className="field-label">Bib Name</label>
          <input className="rp-input" type="text" value={raceName} onChange={e => setRaceName(e.target.value)} placeholder="Ryan" />
          <p style={{ fontSize:'11px', color:'#b0b8c4', margin:'4px 0 0' }}>The name printed on your race bib. Leave blank to use your full name.</p>
        </div>

        <div className="section-header">Emergency Contact</div>
        <div style={{ marginBottom:'10px' }}>
          <label className="field-label">Contact Name</label>
          <input className="rp-input" type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" />
        </div>
        <div style={{ marginBottom:'16px' }}>
          <label className="field-label">Contact Phone</label>
          <input className="rp-input" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>

        <div className="section-header">Running Background</div>
        <div style={{ marginBottom:'14px' }}>
          <label className="field-label">Shirt Size</label>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {SIZES.map(size => (
              <button key={size} className={`size-btn ${shirtSize === size ? 'selected' : ''}`} onClick={() => setShirtSize(size === shirtSize ? '' : size)}>{size}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'14px' }}>
          <label className="field-label">Experience Level</label>
          <select className="rp-select" value={experience} onChange={e => setExperience(e.target.value)}>
            <option value="">Select your level</option>
            <option value="beginner">Beginner — just getting started</option>
            <option value="recreational">Recreational — run for fun</option>
            <option value="intermediate">Intermediate — training regularly</option>
            <option value="competitive">Competitive — racing to place</option>
            <option value="elite">Elite — podium contender</option>
          </select>
        </div>
        <div style={{ marginBottom:'14px' }}>
          <label className="field-label">Favorite Race Distance</label>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {DISTANCES.map(d => (
              <button key={d} className={`dist-btn ${favoriteDistance === d ? 'selected' : ''}`} onClick={() => setFavoriteDistance(d === favoriteDistance ? '' : d)}>{d}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'14px' }}>
          <label className="field-label">Have you run a marathon (26.2)?</label>
          <YesNo value={doneMarathon} onChange={setDoneMarathon} />
        </div>
        {doneMarathon === true && (
          <div style={{ marginBottom:'14px' }}>
            <label className="field-label">Have you completed an IRONMAN triathlon?</label>
            <YesNo value={doneIronman} onChange={setDoneIronman} />
          </div>
        )}

        <div style={{ height:'1px', background:'#f0f2f5', margin:'8px 0 20px' }} />
        <button className="rp-primary" onClick={handleSaveAndContinue} disabled={saving} style={{ marginBottom:'10px' }}>
          {saving ? 'Saving...' : 'Save & Continue →'}
        </button>
        <button className="rp-secondary" onClick={() => navigate('/home')}>Skip for Now</button>

        <div style={{ marginTop:'20px', padding:'14px', background:'#f8f9fb', borderRadius:'6px', border:'1px solid #e2e6ed' }}>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', margin:'0 0 4px' }}>Next Up</p>
          <p style={{ fontSize:'12px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6 }}>
            We'll search <strong style={{ color:'#1B2A4A' }}>RunSignup</strong> for your past results and add them to your Race Passport.
          </p>
        </div>
      </div>
    </div>
  )
}
