import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function StravaCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState('Connecting to Strava...')
  const [error, setError]   = useState(null)

  useEffect(() => {
    const handle = async () => {
      const params = new URLSearchParams(location.search)
      const code   = params.get('code')
      const err    = params.get('error')
      const userId = params.get('state') ? decodeURIComponent(params.get('state')) : null

      if (err || !code) {
        setError('Strava authorization was denied or cancelled.')
        setTimeout(() => navigate('/home'), 3000)
        return
      }

      try {
        setStatus('Exchanging tokens...')
        const r    = await fetch(`/api/strava?action=exchange&code=${code}`)
        const data = await r.json()

        if (data.error) {
          setError(`Failed to connect: ${data.error}`)
          setTimeout(() => navigate('/home'), 3000)
          return
        }

        setStatus('Saving your connection...')

        if (!userId) {
          setError('Could not identify your account. Please try again.')
          setTimeout(() => navigate('/home'), 3000)
          return
        }

        // Save tokens server-side via API (bypasses RLS issues)
        const saveRes = await fetch(
          `/api/strava?action=save_tokens&user_id=${userId}&access_token=${encodeURIComponent(data.access_token)}&refresh_token=${encodeURIComponent(data.refresh_token)}&expires_at=${data.expires_at}&athlete_id=${data.athlete?.id}`
        )
        const saveData = await saveRes.json()

        if (!saveData.success) {
          setError(`Save failed: ${saveData.error}`)
          setTimeout(() => navigate('/home'), 3000)
          return
        }

        setStatus('Connected! Redirecting...')
        // Pass a flag so Home knows to show the success message
        const returnTo = sessionStorage.getItem('strava_return_to') || '/home'
        sessionStorage.removeItem('strava_return_to')
        setTimeout(() => navigate(returnTo, { state: { stravaConnected: true } }), 1000)

      } catch(e) {
        setError('Something went wrong. Please try again.')
        setTimeout(() => navigate('/home'), 3000)
      }
    }

    handle()
  }, [])

  const TICKER = ['26.2','13.1','10K','5K','70.3','140.6','50K','100M','26.2','13.1','10K','5K','70.3','140.6','50K','100M']

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily:"'Barlow',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
        @keyframes tickerScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
        @keyframes pulse { 0%,100%{opacity:0.3;} 50%{opacity:1;} }
        @keyframes spin { to{transform:rotate(360deg);} }
      `}</style>

      {/* Ticker background */}
      <div style={{ position:'absolute', top:'50%', transform:'translateY(-55%)', left:0, whiteSpace:'nowrap', pointerEvents:'none', zIndex:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', animation:'tickerScroll 60s linear infinite' }}>
          {TICKER.map((d,i) => <span key={i} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(180px,24vw,340px)', color:'transparent', WebkitTextStroke:'1px rgba(27,42,74,0.055)', lineHeight:1, padding:'0 40px', userSelect:'none', flexShrink:0 }}>{d}</span>)}
        </div>
      </div>

      <div style={{ position:'relative', zIndex:10, textAlign:'center', padding:'0 24px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'28px' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'12px', letterSpacing:'3.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>

        {error ? (
          <>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(197,48,48,0.08)', border:'1.5px solid rgba(197,48,48,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 4l16 16M20 4L4 20" stroke="#c53030" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'10px' }}>CONNECTION FAILED</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', color:'#9aa5b4', marginBottom:'8px' }}>{error}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:'#b0b8c4' }}>Redirecting you back...</div>
          </>
        ) : (
          <>
            {/* Strava + Race Passport logos */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'16px', marginBottom:'28px' }}>
              <div style={{ width:52, height:52, borderRadius:'12px', background:'rgba(252,76,2,0.1)', border:'1.5px solid rgba(252,76,2,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              </div>
              <div style={{ display:'flex', gap:'4px' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:`pulse 1.1s ease-in-out ${i*0.3}s infinite` }} />)}
              </div>
              <div style={{ width:52, height:52, borderRadius:'12px', background:'rgba(201,168,76,0.1)', border:'1.5px solid rgba(201,168,76,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
              </div>
            </div>

            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'10px' }}>CONNECTING STRAVA</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', color:'#9aa5b4', letterSpacing:'1px' }}>{status}</div>
          </>
        )}
      </div>
    </div>
  )
}
