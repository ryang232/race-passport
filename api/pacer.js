// api/pacer.js
// Pacer AI — generates personalized running insights using Claude
// Caches results in Supabase to avoid redundant API calls

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, user_id, races, profile, last_generated } = req.body

  if (!action) return res.status(400).json({ error: 'action required' })

  // ── insight: main home page Pacer card ───────────────────────────────────
  if (action === 'insight') {
    if (!races || races.length === 0) {
      return res.status(200).json({
        insight: "Add your first race to your Passport and Pacer will start coaching you.",
        next_step: "Import your race history to get started.",
        cached: false,
      })
    }

    // Build a compact race summary for the prompt
    const recentRaces = [...races]
      .sort((a, b) => (b.date_sort || '').localeCompare(a.date_sort || ''))
      .slice(0, 8)

    const raceSummary = recentRaces.map(r =>
      `${r.date || 'Unknown date'}: ${r.name} (${r.distance}${r.time ? ', ' + r.time : ''})`
    ).join('\n')

    const mostRecentRace = recentRaces[0]
    const daysSinceLast = mostRecentRace?.date_sort
      ? Math.floor((Date.now() - new Date(mostRecentRace.date_sort)) / (1000 * 60 * 60 * 24))
      : null

    const distanceCounts = {}
    races.forEach(r => { distanceCounts[r.distance] = (distanceCounts[r.distance] || 0) + 1 })
    const topDistance = Object.entries(distanceCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '5K'

    const prompt = `You are Pacer, a personal AI running coach inside the Race Passport app. You know this runner's complete race history. Give them one sharp, personalized insight — like a coach who's been watching them race for years.

RUNNER PROFILE:
- Name: ${profile?.first_name || 'Runner'}
- Experience level: ${profile?.experience || 'intermediate'}
- Favorite/goal distance: ${profile?.favorite_distance || topDistance}
- Home state: ${profile?.state || 'Unknown'}
- Total races: ${races.length}
- Most raced distance: ${topDistance}
- Days since last race: ${daysSinceLast !== null ? daysSinceLast : 'unknown'}

RECENT RACE HISTORY (newest first):
${raceSummary}

Respond with ONLY a JSON object in this exact format — no other text, no markdown:
{
  "insight": "1-2 sentence insight about this specific runner based on their actual history. Be personal, specific, and direct. Reference their actual races or distances.",
  "next_step": "One clear, actionable next step. Be specific — mention a distance, timeframe, or type of race.",
  "tone": "motivating"
}`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        console.error('Claude API error:', err)
        return res.status(500).json({ error: 'Claude API error', results: [] })
      }

      const data = await response.json()
      const text = data.content?.[0]?.text || ''

      // Strip any markdown fences just in case
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      return res.status(200).json({
        insight:   parsed.insight,
        next_step: parsed.next_step,
        cached:    false,
        generated_at: new Date().toISOString(),
      })
    } catch(e) {
      console.error('Pacer insight error:', e.message)
      // Graceful fallback — never show an error to the user
      return res.status(200).json({
        insight: `You've got ${races.length} races in your Passport. Your coach is analyzing your history.`,
        next_step: "Keep building your race history for more personalized insights.",
        cached: false,
        error: true,
      })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
