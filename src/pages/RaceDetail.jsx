import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const navy = '#1B2A4A', gold = '#C9A84C'

export default function RaceDetail() {
  const navigate = useNavigate()
  const [showPopup, setShowPopup] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Barlow, sans-serif', position: 'relative' }}>

      {/* Did you register popup */}
      {showPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,35,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px 16px 0 0', padding: '24px 24px 40px', width: '100%', maxWidth: '420px' }}>
            <div style={{ width: '36px', height: '4px', background: 'rgba(27,42,74,0.12)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>🏁</div>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', color: navy, textAlign: 'center', letterSpacing: '0.04em', marginBottom: '8px' }}>Did You Register?</div>
            <div style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(27,42,74,0.5)', textAlign: 'center', lineHeight: 1.6, marginBottom: '16px' }}>We sent you to the <strong style={{ color: navy, fontWeight: 500 }}>Parks Half Marathon</strong> sign-up page. Did you complete your registration?</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(252,76,2,0.07)', border: '1px solid rgba(252,76,2,0.15)', borderRadius: '8px', padding: '10px 12px', marginBottom: '20px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="#FC4C02"/></svg>
              <div style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(27,42,74,0.6)', lineHeight: 1.5 }}>Tap <strong style={{ color: '#FC4C02', fontWeight: 600 }}>"Yes, I'm In!"</strong> and we'll post your registration to Strava automatically.</div>
            </div>
            <button onClick={() => setShowPopup(false)} style={{ width: '100%', padding: '14px', background: gold, color: '#fff', border: 'none', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '8px' }}>🎉 Yes, I'm In!</button>
            <button onClick={() => setShowPopup(false)} style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(27,42,74,0.4)', border: '1px solid rgba(27,42,74,0.12)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>Not Yet — I'll Register Later</button>
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ background: navy, padding: '48px 20px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-10px', top: '50%', transform: 'translateY(-50%)', fontFamily: '"Bebas Neue", sans-serif', fontSize: '90px', color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.06)', pointerEvents: 'none' }}>13.1</div>
        <div onClick={() => navigate('/discover')} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '14px', cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Discover</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: `2px solid ${gold}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '16px', color: gold, lineHeight: 1 }}>13.1</div>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '6px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)' }}>Half</div>
          </div>
          <div>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '22px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.1, marginBottom: '6px' }}>Parks Half Marathon</div>
            <div style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}><strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Sept 21, 2026</strong> · Bethesda, MD · 13.1 miles</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '10px', background: 'rgba(42,122,75,0.25)', color: '#6ee7a0' }}>Registration Open</span>
              <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>8 miles away</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ paddingBottom: '100px' }}>

        {/* Race Day Essentials */}
        <InfoSection title="Race Day Essentials">
          <InfoRow label="Race Start" value="7:00 AM — Wave Start" sub="Rockville Pike & Edson Lane, Bethesda MD" />
          <InfoRow label="Packet Pickup" value="Sat Sept 20 · 10AM – 6PM" sub="Westfield Montgomery Mall, 7101 Democracy Blvd" link="Get Directions →" />
          <InfoRow label="Parking" value="Westfield Montgomery Mall Lots B & C" sub="Free race day parking. Arrive before 6:30AM." link="Get Directions →" />
          <InfoRow label="Finish Line" value="Veteran's Park, Bethesda Ave" link="Share Finish Line Location with Family & Friends →" />
          <InfoRow label="Course Map" value="Point-to-point, mostly flat" sub="Through Rock Creek Park and Bethesda neighborhoods" link="Download Course PDF →" />
        </InfoSection>

        {/* Weather */}
        <InfoSection title="Race Day Weather">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[['🌤','62°F','At Start'],['☀️','71°F','At Finish'],['💧','18%','Rain'],['💨','8 mph','Wind']].map(([icon,val,lbl],i) => (
              <div key={i} style={{ flex: 1, background: 'rgba(27,42,74,0.04)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid rgba(27,42,74,0.08)' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '16px', color: navy }}>{val}</div>
                <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '8px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.4)', marginTop: '2px' }}>{lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.22)', borderRadius: '8px', padding: '12px 14px', display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🎽</span>
            <div>
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: gold, marginBottom: '4px' }}>Suggested Gear</div>
              <div style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(27,42,74,0.6)', lineHeight: 1.5 }}><strong style={{ color: navy, fontWeight: 500 }}>Light jacket or arm warmers</strong> at the start line — leave behind as temps rise. <strong style={{ color: navy, fontWeight: 500 }}>Moisture-wicking layers</strong> recommended.</div>
            </div>
          </div>
        </InfoSection>

        {/* Suggested Training */}
        <InfoSection title="Suggested Training">
          <div style={{ background: navy, borderRadius: '10px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', fontFamily: '"Bebas Neue", sans-serif', fontSize: '70px', color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.05)', pointerEvents: 'none' }}>13.1</div>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '32px', color: gold, lineHeight: 1 }}>16</div>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Weeks to Race Day</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Half Marathon Training Plan</div>
            <div style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '16px' }}>A 16-week structured plan tailored to your experience level.</div>
            <button style={{ width: '100%', padding: '12px', background: '#FC4C02', color: '#ffffff', border: 'none', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}>
              <svg width="14" height="14" viewBox="0 0 24 24"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" fill="white"/></svg>
              Connect Strava
            </button>
            <button style={{ width: '100%', padding: '12px', background: '#00A36C', color: '#ffffff', border: 'none', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'not-allowed', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box', opacity: 0.75 }}>
              Connect Runna
              <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: '8px', color: '#ffffff' }}>Coming Soon</span>
            </button>
          </div>
        </InfoSection>

        {/* Getting There */}
        <InfoSection title="Getting There">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[['Hotels','Near the race'],['Flights','From your location'],['Trains','Amtrak & Metro'],['Directions','From your location']].map(([lbl,sub],i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: '1px solid rgba(27,42,74,0.12)', borderRadius: '8px', cursor: 'pointer', background: '#ffffff' }}>
                <div style={{ fontSize: '18px' }}>{['🏨','✈️','🚂','📍'][i]}</div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: navy }}>{lbl}</div>
                  <div style={{ fontSize: '9px', fontWeight: 300, color: 'rgba(27,42,74,0.4)', marginTop: '1px' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </InfoSection>

      </div>

      {/* Register bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid rgba(27,42,74,0.1)', padding: '14px 20px 24px' }}>
        <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 300, color: 'rgba(27,42,74,0.4)', textAlign: 'center', marginBottom: '8px', fontStyle: 'italic' }}>Tapping Register will open the race's official sign-up page with your info pre-filled.</div>
        <button onClick={() => setShowPopup(true)} style={{ width: '100%', padding: '15px', background: gold, color: '#ffffff', border: 'none', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          Register for this Race →
        </button>
      </div>
    </div>
  )
}

function InfoSection({ title, children }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(27,42,74,0.07)' }}>
      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {title}
        <div style={{ flex: 1, height: '1px', background: 'rgba(27,42,74,0.07)' }} />
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, sub, link }) {
  const navy = '#1B2A4A', gold = '#C9A84C'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
      <div style={{ width: '32px', height: '32px', background: 'rgba(27,42,74,0.05)', borderRadius: '8px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.4)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: navy, lineHeight: 1.4 }}>{value}</div>
        {sub && <div style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(27,42,74,0.45)', marginTop: '2px' }}>{sub}</div>}
        {link && <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, marginTop: '4px', cursor: 'pointer' }}>{link}</div>}
      </div>
    </div>
  )
}
