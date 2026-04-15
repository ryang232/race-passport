// src/lib/photos.js
// ALL photos come from Supabase city_images (AI-generated).
// No Unsplash. No external URLs.
// Fallback = a placeholder navy gradient while the real image loads.

import { supabase } from './supabase'

// ── Helpers ───────────────────────────────────────────────────────────────
const WARM_STATES    = new Set(['FL','HI','TX','LA','SC','GA','AL','MS','PR'])
const COASTAL_STATES = new Set(['CA','OR','WA','ME','NH','MA','RI','CT','NY','NJ','DE','MD','VA','NC','SC','FL','HI'])

function getTriType(state) {
  const s = (state||'').toUpperCase()
  if (WARM_STATES.has(s))    return 'triathlon_tropical'
  if (COASTAL_STATES.has(s)) return 'triathlon_coastal'
  return 'triathlon_lake'
}

export function getRaceType(distance, state) {
  const d = (distance||'').toLowerCase()
  return (d.includes('70.3')||d.includes('140.6')||d.includes('tri')||d.includes('iron'))
    ? getTriType(state) : 'standard'
}

// ── In-memory cache ───────────────────────────────────────────────────────
const photoCache = new Map()

// ── Null placeholder — navy gradient data URI, no external requests ───────
// Shows while the real image loads — matches Race Passport brand colors
export const PHOTO_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="%231B2A4A"/><stop offset="100%25" stop-color="%23243659"/></linearGradient></defs><rect width="800" height="450" fill="url(%23g)"/></svg>'

// ── Main async loader — use with useState + useEffect ─────────────────────
// const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
// useEffect(() => { loadRacePhoto(race).then(setPhoto) }, [race.id])
export async function loadRacePhoto(race) {
  if (!race || typeof race === 'string') return PHOTO_PLACEHOLDER

  // RunSignup hero image — real race photo, highest priority
  if (race.hero_image) return race.hero_image

  const city     = (race.city || '').trim()
  const state    = (race.state || '').trim().toUpperCase()
  const distance = race.distance || ''

  if (!city || !state) return PHOTO_PLACEHOLDER

  const raceType = getRaceType(distance, state)
  const cacheKey = `${city.toLowerCase()}|${state}|${raceType}`

  // Return from cache immediately
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) || PHOTO_PLACEHOLDER
  }

  // Mark as in-flight
  photoCache.set(cacheKey, null)

  try {
    // Try exact match first
    let { data, error } = await supabase
      .from('city_images')
      .select('image_url')
      .eq('state', state)
      .eq('race_type', raceType)
      .ilike('city', city)
      .maybeSingle()

    // If no match, try standard type as fallback (e.g. city exists but not tri type)
    if ((error || !data?.image_url) && raceType !== 'standard') {
      const fallbackResult = await supabase
        .from('city_images')
        .select('image_url')
        .eq('state', state)
        .eq('race_type', 'standard')
        .ilike('city', city)
        .maybeSingle()
      if (!fallbackResult.error && fallbackResult.data?.image_url) {
        data = fallbackResult.data
        error = null
      }
    }

    // No state-level fallback — show placeholder rather than wrong city image

    if (data?.image_url) {
      photoCache.set(cacheKey, data.image_url)
      return data.image_url
    }
  } catch (e) {
    console.warn('Photo lookup failed:', e.message)
  }

  photoCache.set(cacheKey, null)
  return PHOTO_PLACEHOLDER
}

// ── Legacy sync export — returns placeholder, real image loads async ───────
export function getRacePhoto(race) {
  return PHOTO_PLACEHOLDER
}

// ── Cache buster ──────────────────────────────────────────────────────────
export function bustPhotoCache(city, state, raceType) {
  const key = `${(city||'').toLowerCase()}|${(state||'').toUpperCase()}|${raceType||'standard'}`
  photoCache.delete(key)
}
