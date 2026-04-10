import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SIZES = ['XS','S','M','L','XL','XXL','XXXL']
const DISTANCES = ['5K','10K','10 Mile','Half Marathon','Marathon','Ultra','Triathlon']

function DobPicker({ value, onChange }) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length:100 }, (_,i) => currentYear - 18 - i)
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')

  useEffect(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-')
      if (parts.length === 3) { setYear(parts[0]); setMonth(String(parseInt(parts[1]))); setDay(String(parseInt(parts[2]))) }
    }
  }, [value])

  const daysInMonth = month && year ? new Date(parseInt(year), parseInt(month), 0).getDate() : 31
  const days = Array.from({ length:daysInMonth }, (_,i) => i+1)
  const sel = { padding:'9px 12px', borderRadius:'6px', border:'1.5px solid #e2e6ed', background:'#fafbfc', color:'#1B2A4A', fontSize:'13px', fontFamily:"'Barlow',sans-serif", outline:'none', appearance:'none', cursor:'pointer', width:'100%', transition:'border-color 0.15s' }
  const fire = (m, d, y) => { if (m && d && y) onChange(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`) }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 1.4fr', gap:'8px' }}>
      <select value={month} style={sel} onChange={e => { setMonth(e.target.value); fire(e.target.value,day,year) }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Month</option>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
      </select>
      <select value={day} style={sel} onChange={e => { setDay(e.target.value); fire(month,e.target.value,year) }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Day</option>{days.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={year} style={sel} onChange={e => { setYear(e.target.value); fire(month,day,e.target.value) }} onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'}>
        <option value="">Year</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:'8px' }}>
      {['Yes','No'].map(opt => (
        <button key={opt} onClick={() => onChange(opt==='Yes')}
          style={{ flex:1, padding:'9px', border:'1.5px solid', borderRadius:'6px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', cursor:'pointer', transition:'all 0.15s',
            background:(value===true&&opt==='Yes')||(value===false&&opt==='No')?'#1B2A4A':'#fafbfc',
            borderColor:(value===true&&opt==='Yes')||(value===false&&opt==='No')?'#1B2A4A':'#e2e6ed',
            color:(value===true&&opt==='Yes')||(value===false&&opt==='No')?'#fff':'#9aa5b4' }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background:'#fff', borderRadius:'16px', border:'1px solid #e8eaed', marginBottom:'20px', overflow:'hidden' }}>
      <div style={{ padding:'18px 24px 14px', borderBottom:'1px solid #f0f2f5' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#1B2A4A', letterSpacing:'1px' }}>{title}</div>
      </div>
      <div style={{ padding:'20px 24px' }}>{children}</div>
    </div>
  )
}

function Field({ label, children, note }) {
  return (
    <div style={{ marginBottom:'14px' }}>
      <label style={{ display:'block', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'5px' }}>{label}</label>
      {children}
      {note && <p style={{ fontSize:'11px', color:'#b0b8c4', margin:'4px 0 0', fontFamily:"'Barlow',sans-serif" }}>{note}</p>}
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
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
  const [savingSection, setSavingSection] = useState(null)
  const [savedSection, setSavedSection] = useState(null)

  const inp = { width:'100%', padding:'10px 13px', borderRadius:'6px', border:'1.5px solid #e2e6ed', background:'#fafbfc', color:'#1B2A4A', fontSize:'14px', fontFamily:"'Barlow',sans-serif", outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }
  const inpRO = { ...inp, background:'#f4f5f7', color:'#6b7a8d', cursor:'default' }
  const sel = { ...inp, appearance:'none', cursor:'pointer' }

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) {
        setProfile({ full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}` })
        setFirstName(DEMO_FIRST_NAME); setLastName(DEMO_LAST_NAME)
        setEmail('demo@racepassport.app')
        return
      }
      setEmail(user.email || '')
      const meta = user.user_metadata || {}
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      if (data) {
        const fn = meta.first_name || data.full_name?.split(' ')[0] || ''
        const ln = meta.last_name || data.full_name?.split(' ').slice(1).join(' ') || ''
        setFirstName(fn); setLastName(ln)
        setBio(data.bio || '')
        setPhone(data.phone || '')
        setDob(data.date_of_birth || '')
        setGender(data.gender || '')
        setAddress(data.address || '')
        setCity(data.city || '')
        setState(data.state || '')
        setZip(data.zip_code || '')
        setCountry(data.country || 'United States')
        setRaceName(data.race_name || '')
        setContactName(data.emergency_contact_name || '')
        setContactPhone(data.emergency_contact_phone || '')
        setShirtSize(data.shirt_size || '')
        setExperience(data.experience_level || '')
        setFavoriteDistance(data.favorite_distance || '')
        if (data.done_marathon != null) setDoneMarathon(data.done_marathon)
        if (data.done_ironman != null) setDoneIronman(data.done_ironman)
      }
    }
    loadProfile()

    const style = document.createElement('style')
    style.id = 'rp-profile-settings-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
      .nav-tab { display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 24px; height:64px; justify-content:center; cursor:pointer; border:none; background:none; color:#9aa5b4; transition:color 0.15s; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; border-bottom:2px solid transparent; white-space:nowrap; }
      .nav-tab.active { color:#1B2A4A; border-bottom-color:#C9A84C; }
      .nav-tab:hover { color:#1B2A4A; }
      .dropdown-item { display:block; width:100%; padding:10px 18px; background:none; border:none; text-align:left; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:1px; color:#1B2A4A; cursor:pointer; transition:background 0.1s; }
      .dropdown-item:hover { background:#f4f5f7; }
      .size-btn { padding:9px 0; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.15s; flex:1; }
      .size-btn:hover { border-color:#1B2A4A; }
      .size-btn.selected { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .dist-btn { padding:8px 4px; border-radius:6px; border:1.5px solid #e2e6ed; background:#fafbfc; color:#1B2A4A; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:1px; cursor:pointer; transition:all 0.15s; flex:1; text-align:center; }
      .dist-btn:hover { border-color:#1B2A4A; }
      .dist-btn.selected { background:#1B2A4A; color:#fff; border-color:#1B2A4A; }
      .save-btn { padding:9px 22px; border:none; background:#1B2A4A; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; color:#fff; cursor:pointer; text-transform:uppercase; transition:background 0.15s; }
      .save-btn:hover { background:#C9A84C; }
      .save-btn.saved { background:#16a34a; }
    `
    if (!document.getElementById('rp-profile-settings-styles')) document.head.appendChild(style)
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-profile-settings-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user])

  const saveSection = async (section, updates) => {
    setSavingSection(section)
    try {
      await supabase.from('profiles').update({ ...updates, full_name:`${firstName.trim()} ${lastName.trim()}` }).eq('id', user?.id)
      setSavedSection(section)
      setTimeout(() => setSavedSection(null), 2000)
    } catch (e) {}
    setSavingSection(null)
  }

  const initials = `${firstName[0]||''}${lastName[0]||''}`.toUpperCase() || 'RG'
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }

  const SaveButton = ({ section, updates }) => (
    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'16px' }}>
      <button className={`save-btn ${savedSection===section?'saved':''}`} disabled={savingSection===section}
        onClick={() => saveSection(section, updates)}>
        {savingSection===section ? 'Saving...' : savedSection===section ? '✓ Saved' : 'Save Changes'}
      </button>
    </div>
  )

  const NAV_TABS = [
    { label:'Home', path:'/home', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile', path:'/profile', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif" }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(8px)', borderBottom:'1px solid #e8eaed', boxShadow:'0 1px 8px rgba(27,42,74,0.06)', display:'flex', alignItems:'stretch', justifyContent:'space-between', padding:'0 40px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', alignItems:'stretch' }}>
          {NAV_TABS.map(tab => (
            <button key={tab.path} className={`nav-tab ${location.pathname===tab.path?'active':''}`} onClick={() => navigate(tab.path)}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        <div ref={dropdownRef} style={{ position:'relative', display:'flex', alignItems:'center' }}>
          <div onClick={() => setShowDropdown(!showDropdown)}
            style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid #e2e6ed', transition:'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#e2e6ed'}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C' }}>{initials}</span>
          </div>
          {showDropdown && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'#fff', border:'1px solid #e2e6ed', borderRadius:'10px', boxShadow:'0 8px 32px rgba(27,42,74,0.14)', minWidth:'190px', overflow:'hidden', zIndex:100 }}>
              <div style={{ padding:'14px 18px 10px', borderBottom:'1px solid #f0f2f5' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A' }}>{firstName} {lastName}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{email}</div>
              </div>
              <button className="dropdown-item" onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
              <div style={{ height:'1px', background:'#f0f2f5' }} />
              <button className="dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut}>Log Out</button>
            </div>
          )}
        </div>
      </div>

      {/* PAGE HEADER */}
      <div style={{ background:'#1B2A4A', padding:'32px 40px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:0, top:'-10px', fontFamily:"'Bebas Neue',sans-serif", fontSize:'160px', color:'transparent', WebkitTextStroke:'1px rgba(255,255,255,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>SETTINGS</div>
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:'20px' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'#2a3f6a', border:'3px solid #C9A84C', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:'#C9A84C', letterSpacing:'2px' }}>{initials}</span>
          </div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(24px,4vw,40px)', color:'#fff', letterSpacing:'2px', lineHeight:1, marginBottom:'4px' }}>{firstName.toUpperCase()} {lastName.toUpperCase()}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.45)', letterSpacing:'1px' }}>{email}</div>
          </div>
          <div style={{ marginLeft:'auto' }}>
            <button onClick={() => navigate(`/ryan-groene`)}
              style={{ padding:'8px 18px', border:'1.5px solid rgba(201,168,76,0.5)', borderRadius:'8px', background:'rgba(201,168,76,0.08)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(201,168,76,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(201,168,76,0.08)' }}>
              View Public Profile →
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'28px 40px 80px' }}>

        {/* ACCOUNT */}
        <Section title="Account">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <Field label="First Name">
              <input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ryan"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
            <Field label="Last Name">
              <input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Groene"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
          </div>
          <Field label="Email" note="Your login email. Contact support to change it.">
            <input style={inpRO} value={email} readOnly />
          </Field>
          <Field label="Bio">
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="One sentence about your racing journey..."
              style={{ ...inp, minHeight:'80px', resize:'vertical', lineHeight:1.6 }}
              onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
          </Field>
          <SaveButton section="account" updates={{ bio }} />
        </Section>

        {/* PASSPORT INFO */}
        <Section title="Race Passport Info">
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', lineHeight:1.6, marginBottom:'16px', marginTop:0 }}>
            Used to pre-fill race registrations when direct registration inside Race Passport launches.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <Field label="Phone">
              <input style={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
            <Field label="Bib Name" note="Leave blank to use your full name.">
              <input style={inp} value={raceName} onChange={e => setRaceName(e.target.value)} placeholder="Ryan"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
          </div>
          <Field label="Date of Birth">
            <DobPicker value={dob} onChange={setDob} />
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <Field label="Gender">
              <select style={sel} value={gender} onChange={e => setGender(e.target.value)}
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </Field>
            <Field label="Shirt Size">
              <div style={{ display:'flex', gap:'4px' }}>
                {SIZES.map(s => <button key={s} className={`size-btn ${shirtSize===s?'selected':''}`} onClick={() => setShirtSize(s===shirtSize?'':s)}>{s}</button>)}
              </div>
            </Field>
          </div>
          <Field label="Street Address">
            <input style={inp} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St"
              onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1.5fr', gap:'12px' }}>
            <Field label="City">
              <input style={inp} value={city} onChange={e => setCity(e.target.value)} placeholder="Highland"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
            <Field label="State">
              <input style={inp} value={state} onChange={e => setState(e.target.value)} placeholder="MD"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
            <Field label="Zip">
              <input style={inp} value={zip} onChange={e => setZip(e.target.value)} placeholder="20777"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
            <Field label="Country">
              <input style={inp} value={country} onChange={e => setCountry(e.target.value)} placeholder="United States"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
          </div>
          <SaveButton section="passport" updates={{ phone, race_name:raceName, date_of_birth:dob, gender, shirt_size:shirtSize, address, city, state, zip_code:zip, country }} />
        </Section>

        {/* EMERGENCY CONTACT */}
        <Section title="Emergency Contact">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <Field label="Contact Name">
              <input style={inp} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
            <Field label="Contact Phone">
              <input style={inp} type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 (555) 000-0000"
                onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'} />
            </Field>
          </div>
          <SaveButton section="emergency" updates={{ emergency_contact_name:contactName, emergency_contact_phone:contactPhone }} />
        </Section>

        {/* RUNNING BACKGROUND */}
        <Section title="Running Background">
          <Field label="Experience Level">
            <select style={sel} value={experience} onChange={e => setExperience(e.target.value)}
              onFocus={e => e.target.style.borderColor='#C9A84C'} onBlur={e => e.target.style.borderColor='#e2e6ed'}>
              <option value="">Select your level</option>
              <option value="beginner">Beginner — just getting started</option>
              <option value="recreational">Recreational — run for fun</option>
              <option value="intermediate">Intermediate — training regularly</option>
              <option value="competitive">Competitive — racing to place</option>
              <option value="elite">Elite — podium contender</option>
            </select>
          </Field>
          <Field label="Favorite Race Distance">
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {DISTANCES.map(d => <button key={d} className={`dist-btn ${favoriteDistance===d?'selected':''}`} onClick={() => setFavoriteDistance(d===favoriteDistance?'':d)}>{d}</button>)}
            </div>
          </Field>
          <Field label="Have you run a marathon?">
            <YesNo value={doneMarathon} onChange={setDoneMarathon} />
          </Field>
          {doneMarathon === true && (
            <Field label="Have you completed an IRONMAN?">
              <YesNo value={doneIronman} onChange={setDoneIronman} />
            </Field>
          )}
          <SaveButton section="background" updates={{ experience_level:experience, favorite_distance:favoriteDistance, done_marathon:doneMarathon, done_ironman:doneIronman }} />
        </Section>

        {/* CONNECTED ACCOUNTS */}
        <Section title="Connected Accounts">
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {[
              { name:'Strava', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>, bg:'#FC4C02', connected:false, desc:'Sync activities, miles, and PRs automatically' },
              { name:'RunSignup', icon:<span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'11px', color:'#2563EB' }}>RS</span>, bg:'#2563EB', connected:false, desc:'Import your full race registration history' },
              { name:'Athlinks', icon:<span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'10px', color:'#7c3aed' }}>AT</span>, bg:'#7c3aed', connected:false, desc:'Pull in race results from thousands of events' },
            ].map(acct => (
              <div key={acct.name} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', background:'#f8f9fb', border:'1.5px solid #e8eaed', borderRadius:'10px' }}>
                <div style={{ width:38, height:38, borderRadius:'8px', background:acct.bg+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {acct.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:'#1B2A4A', letterSpacing:'0.5px' }}>{acct.name}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>{acct.desc}</div>
                </div>
                <button style={{ padding:'7px 16px', border:'1.5px solid #1B2A4A', borderRadius:'7px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', whiteSpace:'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.background='#1B2A4A'; e.currentTarget.style.color='#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#1B2A4A' }}>
                  {acct.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* DANGER ZONE */}
        <div style={{ background:'#fff', borderRadius:'16px', border:'1.5px solid rgba(197,48,48,0.2)', overflow:'hidden' }}>
          <div style={{ padding:'18px 24px 14px', borderBottom:'1px solid rgba(197,48,48,0.1)' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', color:'#c53030', letterSpacing:'1px' }}>Danger Zone</div>
          </div>
          <div style={{ padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'20px' }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:600, color:'#1B2A4A', marginBottom:'3px' }}>Delete Account</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#9aa5b4', lineHeight:1.5 }}>Permanently delete your account and all race data. This cannot be undone.</div>
            </div>
            <button style={{ padding:'8px 20px', border:'1.5px solid rgba(197,48,48,0.4)', borderRadius:'8px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', color:'#c53030', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0 }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(197,48,48,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background='#fff' }}>
              Delete Account
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
