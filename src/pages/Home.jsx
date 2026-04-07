import { useNavigate } from 'react-router-dom'

const UPCOMING = [
  { dist: '26.2', label: 'Marathon', name: 'Marine Corps Marathon', date: 'Oct 26 · Washington, DC', days: '92' },
  { dist: '70.3', label: 'IRONMAN', name: 'IRONMAN 70.3 Atlantic City', date: 'Sept 14 · Atlantic City, NJ', days: '49' },
  { dist: '10K', label: '10K', name: 'Capitol Hill Classic 10K', date: 'May 17 · Washington, DC', days: '41' },
]

const STAMPS = [
  { dist: '70.3', label: 'IRONMAN', gold: true }, { dist: '26.2', label: 'Marathon', gold: false },
  { dist: '13.1', label: 'Half', gold: false }, { dist: '10K', label: '10K', gold: false },
  { dist: '5K', label: '5K', gold: false }, { dist: '50K', label: 'Ultra', gold: true },
]

export default function Home() {
  const navigate = useNavigate()
  const navy = '#1B2A4A', gold = '#C9A84C'

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Barlow, sans-serif', paddingBottom: '80px' }}>

      {/* Navy wipe header */}
      <div style={{ background: navy, padding: '48px 24px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', fontFamily: '"Bebas Neue", sans-serif', fontSize: '120px', color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.05)', pointerEvents: 'none', userSelect: 'none' }}>26.2</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>Good morning</div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '32px', letterSpacing: '0.04em', color: '#ffffff', lineHeight: 1 }}>The start line is calling, <span style={{ color: gold }}>Ryan.</span></div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: navy, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '0 0 20px' }}>
        {[['14','Races'],['341','Miles'],['4:02','PR'],['3','Upcoming']].map(([num, lbl], i) => (
          <div key={i} style={{ textAlign: 'center', padding: '14px 8px 0', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '22px', color: i === 2 ? gold : '#ffffff', lineHeight: 1 }}>{num}</div>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '8px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>{lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Upcoming races */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)' }}>Upcoming Races</div>
            <div onClick={() => navigate('/discover')} style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: gold, cursor: 'pointer' }}>Find Races →</div>
          </div>
          {UPCOMING.map((r, i) => (
            <div key={i} onClick={() => navigate('/race/1')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < UPCOMING.length-1 ? '1px solid rgba(27,42,74,0.06)' : 'none', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', border: `1.5px solid ${navy}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '11px', color: navy, lineHeight: 1 }}>{r.dist}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: navy }}>{r.name}</div>
                <div style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(27,42,74,0.4)', marginTop: '1px' }}>{r.date}</div>
              </div>
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: gold, border: '1px solid rgba(201,168,76,0.3)', padding: '3px 7px', borderRadius: '10px' }}>{r.days} days</div>
            </div>
          ))}
        </div>

        {/* Stamps row */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)' }}>Recent Stamps</div>
            <div onClick={() => navigate('/passport')} style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: gold, cursor: 'pointer' }}>See All →</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {STAMPS.map((s, i) => (
              <div key={i} style={{ width: '62px', height: '62px', borderRadius: '50%', border: `1.5px solid ${s.gold ? gold : navy}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: s.gold ? 'rgba(201,168,76,0.04)' : '#fff', cursor: 'pointer' }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '13px', color: s.gold ? gold : navy, lineHeight: 1 }}>{s.dist}</div>
                <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '5.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)', marginTop: '1px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Races near you */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(27,42,74,0.35)' }}>Races Near You</div>
            <div onClick={() => navigate('/discover')} style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: gold, cursor: 'pointer' }}>See All →</div>
          </div>
          {[{ dist:'13.1', name:'Parks Half Marathon', meta:'Sept 21 · Bethesda, MD · 8 mi away' },{ dist:'10K', name:'Capitol Hill Classic 10K', meta:'May 17 · Washington, DC · 12 mi away' }].map((r,i) => (
            <div key={i} onClick={() => navigate('/race/1')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid rgba(27,42,74,0.1)', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', background: '#fff' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', border: `1.5px solid ${navy}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '11px', color: navy, lineHeight: 1 }}>{r.dist}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: navy }}>{r.name}</div>
                <div style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(27,42,74,0.4)', marginTop: '1px' }}>{r.meta}</div>
              </div>
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: navy }}>More Info →</div>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid rgba(27,42,74,0.08)', display: 'flex', padding: '12px 0 20px', zIndex: 50 }}>
        {[{label:'Home',path:'/home',active:true},{label:'Discover',path:'/discover',active:false},{label:'Passport',path:'/passport',active:false},{label:'Profile',path:'/profile',active:false}].map((item,i) => (
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
