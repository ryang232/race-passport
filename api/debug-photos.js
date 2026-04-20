// api/debug-photos.js
// Temporary debug endpoint to see what's actually in city_images
// Visit: /api/debug-photos?city=Baltimore&state=MD
// Visit: /api/debug-photos?state=MD (see all MD cities)
// Visit: /api/debug-photos?action=sample (see 20 random entries)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  const { city, state, action } = req.query

  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }

  if (action === 'sample') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/city_images?select=city,state,race_type,image_url&limit=20`, { headers })
    return res.status(200).json(await r.json())
  }

  if (state && !city) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/city_images?select=city,state,race_type&state=eq.${state}&limit=50`, { headers })
    return res.status(200).json(await r.json())
  }

  if (city && state) {
    const encoded = encodeURIComponent(city)
    const r = await fetch(`${SUPABASE_URL}/rest/v1/city_images?select=city,state,race_type,image_url&city=ilike.${encoded}&state=eq.${state}`, { headers })
    return res.status(200).json(await r.json())
  }

  // Count by race_type
  const r = await fetch(`${SUPABASE_URL}/rest/v1/city_images?select=race_type&limit=10000`, { headers })
  const data = await r.json()
  const counts = data.reduce((acc, row) => { acc[row.race_type] = (acc[row.race_type]||0)+1; return acc }, {})
  return res.status(200).json({ total: data.length, by_type: counts })
}
