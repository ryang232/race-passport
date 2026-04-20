// Unsplash API photo fetcher
// Requires VITE_UNSPLASH_ACCESS_KEY in .env / Vercel environment variables

const FALLBACKS = {
  marathon:  'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80&fit=crop',
  triathlon: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80&fit=crop',
  cherry:    'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80&fit=crop',
  running:   'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80&fit=crop',
}

const cache = new Map()

export async function fetchUnsplashPhoto(query, fallbackType = 'running') {
  if (cache.has(query)) return cache.get(query)

  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    console.warn('VITE_UNSPLASH_ACCESS_KEY not set — using fallback photo')
    return FALLBACKS[fallbackType] || FALLBACKS.running
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` }
    })
    if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`)
    const data = await res.json()
    // Pick a random result from top 5 for variety
    const results = data?.results || []
    if (results.length === 0) throw new Error('No results')
    const pick = results[Math.floor(Math.random() * Math.min(results.length, 3))]
    const photoUrl = pick.urls.regular
    cache.set(query, photoUrl)
    return photoUrl
  } catch (e) {
    console.warn('Unsplash fetch failed:', e.message)
    const fallback = FALLBACKS[fallbackType] || FALLBACKS.running
    cache.set(query, fallback)
    return fallback
  }
}

export function getFallback(type) {
  return FALLBACKS[type] || FALLBACKS.running
}
