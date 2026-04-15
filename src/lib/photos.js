// src/lib/photos.js
// Photo lookup — checks city_images table (AI-generated) first,
// falls back to curated Unsplash pool if not yet generated.

import { supabase } from './supabase'

// ── In-memory cache — city+state+type → url ───────────────────────────────
const photoCache = new Map()

// ── Region / type helpers ─────────────────────────────────────────────────
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
  const isTri = d.includes('70.3') || d.includes('140.6') || d.includes('tri') || d.includes('iron')
  return isTri ? getTriType(state) : 'standard'
}

// ── Curated fallback pool (used while AI images are being generated) ───────
// Old-format Unsplash IDs that reliably resolve
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

function getFallback(distance, id) {
  const d = (distance||'').toLowerCase()
  const isTri = d.includes('70.3') || d.includes('140.6') || d.includes('tri') || d.includes('iron')
  const pool  = isTri ? FALLBACK_TRI : FALLBACK_RUNNING
  return pool[stableIndex(String(id||''), pool.length)]
}

// ── Main export ───────────────────────────────────────────────────────────
// Accepts a race object: { id, name, city, state, distance, hero_image }
// Returns a URL string synchronously (fallback) while async lookup runs in bg
export function getRacePhoto(raceOrDistance) {
  // Legacy: string distance passed directly
  if (typeof raceOrDistance === 'string') {
    return FALLBACK_RUNNING[stableIndex(raceOrDistance, FALLBACK_RUNNING.length)]
  }

  const { id, city, state, distance, hero_image } = raceOrDistance || {}

  // 1. RunSignup hero image (highest priority — real race photo)
  if (hero_image) return hero_image

  // 2. Check in-memory cache
  const raceType  = getRaceType(distance, state)
  const cacheKey  = `${(city||'').toLowerCase()}|${(state||'').toUpperCase()}|${raceType}`
  if (photoCache.has(cacheKey)) return photoCache.get(cacheKey)

  // 3. Kick off async Supabase lookup — updates cache for next render
  if (city && state) {
    lookupCityImage(city, state, raceType, cacheKey)
  }

  // 4. Return fallback immediately while async lookup runs
  return getFallback(distance, id || city)
}

// Async lookup — fires in background, populates cache
async function lookupCityImage(city, state, raceType, cacheKey) {
  // Avoid duplicate in-flight requests
  if (photoCache.has(cacheKey)) return
  photoCache.set(cacheKey, null) // mark as in-flight

  try {
    const { data, error } = await supabase
      .from('city_images')
      .select('image_url')
      .ilike('city', city)
      .eq('state', state.toUpperCase())
      .eq('race_type', raceType)
      .single()

    if (!error && data?.image_url) {
      photoCache.set(cacheKey, data.image_url)
    } else {
      photoCache.delete(cacheKey) // allow retry next time
    }
  } catch {
    photoCache.delete(cacheKey)
  }
}

// Force-refresh a specific city (call after generation completes)
export function bustPhotoCache(city, state, raceType) {
  const key = `${(city||'').toLowerCase()}|${(state||'').toUpperCase()}|${raceType||'standard'}`
  photoCache.delete(key)
}
