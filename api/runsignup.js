// api/runsignup.js
// Proxies RunSignup race search API — keeps secrets server-side

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const API_KEY    = process.env.RUNSIGNUP_API_KEY
  const API_SECRET = process.env.RUNSIGNUP_API_SECRET

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: 'RunSignup credentials not configured' })
  }

  try {
    // Pull params from query string, inject credentials
    const {
      distance,
      lat, lon, radius, radius_units,
      state,
      start_date, end_date,
      results_per_page = 20,
      page = 1,
      sort = 'date ASC',
    } = req.query

    // Always default start_date to today — never return past races
    const today = new Date().toISOString().split('T')[0]
    const effectiveStart = start_date || today

    const params = new URLSearchParams({
      api_key:          API_KEY,
      api_secret:       API_SECRET,
      format:           'json',
      results_per_page: String(results_per_page),
      page:             String(page),
      sort,
      start_date:       effectiveStart,
    })

    if (distance)      params.set('distance',     distance)
    if (end_date)      params.set('end_date',     end_date)
    if (lat && lon)    { params.set('lat', lat); params.set('lon', lon) }
    if (radius)        params.set('radius',       radius)
    if (radius_units)  params.set('radius_units', radius_units)
    if (state && !lat) params.set('state',        state)

    const url = `https://runsignup.com/Rest/races?${params}`
    const resp = await fetch(url)

    if (!resp.ok) {
      const text = await resp.text()
      console.error('RunSignup API error:', resp.status, text)
      return res.status(resp.status).json({ error: 'RunSignup API error', detail: text })
    }

    const data = await resp.json()
    return res.status(200).json(data)

  } catch(err) {
    console.error('RunSignup handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}
