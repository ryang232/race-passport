import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isDemo, DEMO_FIRST_NAME, DEMO_LAST_NAME } from '../lib/demo'
import { getDistanceColor } from '../lib/colors'

const ALL_RACES = [
  { id:'d1', name:'Parks Half Marathon', date:'Sept 21, 2026', dateSort:'2026-09-21', location:'Bethesda, MD', distance:'13.1', price:95, terrain:'Road', elevation:'180ft', weeks:10, estFinishers:1200, lat:38.9807, lng:-77.1003, query:'half marathon road' },
  { id:'d2', name:'Suds & Soles 5K', date:'Jun 13, 2026', dateSort:'2026-06-13', location:'Rockville, MD', distance:'5K', price:35, terrain:'Road', elevation:'85ft', weeks:4, estFinishers:400, lat:39.0840, lng:-77.1528, query:'5K community' },
  { id:'d3', name:'Baltimore 10 Miler', date:'Jun 6, 2026', dateSort:'2026-06-06', location:'Baltimore, MD', distance:'10 mi', price:65, terrain:'Road', elevation:'210ft', weeks:8, estFinishers:800, lat:39.2904, lng:-76.6122, query:'Baltimore' },
  { id:'d4', name:'Annapolis Bay Bridge Run', date:'Oct 12, 2026', dateSort:'2026-10-12', location:'Annapolis, MD', distance:'10K', price:55, terrain:'Bridge', elevation:'140ft', weeks:6, estFinishers:600, lat:38.9784, lng:-76.4922, query:'Annapolis' },
  { id:'d5', name:'DC Half Marathon', date:'Mar 15, 2027', dateSort:'2027-03-15', location:'Washington, DC', distance:'13.1', price:110, terrain:'Road', elevation:'190ft', weeks:10, estFinishers:14000, lat:38.9072, lng:-77.0369, query:'DC Capitol' },
  { id:'d6', name:'Frederick Festival 5K', date:'May 2, 2026', dateSort:'2026-05-02', location:'Frederick, MD', distance:'5K', price:30, terrain:'Road', elevation:'95ft', weeks:4, estFinishers:300, lat:39.4143, lng:-77.4105, query:'Frederick Maryland' },
  { id:'d7', name:'Marine Corps Marathon', date:'Oct 26, 2026', dateSort:'2026-10-26', location:'Arlington, VA', distance:'26.2', price:140, terrain:'Road', elevation:'912ft', weeks:16, estFinishers:19000, lat:38.8719, lng:-77.0563, query:'Marines DC marathon' },
  { id:'d8', name:'Richmond Marathon', date:'Nov 15, 2026', dateSort:'2026-11-15', location:'Richmond, VA', distance:'26.2', price:110, terrain:'Road', elevation:'520ft', weeks:16, estFinishers:8000, lat:37.5407, lng:-77.4360, query:'Richmond Virginia marathon' },
  { id:'d9', name:'Seneca Creek 50K', date:'Mar 21, 2026', dateSort:'2026-03-21', location:'Gaithersburg, MD', distance:'50K', price:85, terrain:'Trail', elevation:'2800ft', weeks:20, estFinishers:200, lat:39.1434, lng:-77.2135, query:'trail ultra Maryland' },
  { id:'d10', name:'IRONMAN 70.3 Atlantic City', date:'Sept 13, 2026', dateSort:'2026-09-13', location:'Atlantic City, NJ', distance:'70.3', price:350, terrain:'Multi', elevation:'1200ft', weeks:20, estFinishers:2000, lat:39.3643, lng:-74.4229, query:'triathlon Atlantic City' },
]

const DIST_FILTERS = [
  { label:'All', value:'ALL' },
  { label:'5K', value:'5K' },
  { label:'10K', value:'10K' },
  { label:'13.1', value:'13.1' },
  { label:'26.2', value:'26.2' },
  { label:'Tri', value:'TRI' },
  { label:'Ultra', value:'ULTRA' },
]

const SORT_OPTIONS = [
  { label:'Date', value:'date' },
  { label:'Price', value:'price' },
  { label:'Distance', value:'distance' },
]

function matchesFilter(race, distFilter, search) {
  const d = race.distance.toLowerCase()
  const matchDist = distFilter === 'ALL' ? true
    : distFilter === 'TRI' ? ['70.3','140.6'].includes(race.distance)
    : distFilter === 'ULTRA' ? ['50k','50m','100k','100m'].includes(d)
    : distFilter === '13.1' ? race.distance === '13.1'
    : distFilter === '26.2' ? race.distance === '26.2'
    : d.startsWith(distFilter.toLowerCase())
  const q = search.toLowerCase()
  const matchSearch = !q || race.name.toLowerCase().includes(q) || race.location.toLowerCase().includes(q)
  return matchDist && matchSearch
}

export default function Discover() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [distFilter, setDistFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('date')
  const [activeId, setActiveId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [maxPrice, setMaxPrice] = useState(400)
  const [terrainFilter, setTerrainFilter] = useState('ALL')
  const dropdownRef = useRef(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const listRef = useRef(null)
  const cardRefs = useRef({})

  const filtered = ALL_RACES
    .filter(r => matchesFilter(r, distFilter, search) && r.price <= maxPrice && (terrainFilter === 'ALL' || r.terrain.toLowerCase().includes(terrainFilter.toLowerCase())))
    .sort((a, b) => sort === 'date' ? a.dateSort.localeCompare(b.dateSort) : sort === 'price' ? a.price - b.price : 0)

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
      * { box-sizing: border-box; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin { to{transform:rotate(360deg);} }
      .nav-tab { display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 24px; height:64px; justify-content:center; cursor:pointer; border:none; background:none; color:#9aa5b4; transition:color 0.15s; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; border-bottom:2px solid transparent; white-space:nowrap; }
      .nav-tab.active { color:#1B2A4A; border-bottom-color:#C9A84C; }
      .nav-tab:hover { color:#1B2A4A; }
      .dropdown-item { display:block; width:100%; padding:10px 18px; background:none; border:none; text-align:left; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:1px; color:#1B2A4A; cursor:pointer; transition:background 0.1s; }
      .dropdown-item:hover { background:#f4f5f7; }
      .dist-pill { padding:5px 14px; border-radius:20px; border:1.5px solid; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
      .race-list-item { border-radius:10px; border:1.5px solid #e8eaed; background:#fff; cursor:pointer; transition:all 0.18s; overflow:hidden; animation:fadeIn 0.3s ease both; }
      .race-list-item:hover { border-color:#1B2A4A; transform:translateX(3px); }
      .race-list-item.selected { border-color:#1B2A4A; background:#f8f9fb; }
      .leaflet-container { font-family:'Barlow Condensed',sans-serif !important; }
      .rp-map-pin { display:flex; align-items:center; justify-content:center; border-radius:50%; border:2px solid #fff; font-family:'Bebas Neue',sans-serif; font-weight:700; color:#fff; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.25); transition:transform 0.15s; }
      .rp-map-pin:hover { transform:scale(1.2); }
      .rp-map-pin.active { transform:scale(1.3); box-shadow:0 4px 16px rgba(0,0,0,0.35); }
      div::-webkit-scrollbar { width:4px; }
      div::-webkit-scrollbar-track { background:transparent; }
      div::-webkit-scrollbar-thumb { background:#e2e6ed; border-radius:2px; }
    `
    if (!document.getElementById('rp-discover-styles')) document.head.appendChild(style)

    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handleClick)
    return () => { document.getElementById('rp-discover-styles')?.remove(); document.removeEventListener('mousedown', handleClick) }
  }, [user])

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const loadLeaflet = async () => {
      if (!window.L) {
        // Load Leaflet CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
        // Load Leaflet JS
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.onload = resolve
          document.head.appendChild(script)
        })
      }

      const L = window.L
      const map = L.map(mapRef.current, {
        center: [39.0, -77.2],
        zoom: 8,
        zoomControl: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 18,
      }).addTo(map)

      L.control.zoom({ position: 'topright' }).addTo(map)
      mapInstanceRef.current = map
    }

    loadLeaflet()
  }, [])

  // Update markers when filtered races change
  useEffect(() => {
    const L = window.L
    if (!L || !mapInstanceRef.current) return
    const map = mapInstanceRef.current

    // Remove old markers
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    filtered.forEach(race => {
      const colors = getDistanceColor(race.distance)
      const cleaned = race.distance.replace(' mi','')
      const size = activeId === race.id ? 40 : 34

      const icon = L.divIcon({
        className: '',
        html: `<div class="rp-map-pin ${activeId === race.id ? 'active' : ''}" style="width:${size}px;height:${size}px;background:${colors.primary};font-size:${cleaned.length > 3 ? 9 : cleaned.length > 2 ? 10 : 13}px;">${cleaned}</div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
      })

      const marker = L.marker([race.lat, race.lng], { icon })
        .addTo(map)
        .on('click', () => {
          setActiveId(race.id)
          // Scroll list to card
          cardRefs.current[race.id]?.scrollIntoView({ behavior:'smooth', block:'nearest' })
        })

      // Tooltip
      marker.bindTooltip(`<div style="font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:12px;color:#1B2A4A;">${race.name}<br><span style="color:#9aa5b4;font-size:10px;">${race.date}</span></div>`, {
        permanent: false,
        direction: 'top',
        offset: [0, -18],
        className: 'rp-tooltip',
      })

      markersRef.current[race.id] = marker
    })
  }, [filtered, activeId])

  const handleCardClick = (race) => {
    setActiveId(race.id)
    const map = mapInstanceRef.current
    if (map) map.flyTo([race.lat, race.lng], 11, { animate: true, duration: 0.8 })
  }

  const initials = (profile?.full_name || 'RG').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
  const handleSignOut = async () => { await signOut?.(); navigate('/login') }

  const NAV_TABS = [
    { label:'Home', path:'/home', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label:'Discover', path:'/discover', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label:'Passport', path:'/passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label:'Profile', path:'/build-passport', icon:<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#f4f5f7', fontFamily:"'Barlow',sans-serif", overflow:'hidden' }}>

      {/* TOP NAV */}
      <div style={{ flexShrink:0, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(8px)', borderBottom:'1px solid #e8eaed', boxShadow:'0 1px 8px rgba(27,42,74,0.06)', display:'flex', alignItems:'stretch', justifyContent:'space-between', padding:'0 40px', zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'14px 0' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#C9A84C' }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'20px', letterSpacing:'2.5px', color:'#1B2A4A' }}>RACE PASSPORT</span>
        </div>
        <div style={{ display:'flex', alignItems:'stretch' }}>
          {NAV_TABS.map(tab => (
            <button key={tab.path} className={`nav-tab ${location.pathname === tab.path ? 'active' : ''}`} onClick={() => navigate(tab.path)}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        <div ref={dropdownRef} style={{ position:'relative', display:'flex', alignItems:'center' }}>
          <div onClick={() => setShowDropdown(!showDropdown)}
            style={{ width:40, height:40, borderRadius:'50%', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid #e2e6ed', transition:'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#e2e6ed'}>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'14px', color:'#C9A84C' }}>{initials}</span>
          </div>
          {showDropdown && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'#fff', border:'1px solid #e2e6ed', borderRadius:'10px', boxShadow:'0 8px 32px rgba(27,42,74,0.14)', minWidth:'190px', overflow:'hidden', zIndex:100 }}>
              <div style={{ padding:'14px 18px 10px', borderBottom:'1px solid #f0f2f5' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A' }}>{profile?.full_name || 'Ryan Groene'}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4' }}>racepassportapp.com/ryan-groene</div>
              </div>
              <button className="dropdown-item" onClick={() => { navigate('/passport'); setShowDropdown(false) }}>My Passport</button>
              <button className="dropdown-item" onClick={() => { navigate('/build-passport'); setShowDropdown(false) }}>Settings</button>
              <div style={{ height:'1px', background:'#f0f2f5' }} />
              <button className="dropdown-item" style={{ color:'#c53030' }} onClick={handleSignOut}>Log Out</button>
            </div>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ flexShrink:0, background:'#fff', borderBottom:'1px solid #e8eaed', padding:'14px 24px', zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:'8px', background:'#f4f5f7', border:'1.5px solid #e2e6ed', borderRadius:'10px', padding:'9px 14px', transition:'border-color 0.15s' }}
            onFocus={() => {}} >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="#9aa5b4" strokeWidth="1.3"/><path d="M10 10l2.5 2.5" stroke="#9aa5b4" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search races, cities, states..."
              style={{ border:'none', background:'transparent', outline:'none', fontFamily:"'Barlow',sans-serif", fontSize:'14px', color:'#1B2A4A', width:'100%' }} />
            {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#9aa5b4', fontSize:'16px', lineHeight:1, padding:0 }}>×</button>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding:'9px 14px', border:'1.5px solid #e2e6ed', borderRadius:'10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1px', color:'#1B2A4A', background:'#fff', appearance:'none', cursor:'pointer', outline:'none' }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
            </select>
            <button onClick={() => setShowFilters(!showFilters)}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 16px', border:'1.5px solid #e2e6ed', borderRadius:'10px', background: showFilters ? '#1B2A4A' : '#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', color: showFilters ? '#fff' : '#9aa5b4', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Filters {showFilters ? '▲' : '▼'}
            </button>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          {DIST_FILTERS.map(f => {
            const isActive = distFilter === f.value
            const colors = f.value === 'ALL' ? null : f.value === 'TRI' ? getDistanceColor('70.3') : f.value === 'ULTRA' ? getDistanceColor('50K') : getDistanceColor(f.value)
            return (
              <button key={f.value} className="dist-pill"
                onClick={() => setDistFilter(f.value)}
                style={{
                  color: isActive ? (colors ? '#fff' : '#fff') : (colors ? colors.primary : '#9aa5b4'),
                  borderColor: isActive ? (colors ? colors.primary : '#1B2A4A') : (colors ? colors.dashed : '#e2e6ed'),
                  background: isActive ? (colors ? colors.primary : '#1B2A4A') : (colors ? colors.light : '#fff'),
                }}>
                {f.label}
              </button>
            )
          })}
          <div style={{ marginLeft:'auto', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4', letterSpacing:'0.5px' }}>
            {filtered.length} race{filtered.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {showFilters && (
          <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #f0f2f5', display:'flex', gap:'32px', alignItems:'flex-end', flexWrap:'wrap' }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Max Entry Fee: ${maxPrice}</div>
              <input type="range" min={25} max={400} step={5} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
                style={{ width:'180px', accentColor:'#C9A84C' }} />
            </div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'1.5px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Terrain</div>
              <div style={{ display:'flex', gap:'6px' }}>
                {['ALL','Road','Trail','Multi','Bridge'].map(t => (
                  <button key={t} onClick={() => setTerrainFilter(t)}
                    style={{ padding:'4px 12px', border:'1.5px solid', borderRadius:'6px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', cursor:'pointer', transition:'all 0.15s',
                      background: terrainFilter === t ? '#1B2A4A' : '#fff',
                      borderColor: terrainFilter === t ? '#1B2A4A' : '#e2e6ed',
                      color: terrainFilter === t ? '#fff' : '#9aa5b4' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { setMaxPrice(400); setTerrainFilter('ALL'); setDistFilter('ALL'); setSearch('') }}
              style={{ padding:'6px 14px', border:'1.5px solid #e2e6ed', borderRadius:'8px', background:'#fff', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:600, letterSpacing:'1px', color:'#9aa5b4', cursor:'pointer', textTransform:'uppercase' }}>
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* SPLIT PANEL */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'340px 1fr', overflow:'hidden' }}>

        {/* RACE LIST */}
        <div ref={listRef} style={{ overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'10px', borderRight:'1px solid #e8eaed', background:'#f8f9fb' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 16px' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'28px', color:'#1B2A4A', letterSpacing:'1px', marginBottom:'8px' }}>NO RACES FOUND</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', color:'#9aa5b4' }}>Try adjusting your filters.</div>
            </div>
          ) : filtered.map((race, i) => {
            const colors = getDistanceColor(race.distance)
            const cleaned = race.distance.replace(' mi','')
            const isActive = activeId === race.id
            return (
              <div key={race.id} ref={el => cardRefs.current[race.id] = el}
                className={`race-list-item ${isActive ? 'selected' : ''}`}
                style={{ animationDelay:`${i * 40}ms`, borderColor: isActive ? colors.primary : '#e8eaed' }}
                onClick={() => handleCardClick(race)}>
                {/* Color bar */}
                <div style={{ height:'3px', background:colors.primary }} />
                <div style={{ display:'flex', gap:'12px', padding:'12px' }}>
                  {/* Stamp */}
                  <div style={{ width:52, height:52, borderRadius:'50%', border:`2px solid ${colors.primary}`, background:colors.light, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
                    <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:`1px dashed ${colors.dashed}` }} />
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: cleaned.length > 3 ? 10 : cleaned.length > 2 ? 12 : 16, color:colors.primary, letterSpacing:'0.5px', position:'relative', zIndex:1 }}>{cleaned}</span>
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:'#1B2A4A', letterSpacing:'0.5px', lineHeight:1.2, marginBottom:'3px' }}>{race.name}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', color:'#9aa5b4', marginBottom:'6px' }}>{race.date} · {race.location}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px', color:colors.primary, letterSpacing:'0.5px' }}>${race.price}</span>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4' }}>{race.terrain}</span>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#9aa5b4' }}>{race.weeks}wk plan</span>
                    </div>
                  </div>
                  {/* Register arrow */}
                  <button onClick={e => { e.stopPropagation(); navigate(`/race-detail/${race.id}`) }}
                    style={{ alignSelf:'center', padding:'6px 12px', border:`1.5px solid ${colors.primary}`, borderRadius:'7px', background:colors.light, fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', fontWeight:700, letterSpacing:'1px', color:colors.primary, cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0 }}
                    onMouseEnter={e => { e.currentTarget.style.background=colors.primary; e.currentTarget.style.color='#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background=colors.light; e.currentTarget.style.color=colors.primary }}>
                    View →
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* MAP */}
        <div style={{ position:'relative', overflow:'hidden' }}>
          <div ref={mapRef} style={{ width:'100%', height:'100%' }} />
          {/* Map legend */}
          <div style={{ position:'absolute', bottom:20, left:20, background:'rgba(255,255,255,0.94)', borderRadius:'10px', padding:'10px 14px', border:'1px solid #e2e6ed', zIndex:400 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'9px', fontWeight:600, letterSpacing:'2px', color:'#9aa5b4', textTransform:'uppercase', marginBottom:'8px' }}>Distance</div>
            {[{ label:'5K · 10K · 13.1', color:'#1E5FA8' },{ label:'Marathon', color:'#C9A84C' },{ label:'Triathlon', color:'#B83232' },{ label:'Ultra', color:'#9C7C4A' }].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'5px' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:l.color, flexShrink:0 }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'10px', color:'#4a5568' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
