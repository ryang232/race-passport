// api/pacer.js
// Pacer AI — personalized running insights, fit scores, readiness forecast

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, races, profile, races_to_score } = req.body
  if (!action) return res.status(400).json({ error: 'action required' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const callClaude = async (prompt, max_tokens = 300) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) throw new Error(`Claude error: ${response.status}`)
    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return text.replace(/```json|```/g, '').trim()
  }

  const buildRaceSummary = (races) => {
    const sorted = [...races].sort((a,b) => (b.date_sort||'').localeCompare(a.date_sort||'')).slice(0,8)
    return sorted.map(r => `${r.date||'?'}: ${r.name} (${r.distance}${r.time?', '+r.time:''})`).join('\n')
  }

  const mostRecentRace = (races) => [...races].sort((a,b) => (b.date_sort||'').localeCompare(a.date_sort||''))[0]

  const daysSince = (dateStr) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr)
    return Math.floor(diff / (1000*60*60*24))
  }

  // ── insight: main Pacer card ────────────────────────────────────────────────
  if (action === 'insight') {
    if (!races || races.length === 0) {
      return res.status(200).json({
        insight: "Add your first race to your Passport and Pacer will start coaching you.",
        next_step: "Import your race history to get started.",
      })
    }

    const recent = mostRecentRace(races)
    const days = daysSince(recent?.date_sort)
    const distCounts = {}
    races.forEach(r => { distCounts[r.distance] = (distCounts[r.distance]||0)+1 })
    const topDist = Object.entries(distCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'5K'

    const prompt = `You are Pacer, a personal AI running coach in the Race Passport app. Be direct, specific, and personal — like a coach who knows this runner well.

RUNNER:
- Name: ${profile?.first_name||'Runner'}
- Goal distance: ${profile?.favorite_distance||topDist}
- Home state: ${profile?.state||'unknown'}
- Total races: ${races.length}
- Most raced: ${topDist}
- Days since last race: ${days!==null?days:'unknown'}

RECENT RACES (newest first):
${buildRaceSummary(races)}

Respond ONLY with valid JSON, no markdown:
{
  "insight": "1-2 sentences. Be specific — reference their actual races, distances, or times. Identify a pattern or opportunity.",
  "next_step": "One sharp, actionable next step. Specific distance and timeframe."
}`

    try {
      const text = await callClaude(prompt, 200)
      const parsed = JSON.parse(text)
      return res.status(200).json({ insight: parsed.insight, next_step: parsed.next_step })
    } catch(e) {
      return res.status(200).json({
        insight: `You've got ${races.length} races in your Passport — solid foundation. Your coach is analyzing your history.`,
        next_step: "Keep building your race history for more personalized insights.",
      })
    }
  }

  // ── fit_scores: score a batch of suggested races ────────────────────────────
  if (action === 'fit_scores') {
    if (!races || !races_to_score?.length) {
      return res.status(200).json({ scores: [] })
    }

    const recent = mostRecentRace(races)
    const days = daysSince(recent?.date_sort)
    const distCounts = {}
    races.forEach(r => { distCounts[r.distance] = (distCounts[r.distance]||0)+1 })
    const topDist = Object.entries(distCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'5K'

    // Build compact race list to score
    const toScore = races_to_score.slice(0, 8).map(r =>
      `ID:${r.id}|${r.name}|${r.distance}|${r.city||''},${r.state||''}|${r.date||''}`
    ).join('\n')

    const prompt = `You are Pacer, a running coach AI. Score how well each race fits this runner.

RUNNER PROFILE:
- Goal distance: ${profile?.favorite_distance||topDist}
- Home state: ${profile?.state||'unknown'}
- Most raced distance: ${topDist}
- Total races: ${races.length}
- Days since last race: ${days!==null?days:'unknown'}
- Recent history: ${buildRaceSummary(races).split('\n').slice(0,4).join('; ')}

RACES TO SCORE (ID|name|distance|location|date):
${toScore}

For each race, give a fit score 60-99 and a short reason (max 8 words).
Respond ONLY with valid JSON array, no markdown:
[{"id":"race_id","score":85,"reason":"Matches your half marathon goal"}]`

    try {
      const text = await callClaude(prompt, 400)
      const scores = JSON.parse(text)
      return res.status(200).json({ scores: Array.isArray(scores) ? scores : [] })
    } catch(e) {
      // Return neutral scores on failure — never block the UI
      return res.status(200).json({
        scores: races_to_score.map(r => ({ id: String(r.id), score: 75, reason: 'Good match for your profile' }))
      })
    }
  }

  // ── readiness: compact forecast strip ──────────────────────────────────────
  if (action === 'readiness') {
    if (!races || races.length === 0) {
      return res.status(200).json({
        best_distance: profile?.favorite_distance || '5K',
        time_range: 'See your passport',
        race_window: '4–8 weeks',
      })
    }

    const recent = mostRecentRace(races)
    const days = daysSince(recent?.date_sort)
    const distCounts = {}
    races.forEach(r => { distCounts[r.distance] = (distCounts[r.distance]||0)+1 })
    const topDist = Object.entries(distCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'5K'

    // Find PRs
    const prMap = {}
    races.forEach(r => {
      if (!r.time) return
      const toSecs = t => { const p = t.split(':').map(Number); return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+(p[1]||0) }
      if (!prMap[r.distance] || toSecs(r.time) < toSecs(prMap[r.distance])) prMap[r.distance] = r.time
    })

    const prompt = `You are Pacer. Based on this runner's history, give a compact readiness forecast.

RUNNER:
- Total races: ${races.length}
- Most raced: ${topDist}
- Days since last race: ${days!==null?days:'unknown'}
- Goal distance: ${profile?.favorite_distance||topDist}
- PRs: ${Object.entries(prMap).map(([d,t])=>`${d}: ${t}`).join(', ')||'none recorded'}

Respond ONLY with valid JSON, no markdown:
{
  "best_distance": "e.g. 10K",
  "time_range": "e.g. 48–52 min",
  "race_window": "e.g. 4–6 weeks"
}`

    try {
      const text = await callClaude(prompt, 100)
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(200).json({
        best_distance: topDist,
        time_range: prMap[topDist] ? `~${prMap[topDist]}` : 'Check your PRs',
        race_window: days !== null && days < 21 ? '3–5 weeks' : '4–8 weeks',
      })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
