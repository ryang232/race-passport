import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'

// ── Gate: only Ryan's account can access this page ────────────────────────────
// Replace this with your actual Supabase user ID from:
// Supabase → Authentication → Users → copy the UUID next to your email
const ALLOWED_USER_ID = 'd4055232-68ef-43ca-950f-d73bd7d393fb'

// ── Data ──────────────────────────────────────────────────────────────────────
const LAST_UPDATED = 'May 7, 2026'

const PILLARS = [
  { name: 'Race Import', pct: 80, color: '#1d9e75' },
  { name: 'Race Discovery', pct: 50, color: '#ba7517' },
  { name: 'Pacer AI', pct: 70, color: '#185fa5' },
]

const PAGES = [
  // Auth
  { name: 'Login', route: '/ · /login', group: 'Auth', status: 'live', pct: 95, priority: 'P3' },
  { name: 'Sign Up', route: '/signup', group: 'Auth', status: 'live', pct: 90, priority: 'P3' },
  { name: 'Create Account', route: '/create-account', group: 'Auth', status: 'live', pct: 90, priority: 'P3' },
  { name: 'Verify Email', route: '/verify-email', group: 'Auth', status: 'live', pct: 85, priority: 'P3' },
  { name: 'Forgot / Reset Password', route: '/forgot-password · /reset-password', group: 'Auth', status: 'live', pct: 85, priority: 'P3' },
  // Onboarding
  { name: 'Build Passport', route: '/build-passport', group: 'Onboarding', status: 'live', pct: 90, priority: 'P2' },
  { name: 'Race Import', route: '/race-import', group: 'Onboarding', status: 'live', pct: 85, priority: 'P2' },
  { name: 'Goal Races', route: '/goal-races', group: 'Onboarding', status: 'partial', pct: 70, priority: 'P2' },
  // Core
  { name: 'Home', route: '/home', group: 'Core App', status: 'live', pct: 85, priority: 'P1' },
  { name: 'Discover', route: '/discover', group: 'Core App', status: 'partial', pct: 55, priority: 'P1' },
  { name: 'Race Detail', route: '/race-detail/:id', group: 'Core App', status: 'partial', pct: 65, priority: 'P1' },
  { name: 'Passport', route: '/passport', group: 'Core App', status: 'live', pct: 80, priority: 'P2' },
  { name: 'Race Page (personal)', route: '/race/:id', group: 'Core App', status: 'live', pct: 80, priority: 'P2' },
  { name: 'The Wall', route: '/wall', group: 'Core App', status: 'partial', pct: 60, priority: 'P3' },
  { name: 'Profile', route: '/profile', group: 'Core App', status: 'partial', pct: 65, priority: 'P2' },
  { name: 'Public Profile', route: '/:username', group: 'Core App', status: 'broken', pct: 20, priority: 'P1' },
  { name: 'Auth Callback', route: '/auth/callback', group: 'Core App', status: 'live', pct: 95, priority: 'P3' },
  { name: 'War Room', route: '/warroom', group: 'Core App', status: 'live', pct: 100, priority: 'P3' },
]

const APIS = [
  {
    name: '/api/pacer',
    title: 'Pacer AI — Anthropic Claude',
    note: 'Model: claude-sonnet-4-6 · Key: ANTHROPIC_API_KEY',
    status: 'live',
    actions: ['insight', 'race_reflection', 'report_card', 'checklist', 'race_score', 'race_lookup', 'strava_training'],
  },
  {
    name: '/api/runsignup',
    title: 'RunSignup Race Data',
    note: 'Keys: RUNSIGNUP_API_KEY + RUNSIGNUP_API_SECRET (server-side only)',
    status: 'live',
    actions: ['search_races', 'get_race_detail', 'get_events'],
  },
  {
    name: '/api/strava',
    title: 'Strava OAuth + Activities',
    note: 'Keys: STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET',
    status: 'live',
    actions: ['auth_url', 'exchange_token', 'get_activities', 'refresh_token'],
  },
  {
    name: '/api/unsplash',
    title: 'City Images (Unsplash)',
    note: 'Key: VITE_UNSPLASH_ACCESS_KEY (client-side) · Used for RaceDetail hero images',
    status: 'partial',
    actions: ['search_photos'],
  },
  {
    name: 'Supabase',
    title: 'Auth + Postgres + Storage',
    note: 'Project: xwngrbzvqhioklfvaizm.supabase.co · RLS enabled on all tables',
    status: 'live',
    actions: ['auth', 'passport_races', 'profiles', 'race_lists', 'race_list_items', 'race_checklists', 'storage/assets', 'storage/city-images'],
  },
  {
    name: 'Open-Meteo',
    title: 'Historical Weather — no API key required',
    note: 'Used on RacePage to show race day weather',
    status: 'live',
    actions: ['geocoding', 'archive weather'],
  },
  {
    name: 'Leaflet',
    title: 'Map rendering — loaded via CDN script tag',
    note: 'Tiles: CartoDB Light. Also used on RacePage for Strava route maps.',
    status: 'live',
    actions: ['Discover map', 'RacePage route map'],
  },
  {
    name: 'Apple OAuth',
    title: 'Sign in with Apple',
    note: 'Apple Developer enrolled ($99/yr). Keys not yet configured in Supabase.',
    status: 'pending',
    actions: ['auth_url', 'callback'],
  },
]

const WORKFLOWS = [
  {
    name: 'Onboarding',
    color: '#1d9e75',
    bg: 'rgba(29,158,117,0.08)',
    steps: [
      { num: 1, title: 'Landing / Sign Up', route: '/signup → /create-account', desc: 'User lands, clicks Get Started. Enters email + password or continues with Google OAuth.' },
      { num: 2, title: 'Build Passport', route: '/build-passport', desc: 'Collects name (auto-filled from auth), DOB (custom dropdowns), gender, state, favorite distance, shirt size.' },
      { num: 3, title: 'Race Import', route: '/race-import', desc: 'Animated search (~4s, 5 status messages). Shows matched races from RunSignup + manual add. Partial Pacer grade generated silently on save.' },
      { num: 4, title: 'Goal Races', route: '/goal-races', desc: 'User sets their next race goal (distance + target date). Feeds the Your Goal card on Home.' },
      { num: 5, title: 'Home Dashboard', route: '/home', desc: 'First view of full dashboard. Pacer insight populates, stamps appear, timeline builds. Ungraded races auto-score on load.' },
    ],
  },
  {
    name: 'Race Page (Personal Passport)',
    color: '#ba7517',
    bg: 'rgba(186,117,23,0.08)',
    steps: [
      { num: 1, title: 'Navigate to race page', route: '/race/:id', desc: 'From Home stamp or Passport grid. Loads from passport_races with fallback to hardcoded Ryan data.' },
      { num: 2, title: 'Add photos + story + gear', route: 'Edit mode toggle', desc: 'Edit mode unlocks photo upload (local blob), story textarea, gear form (category/brand/model/color/link). Stickers on hero.' },
      { num: 3, title: 'Link Strava activity', route: 'StravaActivitySection', desc: 'Auto-matches by date ± 14 days and distance. Manual picker if no match. Saves to Supabase. Unlocks map, splits, elevation.' },
      { num: 4, title: 'Pacer report card', route: 'Report Card section', desc: 'Click to expand → fires report_card action. When Strava linked AND report card submitted, full grade auto-generates (60% training + 40% performance).' },
    ],
  },
  {
    name: 'Race Discovery',
    color: '#185fa5',
    bg: 'rgba(24,95,165,0.08)',
    steps: [
      { num: 1, title: 'Discover page', route: '/discover', desc: 'Leaflet map with race pins. Filters by distance type. RunSignup API via /api/runsignup with quality filter (logo required, known distance, within 6 months).' },
      { num: 2, title: 'Race Detail page', route: '/race-detail/:id', desc: 'Hero with city image. Full RunSignup data: events, pricing, terrain, description. Register CTA links to RunSignup. Add-to-list button (⚠ incomplete).' },
      { num: 3, title: 'Registration handoff', route: 'External → runsignup.com', desc: 'User clicks Register → opens RunSignup in new tab. Race Passport sits on top of RunSignup, not replacing it.' },
    ],
  },
]

const ACTION_ITEMS = {
  p1: [
    { text: 'End-to-end new user flow — sign up fresh, onboard, import, land on Home. Fix every break.', note: 'Most important. Nobody has tested this clean.' },
    { text: 'PublicProfile /:username — wire to real Supabase data', note: 'Currently shows Ryan\'s races for every user' },
    { text: 'Apple OAuth — configure in Supabase Auth settings', note: 'Enrolled in Apple Developer, keys not set up' },
  ],
  p2: [
    { text: 'Race Discovery data quality — tighten RunSignup filter', note: 'Bad races still slip through occasionally' },
    { text: 'RaceDetail — add-to-list button functional', note: 'Tables exist, Home card built, button not wired on detail page' },
    { text: 'Full grade trigger — test in production', note: 'Strava + training → full score, not yet verified live' },
    { text: 'Passport page — edge case testing with real user data', note: null },
    { text: 'Profile page — complete settings (currently partial)', note: null },
  ],
  p3: [
    { text: 'The Wall — real story submission + Supabase storage', note: 'Currently dummy submit with fake success state' },
    { text: 'RaceDetail post-registration experience', note: null },
  ],
  dropped: [
    { text: 'Athlinks integration — dead end, dropped', note: null },
    { text: 'Suggested Gear post-registration — dropped', note: null },
  ],
  risks: [
    { text: 'esbuild regex: never use / inside template literals in JSX attribute positions. Use string concatenation.', note: 'e.g. \'1px solid \' + color NOT `1px solid ${color}`' },
    { text: 'pacer.js: never nest backticks inside template literals. Use string concatenation inside prompt strings.', note: null },
    { text: 'All files must be complete + ready to upload. No partial edits, no diffs, no find-and-replace.', note: null },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = (s) => {
  const map = {
    live:    { label: 'Live',    bg: 'rgba(29,158,117,0.12)', color: '#0f6e56' },
    partial: { label: 'Partial', bg: 'rgba(186,117,23,0.12)', color: '#854f0b' },
    broken:  { label: 'Broken',  bg: 'rgba(163,45,45,0.12)',  color: '#a32d2d' },
    pending: { label: 'Pending', bg: 'rgba(163,45,45,0.12)',  color: '#a32d2d' },
  }
  return map[s] || map.partial
}

const priorityBadge = (p) => {
  const map = {
    P1: { bg: 'rgba(163,45,45,0.1)',   color: '#a32d2d' },
    P2: { bg: 'rgba(186,117,23,0.1)',  color: '#854f0b' },
    P3: { bg: 'rgba(24,95,165,0.1)',   color: '#185fa5' },
  }
  return map[p] || map.P3
}

const readinessColor = (pct) => {
  if (pct >= 80) return '#1d9e75'
  if (pct >= 60) return '#ba7517'
  return '#a32d2d'
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Badge({ label, bg, color, size = 11 }) {
  return (
    <span style={{ fontSize: size, padding: '2px 8px', borderRadius: 6, background: bg, color, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.3px' }}>
      {label}
    </span>
  )
}

function MeterBar({ pct, color, height = 8 }) {
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
    </div>
  )
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ flex: 1, padding: '8px 6px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', border: 'none', borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent', background: 'transparent', color: active ? '#C9A84C' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all 0.15s' }}>
      {label}
    </button>
  )
}

// ── Tab Panels ────────────────────────────────────────────────────────────────
function OverviewPanel() {
  const overallPct = Math.round(PILLARS.reduce((s, p) => s + p.pct, 0) / PILLARS.length)
  const recentlyShipped = [
    'World Majors with live per-second countdowns',
    'Pacer race grades — auto-score on Home load',
    'Race grade in header stat bar (replaces Overall Place)',
    'The Wall featured story section',
    'Partners card in right sidebar',
    'Section hover system + light mode contrast fix',
    'pacer.js nested backtick syntax fix',
  ]
  const risks = [
    { text: 'esbuild: template literals with / in JSX attrs break builds', sev: 'amber' },
    { text: 'pacer.js: nested backticks crash the entire API', sev: 'amber' },
    { text: 'RunSignup data quality — bad races slip filter', sev: 'amber' },
  ]
  return (
    <div>
      {/* Overall meter */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Overall MVP Readiness</span>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: '#C9A84C', lineHeight: 1 }}>{overallPct}%</span>
        </div>
        <MeterBar pct={overallPct} color="#C9A84C" height={10} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          <span>Not started</span><span>Ship it</span>
        </div>
      </div>

      {/* Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {PILLARS.map(p => (
          <div key={p.name} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{p.name}</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: p.color, lineHeight: 1, marginBottom: 8 }}>{p.pct}%</div>
            <MeterBar pct={p.pct} color={p.color} height={4} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Recently shipped */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12 }}>Recently Shipped</div>
          {recentlyShipped.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingBottom: 8, marginBottom: 8, borderBottom: i < recentlyShipped.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d9e75', flexShrink: 0, marginTop: 4 }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>
        {/* Risks */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12 }}>Active Risks</div>
          {risks.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingBottom: 8, marginBottom: 8, borderBottom: i < risks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ba7517', flexShrink: 0, marginTop: 4 }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{r.text}</span>
            </div>
          ))}
          {/* P1 blockers */}
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', margin: '14px 0 10px' }}>P1 Blockers</div>
          {ACTION_ITEMS.p1.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingBottom: 8, marginBottom: 8, borderBottom: i < ACTION_ITEMS.p1.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a32d2d', flexShrink: 0, marginTop: 4 }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WorkflowPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {WORKFLOWS.map(wf => (
        <div key={wf.name} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: wf.color, letterSpacing: '1px', marginBottom: 18 }}>{wf.name}</div>
          {wf.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < wf.steps.length - 1 ? 0 : 0 }}>
              {/* Left timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: wf.bg, border: '1.5px solid ' + wf.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: wf.color }}>
                  {step.num}
                </div>
                {i < wf.steps.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'rgba(255,255,255,0.08)', minHeight: 16, margin: '4px 0' }} />}
              </div>
              {/* Content */}
              <div style={{ flex: 1, paddingBottom: i < wf.steps.length - 1 ? 16 : 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>{step.title}</div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: wf.color, marginBottom: 4, letterSpacing: '0.3px' }}>{step.route}</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function PagesPanel() {
  const groups = [...new Set(PAGES.map(p => p.group))]
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 60px', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        {['Page / Route', 'Status', 'Readiness', 'Priority'].map(h => (
          <div key={h} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>
      {groups.map(group => (
        <div key={group}>
          <div style={{ padding: '8px 20px 4px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(201,168,76,0.03)' }}>
            {group}
          </div>
          {PAGES.filter(p => p.group === group).map((page, i, arr) => {
            const sb = statusBadge(page.status)
            const pb = priorityBadge(page.priority)
            const rc = readinessColor(page.pct)
            return (
              <div key={page.name} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 60px', gap: 12, padding: '10px 20px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{page.name}</div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{page.route}</div>
                </div>
                <div><Badge label={sb.label} bg={sb.bg} color={sb.color} /></div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: rc, marginBottom: 3 }}>{page.pct}%</div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: page.pct + '%', background: rc, borderRadius: 99 }} />
                  </div>
                </div>
                <div><Badge label={page.priority} bg={pb.bg} color={pb.color} /></div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function APIsPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {APIS.map(api => {
        const sb = statusBadge(api.status === 'pending' ? 'pending' : api.status)
        return (
          <div key={api.name} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', display: 'grid', gridTemplateColumns: '140px 1fr 70px', gap: 16, alignItems: 'start' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>{api.name}</div>
              <Badge label={sb.label} bg={sb.bg} color={sb.color} />
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 3 }}>{api.title}</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, lineHeight: 1.5 }}>{api.note}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {api.actions.map(a => (
                  <span key={a} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3px' }}>{a}</span>
                ))}
              </div>
            </div>
            <div />
          </div>
        )
      })}
    </div>
  )
}

function ActionPanel() {
  const sections = [
    { label: 'P1 — Blocks MVP', dot: '#a32d2d', items: ACTION_ITEMS.p1 },
    { label: 'P2 — Core pillars', dot: '#ba7517', items: ACTION_ITEMS.p2 },
    { label: 'P3 — Polish', dot: '#185fa5', items: ACTION_ITEMS.p3 },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sections.map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12 }}>{s.label}</div>
            {s.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < s.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0, marginTop: 4 }} />
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{item.text}</div>
                  {item.note && <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{item.note}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12 }}>Recurring Build Risks</div>
          {ACTION_ITEMS.risks.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < ACTION_ITEMS.risks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ba7517', flexShrink: 0, marginTop: 4 }} />
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{item.text}</div>
                {item.note && <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontStyle: 'italic' }}>{item.note}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12 }}>Dropped — Not MVP</div>
          {ACTION_ITEMS.dropped.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < ACTION_ITEMS.dropped.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0, marginTop: 4 }} />
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, textDecoration: 'line-through' }}>{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ── Business Plan Panel ───────────────────────────────────────────────────────
function BusinessPlanPanel() {
  const sections = [
    {
      num: '1', title: 'Executive Summary',
      content: 'Race Passport is a mobile-first platform serving as the universal registration, identity, and discovery layer for the endurance sports world. One account that gets you into every race, everywhere, while building a living record of your racing life.',
      highlight: 'One Passport. Every Race. Everywhere. The world is your course.'
    },
    {
      num: '2', title: 'The Problem',
      items: [
        'Every race uses a different registration platform — RunSignUp, Active.com, RaceRoster, and dozens more',
        'Runners re-enter the same information for every single race',
        'No single place to view a complete race history, times, and personal records',
        'Race discovery is completely fragmented',
        'No AI-powered coaching exists for everyday endurance athletes',
      ]
    },
    {
      num: '3', title: 'The Solution',
      items: [
        'One profile created once — saves to every race forever',
        'Race Discovery powered by RunSignUp API with quality filtering and Leaflet map',
        'Personal Race Passport pages — photos, story, gear, Strava linking, splits',
        'Pacer AI — personalized insights, report cards, race grades, career score (powered by Claude)',
        'The Wall — community story feed for athlete moments',
        'World Majors tracker with live countdowns to all 6 Abbott World Marathon Majors',
        'Public passport profile — shareable URL as running identity',
      ]
    },
    {
      num: '4', title: 'Market Opportunity',
      table: {
        headers: ['Segment', 'Description', 'Size'],
        rows: [
          ['Primary', 'Active racers in the US, 2+ races/year', '~10M runners'],
          ['Secondary', 'Race directors & event companies', '~30,000 events/year'],
          ['Tertiary', 'Running-adjacent brands', 'Multi-billion dollar market'],
        ]
      }
    },
    {
      num: '5', title: 'Product Roadmap',
      items: [
        'MVP (April 2027) — Core passport, discovery, import, Pacer AI, The Wall, World Majors ← IN PROGRESS',
        'V2 (Q3 2027) — Race director portal, custom stamps, live tracking, push notifications, Runna integration',
        'V3 (2028) — Brand sponsorship platform, premium tier, international expansion, timing integration',
      ]
    },
    {
      num: '6', title: 'Business Model',
      table: {
        headers: ['Stream', 'Price', 'Available'],
        rows: [
          ['Race Director Listing Fee', '$299/race/year', 'From launch'],
          ['Featured Race Placement', '$99–499/placement', 'Year 2'],
          ['Sponsored Stamps & Challenges', '$5K–50K/campaign', 'Year 2–3'],
          ['Premium Racer Passport', '$4.99–9.99/month', 'Year 2'],
        ]
      }
    },
    {
      num: '7', title: 'Financial Projections',
      table: {
        headers: ['Metric', 'Year 1 (2027)', 'Year 2 (2028)', 'Year 3 (2029)'],
        rows: [
          ['Race Director Listings', '25 races', '100 races', '500 races'],
          ['Total Revenue', '$7,475', '$64,900', '$374,500'],
          ['Active Racer Accounts', '1,000', '10,000', '50,000'],
          ['Operating Costs', '$5,000', '$20,000', '$80,000'],
          ['Net', '$2,475', '$44,900', '$294,500'],
        ]
      },
      note: 'Break-even: 17 race listings. Corrigan Sports alone (9 races) gets Race Passport more than halfway there.'
    },
    {
      num: '8', title: 'Go-to-Market',
      items: [
        'Phase 1 (Now–Q4 2026): Build MVP, begin race director outreach in MD/DC/VA',
        'Phase 2 (Q1 2027): Soft launch to waitlist — 30 days before public',
        'Phase 3 (April 22, 2027): Public launch — social, press, running clubs',
        'Growth engine: Strava integration posts to runners\'s feeds on every race registration and stamp',
        'Virality loop: Public passport profile URL in every user\'s Instagram bio',
        'Beachhead: Corrigan Sports (9 races, 13,000+ participants at Baltimore Running Festival)',
      ]
    },
    {
      num: '9', title: 'Technology Stack',
      table: {
        headers: ['Layer', 'Technology', 'Status'],
        rows: [
          ['Frontend', 'React + Vite + Tailwind CSS', 'Live'],
          ['Hosting', 'Vercel (auto-deploy from GitHub)', 'Live'],
          ['Database & Auth', 'Supabase (PostgreSQL + Auth)', 'Live'],
          ['AI Coaching', 'Anthropic Claude (Pacer AI)', 'Live'],
          ['Race Data', 'RunSignUp API', 'Live'],
          ['Activity Tracking', 'Strava OAuth + Activities API', 'Live'],
          ['Maps', 'Leaflet CDN', 'Live'],
          ['Social Login', 'Google OAuth + Apple OAuth', 'Partial'],
        ]
      }
    },
    {
      num: '10', title: 'Key Risks',
      items: [
        'Chicken & egg — Mitigation: launch racer-first, deliver value before race directors join',
        'Race directors unwilling to pay — Mitigation: free pilot year for first 10',
        'Solo founder bandwidth — Mitigation: strict MVP scope, AI-accelerated development',
        'RunSignUp competes — Mitigation: Race Passport is complementary, not a threat',
        'Low waitlist growth — Mitigation: personal network, local running clubs, Strava virality',
      ]
    },
  ]

  function SimpleTable({ headers, rows }) {
    return (
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {headers.map(h => (
                <th key={h} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.7)', padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, letterSpacing: '3px', color: 'rgba(201,168,76,0.6)', marginBottom: 4 }}>CONFIDENTIAL</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Updated May 2026 · Ryan Groene · ryan@racepassportapp.com</div>
        </div>
        <a href="https://racepassportapp.com" target="_blank" rel="noreferrer"
          style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#C9A84C', textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8 }}>
          racepassportapp.com →
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map(s => (
          <div key={s.num} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: '#C9A84C' }}>
                {s.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: '#fff', letterSpacing: '0.5px', marginBottom: 10 }}>{s.title}</div>
                {s.content && <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: s.highlight ? 10 : 0 }}>{s.content}</div>}
                {s.highlight && (
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: '#C9A84C', fontStyle: 'italic', padding: '8px 14px', background: 'rgba(201,168,76,0.07)', borderLeft: '3px solid #C9A84C', borderRadius: '0 8px 8px 0' }}>{s.highlight}</div>
                )}
                {s.items && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {s.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(201,168,76,0.5)', flexShrink: 0, marginTop: 6 }} />
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{item}</div>
                      </div>
                    ))}
                  </div>
                )}
                {s.table && <SimpleTable headers={s.table.headers} rows={s.table.rows} />}
                {s.note && <div style={{ marginTop: 10, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'rgba(201,168,76,0.7)', fontStyle: 'italic' }}>{s.note}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WarRoom() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (!user) { navigate('/login'); return }
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      // If ALLOWED_USER_ID hasn't been replaced yet, allow any logged-in user
      if (ALLOWED_USER_ID === 'REPLACE_WITH_YOUR_SUPABASE_USER_ID' || uid === ALLOWED_USER_ID) {
        setAuthorized(true)
      } else {
        navigate('/home')
      }
      setChecking(false)
    }
    check()
  }, [user])

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-warroom-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@300;400&display=swap');
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
    `
    if (!document.getElementById('rp-warroom-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-warroom-styles')?.remove()
  }, [])

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (!authorized) return null

  const TABS = ['overview', 'workflows', 'pages', 'apis', 'action items', 'business plan']

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', fontFamily: "'Barlow',sans-serif" }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,15,26,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Home
          </button>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: '#C9A84C', letterSpacing: '2px' }}>War Room</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="https://github.com/ryang232/race-passport" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', textDecoration: 'none', transition: 'all 0.15s' }}>
            GitHub →
          </a>
          <a href="https://racepassportapp.com" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', textDecoration: 'none', transition: 'all 0.15s' }}>
            Live site →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px 80px', animation: 'fadeIn 0.4s ease' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: '#fff', letterSpacing: '2px', lineHeight: 1, marginBottom: 6 }}>Race Passport</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: 'rgba(255,255,255,0.35)', letterSpacing: '1px' }}>MVP Tracker · Last updated {LAST_UPDATED}</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          {TABS.map(tab => (
            <TabBtn key={tab} label={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />
          ))}
        </div>

        {/* Panels */}
        {activeTab === 'overview' && <OverviewPanel />}
        {activeTab === 'workflows' && <WorkflowPanel />}
        {activeTab === 'pages' && <PagesPanel />}
        {activeTab === 'apis' && <APIsPanel />}
        {activeTab === 'action items' && <ActionPanel />}
        {activeTab === 'business plan' && <BusinessPlanPanel />}
      </div>
    </div>
  )
}
