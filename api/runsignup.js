// api/runsignup.js
// Vercel serverless function — proxies RunSignup API to keep secret key server-side

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action, first_name, last_name, dob, race_id, page = 1 } = req.query

  const API_KEY = process.env.RUNSIGNUP_API_KEY
  const API_SECRET = process.env.RUNSIGNUP_API_SECRET

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: 'RunSignup API credentials not configured' })
  }

  const base = 'https://runsignup.com/REST'
  const format = 'json'

  try {
    let url

    if (action === 'search_results') {
      // Search for race results by participant name
      // RunSignup results search endpoint
      url = `${base}/results/search?api_key=${API_KEY}&api_secret=${API_SECRET}&format=${format}&first_name=${encodeURIComponent(first_name || '')}&last_name=${encodeURIComponent(last_name || '')}&results_per_page=50&page=${page}`

      if (dob) {
        // Format DOB as MM/DD/YYYY for RunSignup
        url += `&dob=${encodeURIComponent(dob)}`
      }
    } else if (action === 'get_race') {
      // Get details for a specific race
      url = `${base}/race/${race_id}?api_key=${API_KEY}&api_secret=${API_SECRET}&format=${format}&include_event_details=T`
    } else if (action === 'search_races') {
      // Search upcoming races near a location
      const { state, distance_units = 'M', radius = 50, zipcode } = req.query
      url = `${base}/races?api_key=${API_KEY}&api_secret=${API_SECRET}&format=${format}&state=${state || 'MD'}&results_per_page=20&page=${page}&sort=date+ASC&start_date=${new Date().toISOString().split('T')[0]}`
      if (zipcode) url += `&zipcode=${zipcode}&radius=${radius}&distance_units=${distance_units}`
    } else {
      return res.status(400).json({ error: 'Invalid action' })
    }

    const response = await fetch(url)
    const data = await response.json()

    return res.status(200).json(data)
  } catch (error) {
    console.error('RunSignup API error:', error)
    return res.status(500).json({ error: 'Failed to fetch from RunSignup', details: error.message })
  }
}
