// api/athlinks.js
// Vercel serverless proxy for Athlinks API
// Actions: search_results | get_athlete_results

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const params = req.method === 'POST' ? req.body : req.query
  const action = params.action || 'search_results'

  const API_KEY = process.env.ATHLINKS_API_KEY // optional — used as fallback if keyless fails

  const BASE = 'https://api.athlinks.com'

  // ── Normalize a raw Athlinks result into our format ──────────────────────
  function normalizeResult(r) {
    // Distance normalization
    const rawDist = (r.RaceDistance || r.Distance || r.CourseDistance || '').toString().toLowerCase().trim()
    let distance = rawDist

    const distMi = parseFloat(rawDist)
    if (rawDist.includes('marathon') && !rawDist.includes('half')) distance = '26.2'
    else if (rawDist.includes('half') || rawDist.includes('13.1')) distance = '13.1'
    else if (rawDist.includes('70.3') || rawDist.includes('half iron')) distance = '70.3'
    else if (rawDist.includes('140.6') || rawDist.includes('ironman') || rawDist.includes('full iron')) distance = '140.6'
    else if (rawDist.includes('10k') || rawDist.includes('10km') || rawDist === '6.2') distance = '10K'
    else if (rawDist.includes('5k') || rawDist.includes('5km') || rawDist === '3.1') distance = '5K'
    else if (rawDist.includes('10 mi') || rawDist === '10') distance = '10 mi'
    else if (rawDist.includes('50k')) distance = '50K'
    else if (rawDist.includes('50 mi') || rawDist.includes('50m')) distance = '50M'
    else if (rawDist.includes('100k')) distance = '100K'
    else if (rawDist.includes('100 mi') || rawDist.includes('100m')) distance = '100M'
    else if (!isNaN(distMi) && distMi > 0) {
      // Try to match by numeric distance in miles
      if (Math.abs(distMi - 3.1) <= 0.15)   distance = '5K'
      else if (Math.abs(distMi - 6.2) <= 0.2)  distance = '10K'
      else if (Math.abs(distMi - 13.1) <= 0.3) distance = '13.1'
      else if (Math.abs(distMi - 26.2) <= 0.5) distance = '26.2'
      else if (Math.abs(distMi - 70.3) <= 1)   distance = '70.3'
      else if (Math.abs(distMi - 140.6) <= 2)  distance = '140.6'
      else distance = `${distMi.toFixed(1)} mi`
    }

    // Date
    const rawDate = r.RaceDate || r.EventDate || r.Date || ''
    let date = ''
    let date_sort = null
    if (rawDate) {
      const parsed = new Date(rawDate)
      if (!isNaN(parsed)) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        date = `${months[parsed.getMonth()]} ${parsed.getFullYear()}`
        date_sort = parsed.toISOString().split('T')[0]
      }
    }

    // Finish time
    let time = ''
    const chip = r.ChipTime || r.FinishTime || r.ClockTime || ''
    if (chip) {
      // Athlinks returns times in various formats — normalize to H:MM:SS or M:SS
      const cleaned = chip.toString().replace(/[^0-9:]/g, '')
      const parts   = cleaned.split(':').map(Number)
      if (parts.length === 3) {
        const [h, m, s] = parts
        time = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
      } else if (parts.length === 2) {
        time = `${parts[0]}:${String(parts[1]).padStart(2,'0')}`
      }
    }

    // Location
    const city  = r.City  || r.EventCity  || ''
    const state = r.State || r.EventState || ''
    const location = [city, state].filter(Boolean).join(', ')

    // Confidence — based on how much data we have
    let confidence = 1
    if (time && date && distance && distance !== rawDist) confidence = 3
    else if ((time || date) && distance) confidence = 2

    return {
      id:         `athlinks_${r.RaceID || r.CourseID || r.EventID || Math.random()}`,
      name:       r.EventName || r.RaceName || r.CourseName || 'Unknown Race',
      date,
      date_sort,
      location,
      city,
      state,
      distance,
      time,
      source:     'ATHLINKS',
      confidence,
      raw:        undefined, // don't send raw data to client
    }
  }

  // ── search_results: search by name + optional age range ──────────────────
  if (action === 'search_results') {
    const name      = params.name
    const birthYear = params.birth_year ? parseInt(params.birth_year) : null

    if (!name) return res.status(400).json({ error: 'name required' })

    const currentYear = new Date().getFullYear()
    const age         = birthYear ? currentYear - birthYear : null

    // Build URL — try without API key first (historically public endpoint),
    // fall back to keyed if we have one
    const buildUrl = (withKey) => {
      const keyParam = withKey && API_KEY ? `&api_key=${API_KEY}` : ''
      if (age) {
        const ageFloor   = Math.max(0, age - 2)
        const ageCeiling = age + 2
        return `${BASE}/results/search/${encodeURIComponent(name)}/${ageFloor}-${ageCeiling}?format=json&Includeclaimed=true${keyParam}`
      }
      return `${BASE}/results/search/${encodeURIComponent(name)}?format=json&Includeclaimed=true${keyParam}`
    }

    const attemptFetch = async (url) => {
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!resp.ok) return { ok: false, status: resp.status }
      const data = await resp.json()
      return { ok: true, data }
    }

    try {
      // Try keyless first
      let result = await attemptFetch(buildUrl(false))

      // If that fails with 401/403, try with key if we have one
      if (!result.ok && (result.status === 401 || result.status === 403) && API_KEY) {
        result = await attemptFetch(buildUrl(true))
      }

      if (!result.ok) {
        return res.status(result.status || 500).json({ error: `Athlinks API error: ${result.status}`, results: [] })
      }

      const data = result.data
      let rawResults = []
      if (Array.isArray(data))    rawResults = data
      else if (data?.Results)     rawResults = data.Results
      else if (data?.results)     rawResults = data.results
      else if (data?.Data)        rawResults = data.Data

      const results = rawResults
        .map(normalizeResult)
        .filter(r => r.distance && r.distance !== '')
        .sort((a, b) => {
          if (b.confidence !== a.confidence) return b.confidence - a.confidence
          return (b.date_sort || '').localeCompare(a.date_sort || '')
        })

      return res.status(200).json({ results, total: results.length })
    } catch (e) {
      console.error('Athlinks fetch error:', e.message)
      return res.status(500).json({ error: e.message, results: [] })
    }
  }

  // ── get_athlete_results: fetch all results for a known Athlinks athlete ID ──
  if (action === 'get_athlete_results') {
    const athleteId = params.athlete_id
    if (!athleteId) return res.status(400).json({ error: 'athlete_id required' })

    try {
      const url  = `${BASE}/athletes/${athleteId}/results?format=json&api_key=${API_KEY}`
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!resp.ok) return res.status(resp.status).json({ error: `Athlinks API error: ${resp.status}`, results: [] })

      const data = await resp.json()
      let rawResults = []
      if (Array.isArray(data)) rawResults = data
      else if (data?.Results) rawResults = data.Results
      else if (data?.results) rawResults = data.results

      const results = rawResults
        .map(normalizeResult)
        .filter(r => r.distance)
        .sort((a, b) => (b.date_sort || '').localeCompare(a.date_sort || ''))

      return res.status(200).json({ results, total: results.length })
    } catch (e) {
      return res.status(500).json({ error: e.message, results: [] })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
