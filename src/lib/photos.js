// src/lib/photos.js
// AI-powered race photo selection
//
// STRATEGY:
//   1. Call Claude Sonnet with race metadata → get structured query JSON
//   2. Call Vercel proxy /api/runsignup?action=unsplash_search with best query
//   3. Return photo URL, cache result by race key
//   4. Fall back through backup_queries on 0 results
//   5. If all queries fail, return static distance fallback (instant, no API)
//
// DISTANCE LOGIC (enforced by AI prompt):
//   < 13.1 miles  → local_road_race  (community runners, city streets)
//   >= 13.1 known → race_specific    (real event photos)
//   >= 13.1 other → city_skyline     (location imagery)
//   Triathlon     → tri_specific or city_skyline

// ── Static fallbacks — used when ALL API calls fail ───────────────────────────
const STATIC_FALLBACKS = {
  local_road_race: [
    'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80&fit=crop', // community 5K
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80&fit=crop', // city race
    'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=800&q=80&fit=crop', // road runners
  ],
  race_specific: [
    'https://images.unsplash.com/photo-1530143584546-02191bc84eb5?w=800&q=80&fit=crop', // marathon crowd
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80&fit=crop', // marathon finish
  ],
  city_skyline: [
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80&fit=crop', // city skyline
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80&fit=crop', // downtown
  ],
  triathlon: [
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80&fit=crop', // tri
  ],
  ultra: [
    'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80&fit=crop', // trail
  ],
}

// ── Well-known races list — triggers race_specific strategy ──────────────────
const WELL_KNOWN_RACES = new Set([
  'boston marathon','new york city marathon','nyc marathon','chicago marathon',
  'marine corps marathon','la marathon','los angeles marathon','berlin marathon',
  'london marathon','tokyo marathon','boston','new york marathon',
  'cherry blossom','cherry blossom ten mile','cherry blossom 10 miler',
  'broad street run','peachtree road race','bay to breakers','bolder boulder',
  'cooper river bridge run','gate river run','shamrock marathon','shamrock half',
  'ironman world championship','ironman kona','ironman lake placid',
  'ironman 70.3 eagleman','eagleman','ironman 70.3 chattanooga',
  'ironman 70.3 atlantic city','ironman 70.3 world championship',
  'western states','western states 100','boston marathon 5k',
  'turkey trot','pikes peak marathon','leadville trail 100',
  'rock n roll marathon','rock n roll','rock and roll marathon',
  'baltimore running festival','disney marathon','disney world marathon',
  'runDisney','new york half marathon','united nyc half',
  'austin marathon','austin half marathon',
  'houston marathon','cowtown marathon','dallas marathon',
  'richmond marathon','richmond half marathon',
  'fredericksburg half marathon','annapolis ten mile run','bay bridge run',
])

function isWellKnown(raceName) {
  if (!raceName) return false
  const lower = raceName.toLowerCase().trim()
  for (const known of WELL_KNOWN_RACES) {
    if (lower.includes(known) || known.includes(lower)) return true
  }
  return false
}

// ── Distance in miles from distance label ─────────────────────────────────────
function distanceToMiles(distanceLabel) {
  if (!distanceLabel) return null
  const d = distanceLabel.toLowerCase().replace(/\s/g,'')
  if (d === '5k')  return 3.1
  if (d === '8k')  return 4.9
  if (d === '10k') return 6.2
  if (d === '15k') return 9.3
  if (d === '10mi' || d === '10 mi' || d === '10mile') return 10
  if (d === '13.1' || d.includes('half')) return 13.1
  if (d === '26.2' || d.includes('marathon')) return 26.2
  if (d === '70.3') return 70.3
  if (d === '140.6') return 140.6
  if (d === '50k') return 31
  if (d === '50m' || d === '50mi') return 50
  if (d === '100k') return 62
  if (d === '100m' || d === '100mi') return 100
  return null
}

// ── In-memory cache ───────────────────────────────────────────────────────────
const photoCache = new Map()

function cacheKey(race) {
  return `${race.id || race.name}_${race.distance || ''}`
}

// ── Vercel API base URL ───────────────────────────────────────────────────────
// Works in both dev (proxied by Vite) and production (same domain)
const API_BASE = '/api/runsignup'

// ── Search Unsplash via proxy ─────────────────────────────────────────────────
async function searchUnsplash(query) {
  const url = `${API_BASE}?action=unsplash_search&query=${encodeURIComponent(query)}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Proxy error ${resp.status}`)
  const data = await resp.json()
  const results = data.results || []
  if (results.length === 0) return null
  // Pick from top 3 for variety
  const pick = results[Math.floor(Math.random() * Math.min(results.length, 3))]
  return pick.url
}

// ── AI query generation via Claude API ───────────────────────────────────────
async function getAIQuery(race) {
  const distanceMiles = distanceToMiles(race.distance)
  const wellKnown = isWellKnown(race.name)

  const prompt = `You are responsible for selecting the correct image search strategy and queries for race cards. You must follow the rules strictly and NEVER guess loosely.

GOAL: Return highly relevant, visually consistent image search queries so that results are accurate and not random.

INPUT:
- race_name: ${race.name || ''}
- distance_label: ${race.distance || ''}
- distance_miles: ${distanceMiles ?? 'unknown'}
- city: ${race.city || ''}
- state: ${race.state || ''}
- is_well_known_race: ${wellKnown}

RULES:

1. DISTANCE RULES
IF distance_miles < 13.1 (or unknown for short races):
- Use ONLY "local_road_race" imagery: groups of runners, community race atmosphere, start/finish line, runners on city streets
- DO NOT use: elite marathon photos, trail running, mountains, track meets, gym scenes, single runner portraits, cycling, swimming

IF distance_miles >= 13.1:
- IF is_well_known_race = true: Use "race_specific" (real images from that exact race)
- IF is_well_known_race = false: Use "city_skyline" (visuals of the race location city)

TRIATHLON SPECIAL RULE:
- IF distance_label contains "70.3" or "140.6" or "Tri":
  - IF is_well_known_race = true: Use "race_specific"
  - IF is_well_known_race = false: Use "city_skyline" of the race city

2. STRATEGY TYPES — choose exactly one:
- "local_road_race"
- "race_specific"
- "city_skyline"

3. SEARCH QUERY RULES
- Queries must be VISUAL and SPECIFIC
- DO NOT use vague terms like "5K race", "running", "marathon"
- GOOD for local races: "local road race runners city street", "community 5k finish line crowd", "charity run start line group of runners"
- GOOD for race-specific: "${race.name || 'race'} runners", "${race.name || 'race'} finish line"
- GOOD for skyline: "${race.city || 'city'} skyline", "${race.city || 'city'} downtown cityscape"

4. FORBIDDEN content — always include in avoid list:
tennis, skiing, trail running, mountain running, track and field, gym fitness studio, cycling, swimming, single athlete portrait, abstract fitness

5. OUTPUT FORMAT — JSON ONLY, no text outside JSON:
{
  "image_strategy": "local_road_race" | "race_specific" | "city_skyline",
  "primary_query": "string",
  "backup_queries": ["string", "string", "string"],
  "must_include": ["string", "string"],
  "avoid": ["string", "string"]
}

Return ONLY the JSON object. No explanation, no markdown, no backticks.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`Claude API error ${response.status}`)
  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ── Main export: async getRacePhoto ───────────────────────────────────────────
export async function getRacePhoto(race) {
  // race can be a string (legacy distance-only) or a full race object
  // Normalize to object
  if (typeof race === 'string') {
    race = { distance: race, name: '', city: '', state: '' }
  }

  const key = cacheKey(race)
  if (photoCache.has(key)) return photoCache.get(key)

  const distanceMiles = distanceToMiles(race.distance)
  const wellKnown = isWellKnown(race.name)

  try {
    // Step 1: Get AI-generated query
    const queryData = await getAIQuery(race)
    const { primary_query, backup_queries = [], image_strategy } = queryData

    // Step 2: Try primary query
    let url = await searchUnsplash(primary_query)

    // Step 3: Try backup queries in order
    if (!url) {
      for (const q of backup_queries) {
        url = await searchUnsplash(q)
        if (url) break
      }
    }

    if (url) {
      photoCache.set(key, url)
      return url
    }

    // Step 4: AI queries returned nothing — use static fallback by strategy
    throw new Error('All AI queries returned 0 results')

  } catch (e) {
    console.warn(`getRacePhoto AI path failed for "${race.name}": ${e.message}`)

    // Step 5: Static fallback based on distance
    let fallbackSet
    const d = (race.distance || '').toLowerCase()
    if (d.includes('70.3') || d.includes('140.6') || d.includes('tri')) {
      fallbackSet = STATIC_FALLBACKS.triathlon
    } else if (d.includes('50') || d.includes('100') || d.includes('ultra')) {
      fallbackSet = STATIC_FALLBACKS.ultra
    } else if (distanceMiles && distanceMiles >= 13.1) {
      fallbackSet = wellKnown ? STATIC_FALLBACKS.race_specific : STATIC_FALLBACKS.city_skyline
    } else {
      fallbackSet = STATIC_FALLBACKS.local_road_race
    }

    const fallback = fallbackSet[Math.floor(Math.random() * fallbackSet.length)]
    photoCache.set(key, fallback)
    return fallback
  }
}

// ── Legacy sync function kept for any remaining static uses ──────────────────
// (Home.jsx NearbyCard / UpcomingCard mock data can pass full objects now)
export function getRacePhotoSync(distance) {
  const STATIC = {
    '5K':   STATIC_FALLBACKS.local_road_race[0],
    '10K':  STATIC_FALLBACKS.local_road_race[1],
    '13.1': STATIC_FALLBACKS.race_specific[0],
    '26.2': STATIC_FALLBACKS.race_specific[1],
    '70.3': STATIC_FALLBACKS.triathlon[0],
  }
  return STATIC[distance] || STATIC_FALLBACKS.local_road_race[0]
}
