// api/athlinks.js
// Proxies Athlinks' internal search API — no key required
// Discovered by inspecting network calls on athlinks.com

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const params = req.method === 'POST' ? req.body : req.query
  const action = params.action || 'search'

  // ── Normalize a RaceList entry into our passport_races format ─────────────
  function normalizeRace(r) {
    const raw = r.Name || r.raceTitle || ''
    const time = r.Time || r.athleteTime || ''
    const date = r.StartDateTime || r.raceStartDate || ''
    const state = r.StateProv || r.raceStateProvAbbrev || ''
    const city  = r.City || r.raceCity || ''
    const course = r.CourseName || r.courseName || ''

    // Parse date
    let dateDisp = '', dateSort = null
    if (date) {
      const d = new Date(date)
      if (!isNaN(d)) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        dateDisp = `${months[d.getMonth()]} ${d.getFullYear()}`
        dateSort = d.toISOString().split('T')[0]
      }
    }

    // Normalize distance from courseName
    const cn = course.toLowerCase()
    let distance = ''
    if (cn.includes('marathon') && !cn.includes('half') && !cn.includes('70.3')) distance = '26.2'
    else if (cn.includes('half marathon') || cn.includes('13.1')) distance = '13.1'
    else if (cn.includes('70.3') || (cn.includes('half') && cn.includes('iron'))) distance = '70.3'
    else if (cn.includes('140.6') || (cn.includes('ironman') && cn.includes('triathlon'))) distance = '140.6'
    else if (cn.includes('triathlon') && cn.includes('1.2')) distance = '70.3'
    else if (cn.includes('triathlon') && cn.includes('2.4')) distance = '140.6'
    else if (cn.includes('10k') || cn.includes('10 k')) distance = '10K'
    else if (cn.includes('5k') || cn.includes('5 k')) distance = '5K'
    else if (cn.includes('10 mi') || cn.includes('10-mi') || cn.includes('ten mile')) distance = '10 mi'
    else if (cn.includes('50k')) distance = '50K'
    else if (cn.includes('50 mi')) distance = '50M'
    else if (cn.includes('100k')) distance = '100K'
    else if (cn.includes('100 mi')) distance = '100M'
    else {
      // Fallback: infer from time
      if (time) {
        const parts = time.split(':').map(Number)
        const totalMins = parts.length === 3
          ? parts[0]*60 + parts[1] + parts[2]/60
          : parts[0] + parts[1]/60
        if (totalMins < 25)      distance = '5K'
        else if (totalMins < 50) distance = '10K'
        else if (totalMins < 90) distance = '10 mi'
        else if (totalMins < 150) distance = '13.1'
        else                     distance = '26.2'
      }
    }

    // Confidence: high if we have time + date + distance
    const confidence = (time && dateSort && distance) ? 3 : (time || distance) ? 2 : 1

    return {
      id:         `athlinks_${r.EntryId || r.entryId || Math.random()}`,
      name:       raw,
      date:       dateDisp,
      date_sort:  dateSort,
      location:   [city, state].filter(Boolean).join(', '),
      city:       city,
      state:      state,
      distance:   distance,
      time:       time,
      bib:        r.BibNum || r.bibNum || '',
      source:     'ATHLINKS',
      confidence,
    }
  }

  // ── search: main athlete search ───────────────────────────────────────────
  if (action === 'search') {
    const name = params.name
    if (!name) return res.status(400).json({ error: 'name required', results: [] })

    try {
      // Athlinks blocks datacenter IPs — route through allorigins which fetches from residential IPs
      const target = `https://alaska.athlinks.com/Search?searchTerm=${encodeURIComponent(name)}`
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`

      const resp = await fetch(proxyUrl, {
        headers: { 'Accept': 'application/json' }
      })

      if (!resp.ok) {
        return res.status(resp.status).json({ error: `Proxy error: ${resp.status}`, results: [] })
      }

      const wrapper = await resp.json()
      // allorigins wraps the response in { contents: "...", status: {...} }
      const raw = wrapper.contents
      if (!raw || raw.trim().startsWith('<')) {
        return res.status(502).json({ error: 'Athlinks returned HTML — blocked', results: [] })
      }

      const data = JSON.parse(raw)

      if (!data.Success && !data.success) {
        return res.status(500).json({ error: data.ErrorMessage || 'Unknown error', results: [] })
      }

      const result = data.Result || data.result
      // RaceList is an array of arrays (grouped by year)
      const raceList = result?.RaceList || result?.raceList || []
      const flat = raceList.flat()

      // Filter out virtual races and normalize
      const results = flat
        .filter(r => !r.IsVirtual && !r.isVirtual)
        .map(normalizeRace)
        .filter(r => r.name && r.distance) // must have name + distance
        .sort((a, b) => (b.date_sort || '').localeCompare(a.date_sort || ''))

      return res.status(200).json({
        results,
        total: results.length,
        locations: result?.Locations || [],
      })
    } catch(e) {
      console.error('Athlinks search error:', e.message)
      return res.status(500).json({ error: e.message, results: [] })
    }
  }

  // ── preview: fast autocomplete (limit 3) ─────────────────────────────────
  if (action === 'preview') {
    const name = params.name
    if (!name) return res.status(400).json({ error: 'name required', results: [] })

    try {
      const url = `https://alaska.athlinks.com/events/race/result/api/find?term=${encodeURIComponent(name)}&limit=10`
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
          'Referer': 'https://www.athlinks.com/',
          'Origin': 'https://www.athlinks.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
        }
      })

      if (!resp.ok) return res.status(resp.status).json({ results: [] })

      const data = await resp.json()
      const unclaimed = data?.result?.unclaimedResults || []

      const results = unclaimed.map(r => ({
        id:        `athlinks_${r.entryId}`,
        name:      r.raceTitle,
        date:      r.raceStartDate ? new Date(r.raceStartDate).toLocaleDateString('en-US', { month:'short', year:'numeric' }) : '',
        date_sort: r.raceStartDate ? r.raceStartDate.split('T')[0] : null,
        location:  [r.raceCity, r.raceStateProvAbbrev].filter(Boolean).join(', '),
        city:      r.raceCity,
        state:     r.raceStateProvAbbrev,
        distance:  r.courseName || '',
        time:      r.athleteTime,
        source:    'ATHLINKS',
        confidence: 3,
      }))

      return res.status(200).json({ results, total: results.length })
    } catch(e) {
      return res.status(500).json({ error: e.message, results: [] })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
