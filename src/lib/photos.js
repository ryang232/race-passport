// src/lib/photos.js
// Photo lookup — checks city_images table (AI-generated) first,
// falls back to curated pool if not found.
//
// Usage in React components:
//   const [photo, setPhoto] = useState(getFallbackPhoto(race))
//   useEffect(() => { loadRacePhoto(race).then(setPhoto) }, [race.id])

import { supabase } from './supabase'

const WARM_STATES    = new Set(['FL','HI','TX','LA','SC','GA','AL','MS','PR'])
const COASTAL_STATES = new Set(['CA','OR','WA','ME','NH','MA','RI','CT','NY','NJ','DE','MD','VA','NC','SC','FL','HI'])

function getTriType(state) {
  const s = (state||'').toUpperCase()
  if (WARM_STATES.has(s))    return 'triathlon_tropical'
  if (COASTAL_STATES.has(s)) return 'triathlon_coastal'
  return 'triathlon_lake'
}

function getRaceType(distance, state) {
  const d = (distance||'').toLowerCase()
  return (d.includes('70.3')||d.includes('140.6')||d.includes('tri')||d.includes('iron'))
    ? getTriType(state) : 'standard'
}

// ── Curated fallback pool ─────────────────────────────────────────────────
const FALLBACK_RUNNING = [
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1530143584546-02191bc84eb5?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1461280360983-bd26c5b93ec0?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80&fit=crop',
]
const FALLBACK_TRI = [
  'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80&fit=crop',
  'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80&fit=crop',
]

function stableIndex(str, len) {
  if (!str || len === 0) return 0
  let h = 0
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0
  return Math.abs(h) % len
}

export function getFallbackPhoto(race) {
  if (typeof race === 'string') {
    return FALLBACK_RUNNING[stableIndex(race, FALLBACK_RUNNING.length)]
  }
  const { id, distance, city } = race || {}
  if (race?.hero_image) return race.hero_image
  const d = (distance||'').toLowerCase()
  const isTri = d.includes('70.3')||d.includes('140.6')||d.includes('tri')||d.includes('iron')
  const pool = isTri ? FALLBACK_TRI : FALLBACK_RUNNING
  return pool[stableIndex(String(id||city||distance||''), pool.length)]
}

// ── In-memory cache ───────────────────────────────────────────────────────
const photoCache = new Map()

// ── Async loader — use with useState + useEffect in cards ─────────────────
export async function loadRacePhoto(race) {
  if (!race) return getFallbackPhoto(race)

  // 1. RunSignup hero image
  if (race.hero_image) return race.hero_image

  // 2. String distance fallback
  if (typeof race === 'string') return getFallbackPhoto(race)

  const { city, state, distance } = race
  if (!city || !state) return getFallbackPhoto(race)

  const raceType = getRaceType(distance, state)
  const cacheKey = `${city.toLowerCase()}|${state.toUpperCase()}|${raceType}`

  // 3. Check cache
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) || getFallbackPhoto(race)
  }

  // 4. Query Supabase city_images
  try {
    const { data, error } = await supabase
      .from('city_images')
      .select('image_url')
      .ilike('city', city.trim())
      .eq('state', state.toUpperCase())
      .eq('race_type', raceType)
      .single()

    if (!error && data?.image_url) {
      photoCache.set(cacheKey, data.image_url)
      return data.image_url
    }
  } catch {}

  // 5. Fallback
  photoCache.set(cacheKey, null)
  return getFallbackPhoto(race)
}

// ── Legacy sync export (used by pages not yet updated) ────────────────────
export function getRacePhoto(race) {
  return getFallbackPhoto(race)
}

// ── Cache buster ──────────────────────────────────────────────────────────
export function bustPhotoCache(city, state, raceType) {
  const key = `${(city||'').toLowerCase()}|${(state||'').toUpperCase()}|${raceType||'standard'}`
  photoCache.delete(key)
}
