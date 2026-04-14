// api/runsignup.js
// Vercel serverless function — proxies RunSignup API + syncs races to Supabase

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_KEY    = process.env.RUNSIGNUP_API_KEY
const API_SECRET = process.env.RUNSIGNUP_API_SECRET
const BASE       = 'https://api.runsignup.com/rest'
const AUTH       = `api_key=${API_KEY}&api_secret=${API_SECRET}&format=json`

const SYNC_STATES = [
  'MD','VA','DC','PA','NY','NJ','DE','WV','NC','SC',
  'GA','FL','TX','CA','IL','OH','MA','CT','CO','WA',
]

// State center coordinates — used as fallback when city not found
const STATE_COORDS = {
  'AL':[32.806671,-86.791130],'AK':[61.370716,-152.404419],'AZ':[33.729759,-111.431221],
  'AR':[34.969704,-92.373123],'CA':[36.116203,-119.681564],'CO':[39.059811,-105.311104],
  'CT':[41.597782,-72.755371],'DE':[39.318523,-75.507141],'DC':[38.897438,-77.026817],
  'FL':[27.766279,-81.686783],'GA':[33.040619,-83.643074],'HI':[21.094318,-157.498337],
  'ID':[44.240459,-114.478828],'IL':[40.349457,-88.986137],'IN':[39.849426,-86.258278],
  'IA':[42.011539,-93.210526],'KS':[38.526600,-96.726486],'KY':[37.668140,-84.670067],
  'LA':[31.169960,-91.867805],'ME':[44.693947,-69.381927],'MD':[39.063946,-76.802101],
  'MA':[42.230171,-71.530106],'MI':[43.326618,-84.536095],'MN':[45.694454,-93.900192],
  'MS':[32.741646,-89.678696],'MO':[38.456085,-92.288368],'MT':[46.921925,-110.454353],
  'NE':[41.125370,-98.268082],'NV':[38.313515,-117.055374],'NH':[43.452492,-71.563896],
  'NJ':[40.298904,-74.521011],'NM':[34.840515,-106.248482],'NY':[42.165726,-74.948051],
  'NC':[35.630066,-79.806419],'ND':[47.528912,-99.784012],'OH':[40.388783,-82.764915],
  'OK':[35.565342,-96.928917],'OR':[44.572021,-122.070938],'PA':[40.590752,-77.209755],
  'RI':[41.680893,-71.511780],'SC':[33.856892,-80.945007],'SD':[44.299782,-99.438828],
  'TN':[35.747845,-86.692345],'TX':[31.054487,-97.563461],'UT':[40.150032,-111.862434],
  'VT':[44.045876,-72.710686],'VA':[37.769337,-78.169968],'WA':[47.400902,-121.490494],
  'WV':[38.491226,-80.954453],'WI':[44.268543,-89.616508],'WY':[42.755966,-107.302490],
}

// Major US cities with coordinates — covers the most common race locations
const CITY_COORDS = {
  // Maryland
  'Baltimore,MD':[39.2904,-76.6122],'Annapolis,MD':[38.9784,-76.4922],
  'Bethesda,MD':[38.9807,-77.1003],'Rockville,MD':[39.0840,-77.1528],
  'Gaithersburg,MD':[39.1434,-77.2011],'Silver Spring,MD':[38.9907,-77.0261],
  'Columbia,MD':[39.2037,-76.8610],'Frederick,MD':[39.4143,-77.4105],
  'Germantown,MD':[39.1732,-77.2717],'Hagerstown,MD':[39.6418,-77.7199],
  'Bowie,MD':[38.9429,-76.7791],'Waldorf,MD':[38.6243,-76.9019],
  'Cambridge,MD':[38.5632,-76.0788],'Salisbury,MD':[38.3607,-75.5994],
  'Greenbelt,MD':[38.9957,-76.8994],'College Park,MD':[38.9807,-76.9369],
  'Laurel,MD':[39.0993,-76.8483],'Bel Air,MD':[39.5354,-76.3483],
  // Virginia
  'Arlington,VA':[38.8799,-77.1068],'Alexandria,VA':[38.8048,-77.0469],
  'Richmond,VA':[37.5407,-77.4360],'Virginia Beach,VA':[36.8529,-75.9780],
  'Norfolk,VA':[36.8508,-76.2859],'Chesapeake,VA':[36.7682,-76.2875],
  'Newport News,VA':[37.0871,-76.4730],'Hampton,VA':[37.0299,-76.3452],
  'Roanoke,VA':[37.2710,-79.9414],'Charlottesville,VA':[38.0293,-78.4767],
  'Blacksburg,VA':[37.2296,-80.4139],'Annandale,VA':[38.8307,-77.1952],
  'McLean,VA':[38.9340,-77.1773],'Reston,VA':[38.9687,-77.3411],
  'Herndon,VA':[38.9696,-77.3861],'Fairfax,VA':[38.8462,-77.3064],
  'Manassas,VA':[38.7509,-77.4753],'Fredericksburg,VA':[38.3032,-77.4605],
  'Williamsburg,VA':[37.2707,-76.7075],'Lynchburg,VA':[37.4138,-79.1422],
  // Washington DC
  'Washington,DC':[38.9072,-77.0369],
  // Pennsylvania
  'Philadelphia,PA':[39.9526,-75.1652],'Pittsburgh,PA':[40.4406,-79.9959],
  'Allentown,PA':[40.6084,-75.4902],'Erie,PA':[42.1292,-80.0851],
  'Reading,PA':[40.3356,-75.9269],'Scranton,PA':[41.4090,-75.6624],
  'Harrisburg,PA':[40.2732,-76.8867],'Lancaster,PA':[40.0379,-76.3055],
  'Bethlehem,PA':[40.6259,-75.3705],'York,PA':[39.9626,-76.7277],
  // New York
  'New York,NY':[40.7128,-74.0060],'Buffalo,NY':[42.8864,-78.8784],
  'Rochester,NY':[43.1566,-77.6088],'Yonkers,NY':[40.9312,-73.8988],
  'Syracuse,NY':[43.0481,-76.1474],'Albany,NY':[42.6526,-73.7562],
  'New Rochelle,NY':[40.9115,-73.7826],'White Plains,NY':[41.0340,-73.7629],
  'Brooklyn,NY':[40.6782,-73.9442],'Queens,NY':[40.7282,-73.7949],
  'Manhattan,NY':[40.7831,-73.9712],'Bronx,NY':[40.8448,-73.8648],
  'Staten Island,NY':[40.5795,-74.1502],
  // New Jersey
  'Newark,NJ':[40.7357,-74.1724],'Jersey City,NJ':[40.7178,-74.0431],
  'Paterson,NJ':[40.9168,-74.1718],'Elizabeth,NJ':[40.6640,-74.2107],
  'Trenton,NJ':[40.2171,-74.7429],'Camden,NJ':[39.9259,-75.1196],
  'Hoboken,NJ':[40.7440,-74.0324],'Princeton,NJ':[40.3573,-74.6672],
  'Atlantic City,NJ':[39.3643,-74.4229],'Morristown,NJ':[40.7968,-74.4815],
  // Delaware
  'Wilmington,DE':[39.7447,-75.5484],'Dover,DE':[39.1582,-75.5244],
  'Newark,DE':[39.6837,-75.7497],
  // North Carolina
  'Charlotte,NC':[35.2271,-80.8431],'Raleigh,NC':[35.7796,-78.6382],
  'Greensboro,NC':[36.0726,-79.7920],'Durham,NC':[35.9940,-78.8986],
  'Winston-Salem,NC':[36.0999,-80.2442],'Fayetteville,NC':[35.0527,-78.8784],
  'Cary,NC':[35.7915,-78.7811],'Wilmington,NC':[34.2257,-77.9447],
  'Chapel Hill,NC':[35.9132,-79.0558],'Asheville,NC':[35.5951,-82.5515],
  // South Carolina
  'Columbia,SC':[34.0007,-81.0348],'Charleston,SC':[32.7765,-79.9311],
  'North Charleston,SC':[32.8546,-79.9748],'Greenville,SC':[34.8526,-82.3940],
  'Spartanburg,SC':[34.9496,-81.9320],'Rock Hill,SC':[34.9249,-81.0251],
  'Hilton Head Island,SC':[32.2163,-80.7526],'Myrtle Beach,SC':[33.6891,-78.8867],
  // Georgia
  'Atlanta,GA':[33.7490,-84.3880],'Columbus,GA':[32.4610,-84.9877],
  'Augusta,GA':[33.4735,-82.0105],'Macon,GA':[32.8407,-83.6324],
  'Savannah,GA':[32.0835,-81.0998],'Athens,GA':[33.9519,-83.3576],
  'Sandy Springs,GA':[33.9304,-84.3733],'Roswell,GA':[34.0232,-84.3616],
  // Florida
  'Jacksonville,FL':[30.3322,-81.6557],'Miami,FL':[25.7617,-80.1918],
  'Tampa,FL':[27.9506,-82.4572],'Orlando,FL':[28.5383,-81.3792],
  'St. Petersburg,FL':[27.7676,-82.6403],'Hialeah,FL':[25.8576,-80.2781],
  'Tallahassee,FL':[30.4518,-84.2807],'Fort Lauderdale,FL':[26.1224,-80.1373],
  'Cape Coral,FL':[26.5629,-81.9495],'Gainesville,FL':[29.6516,-82.3248],
  'Clearwater,FL':[27.9659,-82.8001],'Sarasota,FL':[27.3364,-82.5307],
  'Pensacola,FL':[30.4213,-87.2169],'Daytona Beach,FL':[29.2108,-81.0228],
  // Texas
  'Houston,TX':[29.7604,-95.3698],'San Antonio,TX':[29.4241,-98.4936],
  'Dallas,TX':[32.7767,-96.7970],'Austin,TX':[30.2672,-97.7431],
  'Fort Worth,TX':[32.7555,-97.3308],'El Paso,TX':[31.7619,-106.4850],
  'Arlington,TX':[32.7357,-97.1081],'Corpus Christi,TX':[27.8006,-97.3964],
  'Plano,TX':[33.0198,-96.6989],'Lubbock,TX':[33.5779,-101.8552],
  // California
  'Los Angeles,CA':[34.0522,-118.2437],'San Diego,CA':[32.7157,-117.1611],
  'San Jose,CA':[37.3382,-121.8863],'San Francisco,CA':[37.7749,-122.4194],
  'Fresno,CA':[36.7378,-119.7871],'Sacramento,CA':[38.5816,-121.4944],
  'Long Beach,CA':[33.7701,-118.1937],'Oakland,CA':[37.8044,-122.2712],
  'Bakersfield,CA':[35.3733,-119.0187],'Anaheim,CA':[33.8366,-117.9143],
  'San Bernardino,CA':[34.1083,-117.2898],'Riverside,CA':[33.9806,-117.3755],
  'Santa Ana,CA':[33.7455,-117.8677],'Irvine,CA':[33.6846,-117.8265],
  'Chula Vista,CA':[32.6401,-117.0842],'Fremont,CA':[37.5485,-121.9886],
  'Santa Barbara,CA':[34.4208,-119.6982],'Monterey,CA':[36.6002,-121.8947],
  // Illinois
  'Chicago,IL':[41.8781,-87.6298],'Aurora,IL':[41.7606,-88.3201],
  'Rockford,IL':[42.2711,-89.0937],'Joliet,IL':[41.5250,-88.0817],
  'Naperville,IL':[41.7508,-88.1535],'Springfield,IL':[39.7817,-89.6501],
  'Peoria,IL':[40.6936,-89.5890],'Elgin,IL':[42.0354,-88.2826],
  'Waukegan,IL':[42.3636,-87.8448],'Champaign,IL':[40.1164,-88.2434],
  // Ohio
  'Columbus,OH':[39.9612,-82.9988],'Cleveland,OH':[41.4993,-81.6944],
  'Cincinnati,OH':[39.1031,-84.5120],'Toledo,OH':[41.6528,-83.5379],
  'Akron,OH':[41.0814,-81.5190],'Dayton,OH':[39.7589,-84.1916],
  'Parma,OH':[41.3845,-81.7229],'Canton,OH':[40.7989,-81.3784],
  // Massachusetts
  'Boston,MA':[42.3601,-71.0589],'Worcester,MA':[42.2626,-71.8023],
  'Springfield,MA':[42.1015,-72.5898],'Lowell,MA':[42.6334,-71.3162],
  'Cambridge,MA':[42.3736,-71.1097],'New Bedford,MA':[41.6362,-70.9342],
  'Brockton,MA':[42.0834,-71.0184],'Quincy,MA':[42.2529,-71.0023],
  'Lynn,MA':[42.4668,-70.9495],'Newton,MA':[42.3370,-71.2092],
  // Connecticut
  'Bridgeport,CT':[41.1865,-73.1952],'New Haven,CT':[41.3082,-72.9282],
  'Hartford,CT':[41.7658,-72.6851],'Stamford,CT':[41.0534,-73.5387],
  'Waterbury,CT':[41.5582,-73.0515],'Norwalk,CT':[41.1177,-73.4082],
  'Danbury,CT':[41.3948,-73.4540],'New Britain,CT':[41.6612,-72.7795],
  // Colorado
  'Denver,CO':[39.7392,-104.9903],'Colorado Springs,CO':[38.8339,-104.8214],
  'Aurora,CO':[39.7294,-104.8319],'Fort Collins,CO':[40.5853,-105.0844],
  'Lakewood,CO':[39.7047,-105.0814],'Thornton,CO':[39.8680,-104.9719],
  'Arvada,CO':[39.8028,-105.0875],'Westminster,CO':[39.8367,-105.0372],
  'Pueblo,CO':[38.2544,-104.6091],'Boulder,CO':[40.0150,-105.2705],
  // Washington State
  'Seattle,WA':[47.6062,-122.3321],'Spokane,WA':[47.6588,-117.4260],
  'Tacoma,WA':[47.2529,-122.4443],'Vancouver,WA':[45.6387,-122.6615],
  'Bellevue,WA':[47.6101,-122.2015],'Kent,WA':[47.3809,-122.2348],
  'Everett,WA':[47.9790,-122.2021],'Renton,WA':[47.4829,-122.2171],
  'Kirkland,WA':[47.6769,-122.2060],'Olympia,WA':[47.0379,-122.9007],
  // West Virginia
  'Charleston,WV':[38.3498,-81.6326],'Huntington,WV':[38.4193,-82.4452],
  'Morgantown,WV':[39.6295,-79.9559],'Parkersburg,WV':[39.2667,-81.5615],
}

function getCoordsForRace(city, state) {
  if (!city && !state) return { lat: null, lng: null }
  // Try exact city,state match first
  const cityKey = `${city},${state}`
  if (CITY_COORDS[cityKey]) {
    return { lat: CITY_COORDS[cityKey][0], lng: CITY_COORDS[cityKey][1] }
  }
  // Try state center as fallback
  if (STATE_COORDS[state]) {
    return { lat: STATE_COORDS[state][0], lng: STATE_COORDS[state][1] }
  }
  return { lat: null, lng: null }
}

function normalizeDistance(raw) {
  if (!raw) return null
  const r = raw.toLowerCase().trim()
  if (r.includes('marathon') && !r.includes('half')) return '26.2'
  if (r.includes('half') || r.includes('13.1'))       return '13.1'
  if (r.includes('10k') || r === '10 km')             return '10K'
  if (r.includes('5k')  || r === '5 km')              return '5K'
  if (r.includes('10 mi') || r.includes('10mile') || r.includes('10-mile')) return '10 mi'
  if (r.includes('70.3') || r.includes('half iron'))  return '70.3'
  if (r.includes('140.6') || (r.includes('ironman') && !r.includes('70'))) return '140.6'
  if (r.includes('50k'))  return '50K'
  if (r.includes('50m') || r.includes('50 mi')) return '50M'
  if (r.includes('100k')) return '100K'
  if (r.includes('100m') || r.includes('100 mi')) return '100M'
  if (r.includes('tri'))  return 'Tri'
  return raw.replace(/\s+/g, ' ').trim()
}

function normalizeSport(distance, name) {
  const combined = `${distance || ''} ${name || ''}`.toLowerCase()
  if (combined.includes('ironman') || combined.includes('triathlon') || combined.includes('70.3') || combined.includes('140.6')) return 'Triathlon'
  if (combined.includes('cycl') || combined.includes('bike') || combined.includes('century')) return 'Cycling'
  if (combined.includes('swim') || combined.includes('open water')) return 'Swimming'
  return 'Running'
}

function buildUnsplashQuery(name, city, state, distance) {
  const dist = normalizeDistance(distance)
  if (dist === '26.2') return `${city} marathon runners road race`
  if (dist === '13.1') return `${city} half marathon running`
  if (dist === '70.3' || dist === '140.6') return `triathlon swim bike run race`
  if (dist === '50K' || dist === '50M' || dist === '100K') return `trail ultra running forest`
  return `${city} ${state} running race`
}

function normalizeRace(raceData, state) {
  const race       = raceData?.race || raceData
  const events     = race?.next_date?.events || race?.events || []
  const firstEvent = events?.[0]?.event || events?.[0] || {}

  const raceId   = `rs_${race.race_id}`
  const name     = race.name || 'Unknown Race'
  const city     = race.address?.city || ''
  const stateVal = race.address?.state || state || ''
  const distRaw  = firstEvent.distance || firstEvent.name || ''
  const distance = normalizeDistance(distRaw)
  const sport    = normalizeSport(distRaw, name)
  const { lat, lng } = getCoordsForRace(city, stateVal)

  const dateStr = race.next_date?.start_time || race.start_time || null
  let dateSort    = null
  let dateDisplay = null
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d)) {
      dateSort    = d.toISOString().split('T')[0]
      dateDisplay = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
    }
  }

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

async function syncState(state, dryRun = false) {
  const today   = new Date().toISOString().split('T')[0]
  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let page      = 1
  let total     = 0
  let added     = 0
  let errors    = 0
  const batchSize = 100

  while (true) {
    const url = `${BASE}/races?${AUTH}&state=${state}&results_per_page=${batchSize}&page=${page}&start_date=${today}&end_date=${oneYear}&include_event_details=T`

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
        .filter(r => r.name && r.date_sort)

      if (normalized.length > 0) {
        for (let i = 0; i < normalized.length; i += 50) {
          const chunk = normalized.slice(i, i + 50)
          const { error } = await supabaseAdmin
            .from('races')
            .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })

          if (error) {
            console.error(`Supabase upsert error for ${state}:`, error.message)
            errors += chunk.length
          } else {
            added += chunk.length
          }
        }
      }
    }

    if (races.length < batchSize) break
    page++
    if (page > 20) break
  }

  return { state, total, added, errors }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: 'RunSignup API credentials not configured' })
  }

  const { action, first_name, last_name, race_id, event_id,
          state = 'MD', page = 1,
          states, dry_run, sync_key } = req.query

  if (action === 'sync_races' || action === 'sync_state') {
    const expectedKey = process.env.SYNC_SECRET_KEY
    if (expectedKey && sync_key !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized — invalid sync_key' })
    }
  }

  try {

    if (action === 'sync_races') {
      const statesToSync = states ? states.split(',') : SYNC_STATES
      const dryRun       = dry_run === 'true'
      const results      = []
      let totalAdded     = 0
      let totalErrors    = 0

      for (const s of statesToSync) {
        const result = await syncState(s, dryRun)
        results.push(result)
        totalAdded  += result.added
        totalErrors += result.errors
        console.log(`${s}: ${result.total} fetched, ${result.added} upserted, ${result.errors} errors`)
      }

      if (!dryRun) {
        await supabaseAdmin.from('races').update({ is_past: true }).lt('date_sort', new Date().toISOString().split('T')[0])
      }

      return res.status(200).json({
        action: 'sync_races', dry_run: dryRun,
        states_synced: statesToSync.length,
        total_added: totalAdded, total_errors: totalErrors,
        results, synced_at: new Date().toISOString(),
      })
    }

    if (action === 'sync_state') {
      const result = await syncState(state, dry_run === 'true')
      console.log(`${state}: ${result.total} fetched, ${result.added} upserted, ${result.errors} errors`)
      return res.status(200).json({ action: 'sync_state', ...result })
    }

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
        .order(sort_by, { ascending: true })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

      if (max_price) query = query.lte('price', parseInt(max_price))
      if (dist_filter && dist_filter !== 'ALL') {
        if (dist_filter === 'TRI')        query = query.in('distance', ['70.3','140.6','Tri'])
        else if (dist_filter === 'ULTRA') query = query.in('distance', ['50K','50M','100K','100M'])
        else                              query = query.eq('distance', dist_filter)
      }
      if (terrain_filter && terrain_filter !== 'All') query = query.ilike('terrain', `%${terrain_filter}%`)
      if (sport_filter   && sport_filter   !== 'All') query = query.eq('sport', sport_filter)
      if (date_from) query = query.gte('date_sort', date_from)
      if (date_to)   query = query.lte('date_sort', date_to)

      const { data, error } = await query
      if (error) return res.status(500).json({ error: error.message })

      let races = data || []
      if (user_lat && user_lng) {
        const lat = parseFloat(user_lat)
        const lng = parseFloat(user_lng)
        const rad = parseFloat(radius)
        races = races.filter(r => {
          if (!r.lat || !r.lng) return false
          const dLat = (r.lat - lat) * Math.PI / 180
          const dLng = (r.lng - lng) * Math.PI / 180
          const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(r.lat*Math.PI/180) * Math.sin(dLng/2)**2
          const miles = 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          r.distance_miles = Math.round(miles * 10) / 10
          return miles <= rad
        }).sort((a, b) => (a.distance_miles||999) - (b.distance_miles||999))
      }

      return res.status(200).json({ action: 'get_races', count: races.length, races })
    }

    if (action === 'debug') {
      const url = `${BASE}/races?${AUTH}&state=MD&results_per_page=1&include_event_details=T`
      const response = await fetch(url)
      const data = await response.json()
      const firstRace = data?.races?.[0]
      const city  = firstRace?.race?.address?.city || ''
      const st    = firstRace?.race?.address?.state || 'MD'
      const coords = getCoordsForRace(city, st)
      return res.status(200).json({
        action: 'debug',
        credentials_work: !data?.error,
        first_race_city: city,
        first_race_state: st,
        coords_result: coords,
        supabase_connected: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      })
    }

    // ── GET FULL RACE DETAIL ──────────────────────────────────────────────────
    if (action === 'get_race_detail') {
      if (!race_id) return res.status(400).json({ error: 'race_id required' })

      // Strip 'rs_' prefix if present to get the numeric RunSignup ID
      const numericId = race_id.replace('rs_', '')

      // Fetch full race detail from RunSignup
      const url = `${BASE}/race/${numericId}?${AUTH}&include_event_details=T&include_waiver=F&include_questions=F`
      let rsData
      try {
        const response = await fetch(url)
        rsData = await response.json()
      } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch race detail', message: e.message })
      }

      const race = rsData?.race
      if (!race) return res.status(404).json({ error: 'Race not found' })

      // Derive terrain from name + description
      const nameAndDesc = `${race.name || ''} ${race.description || ''}`.toLowerCase()
      let terrain = 'Road'
      if (nameAndDesc.includes('trail') || nameAndDesc.includes('mountain') || nameAndDesc.includes('ridge') || nameAndDesc.includes('forest') || nameAndDesc.includes('creek')) terrain = 'Trail'
      else if (nameAndDesc.includes('triathlon') || nameAndDesc.includes('ironman') || nameAndDesc.includes('70.3') || nameAndDesc.includes('swim')) terrain = 'Multi'
      else if (nameAndDesc.includes('bridge')) terrain = 'Bridge/Road'
      else if (nameAndDesc.includes('track')) terrain = 'Track'
      else if (nameAndDesc.includes('beach') || nameAndDesc.includes('sand')) terrain = 'Beach'

      // Derive difficulty from distance
      const distLower = (race.distance || '').toLowerCase()
      let difficulty = 'Moderate'
      if (distLower.includes('5k') || distLower === '5 km') difficulty = 'Beginner'
      else if (distLower.includes('10k') || distLower === '10 km') difficulty = 'Easy'
      else if (distLower.includes('half') || distLower.includes('13.1')) difficulty = 'Moderate'
      else if (distLower.includes('marathon') && !distLower.includes('half')) difficulty = 'Hard'
      else if (distLower.includes('ultra') || distLower.includes('50k') || distLower.includes('100')) difficulty = 'Expert'
      else if (distLower.includes('70.3') || distLower.includes('ironman')) difficulty = 'Expert'

      // Parse registration dates from events
      const events = race.events || []
      let regOpenDate = null
      let regCloseDate = null
      let cutoffTime = null
      let minPrice = null
      const eventsDetail = []

      for (const ev of events) {
        const e = ev?.event || ev
        // Registration opens
        const opens = e?.registration_opens?.[0]
        if (opens?.opens_at) regOpenDate = opens.opens_at
        if (opens?.closes_at) regCloseDate = opens.closes_at
        if (opens?.fee) {
          const p = parseFloat(opens.fee)
          if (!isNaN(p) && (minPrice === null || p < minPrice)) minPrice = Math.round(p)
        }
        // Cutoff
        if (e?.cutoff_time) cutoffTime = e.cutoff_time
        // Store event summary
        if (e?.name || e?.distance) {
          eventsDetail.push({
            name: e.name || '',
            distance: e.distance || '',
            fee: opens?.fee || null,
            start_time: e.start_time || null,
          })
        }
      }

      // Build the enriched race object
      const enriched = {
        description:     race.description || null,
        website_url:     race.url || null,
        course_map_url:  race.course_map_url || null,
        charity:         race.charity_name || race.beneficiary || null,
        cutoff_time:     cutoffTime,
        reg_open_date:   regOpenDate,
        reg_close_date:  regCloseDate,
        terrain,
        difficulty,
        events_detail:   eventsDetail.length > 0 ? eventsDetail : null,
        detail_fetched:  true,
        last_updated:    new Date().toISOString(),
      }
      // Also update price if we got a better value
      if (minPrice !== null) enriched.price = minPrice

      // Upsert enriched data back to Supabase
      const supabaseId = `rs_${numericId}`
      const { error: upsertError } = await supabaseAdmin
        .from('races')
        .update(enriched)
        .eq('id', supabaseId)

      if (upsertError) {
        console.error('Supabase update error:', upsertError.message)
      }

      // Also fetch the full race row from Supabase to return
      const { data: fullRace } = await supabaseAdmin
        .from('races')
        .select('*')
        .eq('id', supabaseId)
        .single()

      return res.status(200).json({
        action: 'get_race_detail',
        race: fullRace || { id: supabaseId, ...enriched },
        raw_rs_data: { name: race.name, description: race.description },
      })
    }

    if (action === 'search_results_in_race') {
      const url = `${BASE}/race/${race_id}/results/get-results?${AUTH}&event_id=${event_id}&first_name=${encodeURIComponent(first_name||'')}&last_name=${encodeURIComponent(last_name||'')}&results_per_page=20`
      const response = await fetch(url)
      const data = await response.json()
      return res.status(200).json({ action, data })
    }

    if (action === 'get_race_results') {
      const url = `${BASE}/race/${race_id}/results/get-results?${AUTH}&first_name=${encodeURIComponent(first_name||'')}&last_name=${encodeURIComponent(last_name||'')}&results_per_page=20`
      const response = await fetch(url)
      const data = await response.json()
      return res.status(200).json({ action, data })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })

  } catch (error) {
    console.error('RunSignup API error:', error)
    return res.status(500).json({ error: 'Failed to fetch from RunSignup', message: error.message })
  }
}
