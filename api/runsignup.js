// api/runsignup.js
// Vercel serverless function — proxies RunSignup API + syncs races to Supabase

import { createClient } from '@supabase/supabase-js'

// Supabase service role client (server-side only — never expose this key client-side)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // add this to Vercel env vars
)

const API_KEY    = process.env.RUNSIGNUP_API_KEY
const API_SECRET = process.env.RUNSIGNUP_API_SECRET
const BASE       = 'https://api.runsignup.com/rest'
const AUTH       = `api_key=${API_KEY}&api_secret=${API_SECRET}&format=json`

// States to sync — start with mid-Atlantic, expand over time
const SYNC_STATES = [
  'MD','VA','DC','PA','NY','NJ','DE','WV','NC','SC',
  'GA','FL','TX','CA','IL','OH','MA','CT','CO','WA',
]

// Normalize a RunSignup distance string to our standard format
function normalizeDistance(raw) {
  if (!raw) return null
  const r = raw.toLowerCase().trim()
  if (r.includes('marathon') && !r.includes('half')) return '26.2'
  if (r.includes('half') || r.includes('13.1'))       return '13.1'
  if (r.includes('10k') || r === '10 km')             return '10K'
  if (r.includes('5k')  || r === '5 km')              return '5K'
  if (r.includes('10 mi') || r.includes('10mile'))    return '10 mi'
  if (r.includes('70.3') || r.includes('half iron'))  return '70.3'
  if (r.includes('140.6') || (r.includes('ironman') && !r.includes('70'))) return '140.6'
  if (r.includes('50k'))  return '50K'
  if (r.includes('50m') || r.includes('50 mi')) return '50M'
  if (r.includes('100k')) return '100K'
  if (r.includes('100m') || r.includes('100 mi')) return '100M'
  if (r.includes('tri'))  return 'Tri'
  // Return cleaned raw if we can't normalize
  return raw.replace(/\s+/g, ' ').trim()
}

// Determine sport from distance/event name
function normalizeSport(distance, name) {
  if (!distance && !name) return 'Running'
  const combined = `${distance || ''} ${name || ''}`.toLowerCase()
  if (combined.includes('ironman') || combined.includes('triathlon') || combined.includes('70.3') || combined.includes('140.6')) return 'Triathlon'
  if (combined.includes('cycl') || combined.includes('bike') || combined.includes('century')) return 'Cycling'
  if (combined.includes('swim') || combined.includes('open water')) return 'Swimming'
  return 'Running'
}

// Build a useful Unsplash query from race data
function buildUnsplashQuery(name, city, state, distance) {
  const dist = normalizeDistance(distance)
  if (dist === '26.2') return `${city} marathon runners road race`
  if (dist === '13.1') return `${city} half marathon running`
  if (dist === '70.3' || dist === '140.6') return `triathlon swim bike run race`
  if (dist === '50K' || dist === '50M' || dist === '100K') return `trail ultra running forest`
  return `${city} ${state} running race`
}

// Normalize a single RunSignup race object into our schema
function normalizeRace(raceData, state) {
  const race     = raceData?.race || raceData
  const events   = race?.next_date?.events || race?.events || []
  const firstEvent = events?.[0]?.event || events?.[0] || {}

  const raceId   = `rs_${race.race_id}`
  const name     = race.name || 'Unknown Race'
  const city     = race.address?.city || ''
  const stateVal = race.address?.state || state || ''
  const lat      = parseFloat(race.address?.lat)  || null
  const lng      = parseFloat(race.address?.lng)  || null
  const distRaw  = firstEvent.distance || firstEvent.name || ''
  const distance = normalizeDistance(distRaw)
  const sport    = normalizeSport(distRaw, name)

  // Date
  const dateStr  = race.next_date?.start_time || race.start_time || null
  let dateSort   = null
  let dateDisplay = null
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d)) {
      dateSort    = d.toISOString().split('T')[0]
      dateDisplay = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
    }
  }

  // Price — take the lowest event price
  let price = null
  for (const ev of events) {
    const e = ev?.event || ev
    const fees = e?.registration_opens?.[0]?.fee || e?.fee
    if (fees) {
      const p = parseFloat(fees)
      if (!isNaN(p) && (price === null || p < price)) price = Math.round(p)
    }
  }

  const regUrl   = race.url || `https://runsignup.com/Race/${race.race_id}`
  const location = city && stateVal ? `${city}, ${stateVal}` : stateVal || city || ''

  return {
    id:               raceId,
    source:           'runsignup',
    name,
    location,
    city,
    state:            stateVal,
    lat,
    lng,
    distance,
    distance_raw:     distRaw,
    date:             dateDisplay,
    date_sort:        dateSort,
    price,
    terrain:          'Road',
    elevation:        null,
    est_finishers:    null,
    registration_url: regUrl,
    unsplash_query:   buildUnsplashQuery(name, city, stateVal, distRaw),
    sport,
    is_past:          dateSort ? new Date(dateSort) < new Date() : false,
    raw_data:         race,
    last_updated:     new Date().toISOString(),
  }
}

// Sync races for a single state — returns { added, updated, errors }
async function syncState(state, dryRun = false) {
  const today    = new Date().toISOString().split('T')[0]
  const oneYear  = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let page    = 1
  let total   = 0
  let added   = 0
  let updated = 0
  let errors  = 0
  const batchSize = 100

  while (true) {
    const url = `${BASE}/races?${AUTH}&state=${state}&results_per_page=${batchSize}&page=${page}&start_date=${today}&end_date=${oneYear}&include_event_details=T&sort=date ASC`

    let data
    try {
      const res = await fetch(url)
      data = await res.json()
    } catch (e) {
      console.error(`Fetch error for ${state} page ${page}:`, e.message)
      errors++
      break
    }

    const races = data?.races || []
    if (races.length === 0) break

    total += races.length

    if (!dryRun) {
      const normalized = races
        .map(r => normalizeRace(r, state))
        .filter(r => r.lat && r.lng && r.name && r.date_sort) // only races with valid geo + date

      if (normalized.length > 0) {
        const { error } = await supabaseAdmin
          .from('races')
          .upsert(normalized, { onConflict: 'id', ignoreDuplicates: false })

        if (error) {
          console.error(`Supabase upsert error for ${state}:`, error.message)
          errors += normalized.length
        } else {
          added += normalized.length
        }
      }
    }

    // If we got fewer than batchSize, we're on the last page
    if (races.length < batchSize) break
    page++

    // Safety: don't exceed 20 pages per state (~2000 races)
    if (page > 20) break
  }

  return { state, total, added, updated, errors }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: 'RunSignup API credentials not configured' })
  }

  const { action, first_name, last_name, dob, race_id, event_id,
          state = 'MD', zipcode, page = 1,
          states, dry_run, sync_key } = req.query

  // ── Protect the sync endpoint with a secret key ──────────────────────────
  if (action === 'sync_races' || action === 'sync_state') {
    const expectedKey = process.env.SYNC_SECRET_KEY
    if (expectedKey && sync_key !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized — invalid sync_key' })
    }
  }

  try {
    // ── SYNC ALL STATES ─────────────────────────────────────────────────────
    if (action === 'sync_races') {
      const statesToSync = states ? states.split(',') : SYNC_STATES
      const dryRun       = dry_run === 'true'
      const results      = []
      let totalAdded     = 0
      let totalErrors    = 0

      console.log(`Starting race sync for ${statesToSync.length} states (dry_run: ${dryRun})`)

      for (const s of statesToSync) {
        const result = await syncState(s, dryRun)
        results.push(result)
        totalAdded  += result.added
        totalErrors += result.errors
        console.log(`  ${s}: ${result.total} fetched, ${result.added} upserted, ${result.errors} errors`)
      }

      // Mark past races
      if (!dryRun) {
        await supabaseAdmin
          .from('races')
          .update({ is_past: true })
          .lt('date_sort', new Date().toISOString().split('T')[0])
      }

      return res.status(200).json({
        action: 'sync_races',
        dry_run: dryRun,
        states_synced: statesToSync.length,
        total_added: totalAdded,
        total_errors: totalErrors,
        results,
        synced_at: new Date().toISOString(),
      })
    }

    // ── SYNC SINGLE STATE ────────────────────────────────────────────────────
    if (action === 'sync_state') {
      const result = await syncState(state, dry_run === 'true')
      return res.status(200).json({ action: 'sync_state', ...result })
    }

    // ── GET RACES FROM SUPABASE (for the Discover page) ───────────────────
    if (action === 'get_races') {
      const {
        user_lat, user_lng, radius = '75',
        dist_filter, sport_filter, terrain_filter,
        max_price, date_from, date_to,
        sort_by = 'date_sort', limit = '50', offset = '0',
      } = req.query

      let query = supabaseAdmin
        .from('races')
        .select('*')
        .eq('is_past', false)
        .order(sort_by, { ascending: sort_by === 'price' ? true : true })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

      if (max_price)      query = query.lte('price', parseInt(max_price))
      if (dist_filter && dist_filter !== 'ALL') {
        if (dist_filter === 'TRI')   query = query.in('distance', ['70.3','140.6','Tri'])
        else if (dist_filter === 'ULTRA') query = query.in('distance', ['50K','50M','100K','100M'])
        else                          query = query.eq('distance', dist_filter)
      }
      if (terrain_filter && terrain_filter !== 'All') query = query.ilike('terrain', `%${terrain_filter}%`)
      if (sport_filter   && sport_filter   !== 'All') query = query.eq('sport', sport_filter)
      if (date_from)      query = query.gte('date_sort', date_from)
      if (date_to)        query = query.lte('date_sort', date_to)

      const { data, error } = await query
      if (error) return res.status(500).json({ error: error.message })

      // If user location provided, sort by distance
      let races = data || []
      if (user_lat && user_lng) {
        const lat = parseFloat(user_lat)
        const lng = parseFloat(user_lng)
        const rad = parseFloat(radius) * 1609.34 // miles to meters
        races = races
          .filter(r => {
            if (!r.lat || !r.lng) return false
            const dlat = (r.lat - lat) * Math.PI / 180
            const dlng = (r.lng - lng) * Math.PI / 180
            const a = Math.sin(dlat/2)**2 + Math.cos(lat * Math.PI/180) * Math.cos(r.lat * Math.PI/180) * Math.sin(dlng/2)**2
            const dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 6371000
            r.distance_miles = Math.round(dist / 1609.34 * 10) / 10
            return dist <= rad
          })
          .sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999))
      }

      return res.status(200).json({ action: 'get_races', count: races.length, races })
    }

    // ── EXISTING ACTIONS (kept for backwards compat) ──────────────────────
    if (action === 'search_races_near') {
      const url = `${BASE}/races?${AUTH}&state=${state}&results_per_page=100&page=${page}&include_event_details=T`
      const response = await fetch(url)
      const data = await response.json()
      return res.status(200).json({ action, data })

    } else if (action === 'search_results_in_race') {
      const url = `${BASE}/race/${race_id}/results/get-results?${AUTH}&event_id=${event_id}&first_name=${encodeURIComponent(first_name || '')}&last_name=${encodeURIComponent(last_name || '')}&results_per_page=20`
      const response = await fetch(url)
      const data = await response.json()
      return res.status(200).json({ action, data })

    } else if (action === 'get_race_results') {
      const url = `${BASE}/race/${race_id}/results/get-results?${AUTH}&first_name=${encodeURIComponent(first_name || '')}&last_name=${encodeURIComponent(last_name || '')}&results_per_page=20`
      const response = await fetch(url)
      const data = await response.json()
      return res.status(200).json({ action, data })

    } else if (action === 'debug') {
      const url = `${BASE}/races?${AUTH}&state=MD&results_per_page=3`
      const response = await fetch(url)
      const data = await response.json()
      return res.status(200).json({
        action: 'debug',
        credentials_work: !data?.error,
        api_response_keys: Object.keys(data || {}),
        sample: data,
      })

    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

  } catch (error) {
    console.error('RunSignup API error:', error)
    return res.status(500).json({ error: 'Failed to fetch from RunSignup', message: error.message })
  }
}
