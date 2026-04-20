// src/lib/useStrava.js
// Shared hook — handles token refresh, expiry checks, and API calls
// Usage: const { stravaData, connected, connectStrava, loading } = useStrava(profile)

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const API = '/api/strava'

async function getValidToken(profile, userId) {
  if (!profile?.strava_access_token) return null

  // Check if token is still valid (with 5 min buffer)
  const now = Math.floor(Date.now() / 1000)
  if (profile.strava_expires_at && profile.strava_expires_at > now + 300) {
    return profile.strava_access_token
  }

  // Token expired — refresh it
  try {
    const r    = await fetch(`${API}?action=refresh&refresh_token=${profile.strava_refresh_token}`)
    const data = await r.json()
    if (data.error) return null

    // Save refreshed token back to Supabase
    await supabase.from('profiles').update({
      strava_access_token: data.access_token,
      strava_refresh_token: data.refresh_token,
      strava_expires_at:   data.expires_at,
    }).eq('id', userId)

    return data.access_token
  } catch(e) {
    return null
  }
}

export function useStrava(profile, userId) {
  const [connected, setConnected]     = useState(false)
  const [token, setToken]             = useState(null)
  const [stats, setStats]             = useState(null)
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

      // Fetch athlete stats
      try {
        const r    = await fetch(`${API}?action=stats&access_token=${validToken}&athlete_id=${profile.strava_athlete_id}`)
        const data = await r.json()
        if (!data.error) setStats(data)
      } catch(e) {}

      setLoading(false)
    }
    init()
  }, [profile?.strava_access_token, profile?.strava_connected])

  const connectStrava = async (returnTo = '/home') => {
    sessionStorage.setItem('strava_return_to', returnTo)
    const r    = await fetch(`${API}?action=auth_url`)
    const data = await r.json()
    if (data.url) window.location.href = data.url
  }

  // Fetch activities (used by RaceImport for scan)
  const getActivities = async (options = {}) => {
    if (!token) return []
    const params = new URLSearchParams({ per_page: options.per_page || 60, page: options.page || 1 })
    if (options.after) params.set('after', options.after)
    try {
      const r    = await fetch(`${API}?action=activities&access_token=${token}&${params}`)
      const data = await r.json()
      return Array.isArray(data) ? data : []
    } catch(e) { return [] }
  }

  // Fetch single activity with polyline for map
  const getActivity = async (activityId) => {
    if (!token) return null
    try {
      const r    = await fetch(`${API}?action=activity&access_token=${token}&activity_id=${activityId}`)
      const data = await r.json()
      return data.error ? null : data
    } catch(e) { return null }
  }

  return { connected, token, stats, loading, connectStrava, getActivities, getActivity }
}

// Identify if a Strava activity looks like a race
// Races are typically: weekend, 4am–11am, distance matches common race distances
export function looksLikeRace(activity) {
  if (!activity) return false
  const type = (activity.type || activity.sport_type || '').toLowerCase()
  if (!['run','virtualrun','walk'].includes(type)) return false

  const date = new Date(activity.start_date_local)
  const hour  = date.getHours()
  const dow   = date.getDay() // 0=Sun, 6=Sat
  const distM = activity.distance || 0
  const distKm = distM / 1000
  const distMi = distM / 1609.34

  // Must be weekend or holiday-ish hour
  const isWeekend   = dow === 0 || dow === 6
  const isRaceHour  = hour >= 4 && hour <= 12

  // Must be a common race distance (within 5% tolerance)
  const RACE_DISTANCES_KM = [5, 10, 15, 21.0975, 42.195]
  const RACE_DISTANCES_MI = [3.1, 6.2, 9.3, 13.1, 26.2]

  const matchesDist = (target, actual, pct = 0.05) => Math.abs(actual - target) / target <= pct

  const isRaceDist =
    RACE_DISTANCES_KM.some(d => matchesDist(d, distKm)) ||
    RACE_DISTANCES_MI.some(d => matchesDist(d, distMi))

  // Name hints
  const name = (activity.name || '').toLowerCase()
  const nameHints = ['race','5k','10k','half','marathon','ironman','triathlon','trot','run','10 mile']
  const hasRaceName = nameHints.some(h => name.includes(h))

  return (isWeekend && isRaceHour && isRaceDist) || (isRaceDist && hasRaceName)
}

// Convert Strava stats to our STAT_ITEMS format
export function stravaStatsToItems(stats, raceStats) {
  if (!stats) return null
  const recent = stats.recent_run_totals || {}
  const all    = stats.all_run_totals    || {}
  const ytd    = stats.ytd_run_totals    || {}

  const mi = m => m ? `${Math.round(m / 1609.34)} mi` : '—'
  const formatTime = s => {
    if (!s) return '—'
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return [
    { label:'This Week',     value: mi(recent.distance) },
    { label:'This Year',     value: mi(ytd.distance) },
    { label:'Total Miles',   value: mi(all.distance) },
    { label:'Total Runs',    value: all.count ? `${all.count}` : '—' },
    ...(raceStats || []),
  ]
}
