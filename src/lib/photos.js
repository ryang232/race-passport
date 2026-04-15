// src/lib/photos.js
// Curated photo pools — no API calls, instant loads, no rate limits
//
// STRATEGY:
//   Short races (5K, 10K, 10mi, other) → rotate through Ryan's hand-picked
//     local road race pool (community, crowds, finish lines, city streets)
//
//   Half marathon (13.1):
//     Well-known race → race-specific photo
//     Unknown         → city skyline pool (by state) or generic skyline
//
//   Marathon (26.2) + Triathlon (70.3 / 140.6):
//     Well-known race → race-specific photo
//     Unknown         → city skyline pool (by state) or generic skyline
//
//   Ultra (50K+) → trail/nature pool
//
// Photos are seeded by race ID for consistency (same race = same photo every time)

// ── Ryan's curated local road race pool (20 hand-picked) ─────────────────────
const LOCAL_RACE_POOL = [
  'TqOFeBqnqrI', // people walking/running on street daytime
  'NPFu4GfFZ7E', // runners on road daytime
  '8pNsZRjxtnw', // marathon city street
  'jLeznOrK3UQ', // group running marathon
  'BVvc_KfmzHg', // women in pink shirts running
  'CFkrwz1M_0s', // women in pink shirts and hats
  'SE9bKjzr1Eg', // group of people standing around race
  'PkcaVJbTkCY', // marathon beginning city square
  'jcipiaFDLzE', // red shirts running street daytime
  'B-TiUVkPp90', // runners race blue banner
  'CDPiVNZZm44', // crowd city street
  'jYfeVbmgX3M', // group holding sign race
  'r6IBx_tUhLA', // pain is just bread sign (funny race sign)
  'Ob90gtOzwtU', // runners city street decorations
  'NoPGAeHyymE', // runners celebrate medals
  'O4oXvIw8LUA', // group running marathon with dog
  '8Eg9-cPCt00', // spectator holds sign at race
  'CtDBiRBioNY', // group running down street
  'v0ElfxxyAuY', // group running down street (2)
].map(id => `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop`)

// Note: V-cFACH1EJY (bikes) excluded from road race pool — cycling, not running

// ── City skyline pool — fallback for unknown half/full/tri ────────────────────
// Keyed by US state abbreviation
const CITY_SKYLINES = {
  // Major metro skylines
  MD: 'https://images.unsplash.com/photo-1601409870524-edc80a88f64a?w=800&q=80&fit=crop', // Baltimore
  DC: 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80&fit=crop', // Washington DC
  VA: 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80&fit=crop', // DC/Northern VA
  NY: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80&fit=crop', // NYC
  CA: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80&fit=crop', // LA
  IL: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80&fit=crop', // Chicago
  MA: 'https://images.unsplash.com/photo-1501979376754-c4a4e429cf7c?w=800&q=80&fit=crop', // Boston
  TX: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&q=80&fit=crop', // Austin
  FL: 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=800&q=80&fit=crop', // Miami
  WA: 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&q=80&fit=crop', // Seattle
  OR: 'https://images.unsplash.com/photo-1548285595-2b69de2e7dc5?w=800&q=80&fit=crop', // Portland
  CO: 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&q=80&fit=crop', // Denver
  AZ: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&fit=crop', // Phoenix
  GA: 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800&q=80&fit=crop', // Atlanta
  TN: 'https://images.unsplash.com/photo-1545419913-775e3e69e645?w=800&q=80&fit=crop', // Nashville
  OH: 'https://images.unsplash.com/photo-1505945485253-c2f7ca6a29c8?w=800&q=80&fit=crop', // Cleveland
  PA: 'https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?w=800&q=80&fit=crop', // Philadelphia
  MN: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80&fit=crop', // Minneapolis
  MI: 'https://images.unsplash.com/photo-1589135716736-c8c6d42fb7a8?w=800&q=80&fit=crop', // Detroit
  NC: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&q=80&fit=crop', // Charlotte
  NV: 'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=800&q=80&fit=crop', // Las Vegas
  HI: 'https://images.unsplash.com/photo-1507876466758-e54b27ba70e4?w=800&q=80&fit=crop', // Honolulu
  // Generic fallback
  default: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80&fit=crop',
}

// ── Well-known races → specific curated photos ────────────────────────────────
// Format: lowercase race name fragment → Unsplash photo ID
const KNOWN_RACE_PHOTOS = {
  // Abbott World Marathon Majors
  'boston marathon':          'https://images.unsplash.com/photo-1502224562085-639556652f33?w=800&q=80&fit=crop',
  'new york city marathon':   'https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=800&q=80&fit=crop',
  'nyc marathon':             'https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=800&q=80&fit=crop',
  'new york marathon':        'https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=800&q=80&fit=crop',
  'chicago marathon':         'https://images.unsplash.com/photo-1531979089509-3cfc60cb0f5b?w=800&q=80&fit=crop',
  'berlin marathon':          'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80&fit=crop',
  'london marathon':          'https://images.unsplash.com/photo-1530143584546-02191bc84eb5?w=800&q=80&fit=crop',
  'tokyo marathon':           'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80&fit=crop',

  // Popular US marathons
  'marine corps marathon':    'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80&fit=crop',
  'la marathon':              'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80&fit=crop',
  'los angeles marathon':     'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80&fit=crop',
  'austin marathon':          'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&q=80&fit=crop',
  'houston marathon':         'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&q=80&fit=crop',
  'denver marathon':          'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&q=80&fit=crop',
  'colorado marathon':        'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&q=80&fit=crop',
  'richmond marathon':        'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80&fit=crop',
  'baltimore running festival':'https://images.unsplash.com/photo-1601409870524-edc80a88f64a?w=800&q=80&fit=crop',
  'disney marathon':          'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80&fit=crop',

  // Popular halfs
  'cherry blossom':           'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80&fit=crop',
  'broad street run':         'https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?w=800&q=80&fit=crop',
  'united nyc half':          'https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=800&q=80&fit=crop',
  'nyc half':                 'https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=800&q=80&fit=crop',
  'new york half':            'https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=800&q=80&fit=crop',
  'austin half':              'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&q=80&fit=crop',
  'bay bridge run':           'https://images.unsplash.com/photo-1601409870524-edc80a88f64a?w=800&q=80&fit=crop',
  'peachtree road race':      'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800&q=80&fit=crop',
  'bolder boulder':           'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&q=80&fit=crop',

  // Triathlons
  'ironman world championship':'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80&fit=crop',
  'ironman kona':             'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80&fit=crop',
  'eagleman':                 'https://images.unsplash.com/photo-1601409870524-edc80a88f64a?w=800&q=80&fit=crop',
  'ironman 70.3 eagleman':    'https://images.unsplash.com/photo-1601409870524-edc80a88f64a?w=800&q=80&fit=crop',

  // Ultras
  'western states':           'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80&fit=crop',
  'leadville':                'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80&fit=crop',
}

// ── Ultra / trail pool ────────────────────────────────────────────────────────
const ULTRA_POOL = [
  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=80&fit=crop',
]

// ── Triathlon fallback pool ───────────────────────────────────────────────────
const TRI_POOL = [
  'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80&fit=crop',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

// Stable index from a string — same race always gets same photo from a pool
function stableIndex(str, poolLength) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % poolLength
}

function distanceToMiles(dist) {
  if (!dist) return null
  const d = dist.toLowerCase().replace(/\s/g, '')
  if (d === '5k')  return 3.1
  if (d === '8k')  return 4.9
  if (d === '10k') return 6.2
  if (d === '15k') return 9.3
  if (d.includes('10mi') || d === '10 mi') return 10
  if (d === '13.1' || d.includes('half')) return 13.1
  if (d === '26.2' || (d.includes('marathon') && !d.includes('half'))) return 26.2
  if (d === '70.3') return 70.3
  if (d === '140.6') return 140.6
  if (d.includes('50k')) return 31
  if (d.includes('50m') || d.includes('50mi')) return 50
  if (d.includes('100k')) return 62
  if (d.includes('100m') || d.includes('100mi')) return 100
  return null
}

function lookupKnownRace(name) {
  if (!name) return null
  const lower = name.toLowerCase().trim()
  for (const [key, url] of Object.entries(KNOWN_RACE_PHOTOS)) {
    if (lower.includes(key) || key.includes(lower)) return url
  }
  return null
}

function getSkylinePhoto(state) {
  return CITY_SKYLINES[state?.toUpperCase()] || CITY_SKYLINES.default
}

// ── Main export ───────────────────────────────────────────────────────────────
// Accepts either a string (distance) for legacy use, or a full race object
// { name, distance, city, state, id }
// Always synchronous — no API calls, instant return

export function getRacePhoto(raceOrDistance) {
  // Normalize input
  let name = '', distance = '', state = '', id = ''
  if (typeof raceOrDistance === 'string') {
    distance = raceOrDistance
    id = raceOrDistance
  } else {
    name     = raceOrDistance?.name     || ''
    distance = raceOrDistance?.distance || ''
    state    = raceOrDistance?.state    || ''
    id       = String(raceOrDistance?.id || name || distance)
  }

  const miles = distanceToMiles(distance)
  const d = distance.toLowerCase()

  // ── Triathlon ──────────────────────────────────────────────────────────────
  if (d.includes('70.3') || d.includes('140.6') || d.includes('tri') || d.includes('iron')) {
    const known = lookupKnownRace(name)
    if (known) return known
    const skyline = getSkylinePhoto(state)
    return skyline
  }

  // ── Ultra / trail ──────────────────────────────────────────────────────────
  if (miles && miles > 26.2) {
    const known = lookupKnownRace(name)
    if (known) return known
    return ULTRA_POOL[stableIndex(id, ULTRA_POOL.length)]
  }

  // ── Marathon (26.2) ────────────────────────────────────────────────────────
  if (miles === 26.2 || d === '26.2' || (d.includes('marathon') && !d.includes('half'))) {
    const known = lookupKnownRace(name)
    if (known) return known
    return getSkylinePhoto(state)
  }

  // ── Half marathon (13.1) ───────────────────────────────────────────────────
  if (miles === 13.1 || d === '13.1' || d.includes('half')) {
    const known = lookupKnownRace(name)
    if (known) return known
    return getSkylinePhoto(state)
  }

  // ── Short races (5K, 10K, 10mi, other) → curated local race pool ──────────
  return LOCAL_RACE_POOL[stableIndex(id, LOCAL_RACE_POOL.length)]
}

// Async wrapper — kept so any code using .then() still works without changes
export async function getRacePhotoAsync(race) {
  return getRacePhoto(race)
}
