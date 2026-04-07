import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1B2A4A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Barlow', sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          color: '#C9A84C',
          fontSize: '48px',
          letterSpacing: '2px',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          RACE PASSPORT
        </h1>
        <p style={{ color: '#8899AA', textAlign: 'center', marginBottom: '40px', fontSize: '14px' }}>
          Your endurance journey starts here
        </p>

        {error && (
          <div style={{
            background: 'rgba(220,53,69,0.15)',
            border: '1px solid rgba(220,53,69,0.4)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#ff6b7a',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#8899AA', fontSize: '12px', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(201,168,76,0.3)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label style={{ color: '#8899AA', fontSize: '12px', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(201,168,76,0.3)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            background: loading ? 'rgba(201,168,76,0.5)' : '#C9A84C',
            color: '#1B2A4A',
            fontSize: '16px',
            fontWeight: '700',
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: '2px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '20px'
          }}
        >
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>

        <p style={{ textAlign: 'center', color: '#8899AA', fontSize: '14px' }}>
          Don't have an account?{' '}
          <Link to="/create-account" style={{ color: '#C9A84C', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
