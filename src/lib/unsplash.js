// Unsplash photo fetcher — searches by keyword, returns best result URL
// Falls back to hardcoded running photos if API fails

const FALLBACKS = {
  marathon:  'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=80&fit=crop',
  triathlon: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80&fit=crop',
  running:   'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80&fit=crop',
  race:      'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80&fit=crop',
}

const cache = {}

export async function fetchUnsplashPhoto(query, fallbackType = 'running') {
  const key = query.toLowerCase().trim()
  if (cache[key]) return cache[key]

  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!accessKey) return FALLBACKS[fallbackType] || FALLBACKS.running

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    )
    const data = await res.json()
    const url = data?.results?.[0]?.urls?.regular
    if (url) {
      cache[key] = url
      return url
    }
  } catch (e) {}

  return FALLBACKS[fallbackType] || FALLBACKS.running
}

export function getFallback(type) {
  return FALLBACKS[type] || FALLBACKS.running
}
