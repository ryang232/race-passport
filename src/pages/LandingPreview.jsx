import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Launch flag — flip to true when ready to go live ─────────────────────────
const LIVE = false

// ── Waitlist counter — update manually as signups grow ───────────────────────
const WAITLIST_COUNT = 127

export default function LandingPreview() {
  const navigate   = useNavigate()
  const clicksRef  = useRef(0)
  const timerRef   = useRef(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)
  const [copied, setCopied]             = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-lp-preview-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500&family=Barlow+Condensed:wght@300;400;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --navy: #1B2A4A; --gold: #C9A84C; --white: #ffffff;
        --off: #f5f4f0; --muted: #8a8a8a; --lb: rgba(27,42,74,0.1);
      }
      html { scroll-behavior: smooth; }
      body { background: var(--white); color: var(--navy); font-family: 'Barlow', sans-serif; font-weight: 300; overflow-x: hidden; }

      /* NAV */
      .pv-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: 20px 48px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.96); backdrop-filter: blur(10px); border-bottom: 1px solid var(--lb); }
      .pv-logo { font-family: 'Bebas Neue', sans-serif; font-size: 21px; letter-spacing: 0.15em; color: var(--navy); display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
      .pv-logo-dot { width: 7px; height: 7px; background: var(--gold); border-radius: 50%; flex-shrink: 0; }
      .pv-nav-right { display: flex; align-items: center; gap: 16px; }
      .pv-nav-login { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--navy); background: none; border: none; cursor: pointer; padding: 8px 4px; transition: color 0.2s; }
      .pv-nav-login:hover { color: var(--gold); }
      .pv-nav-signup { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--white); background: var(--navy); border: none; cursor: pointer; padding: 10px 20px; transition: background 0.2s; border-radius: 3px; }
      .pv-nav-signup:hover { background: var(--gold); }

      /* HERO */
      .pv-hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding: 80px 48px 68px; position: relative; overflow: hidden; }
      .pv-ticker { position: absolute; top: 50%; transform: translateY(-55%); left: 0; display: flex; align-items: center; z-index: 0; pointer-events: none; white-space: nowrap; }
      .pv-ticker-item { font-family: 'Bebas Neue', sans-serif; font-size: clamp(200px,28vw,380px); color: transparent; -webkit-text-stroke: 1px rgba(27,42,74,0.055); line-height: 1; user-select: none; padding: 0 40px; flex-shrink: 0; }
      .pv-track-lines { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
      .pv-track { position: absolute; height: 1px; background: linear-gradient(to right, transparent, rgba(201,168,76,0.16), transparent); animation: pvTrack 10s linear infinite; }
      .pv-track:nth-child(1) { top: 28%; width: 55%; left: -55%; animation-delay: 0s; }
      .pv-track:nth-child(2) { top: 48%; width: 70%; left: -70%; animation-delay: 2.5s; }
      .pv-track:nth-child(3) { top: 63%; width: 45%; left: -45%; animation-delay: 5s; }
      .pv-track:nth-child(4) { top: 76%; width: 65%; left: -65%; animation-delay: 1.5s; }
      .pv-track:nth-child(5) { top: 18%; width: 40%; left: -40%; animation-delay: 7s; }
      @keyframes pvTrack { 0%{transform:translateX(0);opacity:0;} 8%{opacity:1;} 92%{opacity:1;} 100%{transform:translateX(250vw);opacity:0;} }
      .pv-hero-content { position: relative; z-index: 1; max-width: 900px; }
      .pv-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.35em; text-transform: uppercase; color: var(--gold); margin-bottom: 16px; display: flex; align-items: center; gap: 12px; opacity: 0; animation: pvUp 0.8s ease 0.2s forwards; }
      .pv-eyebrow::before { content: ''; width: 28px; height: 1px; background: var(--gold); }

      /* EMOTIONAL HOOK — leads first */
      .pv-hook { font-family: 'Bebas Neue', sans-serif; font-size: clamp(38px,5.5vw,72px); line-height: 1; letter-spacing: 0.03em; color: rgba(27,42,74,0.55); margin-bottom: 6px; opacity: 0; animation: pvUp 0.8s ease 0.35s forwards; }

      /* HEADLINE — follows emotional hook */
      .pv-headline { font-family: 'Bebas Neue', sans-serif; font-size: clamp(72px,12vw,158px); line-height: 0.88; letter-spacing: 0.02em; color: var(--navy); opacity: 0; animation: pvUp 0.8s ease 0.5s forwards; }
      .pv-headline span { color: var(--gold); }

      /* DESTINATION LABEL */
      .pv-destination { margin-top: 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.35em; text-transform: uppercase; color: var(--gold); opacity: 0; animation: pvUp 0.8s ease 0.65s forwards; display: flex; align-items: center; gap: 10px; }
      .pv-destination::before, .pv-destination::after { content: ''; flex: none; width: 20px; height: 1px; background: rgba(201,168,76,0.4); }

      .pv-hero-actions { margin-top: 44px; display: flex; align-items: center; gap: 28px; opacity: 0; animation: pvUp 0.8s ease 0.8s forwards; }
      .pv-cta-primary { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; background: var(--navy); color: var(--white); border: none; padding: 18px 44px; cursor: pointer; transition: all 0.3s; text-decoration: none; display: inline-block; }
      .pv-cta-primary:hover { background: var(--gold); transform: translateY(-2px); }
      .pv-cta-ghost { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(27,42,74,0.4); text-decoration: none; display: flex; align-items: center; gap: 8px; transition: color 0.3s; }
      .pv-cta-ghost:hover { color: var(--navy); }
      .pv-cta-ghost::after { content: '→'; }

      /* Waitlist counter */
      .pv-social-proof { margin-top: 24px; opacity: 0; animation: pvFade 1s ease 1.2s forwards; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; color: rgba(27,42,74,0.4); letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; }
      .pv-proof-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; display: inline-block; animation: pvPulse 2s ease infinite; }
      @keyframes pvPulse { 0%,100%{opacity:0.6;} 50%{opacity:1;} }

      /* SCROLL INDICATOR */
      .pv-scroll { position: absolute; bottom: 44px; right: 48px; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; opacity: 0; animation: pvFade 1s ease 1.5s forwards; }
      .pv-scroll-line { width: 1px; height: 56px; background: linear-gradient(to bottom, rgba(27,42,74,0.4), transparent); animation: pvScrollPulse 2s ease infinite; }
      @keyframes pvScrollPulse { 0%,100%{opacity:0.4;} 50%{opacity:1;} }
      .pv-scroll-label { font-family: 'Barlow Condensed', sans-serif; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); writing-mode: vertical-rl; }

      /* SOCIAL PROOF SECTION */
      .pv-proof { padding: 80px 48px; background: var(--off); border-top: 1px solid var(--lb); border-bottom: 1px solid var(--lb); }
      .pv-proof-inner { max-width: 1200px; margin: 0 auto; }
      .pv-proof-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; color: var(--gold); margin-bottom: 36px; display: flex; align-items: center; gap: 12px; }
      .pv-proof-label::before { content: ''; width: 22px; height: 1px; background: var(--gold); }
      .pv-proof-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--lb); border: 1px solid var(--lb); }
      .pv-proof-card { background: var(--white); padding: 28px; transition: background 0.2s; }
      .pv-proof-card:hover { background: #fefcf5; }
      .pv-pc-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--lb); }
      .pv-pc-avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--navy); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 16px; color: var(--gold); flex-shrink: 0; }
      .pv-pc-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: var(--navy); letter-spacing: 0.5px; line-height: 1; }
      .pv-pc-location { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; color: var(--muted); letter-spacing: 0.1em; margin-top: 2px; }
      .pv-pc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .pv-pc-stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: var(--navy); line-height: 1; }
      .pv-pc-stat-label { font-family: 'Barlow Condensed', sans-serif; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-top: 2px; }
      .pv-pc-archetype { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--lb); font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 600; color: var(--gold); letter-spacing: 0.15em; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
      .pv-pc-archetype::before { content: '⚡'; font-size: 11px; }

      /* PRODUCT MOMENT */
      .pv-product { padding: 100px 48px; background: var(--white); border-bottom: 1px solid var(--lb); }
      .pv-product-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
      .pv-product-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; color: var(--gold); margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
      .pv-product-label::before { content: ''; width: 22px; height: 1px; background: var(--gold); }
      .pv-product-headline { font-family: 'Bebas Neue', sans-serif; font-size: clamp(44px,5.5vw,72px); line-height: 0.92; color: var(--navy); margin-bottom: 20px; }
      .pv-product-headline span { color: var(--gold); }
      .pv-product-desc { font-size: 15px; font-weight: 300; line-height: 1.8; color: rgba(27,42,74,0.6); margin-bottom: 32px; }
      .pv-product-desc strong { color: var(--navy); font-weight: 500; }
      .pv-race-card { background: var(--navy); border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(27,42,74,0.25); }
      .pv-race-header { background: linear-gradient(135deg, #1B2A4A 0%, #243657 100%); padding: 22px 22px 16px; border-bottom: 2px solid var(--gold); }
      .pv-race-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.35em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 10px; }
      .pv-race-name { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: var(--white); letter-spacing: 0.5px; line-height: 1; margin-bottom: 4px; }
      .pv-race-meta { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; color: rgba(255,255,255,0.45); letter-spacing: 0.1em; }
      .pv-race-stats { display: grid; grid-template-columns: repeat(4,1fr); border-bottom: 1px solid rgba(255,255,255,0.07); }
      .pv-race-stat { padding: 14px 12px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06); }
      .pv-race-stat:last-child { border-right: none; }
      .pv-race-stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: var(--white); line-height: 1; }
      .pv-race-stat-label { font-family: 'Barlow Condensed', sans-serif; font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-top: 3px; }
      .pv-grade-row { padding: 16px 20px; background: rgba(201,168,76,0.08); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; }
      .pv-grade-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
      .pv-grade-val { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: var(--gold); line-height: 1; letter-spacing: 1px; }
      .pv-pacer-insight { padding: 16px 20px; }
      .pv-pacer-label { font-family: 'Bebas Neue', sans-serif; font-size: 11px; letter-spacing: 2.5px; color: var(--gold); margin-bottom: 8px; }
      .pv-pacer-text { font-family: 'Barlow', sans-serif; font-size: 12px; font-weight: 300; color: rgba(255,255,255,0.55); line-height: 1.7; }

      /* PACER AI */
      .pv-pacer { padding: 100px 48px; background: var(--navy); position: relative; overflow: hidden; border-top: 1px solid rgba(255,255,255,0.05); }
      .pv-pacer::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 50%, rgba(201,168,76,0.06) 0%, transparent 65%); pointer-events: none; }
      .pv-pacer-inner { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }
      .pv-pacer-tag { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; color: var(--gold); margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
      .pv-pacer-tag::before { content: ''; width: 22px; height: 1px; background: var(--gold); }
      .pv-pacer-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px,7.5vw,104px); line-height: 0.88; color: var(--white); margin-bottom: 16px; }
      .pv-pacer-title span { color: var(--gold); }
      .pv-pacer-sub { font-size: 15px; font-weight: 300; color: rgba(255,255,255,0.4); max-width: 520px; line-height: 1.8; margin-bottom: 64px; letter-spacing: 0.02em; }
      .pv-pacer-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
      .pv-pacer-card { background: rgba(10,15,26,0.6); padding: 32px 28px; transition: background 0.2s; }
      .pv-pacer-card:hover { background: rgba(201,168,76,0.05); }
      .pv-pacer-num { font-family: 'Bebas Neue', sans-serif; font-size: 38px; color: var(--gold); line-height: 1; margin-bottom: 12px; }
      .pv-pacer-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 21px; color: var(--white); letter-spacing: 0.04em; margin-bottom: 10px; }
      .pv-pacer-card-desc { font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.38); line-height: 1.7; }
      .pv-founder-note { margin-top: 48px; padding: 24px; border-left: 2px solid rgba(201,168,76,0.3); background: rgba(201,168,76,0.04); }
      .pv-founder-text { font-family: 'Barlow', sans-serif; font-size: 14px; font-weight: 300; color: rgba(255,255,255,0.45); line-height: 1.7; font-style: italic; }
      .pv-founder-sig { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; color: rgba(201,168,76,0.6); margin-top: 10px; text-transform: uppercase; }

      /* HOW IT WORKS */
      .pv-how { padding: 100px 48px; background: var(--off); border-top: 1px solid var(--lb); border-bottom: 1px solid var(--lb); }
      .pv-how-inner { max-width: 1200px; margin: 0 auto; }
      .pv-how-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(52px,7.5vw,96px); line-height: 0.9; color: var(--navy); margin-bottom: 60px; }
      .pv-how-grid { display: grid; grid-template-columns: repeat(3,1fr); border-top: 1px solid var(--lb); }
      .pv-how-step { padding: 44px 36px 44px 0; border-right: 1px solid var(--lb); border-bottom: 1px solid var(--lb); }
      .pv-how-step:nth-child(3) { border-right: none; }
      .pv-how-step:nth-child(2), .pv-how-step:nth-child(3) { padding-left: 36px; }
      .pv-how-step:nth-child(4) { padding-left: 0; border-bottom: none; }
      .pv-how-step:nth-child(5) { padding-left: 36px; border-bottom: none; }
      .pv-step-num { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.3em; color: var(--gold); margin-bottom: 18px; }
      .pv-step-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(22px,2.2vw,30px); letter-spacing: 0.04em; color: var(--navy); margin-bottom: 12px; }
      .pv-step-desc { font-size: 13px; font-weight: 300; line-height: 1.8; color: rgba(27,42,74,0.5); }

      /* STAMPS */
      .pv-stamps { padding: 100px 0 100px 48px; overflow: hidden; background: var(--white); border-top: 1px solid var(--lb); border-bottom: 1px solid var(--lb); }
      .pv-stamps-header { margin-bottom: 52px; padding-right: 48px; max-width: 600px; }
      .pv-stamps-tag { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; color: var(--gold); margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
      .pv-stamps-tag::before { content: ''; width: 22px; height: 1px; background: var(--gold); }
      .pv-stamps-headline { font-family: 'Bebas Neue', sans-serif; font-size: clamp(44px,6.5vw,88px); line-height: 0.92; color: var(--navy); margin-bottom: 14px; }
      .pv-stamps-sub { font-size: 14px; font-weight: 300; color: var(--muted); line-height: 1.7; max-width: 420px; }
      .pv-stamps-track { display: flex; gap: 24px; width: max-content; }
      .pv-stamp { width: 156px; height: 156px; border-radius: 50%; border: 2.5px solid var(--navy); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; flex-shrink: 0; background: var(--white); }
      .pv-stamp::before { content: ''; position: absolute; inset: 7px; border-radius: 50%; border: 0.75px dashed rgba(27,42,74,0.2); }
      .pv-stamp.gold { border-color: var(--gold); background: rgba(201,168,76,0.04); }
      .pv-stamp.gold .pv-sd, .pv-stamp.gold .pv-sn { color: var(--gold); }
      .pv-sd { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: var(--navy); line-height: 1; letter-spacing: 0.04em; }
      .pv-sn { font-family: 'Barlow Condensed', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: var(--navy); text-align: center; padding: 0 14px; line-height: 1.3; margin-top: 4px; }
      .pv-sl { font-family: 'Barlow Condensed', sans-serif; font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--gold); margin-top: 3px; }
      .pv-sy { font-family: 'Barlow Condensed', sans-serif; font-size: 8px; letter-spacing: 0.18em; color: rgba(27,42,74,0.28); margin-top: 1px; }

      /* FOR RACERS / DIRECTORS */
      .pv-sides { padding: 100px 48px; background: var(--off); border-top: 1px solid var(--lb); border-bottom: 1px solid var(--lb); }
      .pv-sides-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 80px; align-items: start; }
      .pv-side-tag { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; color: var(--gold); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
      .pv-side-tag::before { content: ''; width: 18px; height: 1px; background: var(--gold); }
      .pv-side-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(40px,4.5vw,62px); line-height: 0.92; color: var(--navy); margin-bottom: 36px; }
      .pv-side-list { list-style: none; display: flex; flex-direction: column; gap: 14px; border-top: 1px solid var(--lb); padding-top: 24px; }
      .pv-side-list li { font-size: 14px; font-weight: 300; color: rgba(27,42,74,0.65); display: flex; align-items: flex-start; gap: 12px; line-height: 1.65; }
      .pv-side-list li::before { content: '—'; color: var(--gold); flex-shrink: 0; }
      .pv-side-divider { width: 1px; background: var(--lb); align-self: stretch; }

      /* WAITLIST */
      .pv-waitlist { padding: 120px 48px; background: var(--navy); text-align: center; position: relative; overflow: hidden; }
      .pv-waitlist::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(201,168,76,0.07) 0%, transparent 70%); pointer-events: none; }
      .pv-waitlist-inner { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
      .pv-wl-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; color: var(--gold); margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 14px; }
      .pv-wl-eyebrow::before, .pv-wl-eyebrow::after { content: ''; width: 28px; height: 1px; background: var(--gold); }
      .pv-wl-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(52px,8.5vw,112px); line-height: 0.9; color: var(--white); margin-bottom: 16px; }
      .pv-wl-sub { font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.35); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; line-height: 1.8; }
      .pv-wl-founder-stamp { display: inline-flex; align-items: center; gap: 8px; background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2); border-radius: 20px; padding: 8px 16px; margin-bottom: 40px; }
      .pv-wl-founder-stamp-text { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; color: var(--gold); text-transform: uppercase; }
      .pv-wl-form { display: flex; flex-direction: column; gap: 0; max-width: 520px; margin: 0 auto 16px; }
      .pv-wl-input, .pv-wl-select { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-bottom: none; color: var(--white); font-family: 'Barlow', sans-serif; font-size: 15px; font-weight: 300; padding: 18px 22px; outline: none; width: 100%; transition: border-color 0.3s; }
      .pv-wl-select { color: rgba(255,255,255,0.4); cursor: pointer; appearance: none; }
      .pv-wl-input::placeholder { color: rgba(255,255,255,0.28); }
      .pv-wl-input:focus { border-color: rgba(201,168,76,0.4); }
      .pv-wl-btn { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; background: var(--gold); color: var(--white); border: 1px solid var(--gold); padding: 18px 32px; cursor: pointer; transition: all 0.3s; width: 100%; }
      .pv-wl-btn:hover { background: transparent; color: var(--gold); }
      .pv-wl-counter { margin-top: 20px; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; color: rgba(255,255,255,0.25); letter-spacing: 0.15em; display: flex; align-items: center; justify-content: center; gap: 8px; }
      .pv-wl-counter-dot { width: 5px; height: 5px; border-radius: 50%; background: #4ade80; display: inline-block; }
      .pv-wl-note { font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 0.15em; text-transform: uppercase; margin-top: 12px; }
      .pv-wl-success { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: var(--gold); letter-spacing: 0.1em; margin-top: 16px; }

      /* MODAL */
      .pv-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.82); z-index: 1000; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
      .pv-modal-overlay.open { display: flex; }
      .pv-modal { background: var(--white); width: 100%; max-width: 460px; border-radius: 12px; overflow: hidden; position: relative; max-height: 90vh; overflow-y: auto; }
      .pv-modal-close { position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.15); border: none; color: var(--white); font-size: 15px; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; }
      .pv-modal-header { background: var(--navy); padding: 24px 24px 20px; border-bottom: 2px solid var(--gold); }
      .pv-modal-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 12px; }
      .pv-modal-profile { display: flex; align-items: center; gap: 12px; }
      .pv-modal-avatar { width: 50px; height: 50px; border-radius: 50%; background: var(--gold); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: var(--white); flex-shrink: 0; }
      .pv-modal-name { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: var(--white); line-height: 1; }
      .pv-modal-handle { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--gold); letter-spacing: 0.15em; margin-top: 3px; }
      .pv-modal-stats { display: grid; grid-template-columns: repeat(4,1fr); border-bottom: 1px solid var(--lb); }
      .pv-ms { padding: 14px 10px; text-align: center; border-right: 1px solid rgba(27,42,74,0.07); }
      .pv-ms:last-child { border-right: none; }
      .pv-ms-num { font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: var(--navy); line-height: 1; }
      .pv-ms-label { font-family: 'Barlow Condensed', sans-serif; font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-top: 2px; }
      .pv-modal-section { padding: 18px 20px; border-bottom: 1px solid rgba(27,42,74,0.07); }
      .pv-modal-sec-label { font-family: 'Barlow Condensed', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.35em; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
      .pv-modal-sec-label::after { content: ''; flex: 1; height: 1px; background: rgba(201,168,76,0.2); }
      .pv-modal-stamps-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
      .pv-mss { aspect-ratio: 1; border-radius: 50%; border: 1.5px solid var(--navy); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
      .pv-mss::before { content: ''; position: absolute; inset: 3px; border-radius: 50%; border: 0.5px dashed rgba(27,42,74,0.18); }
      .pv-mss.g { border-color: var(--gold); }
      .pv-mss.g .pv-mss-d, .pv-mss.g .pv-mss-n { color: var(--gold); }
      .pv-mss-d { font-family: 'Bebas Neue', sans-serif; font-size: 15px; color: var(--navy); line-height: 1; }
      .pv-mss-n { font-family: 'Barlow Condensed', sans-serif; font-size: 5.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--navy); text-align: center; padding: 0 2px; line-height: 1.2; margin-top: 1px; }
      .pv-modal-archetype { background: rgba(201,168,76,0.06); padding: 12px 18px; display: flex; align-items: center; gap: 8px; }
      .pv-ma-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); }
      .pv-modal-share { padding: 14px 20px; background: var(--off); display: flex; align-items: center; gap: 10px; }
      .pv-modal-share-url { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 0.08em; color: rgba(27,42,74,0.4); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pv-modal-share-btn { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; background: var(--navy); color: var(--white); border: none; padding: 9px 16px; cursor: pointer; flex-shrink: 0; transition: background 0.2s; border-radius: 3px; }
      .pv-modal-share-btn:hover { background: var(--gold); }
      .pv-modal-share-btn.copied { background: #2a7a4b; }

      /* FOOTER */
      .pv-footer { padding: 32px 48px; border-top: 1px solid var(--lb); display: flex; justify-content: space-between; align-items: center; }
      .pv-footer-logo { font-family: 'Bebas Neue', sans-serif; font-size: 15px; letter-spacing: 0.15em; color: rgba(27,42,74,0.28); }
      .pv-footer-note { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); }
      .pv-footer-email { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 0.1em; color: rgba(27,42,74,0.32); text-decoration: none; transition: color 0.2s; }
      .pv-footer-email:hover { color: var(--gold); }

      /* PREVIEW BANNER */
      .pv-banner { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: rgba(27,42,74,0.96); border-top: 2px solid var(--gold); padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; backdrop-filter: blur(8px); }
      .pv-banner-text { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; color: rgba(255,255,255,0.6); text-transform: uppercase; }
      .pv-banner-text span { color: var(--gold); }
      .pv-banner-back { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; color: var(--gold); text-transform: uppercase; cursor: pointer; background: none; border: none; }
      .pv-banner-back:hover { color: #fff; }

      @keyframes pvUp { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:translateY(0);} }
      @keyframes pvFade { to{opacity:1;} }
    `
    if (!document.getElementById('rp-lp-preview-styles')) document.head.appendChild(style)

    // Ticker parallax
    const ticker = document.getElementById('pv-ticker')
    const onScroll = () => { if (ticker) ticker.style.transform = 'translateX(' + (-window.scrollY * 0.38) + 'px)' }
    window.addEventListener('scroll', onScroll)

    // Stamps carousel
    const track = document.getElementById('pv-stamps-track')
    if (track) {
      track.innerHTML += track.innerHTML
      let x = 0, running = true
      const animate = () => {
        if (running) { x -= 0.55; if (Math.abs(x) >= track.scrollWidth / 2) x = 0; track.style.transform = 'translateX(' + x + 'px)' }
        requestAnimationFrame(animate)
      }
      animate()
      track.addEventListener('mouseenter', () => { running = false })
      track.addEventListener('mouseleave', () => { running = true })
    }

    return () => { document.getElementById('rp-lp-preview-styles')?.remove(); window.removeEventListener('scroll', onScroll) }
  }, [])

  // Triple-click backdoor
  const handleLogoClick = () => {
    clicksRef.current++
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { clicksRef.current = 0 }, 600)
    if (clicksRef.current >= 3) { clicksRef.current = 0; navigate('/login') }
  }

  const handleWaitlist = async (e) => {
    e.preventDefault()
    const email = document.getElementById('pv-email')?.value
    if (!email || !email.includes('@')) return
    const btn = document.getElementById('pv-submit-btn')
    if (btn) { btn.textContent = 'Joining...'; btn.disabled = true }
    try {
      const res = await fetch('https://formspree.io/f/meeprapg', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: document.getElementById('pv-role')?.value }),
      })
      if (res.ok) setWaitlistDone(true)
      else if (btn) { btn.textContent = 'Try Again'; btn.disabled = false }
    } catch { if (btn) { btn.textContent = 'Try Again'; btn.disabled = false } }
  }

  const copyLink = () => {
    navigator.clipboard.writeText('racepassportapp.com/ryan-runner').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const STAMPS = [
    { d:'140.6', n:'IRONMAN World Championship', l:'Kona, HI',         y:'2023', g:true  },
    { d:'26.2',  n:'NYC Marathon',               l:'New York, NY',     y:'2024', g:false },
    { d:'70.3',  n:'IRONMAN 70.3 Augusta',       l:'Augusta, GA',      y:'2024', g:false },
    { d:'13.1',  n:'Cherry Blossom Half',        l:'Washington, DC',   y:'2025', g:true  },
    { d:'26.2',  n:'Marine Corps Marathon',      l:'Arlington, VA',    y:'2024', g:false },
    { d:'10K',   n:'Broad Street Run',           l:'Philadelphia, PA', y:'2023', g:false },
    { d:'5K',    n:'Turkey Trot',                l:'Chicago, IL',      y:'2023', g:false },
    { d:'50K',   n:'Seneca Creek Ultra',         l:'Gaithersburg, MD', y:'2022', g:true  },
    { d:'13.1',  n:'Rock n Roll Half',           l:'Nashville, TN',    y:'2023', g:false },
    { d:'5K',    n:'Color Run',                  l:'Denver, CO',       y:'2022', g:false },
  ]

  const PROOF_CARDS = [
    { initials:'SM', name:'Sarah Mitchell', location:'Washington, DC', races:23, miles:341, pr:'3:47:12', archetype:'The Strong Finisher' },
    { initials:'JT', name:'James Torres',   location:'Austin, TX',     races:7,  miles:118, pr:'6:28:04', archetype:'The Iron Soul' },
    { initials:'ML', name:'Maria Landau',   location:'Chicago, IL',    races:41, miles:589, pr:'1:44:33', archetype:'The Grinder' },
  ]

  const PACER_CARDS = [
    { n:'01', t:'Race Insights',      d:'After every race, Pacer delivers personalized analysis — what went right, what to build on, and what it means for your career as an athlete.' },
    { n:'02', t:'Performance Grade',  d:'Every finish gets a letter grade scored against your personal history and runners of similar ability across the same distance and course.' },
    { n:'03', t:'Career Score',       d:'One number that tracks your progression as an endurance athlete across every race, every distance, and every year. Watch it rise.' },
    { n:'04', t:'Race Import',        d:'Pacer finds and imports your complete race history automatically. Your passport builds itself — you just confirm.' },
    { n:'05', t:'Training Grade',     d:'Link your activity and Pacer grades your training block — pacing consistency, long run quality, and how well prep matched race day.' },
    { n:'06', t:'Race Suggestions',   d:'Based on your history and goals, Pacer recommends upcoming races that are the right challenge at the right time for you.' },
  ]

  const HOW_STEPS = [
    { n:'Step 01', t:'Build Your Passport',   d:'Fill out your profile once. Name, running background, shirt size. Race Passport remembers everything so you never fill out a form again.' },
    { n:'Step 02', t:'Import Your Races',     d:'Pull in your complete race history in seconds. Every 5K, marathon, triathlon — organized and preserved in your passport automatically.' },
    { n:'Step 03', t:'Relive Every Race',     d:'Each race gets its own page. Add photos, write your story, log your gear, link your activity for maps and splits. Your finish line, forever.' },
    { n:'Step 04', t:'Get Your Pacer Grade',  d:'Our AI race intelligence analyzes every race and grades your performance. Your career score tracks your growth as an athlete.' },
    { n:'Step 05', t:"Discover What's Next",  d:'Browse thousands of upcoming races on an interactive map. Filter by distance, location, and date. Find your next start line.' },
  ]

  return (
    <div style={{ fontFamily:"'Barlow',sans-serif" }} onKeyDown={e => { if (e.key === 'Escape') setModalOpen(false) }}>

      {/* PREVIEW BANNER */}
      <div className="pv-banner">
        <div className="pv-banner-text">Preview: <span>Landing Page Redesign</span> — Your live page is unchanged at /</div>
        <button className="pv-banner-back" onClick={() => navigate('/home')}>← Back to App</button>
      </div>

      {/* NAV */}
      <nav className="pv-nav">
        <span className="pv-logo" onClick={handleLogoClick}>
          <span className="pv-logo-dot" />Race Passport
        </span>
        {LIVE && (
          <div className="pv-nav-right">
            <button className="pv-nav-login" onClick={() => navigate('/login')}>Log In</button>
            <button className="pv-nav-signup" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pv-hero" id="top">
        <div className="pv-track-lines">{[1,2,3,4,5].map(i => <div key={i} className="pv-track" />)}</div>
        <div className="pv-ticker" id="pv-ticker">
          {['26.2','13.1','10K','5K','70.3','140.6','26.2','13.1','10K'].map((d,i) => (
            <span key={i} className="pv-ticker-item">{d}</span>
          ))}
        </div>
        <div className="pv-hero-content">
          <div className="pv-eyebrow">Coming Soon &nbsp;·&nbsp; Built for Racers</div>

          {/* Emotional hook leads */}
          <p className="pv-hook">Finish lines deserve more than a medal drawer.</p>

          {/* Rational headline follows */}
          <h1 className="pv-headline">Every Race.<br/><span>One Passport.</span></h1>

          {/* Identity anchor */}
          <p className="pv-destination">Your Race Day Destination</p>

          <div className="pv-hero-actions">
            {LIVE
              ? <button className="pv-cta-primary" onClick={() => navigate('/signup')}>Create Your Passport</button>
              : <a href="#waitlist" className="pv-cta-primary">Reserve My Passport</a>
            }
            <a href="#how" className="pv-cta-ghost">How it works</a>
          </div>

          {/* Trust signal */}
          <div className="pv-social-proof">
            <span className="pv-proof-dot" />
            {WAITLIST_COUNT} runners have reserved their passport
          </div>
        </div>
        <div className="pv-scroll">
          <span className="pv-scroll-label">Scroll</span>
          <div className="pv-scroll-line" />
        </div>
      </section>

      {/* SOCIAL PROOF — "Is this for me?" */}
      <section className="pv-proof">
        <div className="pv-proof-inner">
          <div className="pv-proof-label">Runners Like You</div>
          <div className="pv-proof-grid">
            {PROOF_CARDS.map((c,i) => (
              <div key={i} className="pv-proof-card">
                <div className="pv-pc-header">
                  <div className="pv-pc-avatar">{c.initials}</div>
                  <div>
                    <div className="pv-pc-name">{c.name}</div>
                    <div className="pv-pc-location">{c.location}</div>
                  </div>
                </div>
                <div className="pv-pc-stats">
                  {[{n:c.races,l:'Races'},{n:c.miles,l:'Miles'},{n:c.pr,l:'Best Time'}].map((s,j) => (
                    <div key={j}>
                      <div className="pv-pc-stat-num">{s.n}</div>
                      <div className="pv-pc-stat-label">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="pv-pc-archetype">Pacer says: {c.archetype}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT MOMENT — variable reward before the ask */}
      <section className="pv-product">
        <div className="pv-product-inner">
          <div>
            <div className="pv-product-label">Your Race Page</div>
            <h2 className="pv-product-headline">Every race you've ever run<br/>deserves a <span>home like this.</span></h2>
            <p className="pv-product-desc">
              Photos, your story, your gear, Strava splits, and a <strong>Pacer grade</strong> — all in one place.
              Every finish line preserved exactly as it happened. Yours forever.
            </p>
            <button className="pv-cta-primary" onClick={() => setModalOpen(true)}>
              View a Sample Passport
            </button>
          </div>
          <div className="pv-race-card">
            <div className="pv-race-header">
              <div className="pv-race-eyebrow">Race Passport · Personal Race Page</div>
              <div className="pv-race-name">Austin Half Marathon</div>
              <div className="pv-race-meta">Austin, TX · February 16, 2025 · 13.1 miles</div>
            </div>
            <div className="pv-race-stats">
              {[{n:'2:04:37',l:'Finish Time'},{n:'9:31',l:'Avg Pace'},{n:'187',l:'Calories'},{n:'412ft',l:'Elevation'}].map((s,i) => (
                <div key={i} className="pv-race-stat">
                  <div className="pv-race-stat-num">{s.n}</div>
                  <div className="pv-race-stat-label">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="pv-grade-row">
              <div>
                <div className="pv-grade-label">Pacer Race Grade</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.28)', marginTop:'2px' }}>Based on your history + 2,847 comparable finishes</div>
              </div>
              <div className="pv-grade-val">B+</div>
            </div>
            <div className="pv-pacer-insight">
              <div className="pv-pacer-label">PACER · RACE INSIGHT</div>
              <p className="pv-pacer-text">Your negative splits in the back half put you in the top 14% of finishers at this distance. Your pacing strategy has improved significantly since your last half — this is the strongest controlled effort in your passport.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PACER AI */}
      <section className="pv-pacer">
        <div className="pv-pacer-inner">
          <div className="pv-pacer-tag">Artificial Intelligence</div>
          <h2 className="pv-pacer-title">Meet <span>Pacer.</span><br/>Your AI Race<br/>Intelligence.</h2>
          <p className="pv-pacer-sub">Every race in your passport is analyzed by Pacer — built specifically for endurance athletes. Not generic fitness advice. Race-specific intelligence that knows your complete history.</p>
          <div className="pv-pacer-grid">
            {PACER_CARDS.map((c,i) => (
              <div key={i} className="pv-pacer-card">
                <div className="pv-pacer-num">{c.n}</div>
                <div className="pv-pacer-card-title">{c.t}</div>
                <p className="pv-pacer-card-desc">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="pv-founder-note">
            <p className="pv-founder-text">The idea for Race Passport started after I crossed my 12th finish line and realized I had nowhere to put it. A drawer of medals and a folder of forgotten confirmation emails — that was my entire racing life. Race Passport exists because finish lines deserve more.</p>
            <div className="pv-founder-sig">— Ryan Groene, Founder · Highland, MD</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — after emotional investment is earned */}
      <section className="pv-how" id="how">
        <div className="pv-how-inner">
          <h2 className="pv-how-title">How It<br/>Works</h2>
          <div className="pv-how-grid">
            {HOW_STEPS.map((s,i) => (
              <div key={i} className="pv-how-step">
                <div className="pv-step-num">{s.n}</div>
                <div className="pv-step-title">{s.t}</div>
                <p className="pv-step-desc">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STAMPS */}
      <section className="pv-stamps">
        <div className="pv-stamps-header">
          <div className="pv-stamps-tag">Race Stamps</div>
          <h2 className="pv-stamps-headline">Every race you've ever run.<br/>Every finish line you've crossed.<br/>Right here.</h2>
          <p className="pv-stamps-sub">Import your race history and watch your passport fill up in seconds. Each stamp is a permanent record of a start line you showed up to.</p>
        </div>
        <div className="pv-stamps-track" id="pv-stamps-track">
          {STAMPS.map((s,i) => (
            <div key={i} className={'pv-stamp' + (s.g ? ' gold' : '')}>
              <div className="pv-sd">{s.d}</div>
              <div className="pv-sn">{s.n}</div>
              <div className="pv-sl">{s.l}</div>
              <div className="pv-sy">{s.y}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOR RACERS / DIRECTORS */}
      <section className="pv-sides">
        <div className="pv-sides-inner">
          <div>
            <div className="pv-side-tag">For Racers</div>
            <h3 className="pv-side-title">Your Entire<br/>Racing Life.<br/>One Place.</h3>
            <ul className="pv-side-list">
              {[
                'Every race you\'ve ever run, organized and beautifully preserved',
                'Personal race pages — photos, story, gear, activity maps',
                'Pacer AI grades every race and tracks your career score',
                'Collectible stamps for every finish line you\'ve ever crossed',
                'A public passport URL — your running identity on the internet',
                'Interactive race discovery map for your next start line',
                'The Wall — share your story and inspire other athletes',
              ].map((item,i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
          <div>
            <div className="pv-side-tag">For Race Directors</div>
            <h3 className="pv-side-title">Your Race.<br/>Every<br/>Passport.</h3>
            <ul className="pv-side-list">
              {[
                'Your race in front of every Race Passport athlete',
                'Every finisher takes a custom stamp home permanently',
                'Your race lives in thousands of athlete passports forever',
                'Athletes discover your race on the interactive map',
              ].map((item,i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section className="pv-waitlist" id="waitlist">
        <div className="pv-waitlist-inner">
          <div className="pv-wl-eyebrow">Early Access</div>
          <h2 className="pv-wl-title">Your Passport<br/>Is Being Built.</h2>
          <p className="pv-wl-sub">Reserve your spot now and get early access before anyone else.</p>
          <div className="pv-wl-founder-stamp">
            <span style={{ fontSize:12 }}>🏅</span>
            <span className="pv-wl-founder-stamp-text">Founding Member Stamp — exclusive to early access</span>
          </div>

          {!waitlistDone ? (
            <form id="pv-waitlist-form" onSubmit={handleWaitlist} style={{ display:'flex', flexDirection:'column', gap:0, maxWidth:520, margin:'0 auto 16px' }}>
              <input type="email" id="pv-email" className="pv-wl-input" placeholder="your@email.com" required />
              <select id="pv-role" className="pv-wl-select">
                <option value="racer">I am a Racer</option>
                <option value="director">I am a Race Director</option>
              </select>
              <button type="submit" id="pv-submit-btn" className="pv-wl-btn">Reserve My Passport</button>
            </form>
          ) : (
            <div className="pv-wl-success">You are on the list. See you at the start line. 🏅</div>
          )}

          <div className="pv-wl-counter">
            <span className="pv-wl-counter-dot" />
            {WAITLIST_COUNT} runners have already reserved their passport
          </div>
          <p className="pv-wl-note">No spam. No noise. Just your passport when it is ready.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pv-footer">
        <div className="pv-footer-logo">Race Passport</div>
        <div className="pv-footer-note">© 2026 Race Passport · racepassportapp.com</div>
        <a href="mailto:ryan@racepassportapp.com" className="pv-footer-email">ryan@racepassportapp.com</a>
      </footer>

      {/* SAMPLE PASSPORT MODAL */}
      {modalOpen && (
        <div className="pv-modal-overlay open" onClick={e => { if (e.target.className === 'pv-modal-overlay open') setModalOpen(false) }}>
          <div className="pv-modal">
            <button className="pv-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            <div className="pv-modal-header">
              <div className="pv-modal-eyebrow">Race Passport · Public Profile</div>
              <div className="pv-modal-profile">
                <div className="pv-modal-avatar">RR</div>
                <div>
                  <div className="pv-modal-name">Ryan Runner</div>
                  <div className="pv-modal-handle">racepassportapp.com/ryan-runner</div>
                </div>
              </div>
            </div>
            <div className="pv-modal-stats">
              {[{n:'14',l:'Races'},{n:'341',l:'Miles'},{n:'B+',l:'Career Grade'},{n:'78',l:'Career Score'}].map((s,i) => (
                <div key={i} className="pv-ms"><div className="pv-ms-num">{s.n}</div><div className="pv-ms-label">{s.l}</div></div>
              ))}
            </div>
            <div className="pv-modal-archetype">
              <span className="pv-ma-label">⚡ Pacer says: The Strong Finisher</span>
            </div>
            <div className="pv-modal-section">
              <div className="pv-modal-sec-label">Stamps Collected</div>
              <div className="pv-modal-stamps-grid">
                {[{d:'140.6',n:'IRONMAN',g:true},{d:'26.2',n:'NYC Marathon'},{d:'70.3',n:'IRONMAN 70.3'},{d:'13.1',n:'Cherry Blossom'},{d:'10K',n:'Broad St Run'},{d:'5K',n:'Turkey Trot'},{d:'5K',n:'Color Run'}].map((s,i) => (
                  <div key={i} className={'pv-mss' + (s.g ? ' g' : '')}><div className="pv-mss-d">{s.d}</div><div className="pv-mss-n">{s.n}</div></div>
                ))}
                <div className="pv-mss" style={{borderStyle:'dashed',opacity:0.25}}><div className="pv-mss-d" style={{fontSize:14,color:'#8a8a8a'}}>+</div></div>
              </div>
            </div>
            <div className="pv-modal-share">
              <div className="pv-modal-share-url">racepassportapp.com/ryan-runner</div>
              <button className={'pv-modal-share-btn' + (copied ? ' copied' : '')} onClick={copyLink}>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
