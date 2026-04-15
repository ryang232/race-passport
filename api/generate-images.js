// api/generate-images.js
// Vercel serverless endpoint — generates city images via Replicate Flux Dev
// With retry logic for rate limiting
//
// Visit: /api/generate-images?action=status           → see progress + cost estimate
// Visit: /api/generate-images?action=test&city=Baltimore&state=MD&type=standard → test one
// Visit: /api/generate-images?action=run&batch=0      → run batch 0 (25 cities)
// Visit: /api/generate-images?action=run&batch=1      → run batch 1, etc.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY
  const SUPABASE_URL      = process.env.SUPABASE_URL
  const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY

  if (!REPLICATE_API_KEY) return res.status(500).json({ error: 'REPLICATE_API_KEY not set' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase env vars not set' })

  const action = req.query.action || 'status'

  // ── Constants ─────────────────────────────────────────────────────────────
  const BATCH_SIZE   = 25  // reduced from 50 to stay within Vercel 60s timeout
  const MAX_RETRIES  = 5
  const RETRY_DELAY  = 12000 // 12 seconds between retries (handles 6/min rate limit)

  // ── Location helpers ──────────────────────────────────────────────────────
  const WARM_STATES    = new Set(['FL','HI','TX','LA','SC','GA','AL','MS','PR'])
  const COASTAL_STATES = new Set(['CA','OR','WA','ME','NH','MA','RI','CT','NY','NJ','DE','MD','VA','NC','SC','FL','HI'])
  const MAJOR_CITIES   = new Set([
    'new york','new york city','nyc','chicago','boston','los angeles','san francisco',
    'washington','seattle','miami','denver','atlanta','dallas','houston','philadelphia',
    'portland','minneapolis','nashville','austin','charlotte','detroit','baltimore',
    'san diego','phoenix','las vegas','honolulu','pittsburgh','cleveland','columbus',
    'richmond','raleigh','salt lake city','kansas city','st louis','milwaukee',
    'indianapolis','memphis','new orleans','san antonio','sacramento','orlando',
  ])

  const REGIONS = {
    northeast: ['CT','DE','ME','MA','MD','NH','NJ','NY','PA','RI','VT','VA','WV','DC'],
    midwest:   ['IL','IN','IA','KS','MI','MN','MO','NE','ND','OH','SD','WI'],
    southeast: ['AL','AR','FL','GA','KY','LA','MS','NC','SC','TN'],
    southwest: ['AZ','NM','NV','OK','TX','UT'],
    west:      ['AK','CA','CO','HI','ID','MT','OR','WA','WY'],
  }

  function getRegion(state) {
    for (const [r, states] of Object.entries(REGIONS)) {
      if (states.includes((state||'').toUpperCase())) return r
    }
    return 'northeast'
  }

  function getRegionModifier(state) {
    const mods = {
      northeast: 'historic brick buildings, classic American main street, detailed storefronts',
      midwest:   'simple low-rise buildings, wide streets, practical architecture, small town America',
      southeast: 'light-colored buildings, trees, warm humid atmosphere, southern town',
      southwest: 'stucco buildings, warm sandy tones, dry landscape, desert town feel',
      west:      'modern buildings, lush greenery, Pacific Northwest feel, slightly overcast soft light',
    }
    return mods[getRegion(state)] || mods.northeast
  }

  function getTriType(state) {
    const s = (state||'').toUpperCase()
    if (WARM_STATES.has(s))    return 'triathlon_tropical'
    if (COASTAL_STATES.has(s)) return 'triathlon_coastal'
    return 'triathlon_lake'
  }

  function getRaceType(distance, state) {
    const d = (distance||'').toLowerCase()
    return (d.includes('70.3')||d.includes('140.6')||d.includes('tri')||d.includes('iron'))
      ? getTriType(state) : 'standard'
  }

  function buildPrompt(city, state, raceType) {
    const cs     = `${city}, ${state}`
    const isMaj  = MAJOR_CITIES.has(city.toLowerCase().trim())
    const suffix = 'clean composition, minimal, realistic, highly detailed, no people, no cars, no text, no logos'
    if (raceType === 'triathlon_tropical')
      return `A realistic coastal scene in ${cs}, palm trees and calm ocean water, early morning golden light, wide composition, ${suffix}`
    if (raceType === 'triathlon_coastal')
      return `A realistic view of ${cs} with open water, rocky or natural coastline, ocean water, soft golden light, wide composition, ${suffix}`
    if (raceType === 'triathlon_lake')
      return `A realistic lake scene near ${cs}, calm water with reflections, tree-lined shoreline, early morning light, wide composition, ${suffix}`
    if (isMaj)
      return `A cinematic aerial view of ${cs}, showing the real skyline and surrounding area, golden hour light, realistic architecture, wide composition, ${suffix}`
    return `A realistic street-level view of downtown ${cs}, ${getRegionModifier(state)}, wide road with strong perspective, early morning light, ${suffix}`
  }

  // ── Sleep helper ──────────────────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))

  // ── Generate one image with retry logic ───────────────────────────────────
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

      // Rate limited — wait and retry
      if (resp.status === 429) {
        if (attempt >= MAX_RETRIES) throw new Error(`Rate limited after ${MAX_RETRIES} retries`)
        const body = await resp.json().catch(() => ({}))
        const waitMs = ((body.retry_after || 10) + 2) * 1000 // add 2s buffer
        console.log(`Rate limited, waiting ${waitMs}ms before retry ${attempt + 1}...`)
        await sleep(waitMs)
        return generateImage(prompt, attempt + 1)
      }

      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(`Replicate error ${resp.status}: ${err}`)
      }

      const prediction = await resp.json()

      // Already done (Prefer: wait succeeded)
      if (prediction.status === 'succeeded') {
        const out = prediction.output
        return Array.isArray(out) ? out[0] : out
      }

      // Poll if not done yet
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
    if (data.status === 'succeeded') {
      return Array.isArray(data.output) ? data.output[0] : data.output
    }
    if (data.status === 'failed') throw new Error(`Prediction failed: ${data.error}`)
    return pollPrediction(id, attempts + 1)
  }

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  async function uploadToSupabase(imageUrl, city, state, raceType) {
    const imgResp = await fetch(imageUrl)
    if (!imgResp.ok) throw new Error(`Failed to download image: ${imgResp.status}`)
    const imgBuffer = await imgResp.arrayBuffer()
    const filename  = `${state.toLowerCase()}-${city.toLowerCase().replace(/[\s\/\\]+/g,'-')}-${raceType}.webp`

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

  // ── Fetch distinct city combos from races table ───────────────────────────
  async function getDistinctCities() {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/races?select=city,state,distance&city=not.is.null&state=not.is.null&limit=50000`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    if (!resp.ok) throw new Error('Failed to fetch cities')
    const races = await resp.json()
    const seen = new Set(), combos = []
    for (const race of races) {
      if (!race.city || !race.state) continue
      const city     = race.city.trim()
      const state    = race.state.trim().toUpperCase()
      const raceType = getRaceType(race.distance, state)
      const key      = `${city}|${state}|${raceType}`
      if (!seen.has(key)) { seen.add(key); combos.push({ city, state, raceType }) }
    }
    return combos
  }

  async function getAlreadyGenerated() {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/city_images?select=city,state,race_type&limit=10000`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    if (!resp.ok) return new Set()
    const rows = await resp.json()
    return new Set(rows.map(r => `${r.city}|${r.state}|${r.race_type}`))
  }

  // ── ACTION: status ────────────────────────────────────────────────────────
  if (action === 'status') {
    try {
      const [all, done] = await Promise.all([getDistinctCities(), getAlreadyGenerated()])
      const remaining   = all.filter(c => !done.has(`${c.city}|${c.state}|${c.raceType}`))
      const batches     = Math.ceil(remaining.length / BATCH_SIZE)
      return res.status(200).json({
        total_unique_combos: all.length,
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
    const city     = req.query.city  || 'Baltimore'
    const state    = req.query.state || 'MD'
    const raceType = req.query.type  || 'standard'
    const prompt   = buildPrompt(city, state, raceType)
    try {
      const imageUrl = await generateImage(prompt)
      return res.status(200).json({ city, state, raceType, prompt, imageUrl, note: 'Not saved to DB' })
    } catch(e) { return res.status(500).json({ error: e.message, prompt }) }
  }

  // ── ACTION: run ───────────────────────────────────────────────────────────
  if (action === 'run') {
    const batchNum = parseInt(req.query.batch || '0')
    try {
      const [all, done]  = await Promise.all([getDistinctCities(), getAlreadyGenerated()])
      const remaining    = all.filter(c => !done.has(`${c.city}|${c.state}|${c.raceType}`))
      const batch        = remaining.slice(batchNum * BATCH_SIZE, (batchNum + 1) * BATCH_SIZE)

      if (batch.length === 0) {
        return res.status(200).json({ message: 'All images generated!', total_done: done.size })
      }

      const results = { success: [], failed: [] }

      for (const { city, state, raceType } of batch) {
        const prompt = buildPrompt(city, state, raceType)
        try {
          const replicateUrl = await generateImage(prompt)
          const storedUrl    = await uploadToSupabase(replicateUrl, city, state, raceType)
          await saveToDatabase(city, state, raceType, storedUrl, prompt)
          results.success.push({ city, state, raceType })
        } catch(e) {
          results.failed.push({ city, state, raceType, error: e.message })
        }
      }

      const hasMore  = remaining.length > (batchNum + 1) * BATCH_SIZE
      const nextBatch = batchNum + 1
      return res.status(200).json({
        batch:      batchNum,
        processed:  batch.length,
        success:    results.success.length,
        failed:     results.failed.length,
        failures:   results.failed.length > 0 ? results.failed : undefined,
        remaining_after: Math.max(0, remaining.length - results.success.length),
        next_step: hasMore
          ? `Visit /api/generate-images?action=run&batch=${nextBatch}`
          : 'All batches complete! Run action=status to confirm.',
      })
    } catch(e) { return res.status(500).json({ error: e.message }) }
  }

  return res.status(400).json({ error: `Unknown action. Use: status | test | run` })
}
