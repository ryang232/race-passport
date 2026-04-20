// src/lib/colors.js
// Unified navy/gold color system — consistent with brand across all UI
//
// STAMP DESIGN SYSTEM:
//   Short distances (5K, 10K, 13.1, 15K, 8K, 10mi, 1mi):
//     White bg, navy border, navy dashed ring, navy text
//   Marathon+ (26.2, 70.3, 140.6, 50K, 50M, 100K, 100M, Ultra, Tri):
//     White bg, gold border, gold dashed ring, gold text
//
// mapColor retains distance-based colors for Leaflet map pins ONLY

export function getDistanceColor(dist) {
  const d = (dist || '').toLowerCase().replace(/\s/g, '')

  // Map pin colors — kept distinct for at-a-glance map differentiation
  let mapColor = '#1B2A4A'
  let label = dist || ''

  // Determine if this is a "marathon+" distance (gold stamps)
  const isMarathonPlus = (
    ['70.3','140.6','ironman'].some(t => d.includes(t)) ||
    ['tri','triathlon'].some(t => d.includes(t)) ||
    ['50k','50m','100k','100m','ultra'].some(t => d.includes(t)) ||
    d === '26.2' ||
    d.includes('marathon')
  )

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

  if (isMarathonPlus) {
    // Gold stamp variant (Marathon+)
    return {
      primary:       '#C9A84C',   // gold — stamp border, text, dashed ring
      stampBg:       '#fff',      // white background
      stampBorder:   '#C9A84C',   // gold border
      stampDash:     'rgba(201,168,76,0.45)', // gold dashed ring
      stampText:     '#C9A84C',   // gold text
      light:         'rgba(201,168,76,0.08)',
      dashed:        'rgba(201,168,76,0.45)',
      label,
      bg:            '#1B2A4A',
      mapColor,
      isMarathonPlus: true,
    }
  } else {
    // Navy stamp variant (short distances)
    return {
      primary:       '#1B2A4A',   // navy — stamp border, text, dashed ring
      stampBg:       '#fff',      // white background
      stampBorder:   '#1B2A4A',   // navy border
      stampDash:     'rgba(27,42,74,0.25)',   // navy dashed ring
      stampText:     '#1B2A4A',   // navy text
      light:         'rgba(201,168,76,0.08)',
      dashed:        'rgba(201,168,76,0.35)',
      label,
      bg:            '#1B2A4A',
      mapColor,
      isMarathonPlus: false,
    }
  }
}
