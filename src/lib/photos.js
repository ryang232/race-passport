// src/lib/photos.js
// Static distance-based race photos — no API calls, instant loads
// Using permanent Unsplash CDN URLs (no rate limits, no auth needed)

const DISTANCE_PHOTOS = {
  '5K':    'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=640&q=75&auto=format',
  '10K':   'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=640&q=75&auto=format',
  '10 mi': 'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=640&q=75&auto=format',
  '13.1':  'https://images.unsplash.com/photo-1530143584546-02191bc84eb5?w=640&q=75&auto=format',
  '26.2':  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=640&q=75&auto=format',
  '70.3':  'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=640&q=75&auto=format',
  '140.6': 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=640&q=75&auto=format',
  '50K':   'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=640&q=75&auto=format',
  '50M':   'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=640&q=75&auto=format',
  '100K':  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=640&q=75&auto=format',
  '100M':  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=640&q=75&auto=format',
  'Tri':   'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=640&q=75&auto=format',
  default: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=640&q=75&auto=format',
}

export function getRacePhoto(distance) {
  if (!distance) return DISTANCE_PHOTOS.default
  const d = distance.trim()
  if (DISTANCE_PHOTOS[d]) return DISTANCE_PHOTOS[d]
  const lower = d.toLowerCase()
  if (lower.includes('marathon') && !lower.includes('half')) return DISTANCE_PHOTOS['26.2']
  if (lower.includes('half') || lower.includes('13.1')) return DISTANCE_PHOTOS['13.1']
  if (lower.includes('10k')) return DISTANCE_PHOTOS['10K']
  if (lower.includes('5k')) return DISTANCE_PHOTOS['5K']
  if (lower.includes('tri') || lower.includes('iron')) return DISTANCE_PHOTOS['70.3']
  if (lower.includes('trail') || lower.includes('ultra') || lower.includes('50') || lower.includes('100')) return DISTANCE_PHOTOS['50K']
  return DISTANCE_PHOTOS.default
}
