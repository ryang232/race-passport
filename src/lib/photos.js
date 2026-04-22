// src/lib/photos.js
// Photo priority:
//   1. race.logo_url  — RunSignup race logo (medal art, race branding)
//   2. city_images    — Supabase city scene photo fallback
//   3. PHOTO_PLACEHOLDER — navy gradient while loading

import { supabase } from './supabase'

const photoCache = new Map()

export const PHOTO_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="%231B2A4A"/><stop offset="100%25" stop-color="%23243659"/></linearGradient></defs><rect width="800" height="450" fill="url(%23g)"/></svg>'

function parseCityState(race) {
  if (race.city && race.state) return { city: race.city.trim(), state: race.state.trim().toUpperCase() }
  const loc = race.location || ''
  const parts = loc.split(',').map(s => s.trim())
  if (parts.length >= 2) return { city: parts[0], state: parts[parts.length - 1].toUpperCase().slice(0, 2) }
  return { city: '', state: '' }
}

// Returns whether this race has a logo to display
export function hasLogo(race) {
  return !!(race?.logo_url || race?.hero_image)
}

// Returns the logo URL directly (synchronous)
export function getLogoUrl(race) {
  return race?.logo_url || race?.hero_image || null
}

// Main async loader — returns photo URL string
// Callers should check hasLogo(race) to know whether to style as logo vs photo
export async function loadRacePhoto(race) {
  if (!race || typeof race === 'string') return PHOTO_PLACEHOLDER

  // Priority 1: RunSignup logo (medal art / race branding)
  const logo = race.logo_url || race.hero_image
  if (logo) return logo

  // Priority 2: City image from Supabase
  const { city, state } = parseCityState(race)
  if (!city || !state) return PHOTO_PLACEHOLDER

  const cacheKey = `${city.toLowerCase()}|${state}`
  if (photoCache.has(cacheKey)) return photoCache.get(cacheKey) || PHOTO_PLACEHOLDER

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

export function getRacePhoto() { return PHOTO_PLACEHOLDER }

export function bustPhotoCache(city, state) {
  photoCache.delete(`${(city||'').toLowerCase()}|${(state||'').toUpperCase()}`)
}
