// api/strava.js
// Handles all Strava API interactions server-side so secrets never hit the client

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query
  const CLIENT_ID     = process.env.STRAVA_CLIENT_ID
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET
  const REDIRECT_URI  = process.env.STRAVA_REDIRECT_URI || 'https://racepassportapp.com/strava-callback'
  const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL
  const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

  try {
    // ── Save tokens server-side (bypasses RLS using service role key) ────────
    if (action === 'save_tokens') {
      const body = req.method === 'POST' ? req.body : req.query
      const { user_id, access_token, refresh_token, expires_at, athlete_id } = body

      if (!user_id || !access_token) {
        return res.status(400).json({ error: 'Missing user_id or access_token' })
      }

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'Missing Supabase env vars' })
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'apikey':         SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          strava_access_token:  access_token,
          strava_refresh_token: refresh_token,
          strava_expires_at:    parseInt(expires_at),
          strava_athlete_id:    athlete_id?.toString(),
          strava_connected:     true,
        }),
      })

      if (!r.ok) {
        const txt = await r.text()
        return res.status(r.status).json({ error: txt })
      }

      return res.json({ success: true })
    }

    // ── Exchange code for tokens ─────────────────────────────────────────────
    if (action === 'exchange') {
      const { code } = req.method === 'POST' ? req.body : req.query
      if (!code) return res.status(400).json({ error: 'Missing code' })

      const r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      })
      const data = await r.json()
      if (!r.ok) return res.status(400).json({ error: data.message || 'Token exchange failed' })

      return res.json({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    data.expires_at,
        athlete: {
          id:         data.athlete?.id,
          firstname:  data.athlete?.firstname,
          lastname:   data.athlete?.lastname,
          profile:    data.athlete?.profile,
          city:       data.athlete?.city,
          state:      data.athlete?.state,
        },
      })
    }

    // ── Refresh expired access token ─────────────────────────────────────────
    if (action === 'refresh') {
      const { refresh_token } = req.method === 'POST' ? req.body : req.query
      if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' })

      const r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token,
          grant_type: 'refresh_token',
        }),
      })
      const data = await r.json()
      if (!r.ok) return res.status(400).json({ error: data.message || 'Token refresh failed' })

      return res.json({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    data.expires_at,
      })
    }

    // ── Fetch athlete stats ──────────────────────────────────────────────────
    if (action === 'stats') {
      const { access_token, athlete_id } = req.query
      if (!access_token || !athlete_id) return res.status(400).json({ error: 'Missing params' })

      const r = await fetch(`https://www.strava.com/api/v3/athletes/${athlete_id}/stats`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const data = await r.json()
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'Stats fetch failed' })

      return res.json(data)
    }

    // ── Fetch recent activities ──────────────────────────────────────────────
    if (action === 'activities') {
      const { access_token, per_page = 60, page = 1, after } = req.query
      if (!access_token) return res.status(400).json({ error: 'Missing access_token' })

      const params = new URLSearchParams({ per_page, page })
      if (after) params.set('after', after)

      const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const data = await r.json()
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'Activities fetch failed' })

      return res.json(data)
    }

    // ── Fetch single activity detail (for map polyline) ──────────────────────
    if (action === 'activity') {
      const { access_token, activity_id } = req.query
      if (!access_token || !activity_id) return res.status(400).json({ error: 'Missing params' })

      const r = await fetch(`https://www.strava.com/api/v3/activities/${activity_id}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const data = await r.json()
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'Activity fetch failed' })

      return res.json(data)
    }

    // ── Build auth URL ────────────────────────────────────────────────────────
    if (action === 'auth_url') {
      const scope = 'read,activity:read_all'
      const url = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&approval_prompt=force&scope=${scope}`
      return res.json({ url })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })

  } catch (err) {
    console.error('Strava API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
