// api/runsignup.js
// Vercel serverless proxy for RunSignup API + Unsplash image search
// Actions: sync_races | get_races | get_race_detail | unsplash_search | debug

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const params = req.method === 'POST' ? req.body : req.query
  const action = params.action || 'debug'

  // ── Unsplash image search ──────────────────────────────────────────────────
  if (action === 'unsplash_search') {
    const query = params.query
    if (!query) return res.status(400).json({ error: 'query param required' })

    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) return res.status(500).json({ error: 'UNSPLASH_ACCESS_KEY not configured' })

    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`
      const response = await fetch(url, {
        headers: { Authorization: `Client-ID ${accessKey}` }
      })
      if (!response.ok) throw new Error(`Unsplash API error: ${response.status}`)
      const data = await response.json()
      const results = (data.results || []).map(p => ({
        url: p.urls.regular,
        thumb: p.urls.small,
        alt: p.alt_description || query,
        credit: p.user?.name || '',
      }))
      return res.status(200).json({ results })
    } catch (e) {
      return res.status(500).json({ error: e.message, results: [] })
    }
  }

  // ── Debug ──────────────────────────────────────────────────────────────────
  if (action === 'debug') {
    return res.status(200).json({
      message: 'Race Passport API proxy is running',
      env: {
        hasRunSignupKey: !!process.env.RUNSIGNUP_API_KEY,
        hasRunSignupSecret: !!process.env.RUNSIGNUP_API_SECRET,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasUnsplashKey: !!process.env.UNSPLASH_ACCESS_KEY,
        hasSyncKey: !!process.env.SYNC_SECRET_KEY,
      }
    })
  }

  // ── Auth check for write actions ───────────────────────────────────────────
  const SYNC_KEY = process.env.SYNC_SECRET_KEY
  if (['sync_races'].includes(action)) {
    if (params.sync_key !== SYNC_KEY) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const API_KEY    = process.env.RUNSIGNUP_API_KEY
  const API_SECRET = process.env.RUNSIGNUP_API_SECRET
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

  // ── get_races ──────────────────────────────────────────────────────────────
  if (action === 'get_races') {
    try {
      const state = params.state || 'MD'
      const page  = parseInt(params.page) || 1
      const url   = `https://runsignup.com/Rest/races?api_key=${API_KEY}&api_secret=${API_SECRET}&format=json&state=${state}&page=${page}&results_per_page=50&start_date=today&events=T`
      const resp  = await fetch(url)
      const data  = await resp.json()
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── get_race_detail ────────────────────────────────────────────────────────
  if (action === 'get_race_detail') {
    const raceId = params.race_id
    if (!raceId) return res.status(400).json({ error: 'race_id required' })
    try {
      const url  = `https://runsignup.com/Rest/race/${raceId}?api_key=${API_KEY}&api_secret=${API_SECRET}&format=json&events=T&race_headings=T&race_links=T`
      const resp = await fetch(url)
      const data = await resp.json()
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── sync_races ─────────────────────────────────────────────────────────────
  if (action === 'sync_races') {
    const dryRun = params.dry_run === 'true'
    const statesParam = params.states || ''
    const STATES = statesParam
      ? statesParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']

    const normalize = (dist) => {
      if (!dist) return null
      const d = dist.trim().toUpperCase()
      if (d.includes('MARATHON') && !d.includes('HALF')) return '26.2'
      if (d.includes('HALF') || d === '13.1M' || d === '13.1') return '13.1'
      if (d.includes('10K') || d === '6.2M') return '10K'
      if (d.includes('5K') || d === '3.1M') return '5K'
      if (d.includes('10M') && !d.includes('100')) return '10 mi'
      if (d.includes('70.3') || (d.includes('HALF') && d.includes('IRON'))) return '70.3'
      if (d.includes('140.6') || d.includes('IRONMAN') || (d.includes('FULL') && d.includes('IRON'))) return '140.6'
      if (d.includes('50K')) return '50K'
      if (d.includes('50M')) return '50M'
      if (d.includes('100K')) return '100K'
      if (d.includes('100M')) return '100M'
      return dist.trim()
    }

    const parseDate = (str) => {
      if (!str) return null
      const m = str.match(/(\d{4})-(\d{2})-(\d{2})/)
      return m ? `${m[2]}/${m[3]}/${m[1]}` : null
    }

    let totalSynced = 0, totalSkipped = 0, errors = []

    for (const state of STATES) {
      let page = 1, hasMore = true
      while (hasMore) {
        try {
          const url = `https://runsignup.com/Rest/races?api_key=${API_KEY}&api_secret=${API_SECRET}&format=json&state=${state}&page=${page}&results_per_page=100&start_date=today&events=T`
          const resp = await fetch(url)
          const data = await resp.json()
          const races = data.races || []
          if (races.length === 0) { hasMore = false; break }

          const rows = []
          for (const r of races) {
            const info = r.race
            if (!info) continue
            const event = info.events?.[0]
            const dist  = normalize(event?.distance || info.distance || '')
            const dateStr = info.next_date || info.start_date || event?.start_time || null
            const dateSort = dateStr?.substring(0, 10) || null
            const dateDisplay = parseDate(dateSort)
            const lat = parseFloat(info.address?.lat) || null
            const lng = parseFloat(info.address?.lng) || null
            const priceRaw = info.registration_opens?.[0]?.fee
            const price = priceRaw ? parseFloat(String(priceRaw).replace(/[^0-9.]/g,'')) || null : null

            rows.push({
              id: String(info.race_id),
              source: 'runsignup',
              name: info.name || '',
              location: [info.address?.city, info.address?.state].filter(Boolean).join(', '),
              city: info.address?.city || null,
              state: info.address?.state || null,
              lat, lng, distance: dist, distance_raw: event?.distance || null,
              date: dateDisplay, date_sort: dateSort,
              price, price_raw: priceRaw ? String(priceRaw) : null,
              terrain: null, elevation: null, est_finishers: null,
              registration_url: info.url || null,
              unsplash_query: null,
              sport: dist === '70.3' || dist === '140.6' ? 'Triathlon' : 'Running',
              is_past: false, last_updated: new Date().toISOString(), detail_fetched: false,
            })
          }

          if (!dryRun && rows.length > 0) {
            const { error } = await fetch(`${SUPABASE_URL}/rest/v1/races`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'resolution=merge-duplicates,return=minimal',
              },
              body: JSON.stringify(rows),
            }).then(r => r.ok ? { error: null } : r.json().then(e => ({ error: e })))
            if (error) errors.push(`${state} p${page}: ${JSON.stringify(error).substring(0,100)}`)
          }

          totalSynced += rows.length
          hasMore = races.length === 100
          page++
        } catch (e) {
          errors.push(`${state} p${page}: ${e.message}`)
          hasMore = false
        }
      }
    }

    return res.status(200).json({
      success: true, dry_run: dryRun, states: STATES.length,
      synced: totalSynced, skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
