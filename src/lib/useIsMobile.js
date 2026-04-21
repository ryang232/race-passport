// src/lib/useIsMobile.js
// Returns true when viewport width < 768px
// Use to conditionally adjust layout, padding, font sizes on mobile

import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', check)
    check() // run on mount
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}
