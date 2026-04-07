import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function BuildPassport() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [raceName, setRaceName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [shirtSize, setShirtSize] = useState('')
  const [experience, setExperience] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-bp-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes tickerScroll {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      .rp-input {
        width: 100%; padding: 11px 14px;
        border-radius: 6px;
        border: 1.5px solid #e2e6ed;
        background: #fafbfc;
        color: #1B2A4A; font-size: 14px;
        font-family: 'Barlow', sans-serif;
        outline: none; box-sizing: border-box;
        transition: border-color 0.15s, background 0.15s;
      }
      .rp-input:focus { border-color: #C9A84C; background: #fff; }
      .rp-input::placeholder { color: #b0b8c4; }
      .rp-select {
        width: 100%; padding: 11px 14px;
        border-radius: 6px;
        border: 1.5px solid #e2e6ed;
        background: #fafbfc;
        color: #1B2A4A; font-size: 14px;
        font-family: 'Barlow', sans-serif;
        outline: none; box-sizing: border-box;
        appearance: none;
        transition: border-color 0.15s;
        cursor: pointer;
      }
      .rp-select:focus { border-color: #C9A84C; background: #fff; }
      .rp-primary {
        width: 100%; padding: 13px;
        border: none; background: #1B2A4A;
        color: #fff;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 13px; font-weight: 600;
        letter-spacing: 0.25em; text-transform: uppercase;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
        border-radius: 6px;
      }
      .rp-primary:hover:not(:disabled) { background: #C9A84C; }
      .rp-primary:active:not(:disabled) { transform: scale(0.985); }
      .rp-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .rp-secondary {
        width: 100%; padding: 12px;
        border: 1.5px solid #e2e6ed;
        background: #fff; color: #1B2A4A;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 13px; font-weight: 600;
        letter-spacing: 0.25em; text-transform: uppercase;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        border-radius: 6px;
      }
      .rp-secondary:hover { border-color: #1B2A4A; background: #f8f9fb; }
      .size-btn {
        padding: 9px 0;
        border-radius: 6px;
        border: 1.5px solid #e2e6ed;
        background: #fafbfc;
        color: #1B2A4A;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 13px; font-weight: 600;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.15s;
        flex: 1;
      }
      .size-btn:hover { border-color: #1B2A4A; }
      .size-btn.selected { background: #1B2A4A; color: #fff; border-color: #1B2A4A; }
      .field-label {
        display: block; font-size: '10px'; font-weight: 600;
        letter-spacing: 1.5px; color: #9aa5b4;
        margin-bottom: 5px; text-transform: uppercase;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 10px;
      }
      .section-divider {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 9px; font-weight: 600;
        letter-spacing: 2px; color: #9aa5b4;
        text-transform: uppercase;
        padding: 10px 0 6px;
        border-bottom: 1px solid #f0f2f5;
        margin-bottom: 12px;
      }
    `
    if (!document.getElementById('rp-bp-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-bp-styles')?.remove()
  }, [])

  const handleSaveAndContinue = async () => {
    setError(null)

    // Validate required fields
    if (!firstName.trim() || !lastName.trim() || !dob.trim()) {
      setError(
        <span>
          <strong>First name, last name, and date of birth are required</strong> to search for your past race results on RunSignup.
          <br /><br />
          If you'd like to skip this and set up your passport later, press <strong>Skip for Now</strong> below.
        </span>
      )
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        race_name: raceName.trim() || null,
        emergency_contact_name: contactName.trim() || null,
        emergency_contact_phone: contactPhone.trim() || null,
        date_of_birth: dob || null,
        gender: gender || null,
        shirt_size: shirtSize || null,
        experience_level: experience || null,
      })
      .eq('id', user?.id)

    setSaving(false)

    if (error) {
      setError('Something went wrong saving your profile. Please try again.')
    } else {
      navigate('/home')
    }
  }

  const handleSkip = () => {
    navigate('/home')
  }

  const TICKER = ['26.2', '13.1', '10K', '5K', '70.3', '140.6', '50K', '100M', '26.2', '13.1', '10K', '5K', '70.3', '140.6', '50K', '100M']
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: "'Barlow', sans-serif", padding: '40px 0' }}>

      {/* Ghost ticker */}
      <div style={{ position: 'fixed', top: '50%', transform: 'translateY(-55%)', left: 0, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', animation: 'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d, i) => (
            <span key={i} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(180px, 24vw, 340px)', color: 'transparent', WebkitTextStroke: '1px rgba(27,42,74,0.055)', lineHeight: 1, padding: '0 40px', userSelect: 'none', flexShrink: 0 }}>{d}</span>
          ))}
        </div>
      </div>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 10, background: '#fff', borderRadius: '4px', padding: '36px 36px 32px', width: '100%', maxWidth: '440px', margin: '20px', boxShadow: '0 2px 40px rgba(27,42,74,0.10), 0 0 0 1px rgba(27,42,74,0.07)' }}>

        {/* Wordmark + header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', letterSpacing: '3.5px', color: '#1B2A4A' }}>RACE PASSPORT</span>
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '34px', color: '#1B2A4A', margin: '0 0 4px', letterSpacing: '1.5px', lineHeight: 1 }}>BUILD YOUR PASSPORT</h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', letterSpacing: '2.5px', color: '#9aa5b4', margin: '0 0 14px', textTransform: 'uppercase' }}>Step 1 of 2 — Your Racing Profile</p>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ height: '3px', width: '40px', background: '#C9A84C', borderRadius: '2px' }} />
            <div style={{ height: '3px', width: '40px', background: '#e2e6ed', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Skip banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9fb', border: '1px solid #e2e6ed', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#6b7a8d', fontWeight: 300 }}>This can wait — explore Race Passport first.</span>
          <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: '#C9A84C', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase', padding: 0, flexShrink: 0, marginLeft: '12px' }}>Skip →</button>
        </div>

        <p style={{ fontSize: '11px', color: '#9aa5b4', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#9aa5b4"/><path d="M6 5.5V8.5M6 3.5V4" stroke="#9aa5b4" strokeWidth="1.2" strokeLinecap="round"/></svg>
          All fields can be updated anytime from your profile settings.
        </p>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', padding: '12px 14px', color: '#c53030', fontSize: '13px', marginBottom: '16px', lineHeight: 1.6 }}>{error}</div>
        )}

        {/* Your Name */}
        <div className="section-divider">Your Name</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label className="field-label">First Name <span style={{ color: '#C9A84C' }}>*</span></label>
            <input className="rp-input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="William" />
          </div>
          <div>
            <label className="field-label">Last Name <span style={{ color: '#C9A84C' }}>*</span></label>
            <input className="rp-input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label className="field-label">Race Name</label>
          <input className="rp-input" type="text" value={raceName} onChange={e => setRaceName(e.target.value)} placeholder="Billy" />
          <p style={{ fontSize: '11px', color: '#b0b8c4', margin: '4px 0 0' }}>The name that appears on your bib. Leave blank to use your full name.</p>
        </div>

        {/* Emergency Contact */}
        <div className="section-divider">Emergency Contact</div>
        <div style={{ marginBottom: '10px' }}>
          <label className="field-label">Contact Name</label>
          <input className="rp-input" type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label className="field-label">Contact Phone</label>
          <input className="rp-input" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>

        {/* Personal Info */}
        <div className="section-divider">Personal Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label className="field-label">Date of Birth <span style={{ color: '#C9A84C' }}>*</span></label>
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

        {/* Shirt Size */}
        <div style={{ marginBottom: '16px' }}>
          <label className="field-label">Shirt Size</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SIZES.map(size => (
              <button key={size} className={`size-btn ${shirtSize === size ? 'selected' : ''}`} onClick={() => setShirtSize(size === shirtSize ? '' : size)}>{size}</button>
            ))}
          </div>
        </div>

        {/* Running Background */}
        <div className="section-divider">Running Background</div>
        <div style={{ marginBottom: '24px' }}>
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

        <button className="rp-primary" onClick={handleSaveAndContinue} disabled={saving} style={{ marginBottom: '10px' }}>
          {saving ? 'Saving...' : 'Save & Continue →'}
        </button>
        <button className="rp-secondary" onClick={handleSkip}>
          Skip for Now
        </button>

        {/* Next up teaser */}
        <div style={{ marginTop: '20px', padding: '14px', background: '#f8f9fb', borderRadius: '6px', border: '1px solid #e2e6ed' }}>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: '#9aa5b4', textTransform: 'uppercase', margin: '0 0 4px' }}>Next Up</p>
          <p style={{ fontSize: '12px', color: '#6b7a8d', margin: 0, fontWeight: 300, lineHeight: 1.6 }}>
            We'll search <strong style={{ color: '#1B2A4A' }}>RunSignup</strong> for your past results to add them to your Race Passport.
          </p>
        </div>

      </div>
    </div>
  )
}
