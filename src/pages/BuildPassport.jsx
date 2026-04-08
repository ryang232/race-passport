import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isDemo, DEMO_EMAIL, DEMO_FIRST_NAME, DEMO_LAST_NAME, DEMO_DOB } from '../lib/demo'

function ErrorBox({ children }) {
  return (
    <div style={{ background:'rgba(27,42,74,0.06)', border:'1px solid rgba(27,42,74,0.2)', borderRadius:'6px', padding:'12px 14px', fontSize:'13px', marginBottom:'16px', lineHeight:1.6, display:'flex', alignItems:'flex-start', gap:'10px' }}>
      <span style={{ color:'#e53e3e', fontSize:'15px', lineHeight:1.3, flexShrink:0, fontWeight:700 }}>✕</span>
      <span style={{ color:'#1B2A4A' }}>{children}</span>
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
  const [finisherShirtSize, setFinisherShirtSize] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [experience, setExperience] = useState('')
  const [favoriteDistance, setFavoriteDistance] = useState('')
  const [doneMarathon, setDoneMarathon] = useState('')
  const [doneIronman, setDoneIronman] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      // Demo mode — prefill with demo data, no Supabase call needed
      if (!user || isDemo(user?.email) || isDemo(email)) {
        setFirstName(DEMO_FIRST_NAME)
        setLastName(DEMO_LAST_NAME)
        setEmail(DEMO_EMAIL)
        setDob(DEMO_DOB)
        return
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        const metaFirst = user.user_metadata?.first_name
        const metaLast = user.user_metadata?.last_name
        const fullName = data.full_name || user.user_metadata?.full_name || ''
        const parts = fullName.trim().split(' ')
        setFirstName(metaFirst || parts[0] || '')
        setLastName(metaLast || parts.slice(1).join(' ') || '')
        setEmail(user.email || '')
        setPhone(data.phone || '')
        setDob(data.date_of_birth || '')
        setGender(data.gender || '')
        setAddress(data.address || '')
        setCity(data.city || '')
        setState(data.state || '')
        setZip(data.zip_code || '')
        setCountry(data.country || 'United States')
        setRaceName(data.race_name || '')
        setFinisherShirtSize(data.shirt_size || '')
        setContactName(data.emergency_contact_name || '')
        setContactPhone(data.emergency_contact_phone || '')
        setExperience(data.experience_level || '')
        setFavoriteDistance(data.favorite_distance || '')
        setDoneMarathon(data.done_marathon || '')
        setDoneIronman(data.done_ironman || '')
      } else {
        const meta = user.user_metadata || {}
        const fullName = meta.full_name || ''
        const parts = fullName.trim().split(' ')
        setFirstName(meta.first_name || parts[0] || '')
        setLastName(meta.last_name || parts.slice(1).join(' ') || '')
        setEmail(user.email || '')
      }
    }
    loadProfile()

    const style = document.createElement('style')
    style.id = 'rp-bp-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      .rp-input { width:100%; padding:11px 14px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:14px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; transition:border-color 0.15s,background 0.15s; }
      .rp-input:focus { border-color:#C9A84C; background:#fff; }
      .rp-input::placeholder { color:#b0b8c4; }
      .rp-input.readonly { background:#f4f5f7; color:#9aa5b4; cursor:default; }
      .rp-select { width:100%; padding:11px 14px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-size:14px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; appearance:none; cursor:pointer; transition:border-color 0.15s; }
      .rp-select:focus { border-color:#C9A84C; background:#fff; }
      .rp-primary { width:100%; padding:13px; border:none; background:#1B2A4A; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:background 0.2s,transform 0.1s; border-radius:6px; }
      .rp-primary:hover:not(:disabled) { background:#C9A84C; }
      .rp-primary:active:not(:disabled) { transform:scale(0.985); }
      .rp-primary:disabled { opacity:0.5; cursor:not-allowed; }
      .rp-secondary { width:100%; padding:12px; border:1.5px solid #e2e6ed; background:#fff; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; cursor:pointer; transition:border-color 0.2s,background 0.2s; border-radius:6px; }
      .rp-secondary:hover { border-color:#1B2A4A; background:#f8f9fb; }
      .size-btn { padding:9px 0; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.15s; flex:1; }
      .size-btn:hover { border-color:#1B2A4A; }
      .size-btn.selected { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .dist-btn { padding:9px 12px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.15s; }
      .dist-btn:hover { border-color:#1B2A4A; }
      .dist-btn.selected { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .yn-btn { flex:1; padding:10px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.15s; }
      .yn-btn:hover { border-color:#1B2A4A; }
      .yn-btn.sel-yes { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .yn-btn.sel-no { background:#f0f2f5; color:#1B2A4A; border-color:#e2e6ed; }
      .section-header { font-family:'Bebas Neue',sans-serif; font-size:20px; color:#1B2A4A; letter-spacing:1px; padding:14px 0 8px; border-bottom:2px solid #1B2A4A; margin-bottom:14px; margin-top:8px; }
      .field-label { display:block; font-size:10px; font-weight:600; letter-spacing:1.5px; color:#9aa5b4; margin-bottom:5px; text-transform:uppercase; font-family:'Barlow Condensed',sans-serif; }
    `
    if (!document.getElementById('rp-bp-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-bp-styles')?.remove()
  }, [user])

  const handleSaveAndContinue = async () => {
    setError(null)
    if (!firstName.trim() || !lastName.trim() || !dob.trim()) {
      setError(
        <span>
          <strong>First name, last name, and date of birth are required</strong> to search for your past race results on RunSignup and Athlinks.
          <br /><br />
          If you'd like to set this up later, press <strong>Skip for Now</strong> below.
        </span>
      )
      return
    }

    // Demo mode — skip Supabase, go straight to race import
    if (isDemo(email)) {
      navigate('/race-import')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: `${firstName.trim()} ${lastName.trim()}`,
      race_name: raceName.trim() || null,
      phone: phone.trim() || null,
      emergency_contact_name: contactName.trim() || null,
      emergency_contact_phone: contactPhone.trim() || null,
      date_of_birth: dob || null,
      gender: gender || null,
      shirt_size: finisherShirtSize || null,
      experience_level: experience || null,
      favorite_distance: favoriteDistance || null,
      done_marathon: doneMarathon || null,
      done_ironman: doneMarathon === 'yes' ? (doneIronman || null) : null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      zip_code: zip.trim() || null,
      country: country.trim() || null,
    }).eq('id', user?.id)
    setSaving(false)
    if (error) setError('Something went wrong saving your profile. Please try again.')
    else navigate('/race-import')
  }

  const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']
  const SIZES = ['XS','S','M','L','XL','XXL','XXXL']
  const DISTANCES = ['5K','10K','13.1','26.2','Other']

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily:"'Barlow',sans-serif", padding:'40px 0' }}>
      <div style={{ position:'fixed', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.055)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>

      <div style={{ position:'relative', zIndex:10, background:'#fff', borderRadius:'4px', padding:'36px 36px 32px', width:'100%', maxWidth:'460px', margin:'20px', boxShadow:'0 2px 40px rgba(27,42,74,0.10),0 0 0 1px rgba(27,42,74,0.07)' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'34px', color:'#1B2A4A', margin:'0 0 4px', letterSpacing:'1.5px', lineHeight:1 }}>BUILD YOUR PASSPORT</h1>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', letterSpacing:'2.5px', color:'#9aa5b4', margin:'0 0 12px', textTransform:'uppercase' }}>Step 1 of 2 — Your Racing Profile</p>
          <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginBottom:'14px' }}>
            <div style={{ height:'3px', width:'40px', background:'#C9A84C', borderRadius:'2px' }} />
            <div style={{ height:'3px', width:'40px', background:'#e2e6ed', borderRadius:'2px' }} />
          </div>
        </div>

        {/* Next Up */}
        <div style={{ marginBottom:'16px', padding:'14px', background:'#f8f9fb', borderRadius:'6px', border:'1px solid #e2e6ed' }}>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', margin:'0 0 4px' }}>Next Up — Step 2 of 2</p>
          <p style={{ fontSize:'12px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6 }}>
            We'll search <strong style={{ color:'#1B2A4A' }}>RunSignup</strong> and <strong style={{ color:'#1B2A4A' }}>Athlinks</strong> for your past results. <strong style={{ color:'#1B2A4A' }}>First name, last name, and date of birth</strong> are required for this search.
          </p>
        </div>

        {/* Why we ask */}
        <div style={{ marginBottom:'16px', padding:'12px 14px', background:'#f8f9fb', borderRadius:'6px', border:'1px solid #e2e6ed' }}>
          <p style={{ fontSize:'12px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6 }}>
            <strong style={{ color:'#1B2A4A' }}>Why do we ask for this?</strong> When you find a race through Race Passport, you're currently directed to the race's own registration page. In a future version, you'll be able to register directly inside Race Passport using the details below.
          </p>
        </div>

        {/* Skip banner */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f8f9fb', border:'1px solid #e2e6ed', borderRadius:'6px', padding:'10px 14px', marginBottom:'16px' }}>
          <span style={{ fontSize:'12px', color:'#6b7a8d', fontWeight:300 }}>This can wait — explore Race Passport first.</span>
          <button onClick={() => navigate('/home')} style={{ background:'none', border:'none', color:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', cursor:'pointer', textTransform:'uppercase', padding:0, flexShrink:0, marginLeft:'12px' }}>Skip →</button>
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        {/* YOUR RACE PASSPORT INFORMATION */}
        <div className="section-header">Your Race Passport Information</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          <div>
            <label className="field-label">First Name <span style={{ color:'#C9A84C' }}>*</span></label>
            <input className="rp-input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="William" />
          </div>
          <div>
            <label className="field-label">Last Name <span style={{ color:'#C9A84C' }}>*</span></label>
            <input className="rp-input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
          </div>
        </div>

        <div style={{ marginBottom:'10px' }}>
          <label className="field-label">Email</label>
          <input className="rp-input readonly" type="email" value={email} readOnly />
        </div>

        <div style={{ marginBottom:'10px' }}>
          <label className="field-label">Phone Number</label>
          <input className="rp-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          <div>
            <label className="field-label">Date of Birth <span style={{ color:'#C9A84C' }}>*</span></label>
            <input className="rp-input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
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
            <input className="rp-input" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="New York" />
          </div>
          <div>
            <label className="field-label">State</label>
            <input className="rp-input" type="text" value={state} onChange={e => setState(e.target.value)} placeholder="NY" />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
          <div>
            <label className="field-label">Zip Code</label>
            <input className="rp-input" type="text" value={zip} onChange={e => setZip(e.target.value)} placeholder="10001" />
          </div>
          <div>
            <label className="field-label">Country</label>
            <input className="rp-input" type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="United States" />
          </div>
        </div>

        {/* RACE INFO */}
        <div className="section-header">Race Info</div>

        <div style={{ marginBottom:'12px' }}>
          <label className="field-label">Race Name (Bib Name)</label>
          <input className="rp-input" type="text" value={raceName} onChange={e => setRaceName(e.target.value)} placeholder="Billy" />
          <p style={{ fontSize:'11px', color:'#b0b8c4', margin:'4px 0 0' }}>The name that appears on your bib. Leave blank to use your full name.</p>
        </div>

        <div style={{ marginBottom:'16px' }}>
          <label className="field-label">Finisher Shirt Size</label>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {SIZES.map(size => (
              <button key={size} className={`size-btn ${finisherShirtSize === size ? 'selected' : ''}`} onClick={() => setFinisherShirtSize(size === finisherShirtSize ? '' : size)}>{size}</button>
            ))}
          </div>
        </div>

        {/* EMERGENCY CONTACT */}
        <div className="section-header">Emergency Contact</div>

        <div style={{ marginBottom:'10px' }}>
          <label className="field-label">Contact Name</label>
          <input className="rp-input" type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" />
        </div>
        <div style={{ marginBottom:'16px' }}>
          <label className="field-label">Contact Phone</label>
          <input className="rp-input" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>

        {/* RUNNING BACKGROUND */}
        <div className="section-header">Running Background</div>

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
          <label className="field-label">Favorite Distance</label>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {DISTANCES.map(d => (
              <button key={d} className={`dist-btn ${favoriteDistance === d ? 'selected' : ''}`} onClick={() => setFavoriteDistance(d === favoriteDistance ? '' : d)}>{d}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:'14px' }}>
          <label className="field-label">Have you ever run a Marathon?</label>
          <div style={{ display:'flex', gap:'8px' }}>
            <button className={`yn-btn ${doneMarathon === 'yes' ? 'sel-yes' : ''}`} onClick={() => setDoneMarathon('yes')}>Yes</button>
            <button className={`yn-btn ${doneMarathon === 'no' ? 'sel-no' : ''}`} onClick={() => { setDoneMarathon('no'); setDoneIronman('') }}>No</button>
          </div>
        </div>

        {doneMarathon === 'yes' && (
          <div style={{ marginBottom:'14px' }}>
            <label className="field-label">Have you done a Half or Full Ironman?</label>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className={`yn-btn ${doneIronman === 'yes' ? 'sel-yes' : ''}`} onClick={() => setDoneIronman('yes')}>Yes</button>
              <button className={`yn-btn ${doneIronman === 'no' ? 'sel-no' : ''}`} onClick={() => setDoneIronman('no')}>No</button>
            </div>
          </div>
        )}

        <div style={{ marginBottom:'24px', padding:'12px 14px', background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'6px' }}>
          <p style={{ fontSize:'11px', color:'#6b7a8d', margin:0, fontWeight:300, lineHeight:1.6 }}>
            <span style={{ color:'#C9A84C', fontWeight:600 }}>Why we ask:</span> We use your experience level, favorite distance, and race history to suggest the right races for you — including your next big challenge.
          </p>
        </div>

        <button className="rp-primary" onClick={handleSaveAndContinue} disabled={saving} style={{ marginBottom:'10px' }}>
          {saving ? 'Saving...' : 'Save & Continue →'}
        </button>
        <button className="rp-secondary" onClick={() => navigate('/home')}>Skip for Now</button>

      </div>
    </div>
  )
}
