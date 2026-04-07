import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function BuildPassport() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [raceName, setRaceName] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [shirtSize, setShirtSize] = useState('')
  const [experience, setExperience] = useState('')
  const [favDistance, setFavDistance] = useState('')

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1px solid rgba(27,42,74,0.15)',
    background: '#ffffff', fontFamily: 'Barlow, sans-serif', fontSize: '14px',
    color: '#1B2A4A', outline: 'none', borderRadius: '2px', boxSizing: 'border-box'
  }
  const labelStyle = {
    display: 'block', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px',
    fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase',
    color: 'rgba(27,42,74,0.45)', marginBottom: '5px'
  }
  const sectionLabel = (text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px', marginBottom: '10px' }}>
      <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)' }}>{text}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(27,42,74,0.08)' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Barlow, sans-serif', padding: '40px 24px' }}>

      {/* Background ticker */}
      <div style={{ position: 'fixed', top: '50%', left: 0, transform: 'translateY(-50%)', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {['26.2', '13.1', '10K', '5K', '70.3', '140.6', '26.2', '13.1', '10K'].map((item, i) => (
          <span key={i} style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(100px, 15vw, 180px)', color: 'transparent', WebkitTextStroke: '1px rgba(27,42,74,0.06)', lineHeight: 1, padding: '0 16px', userSelect: 'none' }}>{item}</span>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ width: '9px', height: '9px', background: '#C9A84C', borderRadius: '50%' }} />
          <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '22px', letterSpacing: '0.18em', color: '#1B2A4A' }}>Race Passport</span>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '32px', letterSpacing: '0.04em', color: '#1B2A4A', lineHeight: 1, marginBottom: '6px' }}>Build Your Passport</h1>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.4)' }}>Step 2 of 2 — Your racing profile</p>
        </div>

        {/* Step indicator — both gold */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ width: '28px', height: '4px', background: '#C9A84C', borderRadius: '2px' }} />
          <div style={{ width: '28px', height: '4px', background: '#C9A84C', borderRadius: '2px' }} />
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '8px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.4)', marginLeft: '4px' }}>Account · Profile</span>
        </div>

        {/* Skip banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', padding: '10px 14px', marginBottom: '10px' }}>
          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '12px', fontWeight: 300, color: 'rgba(27,42,74,0.55)', lineHeight: 1.4 }}>This can wait — explore Race Passport first.</span>
          <span onClick={() => navigate('/home')} style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A84C', cursor: 'pointer', marginLeft: '10px', flexShrink: 0 }}>Skip →</span>
        </div>

        {/* Editable note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#C9A84C" strokeWidth="1"/><path d="M6 5v3M6 4v.4" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round"/></svg>
          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '10px', fontWeight: 300, color: 'rgba(27,42,74,0.4)', fontStyle: 'italic' }}>All fields can be updated anytime from your profile settings.</span>
        </div>

        {/* Your Name */}
        {sectionLabel('Your Name')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="William" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(27,42,74,0.15)'} />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(27,42,74,0.15)'} />
          </div>
        </div>
        <div style={{ marginBottom: '4px' }}>
          <label style={labelStyle}>Race Name</label>
          <input type="text" value={raceName} onChange={e => setRaceName(e.target.value)} placeholder="Billy" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(27,42,74,0.15)'} />
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '10px', fontWeight: 300, color: 'rgba(27,42,74,0.35)', marginTop: '4px', fontStyle: 'italic' }}>The name that appears on your bib. Leave blank to use your full name.</p>
        </div>

        {/* Emergency Contact */}
        {sectionLabel('Emergency Contact')}
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Contact Name</label>
          <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Full name" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(27,42,74,0.15)'} />
        </div>
        <div style={{ marginBottom: '4px' }}>
          <label style={labelStyle}>Contact Phone</label>
          <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(27,42,74,0.15)'} />
        </div>

        {/* Personal Info */}
        {sectionLabel('Personal Info')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <input type="text" value={dob} onChange={e => setDob(e.target.value)} placeholder="MM / DD / YYYY" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(27,42,74,0.15)'} />
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...inputStyle, color: gender ? '#1B2A4A' : 'rgba(27,42,74,0.35)', appearance: 'none' }}>
              <option value="" disabled>Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Non-binary</option>
              <option>Prefer not to say</option>
            </select>
          </div>
        </div>

        {/* Shirt Size */}
        {sectionLabel('Shirt Size')}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          {SHIRT_SIZES.map(size => (
            <button key={size} onClick={() => setShirtSize(size)}
              style={{ padding: '8px 16px', border: `1px solid ${shirtSize === size ? '#1B2A4A' : 'rgba(27,42,74,0.14)'}`, background: shirtSize === size ? '#1B2A4A' : '#ffffff', color: shirtSize === size ? '#ffffff' : 'rgba(27,42,74,0.45)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.15s' }}>
              {size}
            </button>
          ))}
        </div>

        {/* Running Background */}
        {sectionLabel('Running Background')}
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>Experience Level</label>
          <select value={experience} onChange={e => setExperience(e.target.value)} style={{ ...inputStyle, color: experience ? '#1B2A4A' : 'rgba(27,42,74,0.35)', appearance: 'none' }}>
            <option value="" disabled>Select your level</option>
            <option>Beginner — just getting started</option>
            <option>Casual — a few races a year</option>
            <option>Intermediate — regular racer</option>
            <option>Advanced — competitive runner</option>
            <option>Elite — podium contender</option>
          </select>
        </div>
        <div style={{ marginBottom: '4px' }}>
          <label style={labelStyle}>Favourite Distance</label>
          <select value={favDistance} onChange={e => setFavDistance(e.target.value)} style={{ ...inputStyle, color: favDistance ? '#1B2A4A' : 'rgba(27,42,74,0.35)', appearance: 'none' }}>
            <option value="" disabled>Select a distance</option>
            <option>5K</option>
            <option>10K</option>
            <option>Half Marathon</option>
            <option>Full Marathon</option>
            <option>Ultra / Trail</option>
            <option>Triathlon</option>
          </select>
        </div>

        {/* Search callout */}
        <div style={{ background: 'rgba(27,42,74,0.03)', border: '1px solid rgba(27,42,74,0.1)', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '20px 0 16px' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="7" cy="7" r="5" stroke="#C9A84C" strokeWidth="1.2"/><path d="M11 11l2.5 2.5" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <div>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1B2A4A', marginBottom: '4px' }}>Next up — we'll find your race history</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '12px', fontWeight: 300, color: 'rgba(27,42,74,0.5)', lineHeight: 1.6 }}>Using your name and date of birth, we'll automatically search Athlinks and RunSignUp for your past results and turn them into passport stamps.</div>
          </div>
        </div>

        {/* Find results button */}
        <button onClick={() => navigate('/home')}
          style={{ width: '100%', padding: '15px', background: '#C9A84C', color: '#ffffff', border: 'none', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '13px', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '2px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onMouseEnter={e => e.currentTarget.style.background = '#b8963e'}
          onMouseLeave={e => e.currentTarget.style.background = '#C9A84C'}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#fff" strokeWidth="1.5"/><path d="M11 11l2.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Find My Race Results →
        </button>

        <p onClick={() => navigate('/home')} style={{ textAlign: 'center', fontFamily: 'Barlow, sans-serif', fontSize: '12px', fontWeight: 300, color: 'rgba(27,42,74,0.35)', cursor: 'pointer', marginBottom: '20px' }}>
          Skip for now — I'll add races later
        </p>

      </div>
    </div>
  )
}
