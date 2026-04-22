// api/athlinks.js
// Vercel Edge Function — runs on Cloudflare edge network, not datacenter IPs
// This bypasses Athlinks' block on traditional serverless/datacenter IPs

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'search'
  const name   = searchParams.get('name') || ''

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers })
  }

  if (!name) {
    return new Response(JSON.stringify({ error: 'name required', results: [] }), { status: 400, headers })
  }

  // ── Normalize a RaceList entry ──────────────────────────────────────────
  function normalizeRace(r) {
    const time  = r.Time || r.athleteTime || ''
    const date  = r.StartDateTime || r.raceStartDate || ''
    const state = r.StateProv || r.raceStateProvAbbrev || ''
    const city  = r.City || r.raceCity || ''
    const course = r.CourseName || r.courseName || ''
    const rawName = r.Name || r.raceTitle || ''

    let dateDisp = '', dateSort = null
    if (date) {
      const d = new Date(date)
      if (!isNaN(d)) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        dateDisp = `${months[d.getMonth()]} ${d.getFullYear()}`
        dateSort = d.toISOString().split('T')[0]
      }
    }

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
    else if (cn.includes('10 mi') || cn.includes('ten mile')) distance = '10 mi'
    else if (cn.includes('50k')) distance = '50K'
    else if (cn.includes('50 mi')) distance = '50M'
    else if (cn.includes('100k')) distance = '100K'
    else if (cn.includes('100 mi')) distance = '100M'
    else if (time) {
      const parts = time.split(':').map(Number)
      const mins  = parts.length === 3 ? parts[0]*60 + parts[1] : parts[0]
      if (mins < 25)       distance = '5K'
      else if (mins < 50)  distance = '10K'
      else if (mins < 90)  distance = '10 mi'
      else if (mins < 150) distance = '13.1'
      else                 distance = '26.2'
    }

    const confidence = (time && dateSort && distance) ? 3 : (time || distance) ? 2 : 1

    return {
      id:        `athlinks_${r.EntryId || r.entryId || Math.random()}`,
      name:      rawName,
      date:      dateDisp,
      date_sort: dateSort,
      location:  [city, state].filter(Boolean).join(', '),
      city, state, distance, time,
      bib:       r.BibNum || r.bibNum || '',
      source:    'ATHLINKS',
      confidence,
    }
  }

  try {
    const url = `https://alaska.athlinks.com/Search?searchTerm=${encodeURIComponent(name)}`
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
      }
    })

    const text = await resp.text()

    if (!text || text.trim().startsWith('<')) {
      return new Response(JSON.stringify({ error: 'blocked', results: [], html: true }), { status: 502, headers })
    }

    const data = JSON.parse(text)
    const result = data.Result || data.result
    const raceList = result?.RaceList || result?.raceList || []
    const flat = raceList.flat()

    const results = flat
      .filter(r => !r.IsVirtual && !r.isVirtual)
      .map(normalizeRace)
      .filter(r => r.name && r.distance)
      .sort((a, b) => (b.date_sort || '').localeCompare(a.date_sort || ''))

    return new Response(JSON.stringify({ results, total: results.length }), { status: 200, headers })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message, results: [] }), { status: 500, headers })
  }
}
