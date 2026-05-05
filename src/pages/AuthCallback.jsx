import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handle = async () => {
      // Supabase automatically parses the hash fragment and establishes the session
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // Something went wrong — send to login
        navigate('/login', { replace: true })
        return
      }

      const userId = session.user.id

      // Check if this is a new user (no full_name in profile yet)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

      if (!profile?.full_name) {
        // New user — save name from Google metadata then send to onboarding
        const meta = session.user.user_metadata || {}
        const googleName = meta.full_name || meta.name || ''
        if (googleName) {
          await supabase.from('profiles').update({
            full_name:  googleName,
            first_name: meta.given_name  || googleName.split(' ')[0] || '',
            last_name:  meta.family_name || googleName.split(' ').slice(1).join(' ') || '',
          }).eq('id', userId)
        }
        navigate('/build-passport', { replace: true })
      } else {
        // Returning user — go straight to home
        navigate('/home', { replace: true })
      }
    }

    handle()
  }, [])

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase' }}>Signing you in...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400&display=swap');`}</style>
    </div>
  )
}
