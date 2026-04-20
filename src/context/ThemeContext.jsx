// src/context/ThemeContext.jsx
// Dark / light mode — reads from localStorage, applies data-theme to <html>
// Usage: const { theme, toggleTheme, t } = useTheme()
// t.bg, t.surface, t.text, t.textMuted, t.border, t.navy, t.gold, t.navBg

import { createContext, useContext, useState, useEffect } from 'react'

const LIGHT = {
  bg:          '#f4f5f7',
  surface:     '#ffffff',
  surfaceAlt:  '#f8f9fb',
  text:        '#1B2A4A',
  textMuted:   '#9aa5b4',
  textSubtle:  '#6b7280',
  border:      '#e2e6ed',
  borderLight: '#f0f2f5',
  navy:        '#1B2A4A',
  navyLight:   '#2a3f6a',
  gold:        '#C9A84C',
  navBg:       'rgba(255,255,255,0.96)',
  navBorder:   '#e8eaed',
  navShadow:   '0 1px 8px rgba(27,42,74,0.06)',
  greetingBg:  'rgba(255,255,255,0.88)',
  cardShadow:  '0 2px 12px rgba(27,42,74,0.08)',
  cardShadowHover: '0 12px 32px rgba(27,42,74,0.18)',
  stampBgLocal: '#ffffff',
  inputBg:     '#f4f5f7',
  pillActive:  '#1B2A4A',
  isDark:      false,
}

const DARK = {
  bg:          '#0f1520',
  surface:     '#1a2235',
  surfaceAlt:  '#151d2e',
  text:        '#e8edf5',
  textMuted:   '#6b7a94',
  textSubtle:  '#8899b0',
  border:      '#2a3550',
  borderLight: '#1e2d44',
  navy:        '#1B2A4A',
  navyLight:   '#2a3f6a',
  gold:        '#C9A84C',
  navBg:       'rgba(15,21,32,0.96)',
  navBorder:   '#1e2d44',
  navShadow:   '0 1px 8px rgba(0,0,0,0.3)',
  greetingBg:  'rgba(15,21,32,0.95)',
  cardShadow:  '0 2px 12px rgba(0,0,0,0.3)',
  cardShadowHover: '0 12px 32px rgba(0,0,0,0.5)',
  stampBgLocal: '#1a2235',
  inputBg:     '#0f1520',
  pillActive:  '#C9A84C',
  isDark:      true,
}

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('rp-theme') || 'light' } catch { return 'light' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('rp-theme', theme) } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')
  const t = theme === 'dark' ? DARK : LIGHT

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, t, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
