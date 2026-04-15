// api/generate-images.js
// Vercel serverless endpoint that generates city images using Replicate Flux Dev
// Visit: /api/generate-images?action=status           → see progress
// Visit: /api/generate-images?action=run&batch=0      → run batch 0 (first 50 cities)
// Visit: /api/generate-images?action=run&batch=1      → run batch 1 (next 50 cities)
// etc. Keep incrementing batch until status shows complete.
// Visit: /api/generate-images?action=test&city=Baltimore&state=MD&type=standard → test one image

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY
  const SUPABASE_URL      = process.env.SUPABASE_URL
  const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY

  if (!REPLICATE_API_KEY) return res.status(500).json({ error: 'REPLICATE_API_KEY not set in Vercel env vars' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase env vars not set' })

  const action = req.query.action || 'status'

  // ── Helpers ──────────────────────────────────────────────────────────────

  const WARM_STATES    = ['FL','HI','TX','LA','SC','GA','AL','MS','PR']
  const COASTAL_STATES = ['CA','OR','WA','ME','NH','MA','RI','CT','NY','NJ','DE','MD','VA','NC','SC','FL','HI']
  const MAJOR_CITIES   = new Set([
    'new york','new york city','nyc','chicago','boston','los angeles','san francisco',
    'washington','seattle','miami','denver','atlanta','dallas','houston','philadelphia',
    'portland','minneapolis','nashville','austin','charlotte','detroit','baltimore',
    'san diego','phoenix','las vegas','honolulu','pittsburgh','cleveland','columbus',
    'richmond','raleigh','salt lake city','kansas city','st louis','milwaukee',
    'indianapolis','memphis','new orleans','san antonio','sacramento','orlando'
  ])

  const REGIONS = {
    northeast:  ['CT','DE','ME','MA','MD','NH','NJ','NY','PA','RI','VT','VA','WV','DC'],
    midwest:    ['IL','IN','IA','KS','MI','MN','MO','NE','ND','OH','SD','WI'],
    southeast:  ['AL','AR','FL','GA','KY','LA','MS','NC','SC','TN'],
    southwest:  ['AZ','NM','NV','OK','TX','UT'],
    west:       ['AK','CA','CO','HI','ID','MT','OR','WA','WY'],
  }

  function getRegion(state) {
    for (const [region, states] of Object.entries(REGIONS)) {
      if (states.includes(state?.toUpperCase())) return region
    }
    return 'northeast'
  }

  function getRegionModifier(state) {
    const region = getRegion(state)
    const modifiers = {
      northeast:  'historic brick buildings, classic American main street, detailed storefronts',
      midwest:    'simple low-rise buildings, wide streets, practical architecture, small town America',
      southeast:  'light-colored buildings, trees, warm humid atmosphere, southern town',
      southwest:  'stucco buildings, warm sandy tones, dry landscape, desert town feel',
      west:       'modern small buildings, lush greenery, slightly overcast soft light, Pacific Northwest feel',
    }
    return modifiers[region] || modifiers.northeast
  }

  function getTriType(state) {
    if (WARM_STATES.includes(state?.toUpperCase())) return 'triathlon_tropical'
    if (COASTAL_STATES.includes(state?.toUpperCase())) return 'triathlon_coastal'
    return 'triathlon_lake'
  }

  function buildPrompt(city, state, raceType) {
    const cityState = `${city}, ${state}`
    const isMajor   = MAJOR_CITIES.has(city.toLowerCase().trim())
    const suffix    = 'clean composition, minimal, realistic, highly detailed, no people, no cars, no text, no logos'

    if (raceType === 'triathlon_tropical') {
      return `A realistic coastal scene in ${cityState}, palm trees and calm ocean water, early morning golden light, wide composition, ${suffix}`
    }
    if (raceType === 'triathlon_coastal') {
      return `A realistic view of ${cityState} with open water, rocky or natural coastline, ocean water, soft golden light, wide composition, ${suffix}`
    }
    if (raceType === 'triathlon_lake') {
      return `A realistic lake scene near ${cityState}, calm water with reflections, tree-lined shoreline, early morning light, wide composition, ${suffix}`
    }
    if (isMajor) {
      return `A cinematic aerial view of ${cityState}, showing the real skyline and surrounding area, golden hour light, realistic architecture, highly detailed, wide composition, ${suffix}`
    }
    // Standard — street level with regional modifier
    const regionMod = getRegionModifier(state)
    return `A realistic street-level view of downtown ${cityState}, ${regionMod}, wide road with strong perspective, early morning light, ${suffix}`
  }

  async function generateImage(prompt) {
    // Call Replicate Flux Dev
    const createResp = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait', // wait up to 60s for result synchronously
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
    if (!createResp.ok) {
      const err = await createResp.text()
      throw new Error(`Replicate API error: ${createResp.status} — ${err}`)
    }
    const prediction = await createResp.json()

    // If not done yet (Prefer: wait timed out), poll
    if (prediction.status !== 'succeeded') {
      return await pollPrediction(prediction.id)
    }
    const output = prediction.output
    return Array.isArray(output) ? output[0] : output
  }

  async function pollPrediction(id, attempts = 0) {
    if (attempts > 30) throw new Error('Prediction timed out after 30 polls')
    await new Promise(r => setTimeout(r, 3000))
    const resp = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` }
    })
    const data = await resp.json()
    if (data.status === 'succeeded') {
      return Array.isArray(data.output) ? data.output[0] : data.output
    }
    if (data.status === 'failed') throw new Error(`Prediction failed: ${data.error}`)
    return await pollPrediction(id, attempts + 1)
  }

  async function uploadToSupabase(imageUrl, city, state, raceType) {
    // Download image from Replicate
    const imgResp = await fetch(imageUrl)
    if (!imgResp.ok) throw new Error(`Failed to download image: ${imgResp.status}`)
    const imgBuffer = await imgResp.arrayBuffer()

    // Upload to Supabase Storage bucket "city-images"
    const filename  = `${state.toLowerCase()}-${city.toLowerCase().replace(/\s+/g,'-')}-${raceType}.webp`
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
      throw new Error(`Supabase Storage upload failed: ${uploadResp.status} — ${err}`)
    }
    // Return public URL
    return `${SUPABASE_URL}/storage/v1/object/public/city-images/${filename}`
  }

  async function saveToDatabase(city, state, raceType, imageUrl, prompt) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/city_images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ city, state, race_type: raceType, image_url: imageUrl, prompt })
    })
    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`DB save failed: ${resp.status} — ${err}`)
    }
  }

  async function getDistinctCities() {
    // Get all unique city+state combos from races table
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/races?select=city,state,distance&city=not.is.null&state=not.is.null`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    if (!resp.ok) throw new Error('Failed to fetch cities from races table')
    const races = await resp.json()

    // Build unique city+state+type combos
    const seen   = new Set()
    const combos = []
    for (const race of races) {
      if (!race.city || !race.state) continue
      const city  = race.city.trim()
      const state = race.state.trim().toUpperCase()
      const d     = (race.distance || '').toLowerCase()
      const isTri = d.includes('70.3') || d.includes('140.6') || d.includes('tri') || d.includes('iron')
      const raceType = isTri ? getTriType(state) : 'standard'
      const key   = `${city}|${state}|${raceType}`
      if (!seen.has(key)) { seen.add(key); combos.push({ city, state, raceType }) }
    }
    return combos
  }

  async function getAlreadyGenerated() {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/city_images?select=city,state,race_type`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    if (!resp.ok) return new Set()
    const rows = await resp.json()
    return new Set(rows.map(r => `${r.city}|${r.state}|${r.race_type}`))
  }

  // ── ACTION: status ────────────────────────────────────────────────────────
  if (action === 'status') {
    try {
      const [allCombos, generated] = await Promise.all([getDistinctCities(), getAlreadyGenerated()])
      const remaining = allCombos.filter(c => !generated.has(`${c.city}|${c.state}|${c.raceType}`))
      return res.status(200).json({
        total_unique_combos: allCombos.length,
        already_generated:   generated.size,
        remaining:           remaining.length,
        complete:            remaining.length === 0,
        next_step:           remaining.length > 0
          ? `Visit /api/generate-images?action=run&batch=0 to start generating`
          : 'All images generated!',
        estimated_cost_usd:  `$${(remaining.length * 0.003).toFixed(2)}`,
      })
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── ACTION: test — generate ONE image to preview ──────────────────────────
  if (action === 'test') {
    const city      = req.query.city  || 'Baltimore'
    const state     = req.query.state || 'MD'
    const raceType  = req.query.type  || 'standard'
    const prompt    = buildPrompt(city, state, raceType)
    try {
      const imageUrl = await generateImage(prompt)
      return res.status(200).json({ city, state, raceType, prompt, imageUrl, message: 'Test image generated — not saved to DB' })
    } catch(e) {
      return res.status(500).json({ error: e.message, prompt })
    }
  }

  // ── ACTION: run — generate a batch of 50 ─────────────────────────────────
  if (action === 'run') {
    const BATCH_SIZE = 50
    const batchNum   = parseInt(req.query.batch || '0')

    try {
      const [allCombos, generated] = await Promise.all([getDistinctCities(), getAlreadyGenerated()])
      const remaining  = allCombos.filter(c => !generated.has(`${c.city}|${c.state}|${c.raceType}`))
      const batch      = remaining.slice(batchNum * BATCH_SIZE, (batchNum + 1) * BATCH_SIZE)

      if (batch.length === 0) {
        return res.status(200).json({
          message:    'All images already generated!',
          total_done: generated.size,
        })
      }

      const results = { success: [], failed: [] }

      for (const { city, state, raceType } of batch) {
        const prompt = buildPrompt(city, state, raceType)
        try {
          const replicateUrl = await generateImage(prompt)
          const storedUrl    = await uploadToSupabase(replicateUrl, city, state, raceType)
          await saveToDatabase(city, state, raceType, storedUrl, prompt)
          results.success.push({ city, state, raceType, url: storedUrl })
        } catch(e) {
          results.failed.push({ city, state, raceType, error: e.message })
        }
      }

      const nextBatch   = batchNum + 1
      const hasMore     = remaining.length > (batchNum + 1) * BATCH_SIZE
      return res.status(200).json({
        batch:       batchNum,
        processed:   batch.length,
        success:     results.success.length,
        failed:      results.failed.length,
        failures:    results.failed,
        total_remaining_after: Math.max(0, remaining.length - batch.length),
        next_step:   hasMore
          ? `Visit /api/generate-images?action=run&batch=${nextBatch}`
          : 'All batches complete! Visit /api/generate-images?action=status to confirm.',
      })
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}. Use: status | test | run` })
}
