import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'
import { PHOTO_PLACEHOLDER, loadRacePhoto } from '../lib/photos'

// ── Constants ─────────────────────────────────────────────────────────────────

// Featured: well-known races only — strict blocklist applied separately
const FEATURED_RACE_NAMES = [
  'boston marathon','new york city marathon','chicago marathon','marine corps marathon',
  'la marathon','los angeles marathon','new york city half','united nyc half',
  'broad street run','cherry blossom 10 miler','bolder boulder','ironman 70.3 eagleman',
  'ironman 70.3 atlantic city','richmond marathon','colorado marathon',
  'philadelphia marathon','honolulu marathon','disney marathon',"rock 'n' roll marathon",
  "rock 'n' roll half",'city of oaks marathon','nashville marathon','big sur marathon',
  'bay to breakers','peachtree road race','falmouth road race','new york mini 10k',
]

// Anything matching these keywords is NOT a real race — excluded from results + featured
// Short words (<=4 chars) use whole-word matching to avoid false positives
const NON_RACE_KEYWORDS = [
  // Non-race event types
  'coaching','volunteering','volunteer','clinic','seminar','webinar',
  'information','info session','orientation','meeting','workshop','open house',
  'expo','packet pickup','membership','donation','fundraiser','raffle',
  'merchandise','transfer','deferral',
  // Training programs (whole-word: "training" won't match "trail racing")
  'training session','training program','training class','training run',
  'training series','training schedule',
  // Shakeout / fun runs that aren't timed races
  'shakeout run','shakeout','water stop','bagel run','group run',
  'pacer','pace group','kickoff run','fun run series',
  // Transportation — whole-word "bus" avoids Columbus/Malibu false positives
  'bus service','charter bus','chartered bus','busses','charter coach',
  'shuttle bus','motor coach','transportation to','bus and amenities',
  'bus trip','marathon bus','race bus',
  // Training programs disguised as races
  'couch to','hibernation to','0 to 5k','zero to 5k','beginners to',
  'from couch','learn to run','intro to running','road to','program',
  // Virtual / non-physical
  'virtual race','virtual run','online race',
]

// Distance bucket classification — strict, anything uncertain → Other
const DISTANCE_GROUPS = [
  { key:'5K',   label:'5K',          color:'#1E5FA8' },
  { key:'10K',  label:'10K',         color:'#1E5FA8' },
  { key:'13.1', label:'Half Marathon (13.1)', color:'#1E5FA8' },
  { key:'26.2', label:'Marathon (26.2)',      color:'#C9A84C' },
  { key:'TRI',  label:'Triathlon',   color:'#B83232' },
  { key:'ULTRA',label:'Ultra',       color:'#9C7C4A' },
  { key:'OTHER',label:'Other',       color:'#6B7A8D' },
]

// Cards per distance section shown initially
const PER_SECTION_INITIAL = 8

const STATE_NAME_TO_ABBR = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA','colorado':'CO',
  'connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID',
  'illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA',
  'maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN',
  'mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
  'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC',
  'north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA',
  'rhode island':'RI','south carolina':'SC','south dakota':'SD','tennessee':'TN','texas':'TX',
  'utah':'UT','vermont':'VT','virginia':'VA','washington':'WA','west virginia':'WV',
  'wisconsin':'WI','wyoming':'WY','dc':'DC','district of columbia':'DC',
}

const TERRAIN_OPTIONS = ['All','Road','Trail','Multi','Bridge/Road']
const SPORT_OPTIONS   = ['All','Running','Triathlon','Cycling','Swimming']
const SORT_OPTIONS    = [
  { label:'Date (Soonest)',    value:'date-asc'   },
  { label:'Date (Latest)',     value:'date-desc'  },
  { label:'Price (Low→High)', value:'price-asc'  },
  { label:'Price (High→Low)', value:'price-desc' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineDistance(lat1,lng1,lat2,lng2) {
  const R=3959,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

function matchesSearch(race, q) {
  if (!q) return true
  const lower = q.toLowerCase().trim()
  const abbr = STATE_NAME_TO_ABBR[lower]
  if (abbr) return (race.state||'').toUpperCase() === abbr
  return (
    (race.name||'').toLowerCase().includes(lower) ||
    (race.location||'').toLowerCase().includes(lower) ||
    (race.city||'').toLowerCase().includes(lower) ||
    (race.state||'').toLowerCase().includes(lower)
  )
}

function parseCityState(race) {
  if (race.city && race.state) return { city: race.city, state: race.state }
  const loc = race.location || ''
  const parts = loc.split(',').map(s => s.trim())
  if (parts.length >= 2) return { city: parts[0], state: parts[parts.length-1].toUpperCase().slice(0,2) }
  return { city:'', state:'' }
}

// Whole-word keyword check — prevents "bus" matching "Columbus", "training" matching "trail racing" etc.
function nameContainsKeyword(name, kw) {
  // For short keywords (<=4 chars) use word-boundary check
  // For longer keywords, substring is fine
  if (kw.length <= 4) {
    const re = new RegExp(`(^|\\s|-)${kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(\\s|-|$)`, 'i')
    return re.test(name)
  }
  return name.includes(kw)
}

function isActualRace(r) {
  const name = (r.name || '').toLowerCase()
  return !NON_RACE_KEYWORDS.some(kw => nameContainsKeyword(name, kw))
}

// Strict distance classification — uncertain → OTHER
function classifyDistance(race) {
  const d = (race.distance || '').toLowerCase().replace(/\s/g,'')
  const name = (race.name || '').toLowerCase()
  // Triathlon
  if (['70.3','140.6','triathlon','ironman','tri'].some(t => d.includes(t)) ||
      ['triathlon','ironman','70.3','140.6'].some(t => name.includes(t))) return 'TRI'
  // Ultra
  if (['50k','50m','100k','100m','ultra'].some(t => d.includes(t)) ||
      ['ultramarathon','ultra marathon','50k','100k','50 mile','100 mile'].some(t => name.includes(t))) return 'ULTRA'
  // Marathon 26.2 — must be explicit, not just "marathon" in name (could be relay etc)
  if (d === '26.2' || d === '26.2mi' || d === '42k' || d === '42.2k') return '26.2'
  if (d.includes('26.2') && !d.includes('relay')) return '26.2'
  // Half 13.1
  if (d === '13.1' || d === '13.1mi' || d === '21k' || d === '21.1k') return '13.1'
  if (d.includes('13.1') && !d.includes('relay')) return '13.1'
  // 10K
  if (d === '10k' || d === '10km' || d === '6.2mi' || d === '6.2m') return '10K'
  if (d.includes('10k') || d.includes('10km')) return '10K'
  // 5K
  if (d === '5k' || d === '5km' || d === '3.1mi' || d === '3.1m') return '5K'
  if (d.includes('5k') || d.includes('5km')) return '5K'
  // Anything else — Other (includes relays, fun runs with weird distances, etc.)
  return 'OTHER'
}

const API_BASE = '/api/runsignup'
const enrichCache = new Set()

// Session storage keys for back-button state restore
const SS_KEY = 'rp_discover_state'

// ── Sub-components ────────────────────────────────────────────────────────────

function CardStamp({ distance, size=50 }) {
  const colors = getDistanceColor(distance)
  const cleaned = (distance||'').replace(' mi','')
  const fs = cleaned.length>3 ? 9 : cleaned.length>2 ? 11 : 14
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${colors.stampBorder}`, background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:`0.75px dashed ${colors.stampDash}` }} />
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:colors.stampText, letterSpacing:'0.5px', position:'relative', zIndex:1 }}>{cleaned}</span>
    </div>
  )
}

function RaceCard({ race: initialRace, isActive, onClick, featured, t }) {
  const [hovered, setHovered]     = useState(false)
  const [race, setRace]           = useState(initialRace)
  const [photo, setPhoto]         = useState(PHOTO_PLACEHOLDER)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    if (featured || race.hero_image || enrichCache.has(race.id)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      enrichCache.add(race.id)
      fetch(`${API_BASE}?action=enrich_race&race_id=${race.id}`)
        .then(r => r.json())
        .then(data => { if (data.hero_image) setRace(prev => ({ ...prev, hero_image: data.hero_image })) })
        .catch(() => {})
    }, { rootMargin:'200px' })
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [race.id, race.hero_image, featured])

  useEffect(() => {
    setPhotoLoaded(false)
    setPhoto(PHOTO_PLACEHOLDER)
    const enriched = { ...race, ...parseCityState(race) }
    if (featured) {
      // Small defer so DOM is painted before Supabase query fires
      const tid = setTimeout(() => {
        loadRacePhoto(enriched).then(url => { if (url) { setPhoto(url); setPhotoLoaded(true) } })
      }, 50)
      return () => clearTimeout(tid)
    } else {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        loadRacePhoto(enriched).then(url => { if (url) { setPhoto(url); setPhotoLoaded(true) } })
      }, { rootMargin:'150px' })
      if (cardRef.current) observer.observe(cardRef.current)
      return () => observer.disconnect()
    }
  }, [race.id, race.city, race.state, race.hero_image, featured])

  return (
    <div ref={cardRef}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ borderRadius:'14px', overflow:'hidden', background:t.surface, flexShrink:featured?0:undefined, width:featured?'clamp(220px,20vw,300px)':undefined, boxShadow:hovered?t.cardShadowHover:t.cardShadow, cursor:'pointer', transition:'transform 0.2s,box-shadow 0.2s', transform:hovered?'translateY(-5px)':'none', outline:isActive?'2.5px solid #C9A84C':'none', outlineOffset:'2px' }}>
      <div style={{ position:'relative', height:featured?170:200, overflow:'hidden', background:'#1B2A4A' }}>
        <img src={photo} alt={race.name}
          style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s, opacity 0.5s', transform:hovered?'scale(1.05)':'scale(1)', opacity:photoLoaded?1:0 }}
          onLoad={() => setPhotoLoaded(true)} onError={e => e.target.style.display='none'} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 20%,rgba(0,0,0,0.5))' }} />
        {!featured && (
          <div style={{ position:'absolute', inset:0, background:'rgba(27,42,74,0.9)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px', opacity:hovered?1:0, transition:'opacity 0.25s', padding:'20px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', width:'100%' }}>
              {[
                { label:'Price',     value:race.price?`$${race.price}`:'TBD' },
                { label:'Terrain',   value:race.terrain||'Road' },
                { label:'Elevation', value:race.elevation||'—' },
                { label:'Finishers', value:race.est_finishers?race.est_finishers.toLocaleString():'—' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:'4px' }}>{s.label}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'18px', color:'#fff', letterSpacing:'0.5px', lineHeight:1 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {featured && race.price && (
          <div style={{ position:'absolute', top:10, right:10, background:'rgba(27,42,74,0.85)', borderRadius:'6px', padding:'3px 9px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'1px', color:'#fff' }}>${race.price}</div>
        )}
        <div style={{ position:'absolute', bottom:10, left:10, opacity:(!featured&&hovered)?0:1, transition:'opacity 0.2s' }}>
          <CardStamp distance={race.distance||''} size={featured?42:50} />
        </div>
      </div>
      <div style={{ padding:'12px 14px', borderTop:`1px solid ${t.borderLight}` }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:featured?15:18, color:t.text, letterSpacing:'0.5px', marginBottom:'5px', lineHeight:1.2 }}>{race.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted }}>{race.location}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:t.text }}>{race.date}</div>
        </div>
      </div>
    </div>
  )
}

function ScrollRow({ children }) {
  const ref = useRef(null)
  const [showLeft, setShowLeft]   = useState(false)
  const [showRight, setShowRight] = useState(true)
  const [hovering, setHovering]   = useState(false)
  const check = () => {
    const el = ref.current; if (!el) return
    setShowLeft(el.scrollLeft > 10)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }
  useEffect(() => {
    const el = ref.current
    if (el) { el.addEventListener('scroll', check); check() }
    return () => el?.removeEventListener('scroll', check)
  }, [])
  const scroll = d => ref.current?.scrollBy({ left:d*360, behavior:'smooth' })
  const btn = { position:'absolute', top:'45%', transform:'translateY(-50%)', zIndex:10, width:40, height:40, borderRadius:'50%', background:'#1B2A4A', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(27,42,74,0.25)', transition:'background 0.15s' }
  return (
    <div style={{ position:'relative' }} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      {showLeft && hovering && <button onClick={() => scroll(-1)} style={{ ...btn, left:-20 }} onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>}
      {showRight && hovering && <button onClick={() => scroll(1)} style={{ ...btn, right:-20 }} onMouseEnter={e => e.currentTarget.style.background='#C9A84C'} onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>}
      <div ref={ref} style={{ display:'flex', gap:'16px', overflowX:'auto', paddingBottom:'8px', paddingTop:'4px', scrollbarWidth:'none' }}>
        {children}
      </div>
    </div>
  )
}

// Distance section with its own horizontal scroll + load more
function DistanceSection({ group, races, t, activeId, setActiveId, mapInstanceRef, navigate }) {
  const [shown, setShown] = useState(PER_SECTION_INITIAL)
  const visible = races.slice(0, shown)
  const hasMore = races.length > shown
  return (
    <div style={{ marginBottom:'48px' }}>
      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:group.color, flexShrink:0 }} />
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'24px', color:t.text, letterSpacing:'1px' }}>{group.label}</span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, marginLeft:'4px' }}>{races.length} race{races.length!==1?'s':''}</span>
        <div style={{ flex:1, height:'1px', background:t.borderLight }} />
      </div>
      {/* Horizontal scroll row */}
      <ScrollRow>
        {visible.map(race => (
          <div key={race.id} id={`rc-${race.id}`} style={{ flexShrink:0, width:'clamp(240px,22vw,320px)' }}>
            <RaceCard race={race} t={t} isActive={activeId===race.id}
              onClick={() => {
                setActiveId(race.id)
                if (mapInstanceRef.current && race.lat && race.lng) {
                  mapInstanceRef.current.flyTo([race.lat,race.lng],11,{animate:true,duration:0.8})
                }
                navigate(`/race-detail/${race.id}`)
              }} />
          </div>
        ))}
        {/* Load more card at end of row */}
        {hasMore && (
          <div style={{ flexShrink:0, width:'clamp(240px,22vw,320px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <button onClick={() => setShown(s => s + PER_SECTION_INITIAL)}
              style={{ padding:'16px 28px', border:`1.5px solid ${t.border}`, borderRadius:'14px', background:t.surface, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', width:'100%', height:'200px', justifyContent:'center' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.color='#C9A84C' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.color=t.textMuted }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Load {Math.min(PER_SECTION_INITIAL, races.length - shown)} More
            </button>
          </div>
        )}
      </ScrollRow>
    </div>
  )
}

function ThemeToggle({ t, isDark, toggleTheme }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer' }} onClick={toggleTheme}>
      <button style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s', background:isDark?'#C9A84C':'#d0d7e0', padding:0, flexShrink:0 }}>
        <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
      </button>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'8px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', whiteSpace:'nowrap' }}>Night Mode</span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Discover() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, signOut } = useAuth()
  const { t, isDark, toggleTheme } = useTheme()

  const [profile, setProfile]             = useState(null)
  const [showDropdown, setShowDropdown]   = useState(false)
  const [allRaces, setAllRaces]           = useState([])
  const [featuredRaces, setFeaturedRaces] = useState([])
  const [loading, setLoading]             = useState(true)

  // Restore state from sessionStorage on back-navigation
  const restoreState = () => {
    try {
      const saved = sessionStorage.getItem(SS_KEY)
      if (saved) return JSON.parse(saved)
    } catch(e) {}
    return null
  }
  const saved = restoreState()

  const [search, setSearch]               = useState(saved?.search || '')
  const [distFilter, setDistFilter]       = useState(saved?.distFilter || 'ALL')
  const [sort, setSort]                   = useState(saved?.sort || 'date-asc')
  const [showFilters, setShowFilters]     = useState(false)
  const [maxPrice, setMaxPrice]           = useState(saved?.maxPrice || 400)
  const [terrainFilter, setTerrainFilter] = useState(saved?.terrainFilter || 'All')
  const [sportFilter, setSportFilter]     = useState(saved?.sportFilter || 'All')
  const [dateFrom, setDateFrom]           = useState(saved?.dateFrom || '')
  const [dateTo, setDateTo]               = useState(saved?.dateTo || '')
  const [committed, setCommitted]         = useState(saved?.committed || null)
  const [radius, setRadius]               = useState(saved?.radius || 75)
  const [userLat, setUserLat]             = useState(null)
  const [userLng, setUserLng]             = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [showLocationBanner, setShowLocationBanner] = useState(true)
  const [activeId, setActiveId]           = useState(null)
  const [mapBounds, setMapBounds]         = useState(null) // never restored — always fresh on load
  const [showSearchArea, setShowSearchArea] = useState(false)

  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef     = useRef({})
  const dropdownRef    = useRef(null)

  // Save state to sessionStorage whenever committed changes
  useEffect(() => {
    if (committed) {
      try {
        sessionStorage.setItem(SS_KEY, JSON.stringify({
          search, distFilter, sort, maxPrice, terrainFilter, sportFilter,
          dateFrom, dateTo, committed, radius
        }))
      } catch(e) {}
    } else {
      sessionStorage.removeItem(SS_KEY)
    }
  }, [committed])

  const commitSearch = () => {
    const c = { search, distFilter, sort, maxPrice, terrainFilter, sportFilter, dateFrom, dateTo }
    setCommitted(c)
    setActiveId(null)
    setShowSearchArea(false)
  }

  const clearAll = () => {
    setSearch(''); setDistFilter('ALL'); setMaxPrice(400)
    setTerrainFilter('All'); setSportFilter('All'); setDateFrom(''); setDateTo('')
    setCommitted(null); setActiveId(null); setShowSearchArea(false)
    sessionStorage.removeItem(SS_KEY)
  }

  // ── DERIVED STATE (before all useEffects) ─────────────────────────────────

  const isSearching = committed !== null || userLat !== null

  const filtered = (() => {
    if (!isSearching) return []
    const c = committed || { search:'', distFilter:'ALL', sort:'date-asc', maxPrice:400, terrainFilter:'All', sportFilter:'All', dateFrom:'', dateTo:'' }
    let races = allRaces.filter(r => {
      if (!isActualRace(r)) return false
      // Map bounds filter if set (Search This Area)
      if (mapBounds) {
        if (!r.lat || !r.lng) return false
        if (r.lat < mapBounds.south || r.lat > mapBounds.north ||
            r.lng < mapBounds.west  || r.lng > mapBounds.east) return false
      }
      const matchDist = c.distFilter === 'ALL' ? true : classifyDistance(r) === c.distFilter
      return (
        matchDist &&
        matchesSearch(r, c.search) &&
        (!r.price || r.price <= c.maxPrice) &&
        (c.terrainFilter === 'All' || (r.terrain||'').toLowerCase().includes(c.terrainFilter.toLowerCase())) &&
        (c.sportFilter === 'All' || r.sport === c.sportFilter) &&
        (!c.dateFrom || (r.date_sort||'') >= c.dateFrom) &&
        (!c.dateTo   || (r.date_sort||'') <= c.dateTo)
      )
    })
    if (userLat && userLng) {
      races = races
        .filter(r => {
          if (!r.lat || !r.lng) return false
          const dist = haversineDistance(userLat, userLng, r.lat, r.lng)
          r._distMi = Math.round(dist*10)/10
          return dist <= radius
        })
        .sort((a,b) => (a._distMi||999)-(b._distMi||999))
    } else {
      races.sort((a,b) => {
        if (c.sort==='date-asc')   return (a.date_sort||'').localeCompare(b.date_sort||'')
        if (c.sort==='date-desc')  return (b.date_sort||'').localeCompare(a.date_sort||'')
        if (c.sort==='price-asc')  return (a.price||0)-(b.price||0)
        if (c.sort==='price-desc') return (b.price||0)-(a.price||0)
        return 0
      })
    }
    return races
  })()

  // Group filtered races by distance bucket
  const groupedRaces = DISTANCE_GROUPS.map(group => ({
    ...group,
    races: filtered.filter(r => classifyDistance(r) === group.key)
  })).filter(g => g.races.length > 0)

  // Batch-preload photos for the first 24 races whenever filtered results change
  // loadRacePhoto has its own internal cache — preloading populates it so
  // cards render instantly when they scroll into view
  useEffect(() => {
    if (filtered.length === 0) return
    const first24 = filtered.slice(0, 24)
    first24.forEach(race => {
      const enriched = { ...race, ...parseCityState(race) }
      loadRacePhoto(enriched) // fire and forget — populates photos.js internal cache
    })
  }, [filtered.length, committed])

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      try {
        let all = [], from = 0
        while (true) {
          const { data, error } = await supabase
            .from('races')
            .select('id,name,location,city,state,lat,lng,distance,date,date_sort,price,price_raw,terrain,elevation,sport,est_finishers,is_past,registration_url')
            .eq('is_past', false)
            .order('date_sort', { ascending:true })
            .range(from, from+999)
          if (error || !data || data.length === 0) break
          all = [...all, ...data]
          if (data.length < 1000) break
          from += 1000
        }
        setAllRaces(all)
        // Featured: strict filter — real races, known names, max 5
        // Extra check: exclude anything with "training" or "program" as standalone words
        const isFeaturedSafe = (r) => {
          const name = (r.name || '').toLowerCase()
          return !/\btraining\b/.test(name) && !/\bprogram\b/.test(name) && !/\bbus\b/.test(name) && !/\bcharter\b/.test(name)
        }
        const featured = all.filter(r =>
          isActualRace(r) &&
          isFeaturedSafe(r) &&
          FEATURED_RACE_NAMES.some(name => (r.name||'').toLowerCase().includes(name))
        )
        setFeaturedRaces(featured.length >= 3 ? featured.slice(0,5) : all.filter(r => isActualRace(r) && isFeaturedSafe(r)).slice(0,5))
      } catch(e) { console.error('Failed to load races:', e) }
      setLoading(false)
    }
    loadAll()
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || isDemo(user?.email)) { setProfile({ full_name:`${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}` }); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    loadProfile()
    const style = document.createElement('style')
    style.id = 'rp-discover-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700&display=swap');
      * { box-sizing:border-box; }
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
      @keyframes spin{to{transform:rotate(360deg);}}
      @keyframes slideDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
      @keyframes pulse{0%,100%{opacity:0.5;}50%{opacity:1;}}
      .rp-nav-tab{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 24px;height:64px;justify-content:center;cursor:pointer;border:none;background:none;transition:color 0.15s;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid transparent;white-space:nowrap;}
      .dist-pill{padding:6px 16px;border-radius:20px;border:1.5px solid;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
      .filter-chip{padding:6px 14px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;cursor:pointer;transition:all 0.15s;}
      .rp-map-pin{display:flex;align-items:center;justify-content:center;border-radius:50%;border:2.5px solid rgba(255,255,255,0.9);font-family:'Bebas Neue',sans-serif;color:#fff;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.3);transition:transform 0.15s;}
      .rp-map-pin:hover{transform:scale(1.2);}
      .rp-map-pin.active{transform:scale(1.35);}
      .leaflet-popup-content-wrapper{border-radius:10px!important;padding:0!important;overflow:hidden!important;}
      .leaflet-popup-content{margin:0!important;}
      .leaflet-popup-tip-container{display:none!important;}
      div::-webkit-scrollbar{display:none;}
    `
    if (!document.getElementById('rp-discover-styles')) document.head.appendChild(style)
    const handleClick = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.getElementById('rp-discover-styles')?.remove()
      document.removeEventListener('mousedown', handleClick)
    }
  }, [user])

  // Leaflet init
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const init = async () => {
      if (!window.L) {
        const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
        await new Promise(resolve => { const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=resolve; document.head.appendChild(s) })
      }
      const L = window.L
      const map = L.map(mapRef.current, { center:[39.5,-98.35], zoom:4, zoomControl:false })
      L.tileLayer(
        isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
               : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution:'© OpenStreetMap © CARTO', maxZoom:18 }
      ).addTo(map)
      L.control.zoom({ position:'topright' }).addTo(map)
      mapInstanceRef.current = map

      // Show "Search this area" button when user moves the map
      map.on('moveend', () => {
        const b = map.getBounds()
        setMapBounds({ north:b.getNorth(), south:b.getSouth(), east:b.getEast(), west:b.getWest() })
        setShowSearchArea(true)
      })
    }
    init()
  }, [])

  // Map markers
  useEffect(() => {
    const L = window.L
    if (!L || !mapInstanceRef.current) return
    const map = mapInstanceRef.current
    Object.values(markersRef.current).forEach(m => { try { m.remove() } catch(e){} })
    markersRef.current = {}

    if (userLat && userLng) {
      L.marker([userLat,userLng], {
        icon: L.divIcon({ className:'', html:`<div style="width:14px;height:14px;border-radius:50%;background:#C9A84C;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`, iconSize:[14,14], iconAnchor:[7,7] })
      }).addTo(map).bindTooltip('You are here',{direction:'top',offset:[0,-10]})
    }

    const racesToPin = isSearching
      ? filtered.filter(r => r.lat && r.lng).slice(0,300)
      : featuredRaces.filter(r => r.lat && r.lng)

    racesToPin.forEach(race => {
      const colors  = getDistanceColor(race.distance)
      const cleaned = (race.distance||'').replace(' mi','')
      const isAct   = activeId === race.id
      const size    = isAct ? 42 : 36
      const icon = L.divIcon({
        className:'',
        html:`<div class="rp-map-pin${isAct?' active':''}" style="width:${size}px;height:${size}px;background:${colors.mapColor};font-size:${cleaned.length>3?9:cleaned.length>2?10:13}px;">${cleaned}</div>`,
        iconSize:[size,size], iconAnchor:[size/2,size/2]
      })
      const marker = L.marker([race.lat,race.lng],{icon}).addTo(map)
        .on('click',()=>{ setActiveId(race.id); document.getElementById(`rc-${race.id}`)?.scrollIntoView({behavior:'smooth',block:'center'}) })
      marker.bindPopup(
        `<div style="padding:12px 14px;min-width:180px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:#1B2A4A;">${race.name}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;color:#9aa5b4;margin-bottom:6px;">${race.date||''} · ${race.location||''}</div>
          <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:#1B2A4A;">${race.price?`$${race.price}`:'TBD'}</span>
        </div>`,
        { maxWidth:220 }
      )
      markersRef.current[race.id] = marker
    })

    if (isSearching && racesToPin.length > 0 && !mapBounds) {
      try { map.fitBounds(L.latLngBounds(racesToPin.map(r=>[r.lat,r.lng])),{padding:[40,40],maxZoom:12,animate:true,duration:0.8}) } catch(e){}
    }
  }, [filtered, activeId, userLat, userLng, featuredRaces, isSearching])

  const requestLocation = () => {
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setLocationStatus('granted')
        setShowLocationBanner(false)
        if (mapInstanceRef.current) mapInstanceRef.current.flyTo([pos.coords.latitude,pos.coords.longitude],10,{animate:true,duration:1.2})
      },
      () => { setLocationStatus('denied'); setShowLocationBanner(false) },
      { timeout:10000 }
    )
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const initials      = (profile?.full_name||'RG').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }
  const c = committed || {}
  const activeFilterCount = [
    c.terrainFilter && c.terrainFilter!=='All',
    c.sportFilter && c.sportFilter!=='All',
    c.maxPrice && c.maxPrice<400,
    !!c.dateFrom, !!c.dateTo,
  ].filter(Boolean).length

  const DIST_FILTERS = [
    { label:'All',   value:'ALL'   },
    { label:'5K',    value:'5K'    },
    { label:'10K',   value:'10K'   },
    { label:'13.1',  value:'13.1'  },
    { label:'26.2',  value:'26.2'  },
    { label:'Tri',   value:'TRI'   },
    { label:'Ultra', value:'ULTRA' },
    { label:'Other', value:'OTHER' },
  ]

  const NAV_TABS = [
    { label:'Home',     path:'/home',     icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile',  path:'/profile',  icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  const inputStyle = { border:`1.5px solid ${t.border}`, borderRadius:'8px', padding:'8px 12px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.text, background:t.inputBg, outline:'none' }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:t.bg, fontFamily:"'Barlow',sans-serif", transition:'background 0.25s' }}>

      {/* NAV */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:t.navBg, backdropFilter:'blur(10px)', borderBottom:`1px solid ${t.navBorder}`, boxShadow:t.navShadow, display:'flex', alignItems:'stretch', justifyContent:'space-between', padding:'0 40px', transition:'background 0.25s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:t.text, transition:'color 0.25s' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', alignItems:'stretch' }}>
          {NAV_TABS.map(tab => (
            <button key={tab.path} className="rp-nav-tab"
              style={{ color:location.pathname===tab.path?t.text:t.textMuted, borderBottomColor:location.pathname===tab.path?'#C9A84C':'transparent' }}
              onClick={() => navigate(tab.path)}>{tab.icon}{tab.label}</button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <div ref={dropdownRef} style={{ position:'relative' }}>
            <div onClick={() => setShowDropdown(!showDropdown)}
              style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:`2px solid ${t.border}`, transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
              onMouseLeave={e => e.currentTarget.style.borderColor=t.border}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C' }}>{initials}</span>
            </div>
            {showDropdown && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'10px', boxShadow:t.cardShadowHover, minWidth:'200px', overflow:'hidden', zIndex:100 }}>
                <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${t.borderLight}` }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:t.text }}>{profile?.full_name||'Ryan Groene'}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>racepassportapp.com/ryan-groene</div>
                </div>
                {[['My Passport','/passport'],['Settings','/profile']].map(([label,path]) => (
                  <button key={path} style={{ display:'block', width:'100%', padding:'10px 18px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text, cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    onClick={() => { navigate(path); setShowDropdown(false) }}>{label}</button>
                ))}
                {/* Dark mode toggle */}
                <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${t.borderLight}` }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:t.text }}>Dark Mode</span>
                  <button onClick={toggleTheme}
                    style={{ width:38, height:22, borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s', background:isDark?'#C9A84C':'#d0d7e0', padding:0, flexShrink:0 }}>
                    <div style={{ position:'absolute', top:3, left:isDark?'calc(100% - 19px)':'3px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
                <div style={{ height:'1px', background:t.borderLight }} />
                <button style={{ display:'block', width:'100%', padding:'10px 18px', background:'none', border:'none', textAlign:'left', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, letterSpacing:'1px', color:'#c53030', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background=t.surfaceAlt}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  onClick={handleSignOut}>Log Out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LOCATION BANNER */}
      {showLocationBanner && locationStatus === 'idle' && (
        <div style={{ background:'#1B2A4A', padding:'12px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#C9A84C" strokeWidth="1.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, color:'#fff' }}>Find races near you</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.45)' }}>Share your location to see nearby races sorted by distance</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
            <button onClick={requestLocation} disabled={locationStatus==='requesting'}
              style={{ padding:'8px 20px', border:'none', borderRadius:'8px', background:'#C9A84C', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#1B2A4A', cursor:'pointer', textTransform:'uppercase' }}>
              {locationStatus==='requesting' ? 'Requesting...' : 'Allow Location'}
            </button>
            <button onClick={() => setShowLocationBanner(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontSize:'20px', lineHeight:1, padding:0 }}>✕</button>
          </div>
        </div>
      )}

      {/* SEARCH BAR — sticky, smooth transition, no hard cutoff */}
      <div style={{ background:t.navBg, backdropFilter:'blur(12px)', borderBottom:`1px solid ${t.navBorder}`, padding:'14px 40px', position:'sticky', top:'64px', zIndex:40, transition:'background 0.25s, box-shadow 0.25s', boxShadow:'0 4px 24px rgba(27,42,74,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:'8px', background:t.inputBg, border:`1.5px solid ${t.border}`, borderRadius:'10px', padding:'10px 14px', transition:'border-color 0.15s' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke={t.textMuted} strokeWidth="1.3"/><path d="M10 10l2.5 2.5" stroke={t.textMuted} strokeWidth="1.3" strokeLinecap="round"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitSearch() }}
              placeholder="Search races, cities, states..."
              style={{ border:'none', background:'transparent', outline:'none', fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:t.text, width:'100%' }} />
            {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontSize:'18px', lineHeight:1, padding:0 }}>×</button>}
          </div>
          <button onClick={commitSearch}
            style={{ padding:'10px 24px', border:'none', borderRadius:'10px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'2px', color:'#fff', cursor:'pointer', textTransform:'uppercase', transition:'background 0.15s', whiteSpace:'nowrap', flexShrink:0 }}
            onMouseEnter={e => e.currentTarget.style.background='#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>
            Search
          </button>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inputStyle, appearance:'none', cursor:'pointer' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 18px', border:`1.5px solid ${showFilters?'#1B2A4A':t.border}`, borderRadius:'10px', background:showFilters?'#1B2A4A':t.surface, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:showFilters?'#fff':t.textMuted, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', position:'relative' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Filters
            {activeFilterCount > 0 && <span style={{ position:'absolute', top:-6, right:-6, width:16, height:16, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:700, color:'#1B2A4A' }}>{activeFilterCount}</span>}
          </button>
          {locationStatus === 'granted' && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 14px', border:'1.5px solid rgba(201,168,76,0.3)', borderRadius:'10px', background:'rgba(201,168,76,0.06)' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C' }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', whiteSpace:'nowrap' }}>Near You</span>
            </div>
          )}
        </div>

        {/* Distance pills + result count */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          {DIST_FILTERS.map(f => {
            const isAct = distFilter === f.value
            return (
              <button key={f.value} className="dist-pill" onClick={() => setDistFilter(f.value)}
                style={{ color:isAct?'#fff':t.textMuted, borderColor:isAct?'#1B2A4A':t.border, background:isAct?'#1B2A4A':t.surface }}>
                {f.label}
              </button>
            )
          })}
          {isSearching && (
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'12px' }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>
                {loading ? 'Loading...' : `${filtered.length} races`}
              </span>
              <button onClick={clearAll}
                style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#c53030', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', padding:0 }}>
                Clear ×
              </button>
            </div>
          )}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:`1px solid ${t.borderLight}`, display:'flex', gap:'24px', alignItems:'flex-start', flexWrap:'wrap', animation:'slideDown 0.2s ease' }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>Date Range</div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="date" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:t.textMuted }}>to</span>
                <input type="date" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>Max Fee: ${maxPrice}</div>
              <input type="range" min={25} max={400} step={5} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width:'160px', accentColor:'#C9A84C' }} />
            </div>
            {locationStatus === 'granted' && (
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>Radius: {radius} mi</div>
                <input type="range" min={10} max={200} step={5} value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ width:'140px', accentColor:'#C9A84C' }} />
              </div>
            )}
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>Terrain</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {TERRAIN_OPTIONS.map(ter => (
                  <button key={ter} className="filter-chip" onClick={() => setTerrainFilter(ter)}
                    style={{ background:terrainFilter===ter?'#1B2A4A':t.surface, color:terrainFilter===ter?'#fff':t.textMuted, border:`1.5px solid ${terrainFilter===ter?'#1B2A4A':t.border}` }}>{ter}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>Sport</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {SPORT_OPTIONS.map(sp => (
                  <button key={sp} className="filter-chip" onClick={() => setSportFilter(sp)}
                    style={{ background:sportFilter===sp?'#1B2A4A':t.surface, color:sportFilter===sp?'#fff':t.textMuted, border:`1.5px solid ${sportFilter===sp?'#1B2A4A':t.border}` }}>{sp}</button>
                ))}
              </div>
            </div>
            <button onClick={clearAll}
              style={{ alignSelf:'flex-end', padding:'7px 16px', border:`1.5px solid ${t.border}`, borderRadius:'8px', background:t.surface, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:t.textMuted, cursor:'pointer', textTransform:'uppercase' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#c53030'; e.currentTarget.style.color='#c53030' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.color=t.textMuted }}>Clear All</button>
          </div>
        )}
      </div>

      {/* MAP */}
      <div style={{ position:'relative', height:'45vh', background:t.isDark?'#0f1520':'#e8eaed' }}>
        <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

        {/* Search This Area button — bottom center */}
        {showSearchArea && (
          <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', zIndex:400 }}>
            <button
              onClick={() => {
                setCommitted(prev => ({ ...(prev || { search:'', distFilter:'ALL', sort:'date-asc', maxPrice:400, terrainFilter:'All', sportFilter:'All', dateFrom:'', dateTo:'' }), mapBoundsSearch: true }))
                setShowSearchArea(false)
              }}
              style={{ padding:'10px 22px', border:'none', borderRadius:'24px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase', boxShadow:'0 4px 20px rgba(0,0,0,0.35)', transition:'background 0.15s', display:'flex', alignItems:'center', gap:'8px' }}
              onMouseEnter={e => { e.currentTarget.style.background='#C9A84C'; e.currentTarget.style.color='#1B2A4A' }}
              onMouseLeave={e => { e.currentTarget.style.background='#1B2A4A'; e.currentTarget.style.color='#fff' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Search This Area
            </button>
          </div>
        )}

        {/* Legend */}
        <div style={{ position:'absolute', bottom:16, left:16, background:t.isDark?'rgba(26,34,53,0.95)':'rgba(255,255,255,0.95)', borderRadius:'10px', padding:'10px 14px', border:`1px solid ${t.border}`, zIndex:400 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:t.textMuted, textTransform:'uppercase', marginBottom:'8px' }}>Distance</div>
          {[{label:'5K · 10K · 13.1',color:'#1E5FA8'},{label:'Marathon 26.2',color:'#C9A84C'},{label:'Triathlon',color:'#B83232'},{label:'Ultra',color:'#9C7C4A'}].map(l => (
            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'5px' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:l.color, flexShrink:0 }} />
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:t.textMuted }}>{l.label}</span>
            </div>
          ))}
        </div>
        {isSearching && (
          <div style={{ position:'absolute', top:16, left:16, background:'rgba(27,42,74,0.88)', borderRadius:'8px', padding:'6px 14px', zIndex:400 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#fff' }}>{filtered.length} race{filtered.length!==1?'s':''} on map</span>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ padding:'32px 40px 80px' }}>

        {/* FEATURED */}
        {!isSearching && (
          <div style={{ animation:'fadeIn 0.4s ease both' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'20px' }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:600, letterSpacing:'3px', color:'#C9A84C', textTransform:'uppercase', marginBottom:'4px' }}>Bucket List Races</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:t.text, letterSpacing:'1px' }}>Featured Races</div>
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted }}>Abbott Majors · Popular City Races · Upcoming</div>
            </div>
            {loading ? (
              <div style={{ display:'flex', gap:'16px', overflow:'hidden' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ flexShrink:0, width:'clamp(220px,20vw,300px)', borderRadius:'14px', overflow:'hidden', background:t.surface, height:'240px', animation:'pulse 1.5s ease infinite' }}>
                    <div style={{ height:'170px', background:t.surfaceAlt }} />
                    <div style={{ padding:'12px 14px' }}>
                      <div style={{ height:'12px', background:t.border, borderRadius:'4px', marginBottom:'8px', width:'70%' }} />
                      <div style={{ height:'10px', background:t.borderLight, borderRadius:'4px', width:'50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredRaces.length > 0 ? (
              <ScrollRow>
                {featuredRaces.map(race => (
                  <RaceCard key={race.id} race={race} featured t={t} onClick={() => navigate(`/race-detail/${race.id}`)} />
                ))}
              </ScrollRow>
            ) : (
              <div style={{ padding:'32px', textAlign:'center', color:t.textMuted, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px' }}>
                No featured races found — try searching above.
              </div>
            )}
          </div>
        )}

        {/* SEARCH RESULTS — grouped by distance */}
        {isSearching && (
          <div style={{ animation:'fadeIn 0.3s ease both' }}>
            <div style={{ marginBottom:'32px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:t.text, letterSpacing:'1px' }}>
                  {locationStatus==='granted' ? 'Races Near You' : committed?.search ? `Results for "${committed.search}"` : 'Upcoming Races'}
                </div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', color:t.textMuted, marginTop:'3px' }}>
                  {loading ? 'Loading races...' : `${filtered.length} race${filtered.length!==1?'s':''} across ${groupedRaces.length} distance${groupedRaces.length!==1?'s':''}`}
                </div>
              </div>
              {mapBounds && (
                <button onClick={() => { setMapBounds(null); setShowSearchArea(false) }}
                  style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#C9A84C', background:'none', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'6px 14px', cursor:'pointer', textTransform:'uppercase' }}>
                  Clear Area Filter ×
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ display:'flex', gap:'16px', overflow:'hidden' }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ flexShrink:0, width:'clamp(240px,22vw,320px)', borderRadius:'14px', overflow:'hidden', background:t.surface, height:'270px', animation:'pulse 1.5s ease infinite' }}>
                    <div style={{ height:'200px', background:t.surfaceAlt }} />
                    <div style={{ padding:'14px 16px' }}>
                      <div style={{ height:'12px', background:t.border, borderRadius:'4px', marginBottom:'8px', width:'70%' }} />
                      <div style={{ height:'10px', background:t.borderLight, borderRadius:'4px', width:'50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'64px 24px', background:t.surface, borderRadius:'16px', border:`1.5px solid ${t.border}` }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'32px', color:t.text, letterSpacing:'1px', marginBottom:'10px' }}>NO RACES FOUND</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', color:t.textMuted, marginBottom:'20px' }}>Try a state name like "Maryland" or a city like "Boston".</div>
                <button onClick={clearAll}
                  style={{ padding:'10px 24px', border:'none', borderRadius:'8px', background:'#1B2A4A', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color:'#fff', cursor:'pointer', textTransform:'uppercase' }}
                  onMouseEnter={e => e.currentTarget.style.background='#C9A84C'}
                  onMouseLeave={e => e.currentTarget.style.background='#1B2A4A'}>Clear Filters</button>
              </div>
            ) : (
              groupedRaces.map(group => (
                <DistanceSection
                  key={group.key}
                  group={group}
                  races={group.races}
                  t={t}
                  activeId={activeId}
                  setActiveId={setActiveId}
                  mapInstanceRef={mapInstanceRef}
                  navigate={navigate}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
