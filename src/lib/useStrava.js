// src/lib/useStrava.js
// Shared hook — handles token refresh, expiry checks, API calls, and stats
// Usage: const { connected, stats, connectStrava, ... } = useStrava(profile, userId)

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const API = '/api/strava'

// ── Token management ──────────────────────────────────────────────────────────
async function getValidToken(profile, userId) {
  if (!profile?.strava_access_token) return null

  const now = Math.floor(Date.now() / 1000)
  if (profile.strava_expires_at && profile.strava_expires_at > now + 300) {
    return profile.strava_access_token
  }

  // Token expired — refresh via API
  try {
    const r    = await fetch(`${API}?action=refresh&refresh_token=${encodeURIComponent(profile.strava_refresh_token)}`)
    const data = await r.json()
    if (data.error) return null

    // Save new tokens server-side (bypasses RLS)
    if (userId) {
      await fetch(`${API}?action=save_tokens&user_id=${userId}&access_token=${encodeURIComponent(data.access_token)}&refresh_token=${encodeURIComponent(data.refresh_token)}&expires_at=${data.expires_at}&athlete_id=${profile.strava_athlete_id || ''}`)
    }

    return data.access_token
  } catch(e) { return null }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useStrava(profile, userId) {
  const [connected, setConnected]     = useState(false)
  const [token, setToken]             = useState(null)
  const [stats, setStats]             = useState(null)
  const [monthMiles, setMonthMiles]   = useState(null)
  const [todayMiles, setTodayMiles]   = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!profile) { setLoading(false); return }

    const init = async () => {
      if (!profile.strava_connected || !profile.strava_access_token) {
        setConnected(false); setLoading(false); return
      }

      const validToken = await getValidToken(profile, userId)
      if (!validToken) { setConnected(false); setLoading(false); return }

      setConnected(true)
      setToken(validToken)

      // Fetch athlete stats (week/year/all totals)
      try {
        const r    = await fetch(`${API}?action=stats&access_token=${validToken}&athlete_id=${profile.strava_athlete_id}`)
        const data = await r.json()
        if (!data.error) setStats(data)
      } catch(e) {}

      // Fetch this month's + today's activities
      try {
        const now          = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const afterTs      = Math.floor(startOfMonth.getTime() / 1000)
        const r            = await fetch(`${API}?action=activities&access_token=${validToken}&per_page=60&after=${afterTs}`)
        const acts         = await r.json()

        if (Array.isArray(acts)) {
          const todayStr = now.toDateString()
          let mDist = 0, tDist = 0
          acts.forEach(a => {
            if (!['Run','VirtualRun','Walk','Hike'].includes(a.type || a.sport_type)) return
            mDist += a.distance || 0
            if (new Date(a.start_date_local).toDateString() === todayStr) tDist += a.distance || 0
          })
          setMonthMiles(mDist / 1609.34)
          if (tDist > 0) setTodayMiles(tDist / 1609.34)
        }
      } catch(e) {}

      setLoading(false)
    }

    init()
  }, [profile?.strava_access_token, profile?.strava_connected, profile?.strava_athlete_id])

  const connectStrava = async (returnTo = '/home') => {
    sessionStorage.setItem('strava_return_to', returnTo)
    try {
      const userIdParam = userId ? `&user_id=${userId}` : ''
      const r    = await fetch(`${API}?action=auth_url${userIdParam}`)
      const data = await r.json()
      if (data.url) window.location.href = data.url
    } catch(e) {}
  }

  const getActivities = async (options = {}) => {
    if (!token) return []
    const params = new URLSearchParams({ per_page: options.per_page || 60, page: options.page || 1 })
    if (options.after)  params.set('after',  options.after)
    if (options.before) params.set('before', options.before)
    try {
      const r    = await fetch(`${API}?action=activities&access_token=${token}&${params}`)
      const data = await r.json()
      return Array.isArray(data) ? data : []
    } catch(e) { return [] }
  }

  const getActivity = async (activityId) => {
    if (!token) return null
    try {
      const r    = await fetch(`${API}?action=activity&access_token=${token}&activity_id=${activityId}`)
      const data = await r.json()
      return data.error ? null : data
    } catch(e) { return null }
  }

  return { connected, token, stats, monthMiles, todayMiles, loading, connectStrava, getActivities, getActivity }
}

// ── Race-like activity detection ─────────────────────────────────────────────
export function looksLikeRace(activity) {
  if (!activity) return false
  const type = (activity.type || activity.sport_type || '').toLowerCase()
  if (!['run','virtualrun','walk'].includes(type)) return false
  const date    = new Date(activity.start_date_local)
  const hour    = date.getHours()
  const dow     = date.getDay()
  const distKm  = (activity.distance || 0) / 1000
  const distMi  = (activity.distance || 0) / 1609.34
  const isWeekend   = dow === 0 || dow === 6
  const isRaceHour  = hour >= 4 && hour <= 12
  const near        = (t, a, pct=0.05) => Math.abs(a-t)/t <= pct
  const isRaceDist  = [5,10,15,21.0975,42.195].some(d => near(d,distKm)) || [3.1,6.2,9.3,13.1,26.2].some(d => near(d,distMi))
  const name        = (activity.name || '').toLowerCase()
  const hasRaceName = ['race','5k','10k','half','marathon','ironman','triathlon','trot','10 mile'].some(h => name.includes(h))
  return (isWeekend && isRaceHour && isRaceDist) || (isRaceDist && hasRaceName)
}

// ── Build ticker items ────────────────────────────────────────────────────────
export function stravaStatsToItems(stats, monthMiles, todayMiles, raceStats) {
  if (!stats) return raceStats || []

  const recent = stats.recent_run_totals || {}
  const all    = stats.all_run_totals    || {}
  const ytd    = stats.ytd_run_totals    || {}

  const mi  = m  => (m && m > 0) ? `${Math.round(m / 1609.34)} mi` : '—'
  const miF = m  => (m && m > 0) ? `${m.toFixed(1)} mi` : '—'
  const fmtPace = (secs, meters) => {
    if (!secs || !meters) return '—'
    const secPerMi = secs / (meters / 1609.34)
    const mm = Math.floor(secPerMi / 60), ss = Math.round(secPerMi % 60)
    return `${mm}:${String(ss).padStart(2,'0')}/mi`
  }

  const items = []
  if (todayMiles && todayMiles > 0)   items.push({ label:"Today's Miles",    value: miF(todayMiles) })
  if (recent.distance)                items.push({ label:'Miles This Week',   value: mi(recent.distance) })
  if (monthMiles && monthMiles > 0)   items.push({ label:'Miles This Month',  value: miF(monthMiles) })
  if (ytd.distance)                   items.push({ label:'Miles This Year',   value: mi(ytd.distance) })
  if (all.distance)                   items.push({ label:'Total Miles',       value: mi(all.distance) })
  if (all.count)                      items.push({ label:'Total Runs',        value: `${all.count}` })
  if (recent.moving_time && recent.distance) items.push({ label:'Recent Avg Pace', value: fmtPace(recent.moving_time, recent.distance) })
  if (all.elevation_gain)             items.push({ label:'Total Elevation',   value: `${Math.round(all.elevation_gain * 3.281).toLocaleString()}ft` })

  return [...items, ...(raceStats || [])]
}
