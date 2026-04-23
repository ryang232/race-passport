// api/pacer.js
// Pacer AI — personalized, always positive, constructive running coach

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, races, profile, races_to_score, race } = req.body
  if (!action) return res.status(400).json({ error: 'action required' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  // ── Core positivity rules injected into every prompt ─────────────────────
  const POSITIVITY_RULES = `
PACER COACHING PHILOSOPHY — FOLLOW THESE RULES STRICTLY:
- ALWAYS lead with celebration and positivity. Every runner is doing something incredible.
- NEVER say anything negative, discouraging, or that could make someone feel bad about their time, pace, or performance.
- Frame everything as progress, opportunity, and potential — not as deficiency.
- Instead of "your pace slowed" say "you have a great opportunity to build more speed"
- Instead of "you didn't train enough" say "adding more X to your training will unlock your next level"
- Celebrate the act of racing itself — finishing ANY race is an achievement worth honoring.
- Be warm, enthusiastic, and genuinely excited about this runner's journey.
- Short, punchy, coach-in-your-corner energy. Not clinical. Not cold.`

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

  const mostRecentRace = (races) =>
    [...races].sort((a,b) => (b.date_sort||'').localeCompare(a.date_sort||''))[0]

  const daysSince = (dateStr) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr)
    return Math.floor(diff / (1000*60*60*24))
  }

  const buildPRMap = (races) => {
    const prMap = {}
    races.forEach(r => {
      if (!r.time) return
      const toSecs = t => { const p = t.split(':').map(Number); return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+(p[1]||0) }
      if (!prMap[r.distance] || toSecs(r.time) < toSecs(prMap[r.distance])) prMap[r.distance] = r.time
    })
    return prMap
  }

  // ── insight: main Home Pacer card ─────────────────────────────────────────
  if (action === 'insight') {
    if (!races || races.length === 0) {
      return res.status(200).json({
        insight: "Every great race journey starts with a single step — and you've taken yours! Add your first race to your Passport and Pacer will start cheering you on.",
        next_step: "Import your race history to unlock your personalized coaching.",
      })
    }

    const recent = mostRecentRace(races)
    const days = daysSince(recent?.date_sort)
    const distCounts = {}
    races.forEach(r => { distCounts[r.distance] = (distCounts[r.distance]||0)+1 })
    const topDist = Object.entries(distCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'5K'
    const prMap = buildPRMap(races)

    const prompt = `You are Pacer, a warm and enthusiastic AI running coach inside Race Passport.
${POSITIVITY_RULES}

RUNNER DATA:
- Name: ${profile?.first_name||'Runner'}
- Goal distance: ${profile?.favorite_distance||topDist}
- Home state: ${profile?.state||'unknown'}
- Total races completed: ${races.length}
- Most raced distance: ${topDist}
- Days since last race: ${days!==null?days:'unknown'}
- PRs: ${Object.entries(prMap).map(([d,t])=>`${d}: ${t}`).join(', ')||'building their history'}

RECENT RACE HISTORY (newest first):
${buildRaceSummary(races)}

Write a personalized coaching insight that:
1. Celebrates something specific from their actual race history
2. Identifies a genuine opportunity for growth (framed positively)
3. Gives one clear, exciting next step

Respond ONLY with valid JSON, no markdown:
{
  "insight": "1-2 sentences. Warm, specific, celebratory. Reference their actual races or achievements.",
  "next_step": "One exciting, actionable next step. Specific distance and timeframe. Positive framing."
}`

    try {
      const text = await callClaude(prompt, 200)
      const parsed = JSON.parse(text)
      return res.status(200).json({ insight: parsed.insight, next_step: parsed.next_step })
    } catch(e) {
      return res.status(200).json({
        insight: `${races.length} races in your Passport — that's a real racing legacy you're building! Your coach has been studying your history and is excited about what's next.`,
        next_step: "Keep adding races to unlock deeper personalized insights.",
      })
    }
  }

  // ── fit_scores: score suggested races ─────────────────────────────────────
  if (action === 'fit_scores') {
    if (!races || !races_to_score?.length) return res.status(200).json({ scores: [] })

    const recent = mostRecentRace(races)
    const days = daysSince(recent?.date_sort)
    const distCounts = {}
    races.forEach(r => { distCounts[r.distance] = (distCounts[r.distance]||0)+1 })
    const topDist = Object.entries(distCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'5K'

    const toScore = races_to_score.slice(0, 8).map(r =>
      `ID:${r.id}|${r.name}|${r.distance}|${r.city||''},${r.state||''}|${r.date||''}`
    ).join('\n')

    const prompt = `You are Pacer, an enthusiastic AI running coach.
${POSITIVITY_RULES}

RUNNER PROFILE:
- Goal distance: ${profile?.favorite_distance||topDist}
- Home state: ${profile?.state||'unknown'}
- Most raced distance: ${topDist}
- Total races: ${races.length}
- Days since last race: ${days!==null?days:'unknown'}
- Recent history: ${buildRaceSummary(races).split('\n').slice(0,4).join('; ')}

RACES TO SCORE (ID|name|distance|location|date):
${toScore}

Score each race 60–99 on fit. Give an enthusiastic short reason (max 8 words, positive framing).
Respond ONLY with valid JSON array, no markdown:
[{"id":"race_id","score":85,"reason":"Perfect next step for your journey!"}]`

    try {
      const text = await callClaude(prompt, 400)
      const scores = JSON.parse(text)
      return res.status(200).json({ scores: Array.isArray(scores) ? scores : [] })
    } catch(e) {
      return res.status(200).json({
        scores: races_to_score.map(r => ({ id: String(r.id), score: 78, reason: 'Great match for your goals!' }))
      })
    }
  }

  // ── readiness: forecast strip ─────────────────────────────────────────────
  if (action === 'readiness') {
    if (!races || races.length === 0) {
      return res.status(200).json({
        best_distance: profile?.favorite_distance || '5K',
        time_range: 'Ready to race!',
        race_window: '4–8 weeks',
      })
    }

    const recent = mostRecentRace(races)
    const days = daysSince(recent?.date_sort)
    const distCounts = {}
    races.forEach(r => { distCounts[r.distance] = (distCounts[r.distance]||0)+1 })
    const topDist = Object.entries(distCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'5K'
    const prMap = buildPRMap(races)

    const prompt = `You are Pacer, an enthusiastic AI running coach.
${POSITIVITY_RULES}

RUNNER DATA:
- Total races: ${races.length}
- Most raced distance: ${topDist}
- Goal distance: ${profile?.favorite_distance||topDist}
- Days since last race: ${days!==null?days:'unknown'}
- Personal records (exact format H:MM:SS or MM:SS):
${Object.entries(prMap).length > 0 ? Object.entries(prMap).map(([d,t])=>`  ${d}: ${t}`).join('\n') : '  No finish times recorded yet'}

CRITICAL TIME FORMAT RULES — READ CAREFULLY:
- 5K times look like: 22:00 to 45:00 (twenty-two minutes to forty-five minutes)
- 10K times look like: 45:00 to 1:30:00 (forty-five minutes to ninety minutes)
- Half marathon (13.1 mi) times look like: 1:30:00 to 3:30:00 (one hour thirty to three hours thirty)
- Marathon (26.2 mi) times look like: 3:00:00 to 7:00:00 (three hours to seven hours)
- If their half PR is 1:57:40, their realistic time range is "1:55–2:05" — NOT "4:30–5:00"
- Use the runner's ACTUAL PR as the anchor for your estimate

Based on their history and recency of racing, estimate:
- best_distance: what distance are they most ready to race RIGHT NOW
- time_range: realistic finish time range anchored to their actual PR (e.g. "1:55–2:05" for a 1:57 half runner)
- race_window: ideal weeks until next race based on days since last race

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "best_distance": "Half Marathon",
  "time_range": "1:55–2:05",
  "race_window": "6–8 weeks"
}`

    try {
      const text = await callClaude(prompt, 120)
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch(e) {
      const pr = prMap[topDist]
      return res.status(200).json({
        best_distance: topDist,
        time_range: pr ? `~${pr}` : 'Ready to run!',
        race_window: days !== null && days < 21 ? '3–5 weeks' : '4–8 weeks',
      })
    }
  }

  // ── race_reflection: Pacer card on individual completed race pages ─────────
  if (action === 'race_reflection') {
    if (!race) return res.status(400).json({ error: 'race required' })

    // Is this a PR? Is it their first of this distance?
    const isPR = race.is_pr || race.pr
    const raceName = race.name || 'this race'
    const distance = race.distance || ''
    const time = race.time || ''
    const date = race.date || ''
    const splits = race.splits || []

    // Count how many of this distance they've done
    const sameDistCount = (races||[]).filter(r =>
      r.distance === distance && r.id !== race.id
    ).length
    const isFirst = sameDistCount === 0

    // Build splits summary for tri
    const splitsText = splits.length > 0
      ? `Race splits: ${splits.map(s=>`${s.label}: ${s.time}`).join(', ')}`
      : ''

    const prompt = `You are Pacer, a warm and enthusiastic AI running coach celebrating a runner's completed race.
${POSITIVITY_RULES}

THIS RACE:
- Race: ${raceName}
- Distance: ${distance}
- Finish time: ${time || 'not recorded'}
- Date: ${date}
- Personal record: ${isPR ? 'YES — this is a PR!' : 'No'}
- First time at this distance: ${isFirst ? 'YES — this is their first ever!' : 'No'}
${splitsText ? `- ${splitsText}` : ''}

RUNNER'S HISTORY AT THIS DISTANCE:
${(races||[]).filter(r=>r.distance===distance).map(r=>`  ${r.date||'?'}: ${r.name}, ${r.time||'no time'}`).join('\n') || '  This is their first!'}

Write a personal, celebratory reflection on this specific race. Reference the actual race name, distance, and time. If it's a PR, go BIG with the celebration. If it's their first at this distance, honor the courage that takes. Always find something genuinely praiseworthy.

Respond ONLY with valid JSON, no markdown:
{
  "headline": "Short punchy celebration headline (e.g. 'First 70.3 DONE!' or 'New PR Unlocked!')",
  "reflection": "2-3 sentences. Warm, specific, celebratory. Reference the actual race, time, and achievement. End with genuine encouragement for what's next.",
  "highlight": "One specific thing to be proud of from this race (e.g. 'Negative split on the run' or 'Finished strong in 78° heat')"
}`

    try {
      const text = await callClaude(prompt, 300)
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(200).json({
        headline: isPR ? '🏆 New Personal Record!' : isFirst ? '🎉 First One Down!' : '✅ Race Complete!',
        reflection: `Completing ${raceName} is something to be genuinely proud of — every mile of that ${distance} took real grit and commitment. You showed up, you raced, and you finished. That's what it's all about.`,
        highlight: isPR ? `New PR: ${time}` : `Finished: ${time || 'Strong finish'}`,
      })
    }
  }

  // ── report_card: training analysis for a race build ───────────────────────
  if (action === 'report_card') {
    if (!race) return res.status(400).json({ error: 'race required' })

    const activities = race.strava_activities || []
    const raceName = race.name || 'this race'
    const distance = race.distance || ''
    const time = race.time || ''
    const splits = race.splits || []

    // Summarize training data
    const totalActivities = activities.length
    const totalMiles = activities.reduce((sum, a) => sum + ((a.distance||0)/1609.34), 0).toFixed(1)
    const avgWeeklyMiles = totalActivities > 0 ? (parseFloat(totalMiles) / Math.max(1, activities.length/5)).toFixed(1) : 0
    const longRuns = activities.filter(a => (a.distance||0)/1609.34 > 10).length
    const splitsText = splits.length > 0
      ? splits.map(s=>`${s.label}: ${s.time}`).join(', ')
      : 'not recorded'

    const prompt = `You are Pacer, a warm and enthusiastic AI running coach reviewing a runner's training for a completed race.
${POSITIVITY_RULES}

THE RACE:
- Race: ${raceName}
- Distance: ${distance}
- Finish time: ${time || 'not recorded'}
- Splits: ${splitsText}

TRAINING DATA (${totalActivities} activities in the build):
- Total training miles: ${totalMiles} mi
- Est. weekly average: ${avgWeeklyMiles} mi/week
- Long runs (10+ miles): ${longRuns}
${activities.slice(0,10).map(a => `  ${new Date(a.start_date_local||'').toLocaleDateString()}: ${((a.distance||0)/1609.34).toFixed(1)}mi, ${Math.round((a.moving_time||0)/60)}min`).join('\n')}

Generate a training Report Card. Be genuinely celebratory about what they did well. For areas to grow, frame as exciting opportunities — never as failures or negatives.

Respond ONLY with valid JSON, no markdown:
{
  "summary": "2 sentences. Overall training assessment — positive and energizing.",
  "grades": [
    {"category": "Consistency", "grade": "A", "comment": "Positive comment on what they did well or could build on"},
    {"category": "Long Runs", "grade": "B+", "comment": "Positive comment"},
    {"category": "Volume", "grade": "B", "comment": "Positive comment"},
    {"category": "Race Execution", "grade": "A-", "comment": "Positive comment based on splits if available"}
  ],
  "top_win": "The single best thing about their training build",
  "next_focus": "One exciting opportunity to focus on for next time — positive framing only"
}`

    try {
      const text = await callClaude(prompt, 500)
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(200).json({
        summary: `Your training for ${raceName} shows real dedication — getting to the start line is the first victory, and you did that!`,
        grades: [
          { category:'Consistency', grade:'A', comment:'You showed up and put in the work — that commitment is everything.' },
          { category:'Long Runs',   grade:'B+', comment:'Building that aerobic base is paying dividends in your racing.' },
          { category:'Volume',      grade:'B', comment:'Solid foundation — more miles will only make you stronger.' },
          { category:'Race Execution', grade:'A-', comment:'Crossing that finish line is the ultimate execution.' },
        ],
        top_win: 'You finished the race — that\'s the most important thing.',
        next_focus: 'Keep building your base and enjoy the process!',
      })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
