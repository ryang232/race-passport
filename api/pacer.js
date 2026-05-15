// api/pacer.js
// Pacer AI — personalized, always positive, constructive running coach

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, races, profile, races_to_score, race, query } = req.body
  if (!action) return res.status(400).json({ error: 'action required' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

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

  // ── Standard Claude call (no tools) ──────────────────────────────────────
  const callClaude = async (prompt, max_tokens = 300) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) throw new Error(`Claude error: ${response.status}`)
    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return text.replace(/```json|```/g, '').trim()
  }

  // ── Claude call WITH web search tool ─────────────────────────────────────
  const callClaudeWithSearch = async (prompt, max_tokens = 1000) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Claude search error: ${response.status} ${err}`)
    }
    const data = await response.json()
    // Extract all text blocks from the response (web search may produce multiple)
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .replace(/```json|```/g, '')
      .trim()
    return text
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

  // ── race_lookup: web-search-powered race confirmation + vibe ──────────────
  if (action === 'race_lookup') {
    const {
      query: q,
      year,
      distance,
      first_name,
      last_name,
      dob,
    } = req.body

    if (!q) return res.status(400).json({ error: 'query required' })

    const raceName  = q.trim()
    const raceYear  = year || ''
    const raceDist  = distance || ''
    const hasRunner = !!(first_name && last_name)

    // ── Step 1: Web search for race details + personality ─────────────────
    // Strategy: search race name first (always works), then runner experience
    // No date searching — year is user-provided, Pacer doesn't need to find it
    const locationHint = req.body.location_hint || ''

    // Normalize triathlon brand names so IRONMAN races are found correctly
    let searchQuery = locationHint ? raceName + ' ' + locationHint : raceName
    const lowerQ = searchQuery.toLowerCase()
    const isTri = raceDist === '70.3' || raceDist === '140.6' || lowerQ.includes('triathlon')
    if (isTri && (lowerQ.includes('ironman') || lowerQ.includes('iron man'))) {
      if (raceDist === '70.3' || lowerQ.includes('70.3')) {
        searchQuery = searchQuery.replace(/ironman/gi, 'IRONMAN 70.3').replace(/iron man/gi, 'IRONMAN 70.3')
        // Clean up double "70.3 70.3" if user already included it
        searchQuery = searchQuery.replace(/IRONMAN 70\.3 70\.3/g, 'IRONMAN 70.3')
      } else {
        searchQuery = searchQuery.replace(/ironman/gi, 'IRONMAN').replace(/iron man/gi, 'IRONMAN')
      }
    }

    const triNote = isTri ? 'IMPORTANT: This is a triathlon event. IRONMAN races always use the official brand name with the prefix "IRONMAN" or "IRONMAN 70.3" or "IRONMAN 140.6". Search for the official branded name.' : ''

    const buildDetailsPrompt = () => {
      const triNote = isTri ? 'IMPORTANT: This is a triathlon. IRONMAN races use the official brand name: "IRONMAN 70.3 [location]" or "IRONMAN [location]". Always search with the full IRONMAN brand prefix.' : ''
      const nameRule = isTri
        ? 'For IRONMAN races use the full brand name e.g. IRONMAN 70.3 Eagleman or IRONMAN Maryland. Never abbreviate IRONMAN.'
        : 'e.g. Los Angeles Marathon not Los Angeles Marathon 26.2'
      const distRule = raceDist || 'normalized: 5K or 10K or 10 mi or 13.1 or 26.2 or 50K or 70.3 or 140.6 or Ultra or Other'
      const dateVal = raceYear ? 'Jan ' + raceYear : ''
      const dateSortVal = raceYear ? raceYear + '-01-01' : ''

      return [
        'You are a race data assistant for an endurance sports app called Race Passport.',
        triNote,
        'Find information about: "' + searchQuery + '"' + (raceDist ? ' (' + raceDist + ')' : '') + '.' + (raceYear ? ' User ran it in ' + raceYear + '.' : ''),
        'Do TWO searches:',
        '1. Search "' + searchQuery + '" — find official race name, city, state, distance, what makes it special.',
        '2. Search "' + searchQuery + ' race experience" — find what athletes say about the course, crowd, vibe.',
        'Return ONLY a JSON object (no markdown):',
        '{',
        '  "name": "official event name only — NEVER include distance or year. ' + nameRule + '",',
        '  "date": "' + dateVal + '",',
        '  "date_sort": "' + dateSortVal + '",',
        '  "location": "City, ST",',
        '  "city": "city name only",',
        '  "state": "2-letter abbreviation",',
        '  "distance": "' + distRule + '",',
        '  "confidence": 3,',
        '  "race_vibe": "EXACTLY 2 sentences. Pacer voice — warm, specific to THIS race. Real details only. Empty string if nothing specific found.",',
        '  "website": "official URL or empty string"',
        '}',
        'RULES: confidence 3 if race found (name + location). confidence 2 if uncertain. confidence 1 if not found at all. Never downgrade just because reviews were sparse. Never fabricate vibe details.',
      ].filter(Boolean).join('\n')
    }
    const detailsPrompt = buildDetailsPrompt()
    // ── Step 2: Attempt to find runner's result (if name provided) ────────
    let resultPrompt = null
    if (hasRunner && raceYear) {
      resultPrompt = `You are a race results assistant.

Search the web for the race result of this specific runner:
- Race: "${raceName}" ${raceYear}${raceDist ? ` ${raceDist}` : ''}
- Runner: ${first_name} ${last_name}${dob ? ` (born ${dob})` : ''}

Search for their result on the race's official results page, RunSignup, or any results aggregator.

Return ONLY a JSON object (no markdown):
{
  "found": true or false,
  "official_time": "finish time in H:MM:SS or MM:SS format, or empty string if not found",
  "place_overall": "overall place number or empty string",
  "place_age_group": "age group place or empty string",
  "bib": "bib number or empty string",
  "results_url": "URL where result was found, or empty string"
}

If you cannot find a result for this specific person, return found: false and empty strings for all other fields. Do NOT guess or fabricate a time.`
    }

    try {
      // Fire both searches — details always, result only if we have a name
      const searches = [callClaudeWithSearch(detailsPrompt, 1200)]
      if (resultPrompt) searches.push(callClaudeWithSearch(resultPrompt, 600))

      const [detailsText, resultText] = await Promise.all(searches)

      // Parse details
      let details = {}
      try {
        const jsonMatch = detailsText.match(/\{[\s\S]*\}/)
        details = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      } catch(e) {
        details = {
          name: raceName,
          date: raceYear ? `Jan ${raceYear}` : '',
          date_sort: raceYear ? `${raceYear}-01-01` : null,
          location: '', city: '', state: '',
          distance: raceDist || 'Other',
          confidence: 1,
          race_vibe: '',
          website: '',
        }
      }

      // Always anchor date to user-selected year — don't trust Pacer's date guessing
      if (raceYear) {
        // Keep month if Pacer found it (e.g. "Mar 2023"), otherwise use Jan as placeholder
        const existingDate = details.date || ''
        const hasRealMonth = existingDate && !existingDate.startsWith('Jan') && existingDate.includes(raceYear)
        if (!hasRealMonth) {
          details.date = `Jan ${raceYear}`
          details.date_sort = `${raceYear}-01-01`
        }
        // Ensure date_sort has the right year
        if (details.date_sort && !details.date_sort.startsWith(raceYear)) {
          details.date_sort = `${raceYear}-01-01`
        }
      }

      // Parse result (if searched)
      let runnerResult = { found: false, official_time: '', place_overall: '', place_age_group: '', bib: '', results_url: '' }
      if (resultText) {
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}/)
          if (jsonMatch) runnerResult = { ...runnerResult, ...JSON.parse(jsonMatch[0]) }
        } catch(e) { /* use default */ }
      }

      // If user pre-selected distance, always use that over what Claude returned
      if (raceDist) details.distance = raceDist

      return res.status(200).json({
        ...details,
        runner_result: runnerResult,
      })

    } catch(e) {
      // Full fallback — web search failed, use pure Claude knowledge
      try {
        const fallbackPrompt = `You are a race data assistant with deep knowledge of endurance events in the United States.
The user is looking for: "${raceName}"${raceYear ? ` (${raceYear})` : ''}${raceDist ? `, ${raceDist}` : ''}

Return ONLY a JSON object (no markdown) with these fields:
{
  "name": "official event/series name only — no distance",
  "date": "Month YYYY",
  "date_sort": "YYYY-MM-DD",
  "location": "City, ST",
  "city": "city only",
  "state": "2-letter abbreviation",
  "distance": "${raceDist || 'normalized distance'}",
  "confidence": 2,
  "race_vibe": "2-3 sentences about what makes this race special. Warm, specific, Pacer voice.",
  "website": ""
}`
        const text = await callClaude(fallbackPrompt, 400)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        if (raceDist) parsed.distance = raceDist
        return res.status(200).json({
          ...parsed,
          runner_result: { found: false, official_time: '', place_overall: '', place_age_group: '', bib: '', results_url: '' },
        })
      } catch(e2) {
        return res.status(200).json({
          name: raceName, date: raceYear ? `Jan ${raceYear}` : '', date_sort: raceYear ? `${raceYear}-01-01` : null,
          location: '', city: '', state: '', distance: raceDist || 'Other', confidence: 1,
          race_vibe: '', website: '',
          runner_result: { found: false, official_time: '', place_overall: '', place_age_group: '', bib: '', results_url: '' },
        })
      }
    }
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
- Home city: ${profile?.city||'unknown'}, ${profile?.state||'unknown'}
- Most raced distance: ${topDist}
- Total races: ${races.length}
- Days since last race: ${days!==null?days:'unknown'}
- Recent history: ${buildRaceSummary(races).split('\n').slice(0,4).join('; ')}

RACES TO SCORE (ID|name|distance|location|date):
${toScore}

Score each race 60-99 on fit. Consider: distance match, proximity to their home city/state, timing, and their race history.
Give an enthusiastic short reason (max 8 words, positive framing).
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
        race_window: '4-8 weeks',
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

CRITICAL TIME FORMAT RULES:
- 5K times: 22:00 to 45:00
- 10K times: 45:00 to 1:30:00
- Half marathon: 1:30:00 to 3:30:00
- Marathon: 3:00:00 to 7:00:00
- Use the runner's ACTUAL PR as the anchor for your estimate

Respond ONLY with valid JSON, no markdown:
{
  "best_distance": "Half Marathon",
  "time_range": "1:55-2:05",
  "race_window": "6-8 weeks"
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
        race_window: days !== null && days < 21 ? '3-5 weeks' : '4-8 weeks',
      })
    }
  }

  // ── race_reflection ───────────────────────────────────────────────────────
  if (action === 'race_reflection') {
    if (!race) return res.status(400).json({ error: 'race required' })

    const isPR = race.is_pr || race.pr
    const raceName = race.name || 'this race'
    const distance = race.distance || ''
    const time = race.time || ''
    const date = race.date || ''
    const splits = race.splits || []
    const sameDistCount = (races||[]).filter(r => r.distance === distance && r.id !== race.id).length
    const isFirst = sameDistCount === 0
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

Respond ONLY with valid JSON, no markdown:
{
  "headline": "Short punchy celebration headline",
  "reflection": "2-3 sentences. Warm, specific, celebratory.",
  "highlight": "One specific thing to be proud of from this race"
}`

    try {
      const text = await callClaude(prompt, 300)
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(200).json({
        headline: isPR ? 'New Personal Record!' : isFirst ? 'First One Down!' : 'Race Complete!',
        reflection: `Completing ${raceName} is something to be genuinely proud of — every mile took real grit and commitment.`,
        highlight: isPR ? `New PR: ${time}` : `Finished: ${time || 'Strong finish'}`,
      })
    }
  }

  // ── report_card ───────────────────────────────────────────────────────────
  if (action === 'report_card') {
    if (!race) return res.status(400).json({ error: 'race required' })

    const activities = race.strava_activities || []
    const raceName = race.name || 'this race'
    const distance = race.distance || ''
    const time = race.time || ''
    const splits = race.splits || []
    const totalActivities = activities.length
    const totalMiles = activities.reduce((sum, a) => sum + ((a.distance||0)/1609.34), 0).toFixed(1)
    const avgWeeklyMiles = totalActivities > 0 ? (parseFloat(totalMiles) / Math.max(1, activities.length/5)).toFixed(1) : 0
    const longRuns = activities.filter(a => (a.distance||0)/1609.34 > 10).length
    const splitsText = splits.length > 0 ? splits.map(s=>`${s.label}: ${s.time}`).join(', ') : 'not recorded'

    const prompt = `You are Pacer, a warm and enthusiastic AI running coach reviewing a runner's training for a completed race.
${POSITIVITY_RULES}

THE RACE:
- Race: ${raceName}
- Distance: ${distance}
- Finish time: ${time || 'not recorded'}
- Splits: ${splitsText}

TRAINING DATA (${totalActivities} activities):
- Total training miles: ${totalMiles} mi
- Est. weekly average: ${avgWeeklyMiles} mi/week
- Long runs (10+ miles): ${longRuns}
${activities.slice(0,10).map(a => `  ${new Date(a.start_date_local||'').toLocaleDateString()}: ${((a.distance||0)/1609.34).toFixed(1)}mi, ${Math.round((a.moving_time||0)/60)}min`).join('\n')}

Respond ONLY with valid JSON, no markdown:
{
  "summary": "2 sentences. Overall positive training assessment.",
  "grades": [
    {"category": "Consistency", "grade": "A", "comment": "Positive comment"},
    {"category": "Long Runs", "grade": "B+", "comment": "Positive comment"},
    {"category": "Volume", "grade": "B", "comment": "Positive comment"},
    {"category": "Race Execution", "grade": "A-", "comment": "Positive comment"}
  ],
  "top_win": "The single best thing about their training build",
  "next_focus": "One exciting opportunity — positive framing only"
}`

    try {
      const text = await callClaude(prompt, 500)
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(200).json({
        summary: `Your training for ${raceName} shows real dedication — getting to the start line is the first victory!`,
        grades: [
          { category:'Consistency', grade:'A', comment:'You showed up and put in the work.' },
          { category:'Long Runs',   grade:'B+', comment:'Building that aerobic base is paying off.' },
          { category:'Volume',      grade:'B', comment:'Solid foundation — more miles will only make you stronger.' },
          { category:'Race Execution', grade:'A-', comment:'Crossing that finish line is the ultimate execution.' },
        ],
        top_win: "You finished the race — that's the most important thing.",
        next_focus: 'Keep building your base and enjoy the process!',
      })
    }
  }

  // ── checklist ─────────────────────────────────────────────────────────────
  if (action === 'checklist') {
    if (!race) return res.status(400).json({ error: 'race required' })

    const raceName = race.name || 'your race'
    const distance = (race.distance || '').toString().toLowerCase()
    const raceState = race.state || ''
    const userState = profile?.state || ''
    const isTri = distance.includes('70.3') || distance.includes('140.6') || distance.includes('tri')
    const needsTravel = raceState && userState && raceState.toUpperCase() !== userState.toUpperCase()

    const prompt = `You are Pacer, an enthusiastic AI running coach generating a personalized race day checklist.
${POSITIVITY_RULES}

RACE DETAILS:
- Race: ${raceName}
- Distance: ${race.distance}
- Location: ${race.city||''}, ${raceState}
- Race date: ${race.date||'upcoming'}
- Is triathlon: ${isTri}
- Needs travel: ${needsTravel}

${isTri ? `Create sections: Swim, T1, Bike, T2, Run${needsTravel?', Travel':''}, Misc` : ''}
${!isTri ? `Create sections: Race Morning, Gear, Nutrition${needsTravel?', Travel':''}, Misc` : ''}

Each section: 5-10 specific actionable items. Respond ONLY with valid JSON, no markdown:
{
  "sections": [
    {
      "id": "swim",
      "label": "Swim",
      "emoji": "🏊",
      "color": "#3b82f6",
      "items": [
        { "id": "swim_1", "text": "Wetsuit (if water temp allows)", "checked": false }
      ]
    }
  ]
}`

    try {
      const text = await callClaude(prompt, 1500)
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch(e) {
      const fallback = isTri ? [
        { id:'swim', label:'Swim', emoji:'🏊', color:'#3b82f6', items:[
          { id:'s1', text:'Wetsuit', checked:false },
          { id:'s2', text:'Goggles (+ backup)', checked:false },
          { id:'s3', text:'Swim cap', checked:false },
          { id:'s4', text:'Anti-chafe balm', checked:false },
        ]},
        { id:'t1', label:'T1', emoji:'🔄', color:'#8b5cf6', items:[
          { id:'t1a', text:'Bike shoes', checked:false },
          { id:'t1b', text:'Helmet — on BEFORE touching bike', checked:false },
          { id:'t1c', text:'Sunglasses', checked:false },
          { id:'t1d', text:'Race number belt', checked:false },
        ]},
        { id:'bike', label:'Bike', emoji:'🚴', color:'#f59e0b', items:[
          { id:'b1', text:'Bike (checked in night before)', checked:false },
          { id:'b2', text:'CO2 cartridges + inflator (x2)', checked:false },
          { id:'b3', text:'Spare tube', checked:false },
          { id:'b4', text:'Water bottles filled', checked:false },
        ]},
        { id:'t2', label:'T2', emoji:'🔄', color:'#ec4899', items:[
          { id:'t2a', text:'Running shoes', checked:false },
          { id:'t2b', text:'Race hat / visor', checked:false },
        ]},
        { id:'run', label:'Run', emoji:'🏃', color:'#10b981', items:[
          { id:'r1', text:'Gels / race nutrition', checked:false },
          { id:'r2', text:'Salt tabs', checked:false },
        ]},
        { id:'misc', label:'Misc', emoji:'📋', color:'#9aa5b4', items:[
          { id:'m1', text:'Review race morning schedule', checked:false },
          { id:'m2', text:'Set 2 alarms', checked:false },
        ]},
      ] : [
        { id:'morning', label:'Race Morning', emoji:'🌅', color:'#f59e0b', items:[
          { id:'rm1', text:'Set 2 alarms', checked:false },
          { id:'rm2', text:'Breakfast (nothing new on race day)', checked:false },
          { id:'rm3', text:'Review race morning schedule', checked:false },
        ]},
        { id:'gear', label:'Gear', emoji:'👟', color:'#10b981', items:[
          { id:'g1', text:'Running shoes', checked:false },
          { id:'g2', text:'Race outfit (pinned bib)', checked:false },
          { id:'g3', text:'GPS watch (charged)', checked:false },
          { id:'g4', text:'Sunglasses / hat', checked:false },
        ]},
        { id:'nutrition', label:'Nutrition', emoji:'⚡', color:'#C9A84C', items:[
          { id:'n1', text:'Gels / chews', checked:false },
          { id:'n2', text:'Pre-race fuel', checked:false },
          { id:'n3', text:'Electrolytes', checked:false },
        ]},
        { id:'misc', label:'Misc', emoji:'📋', color:'#9aa5b4', items:[
          { id:'m1', text:'Race bib picked up', checked:false },
          { id:'m2', text:'Post-race recovery clothes', checked:false },
        ]},
      ]
      return res.status(200).json({ sections: fallback })
    }
  }

  // ── goal_race_suggestions ─────────────────────────────────────────────────
  if (action === 'goal_race_suggestions') {
    const { distance, month, year, location, races: raceList } = req.body
    if (!raceList?.length) return res.status(400).json({ error: 'races required' })
    try {
      const prompt = `You are Pacer, a running coach AI. A user wants to run a ${distance} in ${month ? month + ' ' : ''}${year || '2026'}${location ? ' near ' + location : ''}.

Here are up to 15 races that match:
${raceList.map((r, i) => (i+1) + '. ID: ' + r.id + ' | ' + r.name + ' | ' + r.date + ' | ' + r.city + ', ' + r.state).join('\n')}

Pick the 3 best races for this runner. Consider: prestige, beginner-friendliness, location quality, date timing. Return ONLY valid JSON with this exact shape — no markdown, no explanation:
{"top_race_ids": ["id1", "id2", "id3"], "reason": "one sentence explaining your picks"}`

      const result = await callClaude(prompt, 200)
      const clean = result.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(200).json({ top_race_ids: raceList.slice(0,3).map(r => r.id) })
    }
  }

  // ── race_score ────────────────────────────────────────────────────────────
  if (action === 'race_score') {
    const { race, all_races, report_card_grades, strava_data, is_partial, pool_data } = req.body
    if (!race) return res.status(400).json({ error: 'race required' })

    const safeRaces = Array.isArray(all_races) ? all_races : []

    const toSecs = t => {
      if (!t) return null
      const p = t.split(':').map(Number)
      return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + (p[1]||0)
    }

    const raceSecs = toSecs(race.time)
    const sameDist = safeRaces.filter(r => r.distance === race.distance && r.time && r.id !== race.id)

    let timePercentile = 50
    if (raceSecs && sameDist.length > 0) {
      const sameDistSecs = sameDist.map(r => toSecs(r.time)).filter(Boolean)
      const fasterCount  = sameDistSecs.filter(s => s > raceSecs).length
      timePercentile     = Math.round((fasterCount / sameDistSecs.length) * 100)
    }

    // Community percentile from pool_data (if provided and has enough results)
    let communityPercentile = null
    let communityContext = ''
    if (pool_data && pool_data.count >= 20 && raceSecs) {
      const fasterInPool = (pool_data.times || []).filter(t => t > raceSecs).length
      communityPercentile = Math.round((fasterInPool / pool_data.count) * 100)
      communityContext = `Community data: ${pool_data.count} Race Passport runners have run this race/distance. This runner is in the ${communityPercentile}th percentile among similar-age runners in the community.`
    }

    const DIST_MILES = { '5K':3.10559,'10K':6.21371,'10 mi':10,'13.1':13.1,'26.2':26.2,'50K':31.07,'70.3':null,'140.6':null,'Ultra':50 }
    const raceMiles = DIST_MILES[race.distance]
    let paceScore = 70
    if (raceSecs && raceMiles) {
      const racePacePerMile = raceSecs / raceMiles
      const allPaces = safeRaces.map(r => {
        const m = DIST_MILES[r.distance], s = toSecs(r.time)
        return m && s ? s / m : null
      }).filter(Boolean)
      if (allPaces.length > 0) {
        const avgPace = allPaces.reduce((a,b) => a+b, 0) / allPaces.length
        const paceRatio = avgPace / racePacePerMile
        paceScore = Math.min(100, Math.max(40, Math.round(50 + (paceRatio - 1) * 200)))
      }
    }

    const isPR      = race.is_pr || false
    const prBonus   = isPR ? 8 : 0
    const perfScore = Math.min(100, Math.max(60, Math.round((timePercentile * 0.5 + paceScore * 0.5) + prBonus)))

    let finalScore = perfScore
    if (!is_partial && report_card_grades && report_card_grades.length > 0) {
      const gradeToNum = { 'A+':98,'A':95,'A-':92,'B+':88,'B':85,'B-':82,'C+':78,'C':75,'C-':72,'D+':68,'D':65,'D-':62,'F':50 }
      const rcNums  = report_card_grades.map(g => gradeToNum[g] || 75).filter(Boolean)
      const rcScore = rcNums.reduce((a,b) => a+b, 0) / rcNums.length
      finalScore    = Math.min(100, Math.round(rcScore * 0.6 + perfScore * 0.4))
    }

    const gradeFromScore = s => {
      if (s >= 97) return 'A+'; if (s >= 93) return 'A'; if (s >= 90) return 'A-'
      if (s >= 87) return 'B+'; if (s >= 83) return 'B'; if (s >= 80) return 'B-'
      if (s >= 77) return 'C+'; if (s >= 73) return 'C'; if (s >= 70) return 'C-'
      if (s >= 67) return 'D+'; if (s >= 63) return 'D'; if (s >= 60) return 'D-'
      return 'F'
    }

    const grade = gradeFromScore(finalScore)

    try {
      const distSummary = sameDist.length > 0
        ? `Runner has completed ${sameDist.length} other ${race.distance} race(s). This finish time ranked them in the ${timePercentile}th percentile of their own ${race.distance} history.`
        : `This is the runner's first recorded ${race.distance}.`

      const prompt = `You are Pacer, a warm and encouraging AI running coach.
${POSITIVITY_RULES}

RACE: ${race.name} (${race.distance})
FINISH TIME: ${race.time || 'not recorded'}
PERSONAL RECORD: ${isPR ? 'YES' : 'No'}
PERFORMANCE SCORE: ${finalScore}/100 (Grade: ${grade})
${distSummary}
${communityContext}
${is_partial ? 'NOTE: Partial grade — training not yet assessed.' : 'TRAINING GRADE (60% of score): Included in calculation.'}

Write ONE sentence (max 20 words) celebrating this performance and explaining the grade. Be warm and specific.${communityPercentile !== null ? ' Reference their community ranking.' : ''} No markdown.
${is_partial ? 'End with energy about unlocking the full grade.' : ''}`

      const text = await callClaude(prompt, 80)
      return res.status(200).json({
        score: finalScore,
        grade,
        justification: text.trim().replace(/^"|"$/g, ''),
        is_partial: !!is_partial,
        community_percentile: communityPercentile,
      })
    } catch(e) {
      return res.status(200).json({
        score: finalScore,
        grade,
        justification: isPR
          ? 'New personal record — this shows real growth in your racing journey!'
          : 'Solid performance that adds to your racing legacy.',
        is_partial: !!is_partial,
        community_percentile: communityPercentile,
      })
    }
  }

  // ── goal_race_lookup: web search for a specific goal race ───────────────
  if (action === 'goal_race_lookup') {
    const { query: q, month, year } = req.body
    if (!q) return res.status(400).json({ error: 'query required' })

    const prompt = `You are a race data assistant for an endurance sports app called Race Passport.

A runner has set this as their goal race: "${q}"${month ? ` in ${month}` : ''}${year ? ` ${year}` : ''}.

Do TWO searches:
1. Search "${q}" — find the official race name, city, state, typical month, distance, website
2. Search "${q} race experience reviews" — find what makes this race special, its prestige, course highlights, why runners love it

Return ONLY a JSON object (no markdown):
{
  "name": "official race name only — no distance, no year",
  "location": "City, ST",
  "city": "city only",
  "state": "2-letter state abbreviation",
  "distance": "normalized: 5K or 10K or 10 mi or 13.1 or 26.2 or 50K or 70.3 or 140.6 or Ultra or Other",
  "typical_month": "month this race typically occurs e.g. October",
  "website": "official website URL or empty string",
  "confidence": 3,
  "pacer_message": "3-4 sentences MAX. Pacer voice — warm, enthusiastic, specific. First: celebrate that they set this goal (be specific about why THIS race is a great goal). Second: one specific thing that makes this race iconic or special. Third: one motivating insight about what it takes or means to finish it. If this year has any notable milestone for this race (50th anniversary, 100th edition, etc.) call it out with excitement. No generic praise — real details only."
}

CRITICAL: pacer_message must reference real specific details about this race. confidence 3 if found definitively, 2 if partial.`

    try {
      const text = await callClaudeWithSearch(prompt, 800)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      return res.status(200).json(parsed)
    } catch(e) {
      try {
        const fallback = `You are a race data assistant. Tell me about "${q}" as a goal race for a runner. Return ONLY JSON: {"name":"${q}","location":"","city":"","state":"","distance":"Other","typical_month":"","website":"","confidence":1,"pacer_message":"Setting a goal race is the first step toward your next great achievement — this is how champions are made!"}`
        const text = await callClaude(fallback, 300)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        return res.status(200).json(parsed)
      } catch(e2) {
        return res.status(200).json({ name: q, location:'', city:'', state:'', distance:'Other', typical_month:'', website:'', confidence:1, pacer_message:"Setting a goal race is the first step — and you've already taken it. Let's get to work." })
      }
    }
  }

  // ── race_readiness: compute Race Readiness score from Strava + race history ──
  if (action === 'race_readiness') {
    const { activities = [], passport_races = [], profile: prof = {}, goal_race = null } = req.body

    // ── Sub-score computations (all return 0-100) ─────────────────────────────

    const toSecs = t => {
      if (!t) return null
      const p = t.split(':').map(Number)
      return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + (p[1]||0)
    }

    const now = Date.now()
    const weeksMs = w => w * 7 * 24 * 60 * 60 * 1000

    // Filter to run/walk activities only for most metrics
    const runTypes = ['run','virtualrun','walk']
    const triTypes = ['swim','ride','virtualride','mountainbikeride','run','virtualrun']
    const recentRuns = activities.filter(a => {
      const type = (a.type || a.sport_type || '').toLowerCase()
      const age = now - new Date(a.start_date_local || a.start_date).getTime()
      return runTypes.includes(type) && age <= weeksMs(4)
    })
    const recentAll = activities.filter(a => {
      const age = now - new Date(a.start_date_local || a.start_date).getTime()
      return age <= weeksMs(4)
    })
    const prevRuns = activities.filter(a => {
      const type = (a.type || a.sport_type || '').toLowerCase()
      const age = now - new Date(a.start_date_local || a.start_date).getTime()
      return runTypes.includes(type) && age > weeksMs(4) && age <= weeksMs(8)
    })
    const longTermRuns = activities.filter(a => {
      const type = (a.type || a.sport_type || '').toLowerCase()
      const age = now - new Date(a.start_date_local || a.start_date).getTime()
      return runTypes.includes(type) && age <= weeksMs(12)
    })

    // 1. CONSISTENCY — training frequency and streaks (0-100)
    const computeConsistency = () => {
      if (!recentRuns.length) return 0
      // Days active in last 28 days
      const activeDays = new Set(recentRuns.map(a => new Date(a.start_date_local || a.start_date).toDateString()))
      const daysActive = activeDays.size
      // Frequency: 5+/week = 100, 4/week = 85, 3/week = 70, 2/week = 55, 1/week = 35
      const perWeek = daysActive / 4
      let freqScore = perWeek >= 5 ? 100 : perWeek >= 4 ? 85 : perWeek >= 3 ? 70 : perWeek >= 2 ? 55 : 35
      // Streak bonus — consecutive weeks with at least 2 runs
      const weeks = [0,1,2,3].map(w => {
        const start = now - weeksMs(w+1), end = now - weeksMs(w)
        return recentRuns.filter(a => {
          const t = new Date(a.start_date_local || a.start_date).getTime()
          return t >= start && t < end
        }).length
      })
      const streak = weeks.filter(c => c >= 2).length
      const streakBonus = streak * 3
      return Math.min(100, Math.round(freqScore + streakBonus))
    }

    // 2. VOLUME TREND — weekly mileage trend (0-100)
    const computeVolumeTrend = () => {
      const recentMi = recentRuns.reduce((s, a) => s + (a.distance || 0) / 1609.34, 0)
      const prevMi   = prevRuns.reduce((s, a) => s + (a.distance || 0) / 1609.34, 0)
      if (!recentMi && !prevMi) return 0
      if (!prevMi) return 65 // no baseline
      const ratio = recentMi / prevMi
      // 1.1+ = building well, 0.9-1.1 = maintenance, <0.7 = declining
      if (ratio >= 1.2) return 90
      if (ratio >= 1.1) return 82
      if (ratio >= 0.95) return 72
      if (ratio >= 0.8) return 58
      return 42
    }

    // 3. INTENSITY BALANCE — easy/hard ratio (0-100)
    const computeIntensityBalance = () => {
      if (!recentRuns.length) return 0
      // Use average pace as proxy — faster efforts = harder
      // First establish average pace across all their runs
      const paces = longTermRuns
        .filter(a => a.distance > 1609 && a.moving_time)
        .map(a => a.moving_time / (a.distance / 1609.34))
      if (!paces.length) return 65
      const avgPace = paces.reduce((s, p) => s + p, 0) / paces.length
      const recentPaces = recentRuns
        .filter(a => a.distance > 1609 && a.moving_time)
        .map(a => a.moving_time / (a.distance / 1609.34))
      if (!recentPaces.length) return 65
      // Hard runs = significantly faster than avg (< 90% of avg pace = faster)
      const hardCount = recentPaces.filter(p => p < avgPace * 0.92).length
      const hardRatio = hardCount / recentPaces.length
      // Ideal: 20-30% hard, 70-80% easy
      if (hardRatio >= 0.15 && hardRatio <= 0.35) return 88
      if (hardRatio >= 0.10 && hardRatio <= 0.45) return 74
      if (hardRatio < 0.05) return 55  // all easy
      if (hardRatio > 0.55) return 52  // too much hard
      return 65
    }

    // 4. RECOVERY QUALITY — rest between efforts (0-100)
    const computeRecovery = () => {
      if (recentRuns.length < 2) return 70
      const sorted = [...recentRuns].sort((a, b) =>
        new Date(a.start_date_local || a.start_date) - new Date(b.start_date_local || b.start_date)
      )
      let gaps = []
      for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i].start_date_local || sorted[i].start_date) -
                     new Date(sorted[i-1].start_date_local || sorted[i-1].start_date)) / (1000*60*60)
        gaps.push(diff)
      }
      // Flag back-to-back hard days (< 20hr gap after long run)
      const longRuns = sorted.filter(a => (a.distance || 0) / 1609.34 > 8)
      const badGaps = gaps.filter(g => g < 20).length
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length
      if (badGaps === 0 && avgGap >= 36) return 90
      if (badGaps <= 1 && avgGap >= 24) return 78
      if (badGaps <= 2) return 65
      return 50
    }

    // 5. SPEED ENDURANCE — recent pace vs historical best (0-100)
    const computeSpeedEndurance = () => {
      const historicalPaces = longTermRuns
        .filter(a => a.distance > 3000 && a.moving_time)
        .map(a => a.moving_time / (a.distance / 1609.34))
        .sort((a, b) => a - b)
      if (!historicalPaces.length) return 65
      const bestPace = historicalPaces[0]
      const recentBestPaces = recentRuns
        .filter(a => a.distance > 3000 && a.moving_time)
        .map(a => a.moving_time / (a.distance / 1609.34))
        .sort((a, b) => a - b)
      if (!recentBestPaces.length) return 50
      const recentBest = recentBestPaces[0]
      // How close is recent best to historical best?
      const ratio = bestPace / recentBest // > 1 means recent is slower
      if (ratio >= 0.98) return 92  // at or near best
      if (ratio >= 0.95) return 82
      if (ratio >= 0.90) return 70
      if (ratio >= 0.85) return 58
      return 45
    }

    // 6. vs PR CYCLE — compare to training leading into best races (0-100)
    const computeVsPRCycle = () => {
      const prRaces = passport_races.filter(r => r.is_pr && r.date_sort)
      if (!prRaces.length || !longTermRuns.length) return 65
      // Get current 4-week mileage
      const currentMi = recentRuns.reduce((s, a) => s + (a.distance || 0) / 1609.34, 0)
      const currentPerWeek = currentMi / 4
      // Estimate PR cycle volume from number of runs and distances in passport
      // Proxy: if current weekly > 25mi, compare to PR race distances
      const bestRaceDistMi = Math.max(...prRaces.map(r => {
        const d = {'5K':3.1,'10K':6.2,'10 mi':10,'13.1':13.1,'26.2':26.2,'50K':31,'70.3':70.3,'140.6':140.6}
        return d[r.distance] || 0
      }))
      // Expected training volume for best race distance
      const expectedPerWeek = bestRaceDistMi >= 26.2 ? 40 : bestRaceDistMi >= 13.1 ? 28 : bestRaceDistMi >= 10 ? 22 : 18
      const ratio = currentPerWeek / expectedPerWeek
      if (ratio >= 1.0) return 90
      if (ratio >= 0.85) return 80
      if (ratio >= 0.70) return 68
      if (ratio >= 0.55) return 55
      return 42
    }

    // ── Compute all six sub-scores ────────────────────────────────────────────
    const hasData = activities.length >= 3
    let subScores, composite, grade

    if (!hasData) {
      // Baseline state — not enough data
      composite = 75
      grade = 'C'
      subScores = []
    } else {
      const raw = {
        consistency:      computeConsistency(),
        volume_trend:     computeVolumeTrend(),
        intensity_balance: computeIntensityBalance(),
        recovery:         computeRecovery(),
        speed_endurance:  computeSpeedEndurance(),
        vs_pr_cycle:      computeVsPRCycle(),
      }

      // Weights
      const weights = { consistency:0.22, volume_trend:0.2, intensity_balance:0.16, recovery:0.16, speed_endurance:0.14, vs_pr_cycle:0.12 }
      composite = Math.round(Object.entries(raw).reduce((s, [k, v]) => s + v * (weights[k] || 0), 0))

      // Grade
      const gradeFromScore = s => {
        if (s >= 97) return 'A+'; if (s >= 93) return 'A'; if (s >= 90) return 'A-'
        if (s >= 87) return 'B+'; if (s >= 83) return 'B'; if (s >= 80) return 'B-'
        if (s >= 77) return 'C+'; if (s >= 73) return 'C'; if (s >= 70) return 'C-'
        if (s >= 67) return 'D+'; if (s >= 63) return 'D'; if (s >= 60) return 'D-'
        return 'F'
      }
      grade = gradeFromScore(composite)

      // Build ranked sub-score list for display
      const LABELS = {
        consistency:       'Consistency',
        volume_trend:      'Volume trend',
        intensity_balance: 'Intensity balance',
        recovery:          'Recovery quality',
        speed_endurance:   'Speed endurance',
        vs_pr_cycle:       'vs. PR cycle',
      }
      const STATUS = (val) => {
        if (val >= 88) return { label: 'Strong',    color: '#16a34a', bg: 'rgba(22,163,74,0.08)' }
        if (val >= 78) return { label: 'Good',      color: '#16a34a', bg: 'rgba(22,163,74,0.08)' }
        if (val >= 68) return { label: 'Building',  color: '#C9A84C', bg: 'rgba(201,168,76,0.1)' }
        if (val >= 55) return { label: 'Fair',      color: '#C9A84C', bg: 'rgba(201,168,76,0.1)' }
        return { label: 'Needs work', color: '#c53030', bg: 'rgba(197,48,48,0.08)' }
      }

      subScores = Object.entries(raw).map(([key, val]) => {
        const st = STATUS(val)
        return { key, name: LABELS[key], val, ...st }
      })
    }

    // ── Pick top 3 most relevant factors ─────────────────────────────────────
    // Sort by absolute deviation from 75 (most notable, up or down)
    const top3 = hasData
      ? [...subScores].sort((a, b) => Math.abs(b.val - 75) - Math.abs(a.val - 75)).slice(0, 3)
      : []
    const improving = hasData ? subScores.filter(f => f.val >= 75).sort((a, b) => b.val - a.val).slice(0, 3) : []
    const declining = hasData ? subScores.filter(f => f.val < 75).sort((a, b) => a.val - b.val).slice(0, 3) : []

    // ── Ask Pacer to generate the narrative insight ───────────────────────────
    let insight = ''
    try {
      const recentMiTotal = recentRuns.reduce((s, a) => s + (a.distance || 0) / 1609.34, 0).toFixed(1)
      const goalContext = goal_race ? `Goal race: ${goal_race.name || goal_race.goal_race_name || ''} (${goal_race.goal_distance || ''})` : 'No specific goal race set'
      const topFactors = top3.map(f => `${f.name}: ${f.val} (${f.label})`).join(', ')
      const firstName = (prof.full_name || '').split(' ')[0] || 'Runner'

      const prompt = [
        'You are Pacer, a warm AI running coach inside Race Passport.',
        POSITIVITY_RULES,
        '',
        'RUNNER DATA:',
        `Name: ${firstName}`,
        `4-week mileage: ${recentMiTotal} miles`,
        `Activities last 4 weeks: ${recentRuns.length}`,
        `Race Readiness score: ${composite}/100 (${grade})`,
        `Top factors: ${topFactors || 'insufficient data'}`,
        goalContext,
        `Passport races: ${passport_races.length}`,
        '',
        'Write a Race Readiness insight with EXACTLY this structure:',
        '- Sentence 1: One punchy, specific observation about what their training pattern MEANS for racing right now. Be specific — reference actual training signals.',
        '- Sentences 2-3: More detail — what is building, what needs attention, how this translates to race performance. Keep it warm and coach-like.',
        '- Sentence 4: One forward-looking statement about what to focus on or when to race.',
        '',
        'Return ONLY valid JSON:',
        '{"insight": "4 sentences as described above. No markdown. No generic praise."}',
      ].join('\n')

      const text = await callClaude(prompt, 200)
      const parsed = JSON.parse(text)
      insight = parsed.insight || ''
    } catch(e) {
      const recentMi = recentRuns.reduce((s, a) => s + (a.distance || 0) / 1609.34, 0).toFixed(0)
      insight = hasData
        ? `Your training is building real race fitness right now. ${recentMi} miles in the last four weeks shows genuine commitment — keep this momentum going and a race in the next 4-8 weeks will catch you near your peak.`
        : 'Your Race Readiness is at baseline — as you train and sync with Strava, Pacer will calculate your real score. Keep moving and this card will start telling your story.'
    }

    return res.status(200).json({
      score:    composite,
      grade,
      insight,
      factors:  { all: top3, improving, declining },
      has_data: hasData,
    })
  }

  return res.status(400).json({ error: 'Unknown action: ' + action })
}
