// api/runsignup.js
// Vercel serverless function — proxies RunSignup API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const API_KEY = process.env.RUNSIGNUP_API_KEY
  const API_SECRET = process.env.RUNSIGNUP_API_SECRET

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({
      error: 'RunSignup API credentials not configured',
      has_key: !!API_KEY,
      has_secret: !!API_SECRET
    })
  }

  const { action, first_name, last_name, dob, race_id, event_id, state = 'MD', zipcode, page = 1 } = req.query
  const base = 'https://api.runsignup.com/rest'
  const auth = `api_key=${API_KEY}&api_secret=${API_SECRET}&format=json`

  try {
    let url
    let response
    let data

    if (action === 'search_races_near') {
      // Get list of past races in a state to then search for participant
      url = `${base}/races?${auth}&state=${state}&results_per_page=100&page=${page}&include_event_details=T`
      response = await fetch(url)
      data = await response.json()
      return res.status(200).json({ action, url_called: url.replace(API_SECRET, '***'), data })

    } else if (action === 'search_results_in_race') {
      // Search for a participant in a specific race's results
      url = `${base}/race/${race_id}/results/get-results?${auth}&event_id=${event_id}&first_name=${encodeURIComponent(first_name || '')}&last_name=${encodeURIComponent(last_name || '')}&results_per_page=20`
      response = await fetch(url)
      data = await response.json()
      return res.status(200).json({ action, data })

    } else if (action === 'get_race_results') {
      // Get all results for a race event (search by name within)
      url = `${base}/race/${race_id}/results/get-results?${auth}&first_name=${encodeURIComponent(first_name || '')}&last_name=${encodeURIComponent(last_name || '')}&results_per_page=20`
      response = await fetch(url)
      data = await response.json()
      return res.status(200).json({ action, data })

    } else if (action === 'find_participant_races') {
      // Strategy: search recent races in the user's state, then check each for the participant
      // Step 1: get races from last 5 years
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
      const startDate = fiveYearsAgo.toISOString().split('T')[0]
      const endDate = new Date().toISOString().split('T')[0]

      url = `${base}/races?${auth}&state=${state}&results_per_page=200&page=1&start_date=${startDate}&end_date=${endDate}&include_event_details=T`
      response = await fetch(url)
      data = await response.json()

      const races = data?.races || []

      // Step 2: for each race, search for the participant in results
      const participantResults = []
      const searchName = `${first_name || ''} ${last_name || ''}`.trim()

      // Limit to first 50 races to avoid rate limits
      const racesToSearch = races.slice(0, 50)

      for (const raceWrapper of racesToSearch) {
        const race = raceWrapper?.race || raceWrapper
        if (!race?.race_id) continue

        const events = race?.next_date?.events || race?.events || []
        for (const eventWrapper of events.slice(0, 3)) {
          const event = eventWrapper?.event || eventWrapper
          if (!event?.event_id) continue

          try {
            const resultUrl = `${base}/race/${race.race_id}/results/get-results?${auth}&event_id=${event.event_id}&first_name=${encodeURIComponent(first_name || '')}&last_name=${encodeURIComponent(last_name || '')}&results_per_page=5`
            const resultRes = await fetch(resultUrl)
            const resultData = await resultRes.json()

            const results = resultData?.individual_results_sets?.[0]?.results ||
                           resultData?.results ||
                           []

            if (results.length > 0) {
              for (const r of results) {
                participantResults.push({
                  race_id: race.race_id,
                  race_name: race.name,
                  event_id: event.event_id,
                  event_name: event.name,
                  distance: event.distance,
                  city: race.address?.city,
                  state: race.address?.state,
                  start_time: race.next_date?.start_time || race.start_time,
                  result: r
                })
              }
            }
          } catch (e) {
            // Skip races that error
          }
        }
      }

      return res.status(200).json({
        action,
        total_races_searched: racesToSearch.length,
        results_found: participantResults.length,
        participant_results: participantResults
      })

    } else if (action === 'debug') {
      // Just test that credentials work
      url = `${base}/races?${auth}&state=MD&results_per_page=3`
      response = await fetch(url)
      data = await response.json()
      return res.status(200).json({
        action: 'debug',
        credentials_work: !data?.error,
        api_response_keys: Object.keys(data || {}),
        sample: data
      })

    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

  } catch (error) {
    console.error('RunSignup API error:', error)
    return res.status(500).json({
      error: 'Failed to fetch from RunSignup',
      message: error.message
    })
  }
}
