// src/lib/photos.js
// ALL photos come from Supabase city_images (AI-generated skylines + landmarks).
// One image per city, always race_type = 'standard'.
// Fallback = navy gradient placeholder while real image loads.

import { supabase } from './supabase'

// ── In-memory cache ───────────────────────────────────────────────────────
const photoCache = new Map()

// ── Navy gradient placeholder — shows while real image loads ─────────────
export const PHOTO_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="%231B2A4A"/><stop offset="100%25" stop-color="%23243659"/></linearGradient></defs><rect width="800" height="450" fill="url(%23g)"/></svg>'

// ── Parse city/state from "City, ST" location string ─────────────────────
function parseCityState(race) {
  if (race.city && race.state) return { city: race.city.trim(), state: race.state.trim().toUpperCase() }
  const loc = race.location || ''
  const parts = loc.split(',').map(s => s.trim())
  if (parts.length >= 2) return { city: parts[0], state: parts[parts.length - 1].toUpperCase().slice(0, 2) }
  return { city: '', state: '' }
}

// ── Main async loader ─────────────────────────────────────────────────────
// Usage:
//   const [photo, setPhoto] = useState(PHOTO_PLACEHOLDER)
//   useEffect(() => { loadRacePhoto(race).then(setPhoto) }, [race.id, race.city, race.state])
export async function loadRacePhoto(race) {
  if (!race || typeof race === 'string') return PHOTO_PLACEHOLDER

  // RunSignup hero image — real race photo, highest priority
  if (race.hero_image) return race.hero_image

  const { city, state } = parseCityState(race)
  if (!city || !state) return PHOTO_PLACEHOLDER

  const cacheKey = `${city.toLowerCase()}|${state}`

  // Return cached result immediately
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) || PHOTO_PLACEHOLDER
  }

  // Mark as in-flight to prevent duplicate queries
  photoCache.set(cacheKey, null)

  try {
    const { data, error } = await supabase
      .from('city_images')
      .select('image_url')
      .eq('state', state)
      .eq('race_type', 'standard')
      .ilike('city', city)
      .maybeSingle()

    if (!error && data?.image_url) {
      photoCache.set(cacheKey, data.image_url)
      return data.image_url
    }
  } catch (e) {
    console.warn('Photo lookup failed:', e.message)
  }

  photoCache.set(cacheKey, null)
  return PHOTO_PLACEHOLDER
}

// ── Legacy sync export — returns placeholder ──────────────────────────────
export function getRacePhoto() {
  return PHOTO_PLACEHOLDER
}

// ── Cache buster ──────────────────────────────────────────────────────────
export function bustPhotoCache(city, state) {
  photoCache.delete(`${(city||'').toLowerCase()}|${(state||'').toUpperCase()}`)
}
