import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Launch flag ───────────────────────────────────────────────────────────────
// Set to true when ready to go live — reveals nav buttons and switches CTA
const LIVE = false

export default function Landing() {
  const navigate  = useNavigate()
  const clicksRef = useRef(0)
  const timerRef  = useRef(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-landing-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500&family=Barlow+Condensed:wght@300;400;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root { --navy:#1B2A4A; --gold:#C9A84C; --white:#ffffff; --off:#f5f4f0; --muted:#8a8a8a; --light-border:rgba(27,42,74,0.1); }
      html { scroll-behavior: smooth; }
      body { background:var(--white); color:var(--navy); font-family:'Barlow',sans-serif; font-weight:300; overflow-x:hidden; }

      /* NAV */
      .lp-nav { position:fixed; top:0; left:0; right:0; z-index:50; padding:22px 48px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.95); backdrop-filter:blur(8px); border-bottom:1px solid var(--light-border); }
      .lp-logo { font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:0.15em; color:var(--navy); display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; }
      .lp-logo-dot { width:8px; height:8px; background:var(--gold); border-radius:50%; flex-shrink:0; }
      .lp-nav-actions { display:flex; align-items:center; gap:14px; }
      .lp-nav-login { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:var(--navy); background:none; border:none; cursor:pointer; padding:8px 4px; transition:color 0.2s; }
      .lp-nav-login:hover { color:var(--gold); }
      .lp-nav-signup { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:var(--white); background:var(--navy); border:none; cursor:pointer; padding:10px 22px; transition:background 0.2s; }
      .lp-nav-signup:hover { background:var(--gold); }

      /* HERO */
      .lp-hero { min-height:100vh; display:flex; flex-direction:column; justify-content:flex-end; padding:80px 48px 72px; position:relative; overflow:hidden; }
      .lp-hero-ticker { position:absolute; top:50%; transform:translateY(-55%); left:0; display:flex; align-items:center; z-index:0; pointer-events:none; white-space:nowrap; will-change:transform; }
      .lp-ticker-item { font-family:'Bebas Neue',sans-serif; font-size:clamp(200px,28vw,380px); color:transparent; -webkit-text-stroke:1px rgba(27,42,74,0.06); line-height:1; user-select:none; padding:0 40px; flex-shrink:0; }
      .lp-track-lines { position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
      .lp-track-line { position:absolute; height:1px; background:linear-gradient(to right,transparent,rgba(201,168,76,0.18),transparent); animation:lpTrackMove 10s linear infinite; }
      .lp-track-line:nth-child(1) { top:28%; width:55%; left:-55%; animation-delay:0s; }
      .lp-track-line:nth-child(2) { top:48%; width:70%; left:-70%; animation-delay:2.5s; }
      .lp-track-line:nth-child(3) { top:63%; width:45%; left:-45%; animation-delay:5s; }
      .lp-track-line:nth-child(4) { top:76%; width:65%; left:-65%; animation-delay:1.5s; }
      .lp-track-line:nth-child(5) { top:18%; width:40%; left:-40%; animation-delay:7s; }
      @keyframes lpTrackMove { 0%{transform:translateX(0);opacity:0;} 8%{opacity:1;} 92%{opacity:1;} 100%{transform:translateX(250vw);opacity:0;} }
      .lp-hero-content { position:relative; z-index:1; max-width:900px; }
      .lp-hero-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:0.35em; text-transform:uppercase; color:var(--gold); margin-bottom:20px; display:flex; align-items:center; gap:12px; opacity:0; animation:lpSlideUp 0.8s ease 0.3s forwards; }
      .lp-hero-eyebrow::before { content:''; width:32px; height:1px; background:var(--gold); }
      .lp-hero-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(72px,12vw,160px); line-height:0.9; letter-spacing:0.02em; color:var(--navy); opacity:0; animation:lpSlideUp 0.8s ease 0.5s forwards; }
      .lp-hero-title span { color:var(--gold); }
      .lp-hero-tagline { margin-top:24px; font-family:'Bebas Neue',sans-serif; font-size:clamp(22px,3vw,36px); letter-spacing:0.06em; color:rgba(27,42,74,0.45); opacity:0; animation:lpSlideUp 0.8s ease 0.65s forwards; }
      .lp-hero-sub { margin-top:10px; font-size:clamp(12px,1.4vw,16px); font-weight:400; letter-spacing:0.25em; text-transform:uppercase; color:var(--gold); opacity:0; animation:lpSlideUp 0.8s ease 0.75s forwards; }
      .lp-hero-actions { margin-top:48px; display:flex; align-items:center; gap:28px; opacity:0; animation:lpSlideUp 0.8s ease 0.9s forwards; }
      .lp-btn-primary { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; background:var(--navy); color:var(--white); border:none; padding:18px 42px; text-decoration:none; display:inline-block; transition:all 0.3s ease; cursor:pointer; }
      .lp-btn-primary:hover { background:var(--gold); transform:translateY(-2px); }
      .lp-btn-ghost { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:400; letter-spacing:0.2em; text-transform:uppercase; color:rgba(27,42,74,0.45); text-decoration:none; display:flex; align-items:center; gap:10px; transition:color 0.3s ease; }
      .lp-btn-ghost:hover { color:var(--navy); }
      .lp-btn-ghost::after { content:'→'; transition:transform 0.3s ease; }
      .lp-btn-ghost:hover::after { transform:translateX(4px); }
      .lp-hero-scroll { position:absolute; bottom:48px; right:48px; z-index:1; display:flex; flex-direction:column; align-items:center; gap:8px; opacity:0; animation:lpFadeIn 1s ease 1.5s forwards; }
      .lp-scroll-line { width:1px; height:60px; background:linear-gradient(to bottom,rgba(27,42,74,0.4),transparent); animation:lpScrollPulse 2s ease infinite; }
      @keyframes lpScrollPulse { 0%,100%{opacity:0.4;} 50%{opacity:1;} }
      .lp-scroll-label { font-family:'Barlow Condensed',sans-serif; font-size:9px; letter-spacing:0.3em; text-transform:uppercase; color:var(--muted); writing-mode:vertical-rl; }

      /* SHARED */
      .lp-section-tag { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:0.4em; text-transform:uppercase; color:var(--gold); margin-bottom:32px; display:flex; align-items:center; gap:14px; }
      .lp-section-tag::before { content:''; width:24px; height:1px; background:var(--gold); }

      /* HOW IT WORKS */
      .lp-section-how { padding:120px 48px; background:var(--off); border-top:1px solid var(--light-border); border-bottom:1px solid var(--light-border); }
      .lp-how-inner { max-width:1200px; margin:0 auto; }
      .lp-how-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(56px,8vw,100px); line-height:0.9; color:var(--navy); margin-bottom:72px; }
      .lp-how-steps { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid var(--light-border); }
      .lp-how-step { padding:48px 40px 48px 0; border-right:1px solid var(--light-border); border-bottom:1px solid var(--light-border); }
      .lp-how-step:nth-child(3) { border-right:none; }
      .lp-how-step:nth-child(2),.lp-how-step:nth-child(3) { padding-left:40px; }
      .lp-how-step:nth-child(4) { padding-left:0; border-bottom:none; }
      .lp-how-step:nth-child(5) { padding-left:40px; border-bottom:none; }
      .lp-step-num { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:0.3em; color:var(--gold); margin-bottom:20px; }
      .lp-step-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(24px,2.5vw,34px); letter-spacing:0.04em; color:var(--navy); margin-bottom:14px; }
      .lp-step-desc { font-size:14px; font-weight:300; line-height:1.8; color:rgba(27,42,74,0.55); }

      /* PACER AI */
      .lp-pacer { padding:120px 48px; background:var(--navy); position:relative; overflow:hidden; }
      .lp-pacer::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 70% 50%,rgba(201,168,76,0.06) 0%,transparent 65%); pointer-events:none; }
      .lp-pacer-inner { max-width:1200px; margin:0 auto; position:relative; z-index:1; }
      .lp-pacer-tag { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:0.4em; text-transform:uppercase; color:var(--gold); margin-bottom:24px; display:flex; align-items:center; gap:14px; }
      .lp-pacer-tag::before { content:''; width:24px; height:1px; background:var(--gold); }
      .lp-pacer-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(52px,8vw,108px); line-height:0.88; color:var(--white); margin-bottom:20px; }
      .lp-pacer-title span { color:var(--gold); }
      .lp-pacer-sub { font-size:15px; font-weight:300; color:rgba(255,255,255,0.45); max-width:560px; line-height:1.8; margin-bottom:72px; letter-spacing:0.03em; }
      .lp-pacer-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.06); }
      .lp-pacer-card { background:rgba(10,15,26,0.6); padding:36px 32px; transition:background 0.2s; }
      .lp-pacer-card:hover { background:rgba(201,168,76,0.05); }
      .lp-pacer-num { font-family:'Bebas Neue',sans-serif; font-size:42px; color:var(--gold); line-height:1; margin-bottom:14px; }
      .lp-pacer-card-title { font-family:'Bebas Neue',sans-serif; font-size:22px; color:var(--white); letter-spacing:0.04em; margin-bottom:10px; }
      .lp-pacer-card-desc { font-size:13px; font-weight:300; color:rgba(255,255,255,0.4); line-height:1.7; }

      /* FOR RACERS / DIRECTORS */
      .lp-sides-wrapper { border-top:1px solid var(--light-border); border-bottom:1px solid var(--light-border); background:var(--white); position:relative; }
      .lp-sides-wrapper::after { content:''; position:absolute; top:120px; bottom:120px; left:50%; width:1px; background:var(--light-border); }
      .lp-sides { padding:120px 48px; max-width:1200px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:80px; }
      .lp-side-tag { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:0.4em; text-transform:uppercase; color:var(--gold); margin-bottom:24px; display:flex; align-items:center; gap:12px; }
      .lp-side-tag::before { content:''; width:20px; height:1px; background:var(--gold); }
      .lp-side-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(44px,5vw,68px); line-height:0.9; color:var(--navy); margin-bottom:40px; }
      .lp-side-list { list-style:none; display:flex; flex-direction:column; gap:16px; border-top:1px solid var(--light-border); padding-top:28px; }
      .lp-side-list li { font-size:15px; font-weight:300; color:rgba(27,42,74,0.65); display:flex; align-items:flex-start; gap:14px; line-height:1.6; }
      .lp-side-list li::before { content:'—'; color:var(--gold); flex-shrink:0; }

      /* STAMPS */
      .lp-section-stamps { padding:120px 0 120px 48px; overflow:hidden; background:var(--off); border-top:1px solid var(--light-border); border-bottom:1px solid var(--light-border); }
      .lp-stamps-header { margin-bottom:64px; padding-right:48px; }
      .lp-stamps-headline { font-family:'Bebas Neue',sans-serif; font-size:clamp(48px,7vw,96px); line-height:0.95; color:var(--navy); margin-bottom:16px; }
      .lp-stamps-sub { font-size:15px; font-weight:300; color:var(--muted); letter-spacing:0.04em; max-width:480px; line-height:1.7; }
      .lp-stamps-track { display:flex; gap:28px; width:max-content; }
      .lp-stamp { width:168px; height:168px; border-radius:50%; border:2.5px solid var(--navy); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; flex-shrink:0; background:var(--white); }
      .lp-stamp::before { content:''; position:absolute; inset:7px; border-radius:50%; border:0.75px dashed rgba(27,42,74,0.22); }
      .lp-stamp.gold { border-color:var(--gold); background:rgba(201,168,76,0.04); }
      .lp-stamp.gold .lp-sd,.lp-stamp.gold .lp-sn { color:var(--gold); }
      .lp-sd { font-family:'Bebas Neue',sans-serif; font-size:30px; color:var(--navy); line-height:1; letter-spacing:0.04em; }
      .lp-sn { font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:var(--navy); text-align:center; padding:0 16px; line-height:1.3; margin-top:4px; }
      .lp-sl { font-family:'Barlow Condensed',sans-serif; font-size:8px; letter-spacing:0.15em; text-transform:uppercase; color:var(--gold); margin-top:3px; }
      .lp-sy { font-family:'Barlow Condensed',sans-serif; font-size:8px; letter-spacing:0.2em; color:rgba(27,42,74,0.3); margin-top:1px; }

      /* SHOWCASE */
      .lp-showcase { padding:120px 48px; background:var(--white); border-bottom:1px solid var(--light-border); }
      .lp-showcase-inner { max-width:800px; }
      .lp-showcase-headline { font-family:'Bebas Neue',sans-serif; font-size:clamp(40px,5.5vw,72px); line-height:0.95; color:var(--navy); margin-bottom:24px; }
      .lp-showcase-headline span { color:var(--gold); }
      .lp-showcase-desc { font-size:16px; font-weight:300; line-height:1.8; color:rgba(27,42,74,0.6); margin-bottom:40px; max-width:560px; }
      .lp-showcase-desc strong { color:var(--navy); font-weight:500; }
      .lp-btn-showcase { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; background:var(--navy); color:var(--white); border:none; padding:18px 42px; cursor:pointer; transition:all 0.3s ease; display:inline-block; }
      .lp-btn-showcase:hover { background:var(--gold); transform:translateY(-2px); }

      /* MODAL */
      .lp-modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:1000; align-items:center; justify-content:center; padding:24px; backdrop-filter:blur(4px); }
      .lp-modal-overlay.open { display:flex; }
      .lp-modal { background:var(--white); width:100%; max-width:480px; border-radius:12px; overflow:hidden; position:relative; max-height:90vh; overflow-y:auto; }
      .lp-modal-close { position:absolute; top:14px; right:14px; background:rgba(255,255,255,0.15); border:none; color:var(--white); font-size:16px; width:30px; height:30px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10; }
      .lp-modal-close:hover { background:rgba(255,255,255,0.25); }
      .lp-modal-header { background:var(--navy); padding:28px 28px 24px; border-bottom:3px solid var(--gold); }
      .lp-modal-label { font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:600; letter-spacing:0.4em; text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:14px; }
      .lp-modal-profile { display:flex; align-items:center; gap:14px; }
      .lp-modal-avatar { width:56px; height:56px; border-radius:50%; background:var(--gold); display:flex; align-items:center; justify-content:center; font-family:'Bebas Neue',sans-serif; font-size:20px; color:var(--white); flex-shrink:0; border:2px solid rgba(255,255,255,0.1); }
      .lp-modal-name { font-family:'Bebas Neue',sans-serif; font-size:32px; color:var(--white); line-height:0.95; letter-spacing:0.04em; }
      .lp-modal-handle { font-family:'Barlow Condensed',sans-serif; font-size:10px; letter-spacing:0.18em; color:var(--gold); margin-top:4px; }
      .lp-modal-stats { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid rgba(27,42,74,0.1); }
      .lp-modal-stat { padding:18px 14px; text-align:center; border-right:1px solid rgba(27,42,74,0.08); }
      .lp-modal-stat:last-child { border-right:none; }
      .lp-modal-stat-num { font-family:'Bebas Neue',sans-serif; font-size:26px; color:var(--navy); line-height:1; }
      .lp-modal-stat-label { font-family:'Barlow Condensed',sans-serif; font-size:8px; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); margin-top:3px; }
      .lp-modal-section-label { font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:600; letter-spacing:0.35em; text-transform:uppercase; color:var(--gold); margin-bottom:18px; display:flex; align-items:center; gap:10px; }
      .lp-modal-section-label::after { content:''; flex:1; height:1px; background:rgba(201,168,76,0.2); }
      .lp-modal-stamps-section { padding:22px 24px; border-bottom:1px solid rgba(27,42,74,0.08); }
      .lp-modal-stamps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
      .lp-ms { aspect-ratio:1; border-radius:50%; border:2px solid var(--navy); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; }
      .lp-ms::before { content:''; position:absolute; inset:4px; border-radius:50%; border:0.5px dashed rgba(27,42,74,0.2); }
      .lp-ms.g { border-color:var(--gold); }
      .lp-ms.g .lp-ms-d,.lp-ms.g .lp-ms-n { color:var(--gold); }
      .lp-ms-d { font-family:'Bebas Neue',sans-serif; font-size:16px; color:var(--navy); line-height:1; }
      .lp-ms-n { font-family:'Barlow Condensed',sans-serif; font-size:6px; letter-spacing:0.1em; text-transform:uppercase; color:var(--navy); text-align:center; padding:0 3px; line-height:1.2; margin-top:1px; }
      .lp-ms-y { font-family:'Barlow Condensed',sans-serif; font-size:5px; color:var(--muted); margin-top:1px; }
      .lp-modal-upcoming { padding:22px 24px; border-bottom:1px solid rgba(27,42,74,0.08); }
      .lp-modal-race { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(27,42,74,0.06); }
      .lp-modal-race:last-child { border-bottom:none; }
      .lp-modal-race-name { font-family:'Bebas Neue',sans-serif; font-size:15px; color:var(--navy); letter-spacing:0.04em; }
      .lp-modal-race-meta { font-family:'Barlow Condensed',sans-serif; font-size:9px; letter-spacing:0.15em; color:var(--muted); text-transform:uppercase; margin-top:2px; }
      .lp-modal-race-badge { font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:var(--gold); border:1px solid rgba(201,168,76,0.3); padding:3px 8px; flex-shrink:0; }
      .lp-modal-share { padding:16px 24px; background:var(--off); display:flex; align-items:center; gap:12px; }
      .lp-modal-share-url { font-family:'Barlow Condensed',sans-serif; font-size:11px; letter-spacing:0.1em; color:rgba(27,42,74,0.4); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .lp-modal-share-btn { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; background:var(--navy); color:var(--white); border:none; padding:10px 18px; cursor:pointer; transition:background 0.3s; flex-shrink:0; }
      .lp-modal-share-btn:hover { background:var(--gold); }
      .lp-modal-share-btn.copied { background:#2a7a4b; }

      /* WAITLIST */
      .lp-waitlist { padding:140px 48px; background:var(--navy); text-align:center; position:relative; overflow:hidden; }
      .lp-waitlist::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at center,rgba(201,168,76,0.07) 0%,transparent 70%); pointer-events:none; }
      .lp-waitlist-inner { position:relative; z-index:1; max-width:640px; margin:0 auto; }
      .lp-waitlist-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:0.4em; text-transform:uppercase; color:var(--gold); margin-bottom:24px; display:flex; align-items:center; justify-content:center; gap:14px; }
      .lp-waitlist-eyebrow::before,.lp-waitlist-eyebrow::after { content:''; width:32px; height:1px; background:var(--gold); }
      .lp-waitlist-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(56px,9vw,120px); line-height:0.9; letter-spacing:0.02em; color:var(--white); margin-bottom:24px; }
      .lp-waitlist-sub { font-size:14px; font-weight:300; color:rgba(255,255,255,0.4); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:56px; line-height:1.8; }
      .lp-waitlist-form { display:flex; flex-direction:column; gap:0; max-width:560px; margin:0 auto 20px; }
      .lp-waitlist-input,.lp-waitlist-select { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-bottom:none; color:var(--white); font-family:'Barlow',sans-serif; font-size:15px; font-weight:300; padding:20px 24px; outline:none; width:100%; transition:border-color 0.3s; }
      .lp-waitlist-select { color:rgba(255,255,255,0.45); cursor:pointer; appearance:none; }
      .lp-waitlist-input::placeholder { color:rgba(255,255,255,0.3); }
      .lp-waitlist-input:focus { border-color:rgba(201,168,76,0.5); }
      .lp-waitlist-btn { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.25em; text-transform:uppercase; background:var(--gold); color:var(--white); border:1px solid var(--gold); padding:20px 32px; cursor:pointer; transition:all 0.3s; width:100%; }
      .lp-waitlist-btn:hover { background:transparent; color:var(--gold); }
      .lp-waitlist-note { font-size:10px; color:rgba(255,255,255,0.25); letter-spacing:0.15em; text-transform:uppercase; margin-top:16px; }
      .lp-success-msg { display:none; font-family:'Bebas Neue',sans-serif; font-size:24px; color:var(--gold); letter-spacing:0.1em; margin-top:20px; }

      /* FOOTER */
      .lp-footer { padding:36px 48px; border-top:1px solid var(--light-border); display:flex; justify-content:space-between; align-items:center; }
      .lp-footer-logo { font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:0.15em; color:rgba(27,42,74,0.3); }
      .lp-footer-note { font-family:'Barlow Condensed',sans-serif; font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); }
      .lp-footer-email { font-family:'Barlow Condensed',sans-serif; font-size:11px; letter-spacing:0.12em; color:rgba(27,42,74,0.35); text-decoration:none; transition:color 0.3s; }
      .lp-footer-email:hover { color:var(--gold); }

      @keyframes lpSlideUp { from{opacity:0;transform:translateY(30px);} to{opacity:1;transform:translateY(0);} }
      @keyframes lpFadeIn { to{opacity:1;} }
      .lp-reveal { opacity:1; transform:translateY(0); transition:opacity 0.6s ease,transform 0.6s ease; }
    `
    if (!document.getElementById('rp-landing-styles')) document.head.appendChild(style)

    const ticker = document.getElementById('lp-ticker')
    const onScroll = () => { if (ticker) ticker.style.transform = 'translateX(' + (-window.scrollY * 0.4) + 'px)' }
    window.addEventListener('scroll', onScroll)

    const track = document.getElementById('lp-stamps-track')
    if (track) {
      track.innerHTML += track.innerHTML
      let x = 0, running = true
      const animate = () => {
        if (running) { x -= 0.6; if (Math.abs(x) >= track.scrollWidth / 2) x = 0; track.style.transform = 'translateX(' + x + 'px)' }
        requestAnimationFrame(animate)
      }
      animate()
      track.addEventListener('mouseenter', () => { running = false })
      track.addEventListener('mouseleave', () => { running = true })
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)' } })
    }, { threshold: 0.08 })
    document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el))

    return () => { document.getElementById('rp-landing-styles')?.remove(); window.removeEventListener('scroll', onScroll) }
  }, [])

  const handleLogoClick = () => {
    clicksRef.current++
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { clicksRef.current = 0 }, 600)
    if (clicksRef.current >= 3) { clicksRef.current = 0; navigate('/login') }
  }

  const openModal  = () => { document.getElementById('lp-modal')?.classList.add('open'); document.body.style.overflow = 'hidden' }
  const closeModal = () => { document.getElementById('lp-modal')?.classList.remove('open'); document.body.style.overflow = '' }

  const copyLink = () => {
    navigator.clipboard.writeText('racepassportapp.com/ryan-runner').then(() => {
      const btn = document.getElementById('lp-share-btn')
      if (btn) { btn.textContent = 'Copied!'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = 'Copy Link'; btn.classList.remove('copied') }, 2000) }
    })
  }

  const handleWaitlist = async (e) => {
    e.preventDefault()
    const email = document.getElementById('lp-email')?.value
    const role  = document.getElementById('lp-role')?.value
    if (!email || !email.includes('@')) return
    const btn = document.getElementById('lp-submit-btn')
    if (btn) { btn.textContent = 'Joining...'; btn.disabled = true }
    try {
      const res = await fetch('https://formspree.io/f/meeprapg', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      if (res.ok) {
        document.getElementById('lp-waitlist-form')?.style.setProperty('display', 'none')
        const msg = document.getElementById('lp-success-msg')
        if (msg) msg.style.display = 'block'
      } else if (btn) { btn.textContent = 'Try Again'; btn.disabled = false }
    } catch { if (btn) { btn.textContent = 'Try Again'; btn.disabled = false } }
  }

  return (
    <div style={{ fontFamily:"'Barlow',sans-serif" }} onKeyDown={e => { if (e.key === 'Escape') closeModal() }}>

      {/* NAV */}
      <nav className="lp-nav">
        <span className="lp-logo" onClick={handleLogoClick}>
          <span className="lp-logo-dot" />Race Passport
        </span>
        {LIVE && (
          <div className="lp-nav-actions">
            <button className="lp-nav-login" onClick={() => navigate('/login')}>Log In</button>
            <button className="lp-nav-signup" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="lp-hero" id="top">
        <div className="lp-track-lines">{[1,2,3,4,5].map(i => <div key={i} className="lp-track-line" />)}</div>
        <div className="lp-hero-ticker" id="lp-ticker">
          {['26.2','13.1','10K','5K','70.3','140.6','26.2','13.1','10K'].map((d,i) => (
            <span key={i} className="lp-ticker-item">{d}</span>
          ))}
        </div>
        <div className="lp-hero-content">
          <div className="lp-hero-eyebrow">Coming Soon &nbsp;·&nbsp; Built for Racers</div>
          <h1 className="lp-hero-title">Every Race.<br/><span>One Passport.</span></h1>
          <p className="lp-hero-tagline">Finish lines deserve more than a medal drawer.</p>
          <p className="lp-hero-sub">Your Race Day Destination</p>
          <div className="lp-hero-actions">
            {LIVE
              ? <button className="lp-btn-primary" onClick={() => navigate('/signup')}>Create Your Passport</button>
              : <a href="#waitlist" className="lp-btn-primary">Claim Your Passport</a>
            }
            <a href="#how" className="lp-btn-ghost">How it works</a>
          </div>
        </div>
        <div className="lp-hero-scroll">
          <span className="lp-scroll-label">Scroll</span>
          <div className="lp-scroll-line" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section-how" id="how">
        <div className="lp-how-inner">
          <h2 className="lp-how-title">How It<br/>Works</h2>
          <div className="lp-how-steps">
            {[
              { n:'Step 01', t:'Build Your Passport',   d:'Fill out your profile once. Your identity is set — name, running background, shirt size, and more. Race Passport remembers everything so you never have to fill out a form again.' },
              { n:'Step 02', t:'Import Your Races',     d:'Pull in your complete race history in seconds. Every 5K, every marathon, every triathlon — organized and beautifully presented in your passport automatically.' },
              { n:'Step 03', t:'Relive Every Race',     d:'Each race gets its own page. Add photos, write your story, log your gear, and link your activity for maps and splits. Your finish line, preserved forever.' },
              { n:'Step 04', t:'Get Your Pacer Grade',  d:'Our AI race intelligence analyzes every race — your pacing, your performance, your training — and grades each one. Your career score tracks your growth as an athlete.' },
              { n:'Step 05', t:'Discover What\'s Next', d:'Browse thousands of upcoming races on an interactive map. Filter by distance, location, and date. Find your next start line and add it to your passport before race day.' },
            ].map((s,i) => (
              <div key={i} className="lp-how-step lp-reveal">
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-title">{s.t}</div>
                <p className="lp-step-desc">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PACER AI */}
      <section className="lp-pacer">
        <div className="lp-pacer-inner">
          <div className="lp-pacer-tag">Artificial Intelligence</div>
          <h2 className="lp-pacer-title">Meet <span>Pacer.</span><br/>Your AI Race<br/>Intelligence.</h2>
          <p className="lp-pacer-sub">Every race in your passport is analyzed by Pacer — an AI built specifically for endurance athletes. Not generic advice. Intelligence that knows your complete race history.</p>
          <div className="lp-pacer-grid">
            {[
              { n:'01', t:'Race Import',       d:'Pacer automatically finds and imports your past races from your name and running history. Your passport builds itself.' },
              { n:'02', t:'Race Insights',     d:'After every race, Pacer delivers a personalized analysis — what went right, what to improve, and what it means for your journey as an athlete.' },
              { n:'03', t:'Performance Grade', d:'Every finish gets a grade. Pacer scores your performance against your history and against runners of similar ability across the same distance.' },
              { n:'04', t:'Training Grade',    d:'Link your activity and Pacer grades your training block — consistency, load, long run quality, and how well your preparation matched race day.' },
              { n:'05', t:'Career Score',      d:'A single number that tracks your progression as an endurance athlete across every race, every distance, and every year.' },
              { n:'06', t:'Race Suggestions',  d:'Based on your history, fitness, and goals, Pacer recommends upcoming races that are the right challenge at the right time.' },
            ].map((c,i) => (
              <div key={i} className="lp-pacer-card lp-reveal">
                <div className="lp-pacer-num">{c.n}</div>
                <div className="lp-pacer-card-title">{c.t}</div>
                <p className="lp-pacer-card-desc">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR RACERS / RACE DIRECTORS */}
      <div className="lp-sides-wrapper">
        <section className="lp-sides">
          <div className="lp-reveal">
            <div className="lp-side-tag">For Racers</div>
            <h3 className="lp-side-title">Your Entire<br/>Racing Life.<br/>One Place.</h3>
            <ul className="lp-side-list">
              {[
                'Complete race history — every distance, every year, beautifully organized',
                'Personal race pages with photos, story, gear, and activity maps',
                'AI-powered race grades and career score from Pacer',
                'Collectible stamps for every finish line you have ever crossed',
                'A public passport URL — your running identity on the internet',
                'Interactive race discovery map to find your next start line',
                'The Wall — share your story and inspire other athletes',
              ].map((item,i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
          <div className="lp-reveal">
            <div className="lp-side-tag">For Race Directors</div>
            <h3 className="lp-side-title">Your Race.<br/>Every<br/>Passport.</h3>
            <ul className="lp-side-list">
              {[
                'Your race in front of every athlete on the platform',
                'Design a custom stamp — every finisher takes it home in their passport permanently',
                'Your race lives in thousands of athlete passports forever',
                'Athletes discover your race on the interactive map',
                'A permanent, beautiful record of what every finisher accomplished',
              ].map((item,i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        </section>
      </div>

      {/* STAMPS */}
      <section className="lp-section-stamps">
        <div className="lp-stamps-header lp-reveal">
          <div className="lp-section-tag">Race Stamps</div>
          <h2 className="lp-stamps-headline">Every Finish Line.<br/>A New Stamp.</h2>
          <p className="lp-stamps-sub">Your passport fills up race by race. Each stamp is a permanent record of a start line you showed up to and a finish line you crossed.</p>
        </div>
        <div className="lp-stamps-track" id="lp-stamps-track">
          {[
            { d:'140.6', n:'IRONMAN World Championship', l:'Kona, HI',         y:'2023', g:true  },
            { d:'26.2',  n:'NYC Marathon',               l:'New York, NY',     y:'2024', g:false },
            { d:'70.3',  n:'IRONMAN 70.3 Augusta',       l:'Augusta, GA',      y:'2024', g:false },
            { d:'13.1',  n:'Cherry Blossom Half',        l:'Washington, DC',   y:'2025', g:true  },
            { d:'26.2',  n:'Marine Corps Marathon',      l:'Arlington, VA',    y:'2024', g:false },
            { d:'10K',   n:'Broad Street Run',           l:'Philadelphia, PA', y:'2023', g:false },
            { d:'5K',    n:'Turkey Trot',                l:'Chicago, IL',      y:'2023', g:false },
            { d:'50K',   n:'Seneca Creek Trail Ultra',   l:'Gaithersburg, MD', y:'2022', g:true  },
            { d:'13.1',  n:'Rock n Roll Half',           l:'Nashville, TN',    y:'2023', g:false },
            { d:'5K',    n:'Color Run',                  l:'Denver, CO',       y:'2022', g:false },
          ].map((s,i) => (
            <div key={i} className={'lp-stamp' + (s.g ? ' gold' : '')}>
              <div className="lp-sd">{s.d}</div>
              <div className="lp-sn">{s.n}</div>
              <div className="lp-sl">{s.l}</div>
              <div className="lp-sy">{s.y}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="lp-showcase">
        <div className="lp-showcase-inner lp-reveal">
          <div className="lp-section-tag">Your Digital Identity</div>
          <h2 className="lp-showcase-headline">Your Passport.<br/>Your <span>Story.</span><br/>Share It.</h2>
          <p className="lp-showcase-desc">
            Every Race Passport member gets a <strong>public profile</strong> — a living digital passport that tells your story as a runner. Your stamps, your stats, your PRs, all in one link.<br/><br/>
            Put it in your Instagram bio. Send it to your family. <strong>Your racing identity, yours forever.</strong>
          </p>
          <button className="lp-btn-showcase" onClick={openModal}>View a Sample Passport</button>
        </div>
      </section>

      {/* MODAL */}
      <div className="lp-modal-overlay" id="lp-modal" onClick={e => { if (e.target.id === 'lp-modal') closeModal() }}>
        <div className="lp-modal">
          <button className="lp-modal-close" onClick={closeModal}>✕</button>
          <div className="lp-modal-header">
            <div className="lp-modal-label">Race Passport · Public Profile</div>
            <div className="lp-modal-profile">
              <div className="lp-modal-avatar">RR</div>
              <div>
                <div className="lp-modal-name">Ryan Runner</div>
                <div className="lp-modal-handle">racepassportapp.com/ryan-runner</div>
              </div>
            </div>
          </div>
          <div className="lp-modal-stats">
            {[{n:'14',l:'Races'},{n:'341',l:'Miles'},{n:'4:02',l:'PR Marathon'},{n:'3',l:'Upcoming'}].map((s,i) => (
              <div key={i} className="lp-modal-stat"><div className="lp-modal-stat-num">{s.n}</div><div className="lp-modal-stat-label">{s.l}</div></div>
            ))}
          </div>
          <div className="lp-modal-stamps-section">
            <div className="lp-modal-section-label">Stamps Collected</div>
            <div className="lp-modal-stamps-grid">
              {[{d:'140.6',n:'IRONMAN',y:'2023',g:true},{d:'26.2',n:'NYC Marathon',y:'2024'},{d:'70.3',n:'IRONMAN 70.3',y:'2024'},{d:'13.1',n:'Cherry Blossom',y:'2025'},{d:'10K',n:'Broad St Run',y:'2023'},{d:'5K',n:'Turkey Trot',y:'2023'},{d:'5K',n:'Color Run',y:'2022'}].map((s,i) => (
                <div key={i} className={'lp-ms' + (s.g ? ' g' : '')}><div className="lp-ms-d">{s.d}</div><div className="lp-ms-n">{s.n}</div><div className="lp-ms-y">{s.y}</div></div>
              ))}
              <div className="lp-ms" style={{borderStyle:'dashed',opacity:0.3}}><div className="lp-ms-d" style={{fontSize:20,color:'var(--muted)'}}>+</div><div className="lp-ms-n" style={{color:'var(--muted)'}}>Next Race</div></div>
            </div>
          </div>
          <div className="lp-modal-upcoming">
            <div className="lp-modal-section-label">Upcoming Races</div>
            <div className="lp-modal-race"><div><div className="lp-modal-race-name">Marine Corps Marathon</div><div className="lp-modal-race-meta">Washington, DC · Oct 26, 2025 · 26.2 mi</div></div><div className="lp-modal-race-badge">Registered</div></div>
            <div className="lp-modal-race"><div><div className="lp-modal-race-name">IRONMAN 70.3 Atlantic City</div><div className="lp-modal-race-meta">Atlantic City, NJ · Sept 14, 2025 · 70.3 mi</div></div><div className="lp-modal-race-badge">Registered</div></div>
          </div>
          <div className="lp-modal-share">
            <div className="lp-modal-share-url">racepassportapp.com/ryan-runner</div>
            <button className="lp-modal-share-btn" id="lp-share-btn" onClick={copyLink}>Copy Link</button>
          </div>
        </div>
      </div>

      {/* WAITLIST */}
      <section className="lp-waitlist" id="waitlist">
        <div className="lp-waitlist-inner">
          <div className="lp-waitlist-eyebrow">Early Access</div>
          <h2 className="lp-waitlist-title">Claim Your<br/>Passport</h2>
          <p className="lp-waitlist-sub">
            {LIVE ? 'Your passport is ready. Create your account and start building.' : 'Be first when we launch. Racers and race directors both welcome.'}
          </p>
          {LIVE ? (
            <button className="lp-waitlist-btn" style={{maxWidth:560,margin:'0 auto',display:'block'}} onClick={() => navigate('/signup')}>
              Create Your Passport
            </button>
          ) : (
            <form className="lp-waitlist-form" id="lp-waitlist-form" onSubmit={handleWaitlist}>
              <input type="email" className="lp-waitlist-input" id="lp-email" name="email" placeholder="your@email.com" required />
              <select className="lp-waitlist-select" id="lp-role" name="role">
                <option value="racer">I am a Racer</option>
                <option value="director">I am a Race Director</option>
              </select>
              <button type="submit" className="lp-waitlist-btn" id="lp-submit-btn">Join the Waitlist</button>
            </form>
          )}
          <div className="lp-success-msg" id="lp-success-msg">You are on the list. See you at the start line.</div>
          <p className="lp-waitlist-note">No spam. No noise. Just your passport when it is ready.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">Race Passport</div>
        <div className="lp-footer-note">© 2026 Race Passport · racepassportapp.com</div>
        <a href="mailto:ryan@racepassportapp.com" className="lp-footer-email">ryan@racepassportapp.com</a>
      </footer>

    </div>
  )
}
