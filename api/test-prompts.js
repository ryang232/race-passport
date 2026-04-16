// api/test-prompts.js
// Test different race scene prompts before committing
// Visit: /api/test-prompts?variation=1  (through 5)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY
  if (!REPLICATE_API_KEY) return res.status(500).json({ error: 'REPLICATE_API_KEY not set' })

  const city     = req.query.city  || 'Frederick'
  const state    = req.query.state || 'MD'
  const variation = parseInt(req.query.variation || '1')

  const suffix = 'photorealistic, cinematic, highly detailed, no people, no text, no logos'

  const prompts = {
    1: `A low aerial drone shot looking down a closed-off race course street in downtown ${city}, ${state}, orange cone barriers and crowd control fencing lining the sidewalks, a colorful finish line balloon arch visible in the middle distance, early morning golden light, empty road, ${suffix}`,
    2: `A wide-angle street-level view from the start line looking down a race course in ${city}, ${state}, blue and white crowd barrier fencing along both sidewalks, a bright inflatable finish line arch in the distance, confetti on the ground, golden hour light, empty road, ${suffix}`,
    3: `An elevated side-angle view of a race finish line area in downtown ${city}, ${state}, colorful balloon arch spanning the road, crowd control barriers lining the street, timing mats on the ground, early morning light, empty course, ${suffix}`,
    4: `A dramatic low-angle shot from ground level looking up toward a finish line balloon arch on a closed city street in ${city}, ${state}, crowd fencing on both sides, golden morning light streaming between buildings, empty road, ${suffix}`,
    5: `A bird's eye overhead drone view of a race course through downtown ${city}, ${state}, orange barriers forming a clear path through the streets, finish line arch visible from above, crowd fencing along sidewalks, early morning, empty course, ${suffix}`,
  }

  const prompt = prompts[variation] || prompts[1]

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

    if (!resp.ok) throw new Error(`Replicate error: ${resp.status}`)
    const data = await resp.json()
    const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output

    return res.status(200).json({
      variation,
      city, state,
      prompt,
      imageUrl,
      note: 'Not saved — test only. Open imageUrl in browser to preview.'
    })
  } catch(e) {
    return res.status(500).json({ error: e.message, prompt })
  }
}
