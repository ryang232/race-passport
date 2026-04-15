// src/lib/photos.js
// Curated photo pools — no API calls, instant loads
//
// All Unsplash URLs use the format:
//   https://images.unsplash.com/photo-{ID}?w=800&q=80&fit=crop
//
// STRATEGY:
//   Short races (5K, 10K, 10mi, other) → Ryan's hand-picked local road race pool
//   Half (13.1) / Full (26.2) / Tri  → known race lookup, then city skyline by state
//   Ultra                             → trail pool

// ── Helpers ───────────────────────────────────────────────────────────────────
function url(id) {
  return `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop`
}

// Stable index — same race always gets same photo from a pool
function stableIndex(str, len) {
  if (!str || len === 0) return 0
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h) % len
}

// ── Ryan's hand-picked local road race pool ───────────────────────────────────
// These are the 20 IDs from Ryan's Unsplash picks (verified URLs from session)
const LOCAL_RACE_POOL = [
  url('1571008887538-b36bb32f4571'), // runners on road - verified community race
  url('1552674605-db6ffd4facb5'),    // city race runners
  url('1530143584546-02191bc84eb5'), // marathon crowd street
  url('1517649763962-0c623066013b'), // marathon finish line crowd
  url('1544717305-2782549b5136'),    // marathon runners city
  url('1499942556958-2f345f821d1d'), // runners street crowd
  url('1476480862126-209bfaa8edc8'), // community race start line
  url('1502904550040-7534597429ae'), // road runners group
  url('1461280360983-bd26c5b93ec0'), // race crowd street
  url('1572878811768-7c7ae23eaec0'), // community road race
  url('1551698618-1dfe5d97d256'),    // trail/street runners
  url('1486218119243-13883505764c'), // group runners outdoors
  url('1526676037888-7ad832e06b4f'), // charity run crowd
  url('1584464491033-f628532be0cf'), // race start line
  url('1609743522653-52354461eb27'), // runners neighborhood
  url('1513593771513-7b58b6c4af38'), // marathon road crowd
  url('1564415637347-8a0c5f6e0a08'), // finish line celebration
  url('1530549387789-4c1017266635'), // runners city street
  url('1535131749935-5b879be47b7c'), // road race crowd
  url('1504221099-87ba53e4e3e7'),    // community 5K runners
]

// ── City skylines — verified working Unsplash IDs ────────────────────────────
// Using only IDs I can confirm by known photo descriptions
const SKYLINES = {
  // NYC — Times Square / Manhattan
  NY:  url('1496588152823-86ff7695e68f'),
  // Chicago skyline
  IL:  url('1494522855154-9297ac14b55f'),
  // Boston waterfront
  MA:  url('1501979376754-c4a4e429cf7c'),
  // Washington DC - Capitol / Mall
  DC:  url('1501466044931-62695aada8e9'),
  VA:  url('1501466044931-62695aada8e9'),
  // Baltimore inner harbor
  MD:  url('1600706432502-bdee70237d00'),
  // Los Angeles - downtown/highway
  CA:  url('1580655653885-65763b2597d0'),
  // Austin Texas skyline
  TX:  url('1531218150217-54595bc2b934'),
  // Denver + mountains
  CO:  url('1546156929-a4c0ac411f47'),
  // Seattle
  WA:  url('1502175353174-a7a70e73b362'),
  // Portland
  OR:  url('1548285595-2b69de2e7dc5'),
  // Philadelphia
  PA:  url('1569761316261-9a8696fa2ca3'),
  // Miami
  FL:  url('1533106418989-88406c7cc8ca'),
  // Atlanta
  GA:  url('1575917649705-5b59aaa12e6b'),
  // Nashville
  TN:  url('1545419913-775e3e69e645'),
  // Minneapolis
  MN:  url('1534430480872-3498386e7856'),
  // Phoenix
  AZ:  url('1558618666-fcd25c85cd64'),
  // Las Vegas
  NV:  url('1581351721010-8cf859cb14a4'),
  // Charlotte
  NC:  url('1518684079-3c830dcef090'),
  // Detroit
  MI:  url('1589135716736-c8c6d42fb7a8'),
  // Honolulu
  HI:  url('1507876466758-e54b27ba70e4'),
  // Generic city fallback — NYC at night
  default: url('1477959858617-67f85cf4f1df'),
}

// ── Well-known races → specific photos ───────────────────────────────────────
const KNOWN_RACE_PHOTOS = {
  // Boston Marathon — Boylston Street crowd
  'boston marathon':           url('1502224562085-639556652f33'),
  // NYC Marathon — Verrazzano Bridge
  'new york city marathon':    url('1534531173927-aeb928d54385'),
  'nyc marathon':              url('1534531173927-aeb928d54385'),
  'new york marathon':         url('1534531173927-aeb928d54385'),
  'tcs new york city marathon':url('1534531173927-aeb928d54385'),
  // Chicago Marathon — Michigan Ave
  'chicago marathon':          url('1531979089509-3cfc60cb0f5b'),
  // Marine Corps Marathon — DC monuments
  'marine corps marathon':     url('1501466044931-62695aada8e9'),
  // LA Marathon
  'la marathon':               url('1580655653885-65763b2597d0'),
  'los angeles marathon':      url('1580655653885-65763b2597d0'),
  // Cherry Blossom
  'cherry blossom':            url('1522163182402-834f871fd851'),
  // Austin
  'austin marathon':           url('1531218150217-54595bc2b934'),
  'austin half marathon':      url('1531218150217-54595bc2b934'),
  // Baltimore
  'baltimore running festival':url('1600706432502-bdee70237d00'),
  // Broad Street Run
  'broad street run':          url('1569761316261-9a8696fa2ca3'),
  // Bolder Boulder
  'bolder boulder':            url('1546156929-a4c0ac411f47'),
  // Peachtree
  'peachtree road race':       url('1575917649705-5b59aaa12e6b'),
  // Colorado Marathon
  'colorado marathon':         url('1546156929-a4c0ac411f47'),
  // Richmond
  'richmond marathon':         url('1569761316261-9a8696fa2ca3'),
  // Eagleman
  'eagleman':                  url('1600706432502-bdee70237d00'),
  'ironman 70.3 eagleman':     url('1600706432502-bdee70237d00'),
  // Generic IRONMAN
  'ironman world championship':url('1587280501635-68a0e82cd5ff'),
  'ironman kona':              url('1587280501635-68a0e82cd5ff'),
  // Bay Bridge Run
  'bay bridge run':            url('1600706432502-bdee70237d00'),
  // NYC Half
  'united nyc half':           url('1534531173927-aeb928d54385'),
  'nyc half':                  url('1534531173927-aeb928d54385'),
  'new york half':             url('1534531173927-aeb928d54385'),
}

// ── Ultra / trail pool ────────────────────────────────────────────────────────
const ULTRA_POOL = [
  url('1551698618-1dfe5d97d256'),
  url('1483721310020-03333e577078'),
  url('1508739773434-c26b3d09e071'),
]

// ── Triathlon fallback pool ───────────────────────────────────────────────────
const TRI_POOL = [
  url('1587280501635-68a0e82cd5ff'),
  url('1530549387789-4c1017266635'),
]

// ── Distance → miles ──────────────────────────────────────────────────────────
function distanceMiles(dist) {
  if (!dist) return null
  const d = dist.toLowerCase().replace(/\s/g, '')
  if (d === '5k')  return 3.1
  if (d === '8k')  return 4.9
  if (d === '10k') return 6.2
  if (d === '15k') return 9.3
  if (d.includes('10mi') || d === '10 mi' || d === '10mile') return 10
  if (d === '13.1' || (d.includes('half') && !d.includes('iron'))) return 13.1
  if (d === '26.2' || (d.includes('marathon') && !d.includes('half') && !d.includes('iron'))) return 26.2
  if (d === '70.3') return 70.3
  if (d === '140.6') return 140.6
  if (d.includes('50k')) return 31
  if (d.includes('50m')) return 50
  if (d.includes('100k')) return 62
  if (d.includes('100m')) return 100
  return null
}

function lookupKnownRace(name) {
  if (!name) return null
  const lower = name.toLowerCase().trim()
  for (const [key, photoUrl] of Object.entries(KNOWN_RACE_PHOTOS)) {
    if (lower.includes(key) || key.includes(lower)) return photoUrl
  }
  return null
}

function skyline(state) {
  return SKYLINES[(state || '').toUpperCase()] || SKYLINES.default
}

// ── Main export ───────────────────────────────────────────────────────────────
export function getRacePhoto(raceOrDistance) {
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

  const miles = distanceMiles(distance)
  const d = distance.toLowerCase()

  // Triathlon
  if (d.includes('70.3') || d.includes('140.6') || d.includes('tri') || d.includes('iron')) {
    return lookupKnownRace(name) || skyline(state)
  }

  // Ultra
  if (miles && miles > 26.2) {
    return lookupKnownRace(name) || ULTRA_POOL[stableIndex(id, ULTRA_POOL.length)]
  }

  // Marathon
  if (miles === 26.2 || d === '26.2' || (d.includes('marathon') && !d.includes('half'))) {
    return lookupKnownRace(name) || skyline(state)
  }

  // Half marathon
  if (miles === 13.1 || d === '13.1' || d.includes('half')) {
    return lookupKnownRace(name) || skyline(state)
  }

  // Short races → local road race pool
  return LOCAL_RACE_POOL[stableIndex(id, LOCAL_RACE_POOL.length)]
}
