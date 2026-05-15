// src/components/RaceRecapsCard.jsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDistanceColor } from '../lib/colors'

const SORT_OPTIONS = [
  { key: 'recent',   label: 'Most Recent' },
  { key: 'oldest',   label: 'Oldest First' },
  { key: 'grade',    label: 'Best Grade' },
  { key: 'distance', label: 'By Distance' },
]

const GRADE_ORDER = ['A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F']
const DIST_ORDER  = ['140.6','70.3','50K','Ultra','26.2','13.1','10 mi','10K','5K','Other']

function gradeColor(g) {
  if (!g) return '#9aa5b4'
  if (g.startsWith('A')) return '#16a34a'
  if (g.startsWith('B')) return '#C9A84C'
  return '#9aa5b4'
}

function DistStamp({ distance, size = 48 }) {
  const isTri = distance && (distance.includes('70.3') || distance.includes('140.6') || distance.toLowerCase?.().includes('tri'))
  const effectiveDist = isTri ? '70.3' : distance
  const c = getDistanceColor(effectiveDist)
  const cleaned = (distance || '').replace(' mi','').replace(' miles','')
  const fs = cleaned.length > 4 ? 11 : cleaned.length > 2 ? 14 : 18
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${c.stampBorder}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: `0.75px dashed ${c.stampDash}` }} />
      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: fs, color: c.stampText, letterSpacing: '0.3px', position: 'relative', zIndex: 1, textAlign: 'center', lineHeight: 1 }}>{cleaned}</span>
    </div>
  )
}

// Career overview — page 0
function CareerPage({ races, careerScore, careerGrade, pacerInsight }) {
  const graded = races.filter(r => r.pacer_grade)
  const avgGradeIdx = graded.length
    ? Math.round(graded.reduce((s, r) => s + (GRADE_ORDER.indexOf(r.pacer_grade) === -1 ? 7 : GRADE_ORDER.indexOf(r.pacer_grade)), 0) / graded.length)
    : -1
  const avgGrade = avgGradeIdx >= 0 ? GRADE_ORDER[Math.min(avgGradeIdx, GRADE_ORDER.length-1)] : null

  const gColor = gradeColor(careerGrade)
  const dashLen = careerScore ? ((careerScore / 100) * 232.5).toFixed(1) : '0'

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Score ring + insight */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
        {careerScore && (
          <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
            <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="44" cy="44" r="37" fill="none" stroke="#f0f2f5" strokeWidth="7"/>
              <circle cx="44" cy="44" r="37" fill="none" stroke="#C9A84C" strokeWidth="7"
                strokeDasharray={`${dashLen} 232.5`} strokeLinecap="round"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: '#1B2A4A', lineHeight: 1 }}>{careerScore}</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>{careerGrade}</div>
            </div>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 6 }}>Pacer · Career Overview</div>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 14, color: '#1B2A4A', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
            {pacerInsight || 'Import your races and connect Strava to unlock your career intelligence.'}
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Races Graded', value: graded.length },
          { label: 'Avg Grade', value: avgGrade || '—' },
          { label: 'Total Races', value: races.length },
        ].map(s => (
          <div key={s.label} style={{ background: '#f8f9fb', borderRadius: 10, padding: '12px', textAlign: 'center', border: '1px solid #e8eaed' }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: '#1B2A4A', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', color: '#9aa5b4', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(27,42,74,0.04)', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>⚡</span>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#6b7a8d', lineHeight: 1.5 }}>
          Tap the arrows to explore each race — see your Pacer reflection, report card grades, and what to improve next.
        </span>
      </div>
    </div>
  )
}

// Individual race page
function RacePage_({ race, navigate }) {
  const reflection  = race.pacer_reflection   // { headline, reflection, highlight }
  const reportCard  = race.pacer_report_card  // { summary, grades[], top_win, next_focus }
  const grade       = race.pacer_grade
  const score       = race.pacer_score
  const partial     = race.pacer_score_partial !== false
  const gColor      = gradeColor(grade)

  const isTri = race.name && (race.name.toLowerCase().includes('ironman') || race.name.toLowerCase().includes('70.3') || race.name.toLowerCase().includes('140.6'))
  const effectiveDist = isTri ? '70.3' : (race.distance || '26.2')
  const c = getDistanceColor(effectiveDist)

  return (
    <div style={{ padding: '0 24px 20px' }}>
      {/* Race header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingTop: 20 }}>
        <DistStamp distance={race.distance} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: '#1B2A4A', letterSpacing: 0.5, lineHeight: 1.1, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {race.name}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#9aa5b4' }}>
            {race.location} · {race.date}
          </div>
          {race.is_pr && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: '2px 8px', marginTop: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C' }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '1px', color: '#C9A84C', textTransform: 'uppercase' }}>PR</span>
            </div>
          )}
        </div>
        {/* Grade */}
        {grade ? (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: gColor, lineHeight: 1 }}>{partial ? '~' : ''}{grade}</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#9aa5b4', letterSpacing: '1px', textTransform: 'uppercase' }}>{partial ? 'partial' : 'grade'}</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', flexShrink: 0, opacity: 0.4 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: '#9aa5b4', lineHeight: 1 }}>—</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#9aa5b4', letterSpacing: '1px', textTransform: 'uppercase' }}>no grade</div>
          </div>
        )}
      </div>

      {/* Finish time */}
      {race.time && (
        <div style={{ background: '#1B2A4A', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: '#fff', letterSpacing: 1, lineHeight: 1 }}>{race.time}</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginTop: 2 }}>Finish Time</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{race.distance} · {race.location?.split(',')[1]?.trim() || ''}</div>
          </div>
        </div>
      )}

      {/* Pacer reflection */}
      {reflection ? (
        <div style={{ background: 'rgba(201,168,76,0.04)', border: '1.5px solid rgba(201,168,76,0.15)', borderLeft: '4px solid #C9A84C', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 12 }}>⚡</span>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: '#C9A84C', textTransform: 'uppercase' }}>Pacer on this race</span>
          </div>
          {reflection.headline && (
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: '#1B2A4A', letterSpacing: 0.5, lineHeight: 1.2, marginBottom: 6 }}>{reflection.headline}</div>
          )}
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#3d4f6b', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
            {reflection.reflection}
          </p>
          {reflection.highlight && (
            <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,168,76,0.1)', borderRadius: 20, padding: '4px 10px' }}>
              <span style={{ fontSize: 10 }}>★</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 600, color: '#C9A84C' }}>{reflection.highlight}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#f8f9fb', border: '1px solid #e8eaed', borderRadius: 10, padding: '12px 14px', marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#9aa5b4' }}>
            Visit your race page to generate Pacer's reflection on this race.
          </div>
        </div>
      )}

      {/* Report card grades */}
      {reportCard?.grades?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: '#9aa5b4', textTransform: 'uppercase', marginBottom: 8 }}>Report Card</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reportCard.grades.map(g => {
              const gc = gradeColor(g.grade)
              return (
                <div key={g.category} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8f9fb', borderRadius: 10, border: '1px solid #e8eaed' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${gc}18`, border: `1.5px solid ${gc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: gc, letterSpacing: 0.5 }}>{g.grade}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A', marginBottom: 1 }}>{g.category}</div>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#9aa5b4', lineHeight: 1.4 }}>{g.comment}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top win + next focus */}
      {reportCard && (reportCard.top_win || reportCard.next_focus) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {reportCard.top_win && (
            <div style={{ padding: '11px 12px', background: 'rgba(22,163,74,0.05)', borderRadius: 10, border: '1px solid rgba(22,163,74,0.15)' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', color: '#16a34a', textTransform: 'uppercase', marginBottom: 4 }}>🏆 Top Win</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#1B2A4A', lineHeight: 1.5 }}>{reportCard.top_win}</div>
            </div>
          )}
          {reportCard.next_focus && (
            <div style={{ padding: '11px 12px', background: 'rgba(201,168,76,0.05)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.15)' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>⚡ Next Focus</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#1B2A4A', lineHeight: 1.5 }}>{reportCard.next_focus}</div>
            </div>
          )}
        </div>
      )}

      {/* Partial grade callout */}
      {grade && partial && (
        <div style={{ background: 'rgba(27,42,74,0.04)', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 10, padding: '11px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>📊</span>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 600, color: '#1B2A4A', marginBottom: 2 }}>This is a partial grade</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#9aa5b4', lineHeight: 1.5 }}>
              Visit your race page and connect Strava to unlock your full score — training data counts for 60% of the grade.
            </div>
          </div>
        </div>
      )}

      {/* View full race page CTA */}
      <button onClick={() => navigate(`/race/${race.id}`)}
        style={{ width: '100%', padding: '11px', border: '1.5px solid #e2e6ed', borderRadius: 10, background: 'transparent', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#1B2A4A', cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e6ed'; e.currentTarget.style.color = '#1B2A4A' }}>
        Open Full Race Page →
      </button>
    </div>
  )
}

export default function RaceRecapsCard({ passportRaces, careerScore, careerGrade, pacerInsight }) {
  const navigate = useNavigate()
  const [page, setPage]     = useState(0) // 0 = career, 1+ = races
  const [sort, setSort]     = useState('recent')
  const [showSort, setShowSort] = useState(false)

  const sortedRaces = useMemo(() => {
    const races = [...(passportRaces || [])]
    switch (sort) {
      case 'recent':
        return races.sort((a, b) => (b.date_sort || '').localeCompare(a.date_sort || ''))
      case 'oldest':
        return races.sort((a, b) => (a.date_sort || '').localeCompare(b.date_sort || ''))
      case 'grade':
        return races.sort((a, b) => {
          const ai = GRADE_ORDER.indexOf(a.pacer_grade)
          const bi = GRADE_ORDER.indexOf(b.pacer_grade)
          if (ai === -1 && bi === -1) return 0
          if (ai === -1) return 1
          if (bi === -1) return -1
          return ai - bi
        })
      case 'distance':
        return races.sort((a, b) => {
          const ai = DIST_ORDER.indexOf(a.distance)
          const bi = DIST_ORDER.indexOf(b.distance)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
      default:
        return races
    }
  }, [passportRaces, sort])

  const totalPages = 1 + sortedRaces.length // page 0 = career, rest = races
  const currentRace = page > 0 ? sortedRaces[page - 1] : null

  if (!passportRaces?.length) return null

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: '2.5px', color: '#9aa5b4', textTransform: 'uppercase' }}>Race Passport · Pacer</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: '#1B2A4A', marginTop: 2 }}>Race Recaps</div>
        </div>
        {/* Sort dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowSort(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1.5px solid #e2e6ed', borderRadius: 20, background: 'transparent', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '1px', color: '#9aa5b4', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'uppercase' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#1B2A4A'}
            onMouseLeave={e => !showSort && (e.currentTarget.style.borderColor = '#e2e6ed')}>
            {SORT_OPTIONS.find(s => s.key === sort)?.label}
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ transform: showSort ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showSort && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 10, boxShadow: '0 4px 16px rgba(27,42,74,0.1)', minWidth: 150, zIndex: 20, overflow: 'hidden' }}>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => { setSort(opt.key); setShowSort(false); setPage(0) }}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: sort === opt.key ? 'rgba(201,168,76,0.08)' : 'transparent', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '0.5px', color: sort === opt.key ? '#C9A84C' : '#1B2A4A', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (sort !== opt.key) e.currentTarget.style.background = '#f8f9fb' }}
                  onMouseLeave={e => { if (sort !== opt.key) e.currentTarget.style.background = 'transparent' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Page content */}
      <div style={{ minHeight: 300 }}>
        {page === 0
          ? <CareerPage races={sortedRaces} careerScore={careerScore} careerGrade={careerGrade} pacerInsight={pacerInsight} />
          : currentRace && <RacePage_ race={currentRace} navigate={navigate} />
        }
      </div>

      {/* Pagination */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Prev */}
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid', borderRadius: 20, background: 'transparent', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.3 : 1, borderColor: '#e2e6ed', color: '#1B2A4A', transition: 'all 0.15s' }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Prev
        </button>

        {/* Dot indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '60%' }}>
          {Array.from({ length: Math.min(totalPages, 9) }).map((_, i) => {
            const dotPage = totalPages <= 9 ? i : Math.round((i / 8) * (totalPages - 1))
            const isActive = page === dotPage || (i === 8 && page === totalPages - 1)
            return (
              <div key={i} onClick={() => setPage(dotPage)}
                style={{ width: isActive ? 20 : 6, height: 6, borderRadius: 3, background: isActive ? '#C9A84C' : '#e2e6ed', transition: 'all 0.2s', cursor: 'pointer' }} />
            )
          })}
        </div>

        {/* Next */}
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid', borderRadius: 20, background: 'transparent', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page === totalPages - 1 ? 0.3 : 1, borderColor: '#e2e6ed', color: '#1B2A4A', transition: 'all 0.15s' }}>
          Next
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  )
}
