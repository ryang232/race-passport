// api/generate-images.js
// Vercel serverless endpoint — generates city images via Replicate Flux Dev
// ALL images are now skyline or landmark style — no more street-level views.
//
// Visit: /api/generate-images?action=status           → see progress + cost estimate
// Visit: /api/generate-images?action=test&city=Baltimore&state=MD → test one image
// Visit: /api/generate-images?action=run&batch=0      → run batch 0 (25 cities)
// Visit: /api/generate-images?action=run&batch=1      → run batch 1, etc.
// Visit: /api/generate-images?action=regenerate_all   → delete all + re-queue (use carefully)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY
  const SUPABASE_URL      = process.env.SUPABASE_URL
  const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY

  if (!REPLICATE_API_KEY) return res.status(500).json({ error: 'REPLICATE_API_KEY not set' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase env vars not set' })

  const action = req.query.action || 'status'

  const BATCH_SIZE  = 25
  const MAX_RETRIES = 5
  const RETRY_DELAY = 12000

  // ── City knowledge ────────────────────────────────────────────────────────

  // Tier 1: World-class skylines — dramatic aerial
  const TIER1_SKYLINE = new Set([
    'new york','new york city','nyc','chicago','boston','los angeles','san francisco',
    'washington','seattle','miami','denver','atlanta','dallas','houston','philadelphia',
    'portland','minneapolis','nashville','austin','charlotte','detroit','baltimore',
    'san diego','phoenix','las vegas','honolulu','pittsburgh','cleveland','columbus',
    'richmond','raleigh','salt lake city','kansas city','st louis','milwaukee',
    'indianapolis','memphis','new orleans','san antonio','sacramento','orlando',
    'cincinnati','tampa','st. petersburg','louisville','hartford','providence',
    'albany','buffalo','rochester','syracuse','jacksonville','charlotte',
    'oklahoma city','tulsa','omaha','des moines','madison','boise','spokane',
    'anchorage','honolulu','albuquerque','el paso','tucson','fresno','long beach',
    'virginia beach','norfolk','richmond','greensboro','durham','raleigh',
  ])

  // Tier 2: Known for a specific landmark or natural feature
  const LANDMARK_CITIES = {
    'annapolis':       'the Maryland State House dome and historic harbor, Annapolis, Maryland',
    'cambridge':       'the Choptank River waterfront and historic downtown, Cambridge, Maryland',
    'frederick':       'the historic church spires and brick facades of downtown Frederick, Maryland',
    'gettysburg':      'the rolling battlefield and monument fields of Gettysburg, Pennsylvania',
    'mystic':          'the wooden tall ships and historic seaport of Mystic, Connecticut',
    'kennebunkport':   'the rocky coastline and classic Maine lighthouse near Kennebunkport',
    'bar harbor':      'Acadia National Park mountains meeting the ocean at Bar Harbor, Maine',
    'stowe':           'the white church steeple and Green Mountains of Stowe, Vermont',
    'mackinac island': 'the Grand Hotel and bluffs of Mackinac Island, Michigan',
    'traverse city':   'the blue waters of Grand Traverse Bay, Traverse City, Michigan',
    'door county':     'the rocky shoreline and lighthouses of Door County, Wisconsin',
    'galena':          'the historic lead mining town hillside and river, Galena, Illinois',
    'lake tahoe':      'the crystal clear alpine lake surrounded by Sierra Nevada peaks, Lake Tahoe',
    'monterey':        'the dramatic rocky coastline and cypresses of Monterey, California',
    'carmel':          'the white sand beach and cypress trees of Carmel-by-the-Sea, California',
    'santa barbara':   'the Spanish mission architecture against the Santa Ynez Mountains, Santa Barbara',
    'sedona':          'the dramatic red rock formations and desert landscape of Sedona, Arizona',
    'moab':            'the towering red sandstone arches and canyons near Moab, Utah',
    'jackson':         'the Grand Teton peaks rising above the valley at Jackson, Wyoming',
    'gatlinburg':      'the Great Smoky Mountains rising behind Gatlinburg, Tennessee',
    'asheville':       'the Blue Ridge Parkway and mountain skyline above Asheville, North Carolina',
    'savannah':        'the moss-draped live oak trees and historic squares of Savannah, Georgia',
    'charleston':      'the antebellum Rainbow Row houses along the Charleston, South Carolina waterfront',
    'key west':        'the tropical sunset and colorful architecture of Key West, Florida',
    'st augustine':    'the Castillo de San Marcos fort and oldest city streets of St Augustine, Florida',
    'cape cod':        'the classic lighthouse and sand dunes of Cape Cod, Massachusetts',
    'nantucket':       'the gray-shingled cottages and harbor of Nantucket, Massachusetts',
    'newport':         'the Gilded Age mansions along the Cliff Walk, Newport, Rhode Island',
    'saratoga springs':'the grand Victorian racetrack and spa architecture of Saratoga Springs, New York',
    'cooperstown':     'the pastoral village and Otsego Lake shoreline of Cooperstown, New York',
    'niagara falls':   'the thundering Niagara Falls with mist rising, New York',
    'ithaca':          'the dramatic Taughannock Falls gorge near Ithaca, New York',
    'burlington':      'Lake Champlain and the Adirondacks viewed from Burlington, Vermont',
    'portland':        'the lighthouse on Portland Head and rocky coast of Portland, Maine',
    'camden':          'the yacht-filled harbor and Camden Hills of Camden, Maine',
    'concord':         'the gold-domed New Hampshire State House in Concord',
    'portsmouth':      'the historic Strawbery Banke waterfront district of Portsmouth, New Hampshire',
    'bristol':         'the classic New England harbor and sailboats of Bristol, Rhode Island',
    'mystic':          'the wooden tall ships and historic seaport of Mystic, Connecticut',
    'williamsburg':    'the colonial Capitol building and cobblestone Duke of Gloucester Street, Williamsburg, Virginia',
    'luray':           'the dramatic limestone caverns and Shenandoah Valley near Luray, Virginia',
    'harpers ferry':   'the confluence of two rivers at the historic town of Harpers Ferry, West Virginia',
    'ocean city':      'the iconic boardwalk and ferris wheel at Ocean City, Maryland',
    'rehoboth beach':  'the classic Delaware beach boardwalk at Rehoboth Beach',
    'cape may':        'the Victorian gingerbread houses and lighthouse of Cape May, New Jersey',
    'princeton':       'the gothic Nassau Hall and campus greens of Princeton, New Jersey',
    'hershey':         'the streetlights shaped like Hershey kisses in Hershey, Pennsylvania',
    'lancaster':       'the rolling Amish farmlands and red barns near Lancaster, Pennsylvania',
    'gettysburg':      'the Civil War monuments and open fields of Gettysburg, Pennsylvania',
    'erie':            'the Presque Isle lighthouse on Lake Erie at Erie, Pennsylvania',
    'marquette':       'the dramatic Lake Superior shoreline and iron ore docks at Marquette, Michigan',
    'duluth':          'the Aerial Lift Bridge and Lake Superior harbor at Duluth, Minnesota',
    'stillwater':      'the historic lift bridge and St Croix River bluffs at Stillwater, Minnesota',
    'red wing':        'the limestone bluffs above the Mississippi River at Red Wing, Minnesota',
    'galveston':       'the historic Victorian strand and Gulf of Mexico at Galveston, Texas',
    'fredericksburg':  'the wildflower fields and Texas hill country near Fredericksburg, Texas',
    'marfa':           'the vast Chihuahuan desert landscape and minimalist architecture of Marfa, Texas',
    'santa fe':        'the adobe Palace of the Governors and Sangre de Cristo mountains, Santa Fe, New Mexico',
    'taos':            'the ancient Taos Pueblo and New Mexico mountain backdrop',
    'flagstaff':       'the San Francisco Peaks and ponderosa pines at Flagstaff, Arizona',
    'prescott':        'the Courthouse Plaza and Victorian architecture of Prescott, Arizona',
    'bend':            'the Three Sisters volcanic peaks above the high desert at Bend, Oregon',
    'ashland':         'the Lithia Park and green hills of Ashland, Oregon',
    'hood river':      'Mount Hood reflected in the Columbia River Gorge at Hood River, Oregon',
    'astoria':         'the Astoria Column and Columbia River mouth at Astoria, Oregon',
    'port townsend':   'the Victorian seaport buildings and Olympic Mountains at Port Townsend, Washington',
    'leavenworth':     'the Bavarian-style village and Cascade Mountains at Leavenworth, Washington',
    'coeur d alene':   'the resort pier and Lake Coeur d Alene reflecting mountains, Idaho',
    'sun valley':      'the Sawtooth Mountains and ski slopes above Sun Valley, Idaho',
    'missoula':        'the Clark Fork River and surrounding mountains at Missoula, Montana',
    'bozeman':         'the Bridger Mountains and historic main street of Bozeman, Montana',
    'billings':        'the dramatic sandstone rimrocks above Billings, Montana',
    'rapid city':      'the Black Hills and Mount Rushmore region near Rapid City, South Dakota',
    'deadwood':        'the historic gold rush main street of Deadwood, South Dakota',
    'laramie':         'the wide Wyoming plains and Medicine Bow Mountains near Laramie',
    'cody':            'the dramatic Absaroka Mountains and western landscape near Cody, Wyoming',
    'park city':       'the ski slopes and historic silver mining town of Park City, Utah',
    'st george':       'the red Navajo sandstone formations near St George, Utah',
    'durango':         'the narrow gauge railroad and San Juan Mountains at Durango, Colorado',
    'telluride':       'the dramatic box canyon and waterfall above Telluride, Colorado',
    'breckenridge':    'the Victorian Main Street and ski peaks above Breckenridge, Colorado',
    'vail':            'the alpine village and Gore Range peaks at Vail, Colorado',
    'fort collins':    'the historic Old Town and Cache la Poudre River at Fort Collins, Colorado',
    'boulder':         'the Flatirons rock formations above Boulder, Colorado',
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  function buildPrompt(city, state) {
    const cityLower = city.toLowerCase().trim()
    const suffix    = 'dramatic lighting, photorealistic, ultra detailed, wide cinematic composition, no people, no cars, no text, no logos, golden hour or blue hour light'

    // Tier 1: major city skyline
    if (TIER1_SKYLINE.has(cityLower)) {
      return `Dramatic aerial skyline of ${city}, ${state} at golden hour, showing iconic buildings and city silhouette against a glowing sky, wide cinematic shot from above, ${suffix}`
    }

    // Tier 2: known landmark
    if (LANDMARK_CITIES[cityLower]) {
      return `A stunning photorealistic image of ${LANDMARK_CITIES[cityLower]}, golden hour light, wide cinematic composition, ${suffix}`
    }

    // Tier 3: all other cities — best landmark or feature
    return `A stunning photorealistic image of the most iconic landmark or recognizable feature of ${city}, ${state}, dramatic golden hour light, wide cinematic composition, architectural or natural beauty, ${suffix}`
  }

  // ── Sleep helper ──────────────────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))

  // ── Generate one image with retry ────────────────────────────────────────
  async function generateImage(prompt, attempt = 0) {
    try {
      const resp = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify({
          input: {
            prompt,
            width: 1280,
            height: 720,
            num_inference_steps: 28,
            guidance: 3.5,
            output_format: 'webp',
            output_quality: 90,
          }
        })
      })

      if (resp.status === 429) {
        if (attempt >= MAX_RETRIES) throw new Error(`Rate limited after ${MAX_RETRIES} retries`)
        const body = await resp.json().catch(() => ({}))
        const waitMs = ((body.retry_after || 10) + 2) * 1000
        await sleep(waitMs)
        return generateImage(prompt, attempt + 1)
      }

      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(`Replicate error ${resp.status}: ${err}`)
      }

      const prediction = await resp.json()
      if (prediction.status === 'succeeded') {
        const out = prediction.output
        return Array.isArray(out) ? out[0] : out
      }
      return await pollPrediction(prediction.id)

    } catch (e) {
      if (attempt < MAX_RETRIES && e.message.includes('Rate limited')) {
        await sleep(RETRY_DELAY)
        return generateImage(prompt, attempt + 1)
      }
      throw e
    }
  }

  async function pollPrediction(id, attempts = 0) {
    if (attempts > 40) throw new Error('Prediction timed out')
    await sleep(3000)
    const resp = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` }
    })
    const data = await resp.json()
    if (data.status === 'succeeded') return Array.isArray(data.output) ? data.output[0] : data.output
    if (data.status === 'failed') throw new Error(`Prediction failed: ${data.error}`)
    return pollPrediction(id, attempts + 1)
  }

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  async function uploadToSupabase(imageUrl, city, state) {
    const imgResp = await fetch(imageUrl)
    if (!imgResp.ok) throw new Error(`Failed to download image: ${imgResp.status}`)
    const imgBuffer = await imgResp.arrayBuffer()
    const filename  = `${state.toLowerCase()}-${city.toLowerCase().replace(/[\s\/\\]+/g,'-')}-standard.webp`

    const uploadResp = await fetch(`${SUPABASE_URL}/storage/v1/object/city-images/${filename}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/webp',
        'x-upsert': 'true',
      },
      body: imgBuffer,
    })
    if (!uploadResp.ok) {
      const err = await uploadResp.text()
      throw new Error(`Storage upload failed: ${uploadResp.status} — ${err}`)
    }
    return `${SUPABASE_URL}/storage/v1/object/public/city-images/${filename}`
  }

  // ── Save to city_images table ─────────────────────────────────────────────
  // Always uses race_type = 'standard' now — one image per city
  async function saveToDatabase(city, state, imageUrl, prompt) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/city_images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ city, state, race_type: 'standard', image_url: imageUrl, prompt })
    })
    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`DB save failed: ${resp.status} — ${err}`)
    }
  }

  // ── Fetch distinct cities from races table ────────────────────────────────
  async function getDistinctCities() {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/races?select=city,state&city=not.is.null&state=not.is.null&limit=50000`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    if (!resp.ok) throw new Error('Failed to fetch cities')
    const races = await resp.json()
    const seen = new Set(), combos = []
    for (const race of races) {
      if (!race.city || !race.state) continue
      const city  = race.city.trim()
      const state = race.state.trim().toUpperCase()
      const key   = `${city}|${state}`
      if (!seen.has(key)) { seen.add(key); combos.push({ city, state }) }
    }
    return combos
  }

  async function getAlreadyGenerated() {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/city_images?select=city,state&race_type=eq.standard&limit=10000`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    if (!resp.ok) return new Set()
    const rows = await resp.json()
    return new Set(rows.map(r => `${r.city}|${r.state}`))
  }

  // ── ACTION: status ────────────────────────────────────────────────────────
  if (action === 'status') {
    try {
      const [all, done] = await Promise.all([getDistinctCities(), getAlreadyGenerated()])
      const remaining   = all.filter(c => !done.has(`${c.city}|${c.state}`))
      const batches     = Math.ceil(remaining.length / BATCH_SIZE)
      return res.status(200).json({
        total_unique_cities: all.length,
        already_generated:   done.size,
        remaining:           remaining.length,
        batches_needed:      batches,
        complete:            remaining.length === 0,
        estimated_cost_usd:  `$${(remaining.length * 0.003).toFixed(2)}`,
        next_step: remaining.length > 0
          ? `Visit /api/generate-images?action=run&batch=0`
          : 'All images generated!',
      })
    } catch(e) { return res.status(500).json({ error: e.message }) }
  }

  // ── ACTION: test ──────────────────────────────────────────────────────────
  if (action === 'test') {
    const city  = req.query.city  || 'Baltimore'
    const state = req.query.state || 'MD'
    const prompt = buildPrompt(city, state)
    try {
      const imageUrl = await generateImage(prompt)
      return res.status(200).json({ city, state, prompt, imageUrl, note: 'Not saved to DB — preview only' })
    } catch(e) { return res.status(500).json({ error: e.message, prompt }) }
  }

  // ── ACTION: run ───────────────────────────────────────────────────────────
  if (action === 'run') {
    const batchNum = parseInt(req.query.batch || '0')
    try {
      const [all, done]  = await Promise.all([getDistinctCities(), getAlreadyGenerated()])
      const remaining    = all.filter(c => !done.has(`${c.city}|${c.state}`))
      const batch        = remaining.slice(batchNum * BATCH_SIZE, (batchNum + 1) * BATCH_SIZE)

      if (batch.length === 0) {
        return res.status(200).json({ message: 'All images generated!', total_done: done.size })
      }

      const results = { success: [], failed: [] }
      for (const { city, state } of batch) {
        const prompt = buildPrompt(city, state)
        try {
          const replicateUrl = await generateImage(prompt)
          const storedUrl    = await uploadToSupabase(replicateUrl, city, state)
          await saveToDatabase(city, state, storedUrl, prompt)
          results.success.push({ city, state })
        } catch(e) {
          results.failed.push({ city, state, error: e.message })
        }
      }

      const hasMore   = remaining.length > (batchNum + 1) * BATCH_SIZE
      const nextBatch = batchNum + 1
      return res.status(200).json({
        batch:           batchNum,
        processed:       batch.length,
        success:         results.success.length,
        failed:          results.failed.length,
        failures:        results.failed.length > 0 ? results.failed : undefined,
        remaining_after: Math.max(0, remaining.length - results.success.length),
        next_step: hasMore
          ? `Visit /api/generate-images?action=run&batch=${nextBatch}`
          : 'All batches complete! Run action=status to confirm.',
      })
    } catch(e) { return res.status(500).json({ error: e.message }) }
  }

  // ── ACTION: regenerate specific cities ────────────────────────────────────
  // Visit: /api/generate-images?action=regenerate&cities=Baltimore:MD,Annapolis:MD
  if (action === 'regenerate') {
    const citiesParam = req.query.cities || ''
    const cityList = citiesParam.split(',').map(c => {
      const [city, state] = c.trim().split(':')
      return { city: city?.trim(), state: state?.trim() }
    }).filter(c => c.city && c.state)

    if (cityList.length === 0) return res.status(400).json({ error: 'Pass cities=CityName:ST,CityName2:ST2' })

    const results = { success: [], failed: [] }
    for (const { city, state } of cityList) {
      const prompt = buildPrompt(city, state)
      try {
        // Delete existing entry first
        await fetch(`${SUPABASE_URL}/rest/v1/city_images?city=eq.${encodeURIComponent(city)}&state=eq.${state}&race_type=eq.standard`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        })
        const replicateUrl = await generateImage(prompt)
        const storedUrl    = await uploadToSupabase(replicateUrl, city, state)
        await saveToDatabase(city, state, storedUrl, prompt)
        results.success.push({ city, state, url: storedUrl, prompt })
      } catch(e) {
        results.failed.push({ city, state, error: e.message })
      }
    }
    return res.status(200).json(results)
  }

  return res.status(400).json({ error: 'Unknown action. Use: status | test | run | regenerate' })
}
