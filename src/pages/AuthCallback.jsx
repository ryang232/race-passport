import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handle = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        navigate('/login', { replace: true })
        return
      }

      const createdAt  = new Date(session.user.created_at).getTime()
      const lastSignIn = new Date(session.user.last_sign_in_at).getTime()
      const diffSecs   = Math.abs(lastSignIn - createdAt) / 1000

      // Debug — visible in browser console
      console.log('AuthCallback debug:', {
        created_at:       session.user.created_at,
        last_sign_in_at:  session.user.last_sign_in_at,
        diff_seconds:     diffSecs,
        isNewUser:        diffSecs < 60,
      })

      // New user if created_at and last_sign_in_at are within 60 seconds
      const isNewUser = diffSecs < 60

      if (isNewUser) {
        navigate('/build-passport', { replace: true })
      } else {
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
