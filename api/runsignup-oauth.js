// api/runsignup-oauth.js
// Handles RunSignup OAuth2 flow (Authorization Code + PKCE) and user-level race data

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const params = req.method === 'POST' ? req.body : req.query
  const action = params.action || 'debug'

  const CLIENT_ID     = process.env.RUNSIGNUP_CLIENT_ID
  const CLIENT_SECRET = process.env.RUNSIGNUP_CLIENT_SECRET
  const REDIRECT_URI  = 'https://racepassportapp.com/runsignup-callback'

  // ── Build auth URL + generate PKCE code_verifier/challenge ────────────────
  if (action === 'auth_url') {
    const { user_id } = params

    // Generate code_verifier: random 64-char string [A-Za-z0-9-._~]
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    const { randomBytes, createHash } = await import('crypto')
    const bytes = randomBytes(48)
    let verifier = ''
    for (let i = 0; i < 64; i++) {
      verifier += chars[bytes[i % 48] % chars.length]
    }

    // Generate code_challenge: BASE64URL(SHA256(verifier)) without padding
    const hash = createHash('sha256').update(verifier).digest('base64')
    const challenge = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

    const state = user_id ? encodeURIComponent(user_id) : 'racepassport'

    const url = [
      'https://runsignup.com/Profile/OAuth2/RequestGrant',
      `?response_type=code`,
      `&client_id=${CLIENT_ID}`,
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      `&scope=rsu_api_write`,
      `&state=${state}`,
      `&code_challenge_method=S256`,
      `&code_challenge=${challenge}`,
    ].join('')

    // Return verifier so client stores it in sessionStorage for the exchange step
    return res.status(200).json({ url, code_verifier: verifier })
  }

  // ── Exchange code for access token (with PKCE verifier) ───────────────────
  if (action === 'exchange') {
    const { code, code_verifier } = params
    if (!code) return res.status(400).json({ error: 'Missing code' })
    if (!code_verifier) return res.status(400).json({ error: 'Missing code_verifier' })

    try {
      const body = new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        code,
        code_verifier,
      })

      const r = await fetch('https://runsignup.com/rest/v2/auth/auth-code-redemption.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      const data = await r.json()
      if (!r.ok || data.error) {
        return res.status(400).json({ error: data.error_description || data.error || 'Token exchange failed', raw: data })
      }

      return res.status(200).json({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_in:    data.expires_in,
      })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── Refresh access token ───────────────────────────────────────────────────
  if (action === 'refresh') {
    const { refresh_token } = params
    if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' })

    try {
      const body = new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token,
      })

      const r = await fetch('https://runsignup.com/rest/v2/auth/refresh-token.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      const data = await r.json()
      if (!r.ok || data.error) {
        return res.status(400).json({ error: data.error_description || 'Refresh failed' })
      }

      return res.status(200).json({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_in:    data.expires_in,
      })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── Get registered races for logged-in user ────────────────────────────────
  if (action === 'registered_races') {
    const { access_token } = params
    if (!access_token) return res.status(400).json({ error: 'Missing access_token' })

    try {
      const API_KEY    = process.env.RUNSIGNUP_API_KEY
      const API_SECRET = process.env.RUNSIGNUP_API_SECRET
      const url = `https://api.runsignup.com/rest/user/registered-races?format=json&api_key=${API_KEY}&api_secret=${API_SECRET}`
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (!r.ok) {
        const txt = await r.text()
        return res.status(r.status).json({ error: txt, races: [] })
      }

      const data = await r.json()
      // RunSignup may nest under different keys — try all common shapes
      const raw = data?.user_registered_races
        || data?.registered_races
        || data?.races
        || (Array.isArray(data) ? data : [])

      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

      const normalize = (dist) => {
        if (!dist) return 'Other'
        const d = dist.trim().toUpperCase()
        if (d.includes('MARATHON') && !d.includes('HALF')) return '26.2'
        if (d.includes('HALF') || d === '13.1') return '13.1'
        if (d.includes('10K') || d === '6.2M') return '10K'
        if (d.includes('5K') || d === '3.1M') return '5K'
        if (d.includes('10M') && !d.includes('100')) return '10 mi'
        if (d.includes('70.3') || (d.includes('HALF') && d.includes('IRON'))) return '70.3'
        if (d.includes('140.6') || d.includes('IRONMAN')) return '140.6'
        if (d.includes('50K')) return '50K'
        if (d.includes('50M')) return '50M'
        if (d.includes('100K')) return '100K'
        if (d.includes('100M')) return '100M'
        return dist.trim() || 'Other'
      }

      const isExpo = (name) => {
        const n = (name||'').toLowerCase()
        return /\bexpo\b/.test(n) || /\bspectator\b/.test(n) || /\bvolunteer\b/.test(n)
          || /\btot trot\b/.test(n) || n.includes('wellness expo') || n.includes('health expo')
      }

      const races = raw
        .map((reg, i) => {
          const race = reg.race || reg
          const event = race.events?.[0] || {}
          const dateStr = event.start_time || race.start_date || race.next_date || null
          const dateSort = dateStr ? dateStr.substring(0, 10) : null
          let dateDisp = ''
          if (dateSort) {
            const d = new Date(dateSort + 'T12:00:00')
            if (!isNaN(d)) dateDisp = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
          }
          const city     = race.address?.city  || ''
          const state    = race.address?.state || ''
          const location = [city, state].filter(Boolean).join(', ')

          return {
            id:         `rs_${race.race_id || i}`,
            name:       race.name || 'Unknown Race',
            date:       dateDisp,
            date_sort:  dateSort,
            location,
            city,
            state,
            distance:   normalize(event.distance || race.distance || ''),
            time:       '',
            source:     'RUNSIGNUP',
            confidence: 3,
            race_id:    String(race.race_id || ''),
          }
        })
        .filter(r => !isExpo(r.name))
        .sort((a, b) => {
          if (!a.date_sort && !b.date_sort) return 0
          if (!a.date_sort) return 1
          if (!b.date_sort) return -1
          return b.date_sort.localeCompare(a.date_sort)
        })

      return res.status(200).json({ races, total: races.length, _debug_keys: Object.keys(data || {}), _debug_raw_sample: raw.slice(0,1) })
    } catch (e) {
      return res.status(500).json({ error: e.message, races: [] })
    }
  }

  // ── Debug ──────────────────────────────────────────────────────────────────
  if (action === 'debug') {
    return res.status(200).json({
      message: 'RunSignup OAuth proxy running',
      env: {
        hasClientId:     !!CLIENT_ID,
        hasClientSecret: !!CLIENT_SECRET,
        redirectUri:     REDIRECT_URI,
      }
    })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
