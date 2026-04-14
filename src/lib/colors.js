// src/lib/colors.js
// Unified navy/gold color system — consistent with brand across all UI
// mapColor retains distance-based colors for map pin differentiation only

export function getDistanceColor(dist) {
  const d = (dist || '').toLowerCase().replace(/\s/g, '')

  // Map pin colors — kept distinct for at-a-glance map differentiation
  let mapColor = '#1B2A4A' // default navy
  let label = dist || ''

  if (['70.3','140.6','tri','triathlon','ironman'].some(t => d.includes(t))) {
    mapColor = '#B83232'
    label = 'Triathlon'
  } else if (['50k','50m','100k','100m','ultra'].some(t => d.includes(t))) {
    mapColor = '#9C7C4A'
    label = 'Ultra'
  } else if (d === '26.2' || d.includes('marathon')) {
    mapColor = '#C9A84C'
    label = 'Marathon'
  } else if (['5k','10k','13.1','15k','8k','10mi','1mi'].some(t => d.includes(t))) {
    mapColor = '#1E5FA8'
    label = dist || ''
  }

  // Everything else uses navy/gold — stamps, cards, detail pages
  return {
    primary:  '#1B2A4A',          // navy — borders, text, stamp ring
    light:    'rgba(201,168,76,0.08)', // gold tint background
    dashed:   'rgba(201,168,76,0.35)', // gold dashed inner ring
    label,
    bg:       '#1B2A4A',
    mapColor,                     // distance-specific — map pins only
  }
}
