import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useEffect } from 'react'

export default function Privacy() {
  const navigate = useNavigate()
  const { t } = useTheme()
  const LAST_UPDATED = 'April 23, 2026'

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'rp-legal-styles'
    style.textContent = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');`
    if (!document.getElementById('rp-legal-styles')) document.head.appendChild(style)
    return () => document.getElementById('rp-legal-styles')?.remove()
  }, [])

  const Section = ({ title, children }) => (
    <div style={{ marginBottom:'36px' }}>
      <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:t.text, letterSpacing:'1px', marginBottom:'12px' }}>{title}</h2>
      <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'15px', color:t.textMuted, lineHeight:1.8 }}>{children}</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:t.bg, transition:'background 0.25s' }}>
      <div style={{ maxWidth:'760px', margin:'0 auto', padding:'48px 24px 80px' }}>
        <button onClick={() => navigate(-1)}
          style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#C9A84C', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', marginBottom:'32px', padding:0 }}>
          ← Back
        </button>

        <div style={{ marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'10px', letterSpacing:'3px', color:t.textMuted }}>RACE PASSPORT</span>
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'48px', color:t.text, letterSpacing:'2px', marginBottom:'8px' }}>Privacy Policy</h1>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:t.textMuted, marginBottom:'40px' }}>Last updated: {LAST_UPDATED}</p>

        <Section title="Overview">
          Race Passport is built on a simple principle: your race data belongs to you. We collect only what's necessary to provide the Service, we're transparent about how we use it, and we never sell it.
        </Section>

        <Section title="1. Information We Collect">
          <strong style={{ color:t.text }}>Account Information:</strong> Your name, email address, and password when you create an account.
          <br /><br />
          <strong style={{ color:t.text }}>Profile Information:</strong> Optional information you choose to provide including date of birth, gender, home state, shirt size, emergency contact, and running background.
          <br /><br />
          <strong style={{ color:t.text }}>Race History:</strong> Races you import from Athlinks, RunSignup, or add manually — including race names, distances, finish times, and dates.
          <br /><br />
          <strong style={{ color:t.text }}>Strava Data (if connected):</strong> Activity statistics including total runs, miles, and frequency. We do not store your GPS routes, heart rate data, or detailed health metrics.
          <br /><br />
          <strong style={{ color:t.text }}>The Wall Content:</strong> Stories you choose to post, including whether you post anonymously.
          <br /><br />
          <strong style={{ color:t.text }}>Usage Data:</strong> Standard web analytics including pages visited and features used, collected to improve the Service.
        </Section>

        <Section title="2. How We Use Your Information">
          <ul style={{ paddingLeft:'20px', display:'flex', flexDirection:'column', gap:'6px' }}>
            <li>To provide and personalize the Race Passport service</li>
            <li>To power Pacer, our AI coaching feature (see Section 4)</li>
            <li>To show you relevant race recommendations based on your history and location</li>
            <li>To display your public passport when you share your profile link</li>
            <li>To send transactional emails (account verification, password reset)</li>
            <li>To improve the platform based on aggregate usage patterns</li>
          </ul>
        </Section>

        <Section title="3. Information We Never Sell">
          We do not sell, rent, or share your personal information with advertisers or data brokers. Race Passport does not run ads. Your data is not a product.
        </Section>

        <Section title="4. Pacer AI and Your Data">
          Pacer uses your race history, profile settings, and Strava activity counts to generate coaching insights. Specifically:
          <ul style={{ marginTop:'10px', paddingLeft:'20px', display:'flex', flexDirection:'column', gap:'6px' }}>
            <li>Your data is sent to Anthropic's Claude API to generate insights. Anthropic processes this data under their own privacy policy and does not use it to train their models.</li>
            <li>We send only what's necessary: race names, distances, times, dates, your goal distance, and home state.</li>
            <li>We never send payment information, exact GPS data, heart rate, or health metrics to Pacer.</li>
            <li>Pacer-generated insights are cached in your browser session and not stored permanently on our servers.</li>
            <li>You can opt out of Pacer by contacting us, though this will disable AI coaching features.</li>
          </ul>
        </Section>

        <Section title="5. Third-Party Services">
          <strong style={{ color:t.text }}>Supabase:</strong> We use Supabase to store your account data and race history securely. Data is encrypted at rest and in transit.
          <br /><br />
          <strong style={{ color:t.text }}>Strava:</strong> When you connect Strava, we receive an OAuth token that allows us to read your activity data. We only request read permissions — we never post, modify, or delete your Strava data.
          <br /><br />
          <strong style={{ color:t.text }}>Anthropic:</strong> Your race data is processed by Anthropic's Claude API to power Pacer. Anthropic's privacy policy governs their handling of this data.
          <br /><br />
          <strong style={{ color:t.text }}>RunSignup / Athlinks:</strong> Race data is pulled from these platforms' public APIs. We do not share your personal data with them.
        </Section>

        <Section title="6. Data Retention">
          Your account data is retained as long as your account is active. If you delete your account, we delete your personal information within 30 days. Anonymized, aggregate usage data may be retained longer to improve the Service.
        </Section>

        <Section title="7. Your Rights">
          You have the right to:
          <ul style={{ marginTop:'10px', paddingLeft:'20px', display:'flex', flexDirection:'column', gap:'6px' }}>
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data in your profile</li>
            <li>Delete your account and associated data</li>
            <li>Disconnect Strava or other integrations at any time</li>
            <li>Export your race history</li>
          </ul>
          To exercise these rights, contact us at <a href="mailto:privacy@racepassportapp.com" style={{ color:'#C9A84C' }}>privacy@racepassportapp.com</a>
        </Section>

        <Section title="8. Children's Privacy">
          Race Passport is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us.
        </Section>

        <Section title="9. Security">
          We implement industry-standard security measures including encryption in transit (HTTPS), encryption at rest, and row-level security on our database. No system is perfectly secure — if you discover a vulnerability, please report it to <a href="mailto:security@racepassportapp.com" style={{ color:'#C9A84C' }}>security@racepassportapp.com</a>
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this Privacy Policy as the Service evolves. We will notify you of material changes via email or an in-app notice. Your continued use of Race Passport after changes constitutes acceptance.
        </Section>

        <Section title="11. Contact">
          <div>Privacy questions or requests: <a href="mailto:privacy@racepassportapp.com" style={{ color:'#C9A84C' }}>privacy@racepassportapp.com</a></div>
        </Section>

      </div>
    </div>
  )
}
