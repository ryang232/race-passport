// src/lib/colors.js
// Distance color system — used across all race UI components

export function getDistanceColor(dist) {
  const d = (dist || '').toLowerCase().replace(/\s/g, '')

  // Triathlon — Red
  if (['70.3', '140.6', 'tri', 'triathlon', 'ironman'].some(t => d.includes(t))) {
    return {
      primary:  '#B83232',
      light:    'rgba(184,50,50,0.09)',
      dashed:   'rgba(184,50,50,0.3)',
      label:    'Triathlon',
      bg:       '#B83232',
    }
  }

  // Ultra — Tan/Sand
  if (['50k','50m','100k','100m','ultra'].some(t => d.includes(t))) {
    return {
      primary:  '#9C7C4A',
      light:    'rgba(156,124,74,0.09)',
      dashed:   'rgba(156,124,74,0.3)',
      label:    'Ultra',
      bg:       '#9C7C4A',
    }
  }

  // Marathon 26.2 — Gold (matches app brand)
  if (d === '26.2' || d === 'marathon') {
    return {
      primary:  '#C9A84C',
      light:    'rgba(201,168,76,0.08)',
      dashed:   'rgba(201,168,76,0.3)',
      label:    'Marathon',
      bg:       '#C9A84C',
    }
  }

  // Short distances (5K, 10K, 13.1, 10mi etc.) — Blue
  return {
    primary:  '#1E5FA8',
    light:    'rgba(30,95,168,0.08)',
    dashed:   'rgba(30,95,168,0.3)',
    label:    dist,
    bg:       '#1E5FA8',
  }
}
