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

  // ── race_lookup: Pacer-assisted manual race entry ─────────────────────────
  if (action === 'race_lookup') {
    const q = query || req.body.query
    if (!q) return res.status(400).json({ error: 'query required' })

    const prompt = `You are a race data assistant with deep knowledge of endurance events in the United States.
The user entered this race query: "${q}"

Identify the specific race they are referring to and return ONLY a JSON object (no markdown, no explanation, no code fences) with these exact fields:
{
  "name": "official event/series name ONLY — do NOT include the distance in the name field. e.g. 'Baltimore Running Festival' not 'Baltimore Running Festival Marathon'. e.g. 'Cherry Blossom Ten Mile Run' not 'Cherry Blossom 10 Miler Half Marathon'",
  "date": "Month YYYY format e.g. Oct 2024",
  "date_sort": "YYYY-MM-DD use actual race date, 01 for day if unknown",
  "location": "City, ST",
  "city": "city name only",
  "state": "2-letter state abbreviation",
  "distance": "normalized: 5K or 10K or 10 mi or 13.1 or 26.2 or 50K or 70.3 or 140.6 or Ultra or Other — infer from the query if the user specified a distance",
  "confidence": 3
}

CRITICAL RULES:
- The name field must NEVER include the distance. Keep it as the event/series name only.
- If the user says 'Baltimore Running Festival 10K' the name is 'Baltimore Running Festival' and the distance is '10K'
- If you recognize the race confidently, set confidence to 3
- If it is a partial match or you are not certain, set confidence to 2
- ALWAYS return valid JSON even if uncertain — use your best guess
- For well-known races like Cherry Blossom, Boston Marathon, Marine Corps Marathon, Baltimore Running Festival, Frederick Running Festival, you should have high confidence
- Never return an error — always return JSON`

    try {
      const text = await callClaude(prompt, 300)
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(200).json({
        name: q, date: '', date_sort: null, location: '', city: '', state: '',
        distance: 'Other', confidence: 1,
      })
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
    const isMarathon = distance.includes('26.2') || distance.toLowerCase().includes('marathon')
    const isHalf = distance.includes('13.1') || distance.toLowerCase().includes('half')
    const isUltra = distance.includes('50') || distance.includes('100') || distance.toLowerCase().includes('ultra')
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

  // ── Goal race suggestions ─────────────────────────────────────────────────
  if (action === 'goal_race_suggestions') {
    const { distance, month, year, location, races: raceList } = req.body
    if (!raceList?.length) return res.status(400).json({ error: 'races required' })
    try {
      const prompt = `You are Pacer, a running coach AI. A user wants to run a ${distance} in ${month ? month + ' ' : ''}${year || '2026'}${location ? ' near ' + location : ''}.

Here are up to 15 races that match:
${raceList.map((r, i) => `${i+1}. ID: ${r.id} | ${r.name} | ${r.date} | ${r.city}, ${r.state}`).join('
')}

Pick the 3 best races for this runner. Consider: prestige, beginner-friendliness, location quality, date timing. Return ONLY valid JSON with this exact shape — no markdown, no explanation:
{"top_race_ids": ["id1", "id2", "id3"], "reason": "one sentence explaining your picks"}`

      const result = await callClaude(prompt, 200)
      const clean = result.replace(/\`\`\`json|\`\`\`/g, '').trim()
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(200).json({ top_race_ids: raceList.slice(0,3).map(r => r.id) })
    }
  }

  // ── race_score: individual race grade ───────────────────────────────────────
  if (action === 'race_score') {
    const { race, all_races, report_card_grades, strava_data, is_partial } = req.body
    if (!race) return res.status(400).json({ error: 'race required' })

    const safeRaces = Array.isArray(all_races) ? all_races : []

    // ── Performance metrics (40% of full score, 100% of partial) ─────────────
    const toSecs = t => {
      if (!t) return null
      const p = t.split(':').map(Number)
      return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + (p[1]||0)
    }

    const raceSecs = toSecs(race.time)
    const sameDist = safeRaces.filter(r => r.distance === race.distance && r.time && r.id !== race.id)

    // Time percentile vs same distance
    let timePercentile = 50
    if (raceSecs && sameDist.length > 0) {
      const sameDistSecs = sameDist.map(r => toSecs(r.time)).filter(Boolean)
      const fasterCount  = sameDistSecs.filter(s => s > raceSecs).length
      timePercentile     = Math.round((fasterCount / sameDistSecs.length) * 100)
    }

    // Pace vs personal average across all distances (normalized to per-mile)
    const DIST_MILES = { '5K':3.10559,'10K':6.21371,'10 mi':10,'13.1':13.1,'26.2':26.2,'50K':31.07,'70.3':null,'140.6':null,'Ultra':50 }
    const raceMiles = DIST_MILES[race.distance]
    let paceScore = 70 // neutral default
    if (raceSecs && raceMiles) {
      const racePacePerMile = raceSecs / raceMiles
      const allPaces = safeRaces.map(r => {
        const m = DIST_MILES[r.distance], s = toSecs(r.time)
        return m && s ? s / m : null
      }).filter(Boolean)
      if (allPaces.length > 0) {
        const avgPace = allPaces.reduce((a,b) => a+b, 0) / allPaces.length
        // Faster pace than average = higher score
        const paceRatio = avgPace / racePacePerMile  // >1 means faster than avg
        paceScore = Math.min(100, Math.max(40, Math.round(50 + (paceRatio - 1) * 200)))
      }
    }

    const isPR      = race.is_pr || false
    const prBonus   = isPR ? 8 : 0
    const perfScore = Math.min(100, Math.max(40, Math.round((timePercentile * 0.5 + paceScore * 0.5) + prBonus)))

    // ── Full score: 60% report card + 40% performance ────────────────────────
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

    // ── Ask Pacer for a one-sentence justification ───────────────────────────
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
${!is_partial && report_card_grades ? `TRAINING GRADE (60% of score): Based on ${report_card_grades.length} training metrics` : 'NOTE: This is a partial grade based on performance data only — training not yet assessed'}

Write ONE sentence (max 20 words) celebrating this performance and explaining the grade. Be warm and specific. No markdown.
${is_partial ? 'End with energy about unlocking the full grade.' : ''}`

      const text = await callClaude(prompt, 80)
      return res.status(200).json({
        score: finalScore,
        grade,
        justification: text.trim().replace(/^"|"$/g, ''),
        is_partial: !!is_partial,
      })
    } catch(e) {
      return res.status(200).json({
        score: finalScore,
        grade,
        justification: isPR
          ? `New personal record — this race shows real growth in your ${race.distance} journey!`
          : `Solid ${race.distance} performance that adds to your racing legacy.`,
        is_partial: !!is_partial,
      })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
