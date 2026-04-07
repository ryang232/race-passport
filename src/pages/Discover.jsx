import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const RACES = [
  { dist: '13.1', label: 'Half', name: 'Parks Half Marathon', date: 'Sept 21, 2026', location: 'Bethesda, MD', away: '8 miles away', status: 'Open', gold: true },
  { dist: '10K', label: '10K', name: 'Capitol Hill Classic 10K', date: 'May 17, 2026', location: 'Washington, DC', away: '12 miles away', status: 'Open', gold: false },
  { dist: '26.2', label: 'Marathon', name: 'Marine Corps Marathon', date: 'Oct 26, 2026', location: 'Washington, DC', away: '12 miles away', status: 'Sold Out', gold: false },
  { dist: '70.3', label: 'IRONMAN', name: 'IRONMAN 70.3 Atlantic City', date: 'Sept 14, 2026', location: 'Atlantic City, NJ', away: '156 miles away', status: 'Open', gold: true },
]

const navy = '#1B2A4A', gold = '#C9A84C'

export default function Discover() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('All')
  const filters = ['All', '5K', '10K', 'Half', 'Full', 'Ultra', 'Triathlon']

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Barlow, sans-serif', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '48px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '28px', letterSpacing: '0.04em', color: navy }}>Discover</div>
        <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: gold }}>2,847 races</div>
      </div>

      {/* Search */}
      <div style={{ margin: '0 20px 10px', display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', border: '1px solid rgba(27,42,74,0.15)', borderRadius: '4px', background: '#f9f8f5' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="rgba(27,42,74,0.35)" strokeWidth="1.2"/><path d="M10 10l2.5 2.5" stroke="rgba(27,42,74,0.35)" strokeWidth="1.2" strokeLinecap="round"/></svg>
        <input placeholder="Search races, cities, states..." style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '13px', color: navy, outline: 'none', fontFamily: 'Barlow, sans-serif' }} />
      </div>

      {/* Distance filters */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 20px 14px', overflowX: 'auto' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: '6px 12px', border: `1px solid ${activeFilter===f ? navy : 'rgba(27,42,74,0.12)'}`, borderRadius: '20px', background: activeFilter===f ? navy : '#fff', color: activeFilter===f ? '#fff' : 'rgba(27,42,74,0.45)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{f}</button>
        ))}
      </div>

      {/* Map placeholder */}
      <div style={{ margin: '0 20px 8px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(27,42,74,0.1)', height: '160px', background: '#dce8f2', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.3)' }}>Race Map · US View</div>
        <div style={{ position: 'absolute', top: '8px', left: '10px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.4)' }}>📍 Your Location</div>
      </div>

      {/* View World Map button */}
      <div style={{ margin: '0 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: '1px solid rgba(27,42,74,0.12)', borderRadius: '4px', cursor: 'pointer', background: '#ffffff' }}>
        <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.5)' }}>🌍 View World Map</span>
      </div>

      {/* Race cards */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)' }}>Featured Near You</div>
          <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: gold, cursor: 'pointer' }}>See all →</div>
        </div>
        {RACES.map((r, i) => (
          <div key={i} style={{ border: '1px solid rgba(27,42,74,0.1)', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ display: 'flex', padding: '14px 14px 12px', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: `1.5px solid ${r.gold ? gold : navy}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '13px', color: r.gold ? gold : navy, lineHeight: 1 }}>{r.dist}</div>
                <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)', marginTop: '1px' }}>{r.label}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: navy, marginBottom: '3px' }}>{r.name}</div>
                <div style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(27,42,74,0.45)', marginBottom: '6px', lineHeight: 1.4 }}>{r.date} · {r.location}</div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: '10px', background: r.status==='Open' ? 'rgba(42,122,75,0.1)' : 'rgba(153,27,27,0.08)', color: r.status==='Open' ? '#2a7a4b' : '#991b1b' }}>{r.status}</span>
                  <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: '10px', background: 'rgba(27,42,74,0.06)', color: 'rgba(27,42,74,0.6)' }}>{r.away}</span>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(27,42,74,0.07)', padding: '10px 14px', display: 'flex', justifyContent: 'flex-end' }}>
              <div onClick={() => navigate('/race/1')} style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: navy, cursor: 'pointer', background: 'rgba(27,42,74,0.06)', padding: '7px 14px', borderRadius: '4px' }}>More Info →</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid rgba(27,42,74,0.08)', display: 'flex', padding: '12px 0 20px', zIndex: 50 }}>
        {[{label:'Home',path:'/home',active:false},{label:'Discover',path:'/discover',active:true},{label:'Passport',path:'/passport',active:false},{label:'Profile',path:'/profile',active:false}].map((item,i) => (
          <div key={i} onClick={() => navigate(item.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px' }}>
              {i===0 && <svg viewBox="0 0 20 20" fill="none"><path d="M3 10L10 3l7 7" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5" strokeLinecap="round"/><path d="M5 8v7h4v-4h2v4h4V8" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              {i===1 && <svg viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5"/><path d="M14 14l3 3" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5" strokeLinecap="round"/></svg>}
              {i===2 && <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5"/><circle cx="10" cy="10" r="2" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5"/></svg>}
              {i===3 && <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5"/><path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '8px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: item.active ? gold : 'rgba(27,42,74,0.3)' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
