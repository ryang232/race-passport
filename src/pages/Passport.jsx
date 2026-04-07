import { useNavigate } from 'react-router-dom'
const navy='#1B2A4A', gold='#C9A84C'
const STAMPS=[{dist:'140.6',name:'IRONMAN World',year:'2023',gold:true},{dist:'26.2',name:'NYC Marathon',year:'2024',gold:false},{dist:'70.3',name:'Eagleman',year:'2025',gold:true},{dist:'26.2',name:'Marine Corps',year:'2023',gold:false},{dist:'13.1',name:'Cherry Blossom',year:'2025',gold:false},{dist:'10K',name:'Bay Bridge',year:'2024',gold:false},{dist:'10K',name:'Capitol Hill',year:'2024',gold:false},{dist:'50K',name:'Seneca Creek',year:'2022',gold:true},{dist:'5K',name:'Hot Cider',year:'2023',gold:false},{dist:'5K',name:'Turkey Trot',year:'2023',gold:false},{dist:'13.1',name:'Parks Half',year:'2022',gold:false},{dist:'5K',name:'Suds & Soles',year:'2024',gold:false},{dist:'10K',name:'Broad St Run',year:'2023',gold:false},{dist:'13.1',name:'Rock n Roll',year:'2022',gold:false}]
const UPCOMING=[{dist:'26.2',name:'Marine Corps Marathon',meta:'Oct 26 · Washington, DC',days:'92'},{dist:'70.3',name:'IRONMAN 70.3 Atlantic City',meta:'Sept 14 · Atlantic City, NJ',days:'49'},{dist:'10K',name:'Capitol Hill Classic 10K',meta:'May 17 · Washington, DC',days:'41'}]
export default function Passport(){
  const navigate=useNavigate()
  return(
    <div style={{minHeight:'100vh',background:'#f5f4f0',fontFamily:'Barlow, sans-serif',paddingBottom:'80px'}}>
      {/* Profile header */}
      <div style={{background:navy,padding:'48px 20px 20px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:'-20px',top:'50%',transform:'translateY(-50%)',fontFamily:'"Bebas Neue", sans-serif',fontSize:'100px',color:'transparent',WebkitTextStroke:'1px rgba(255,255,255,0.05)',pointerEvents:'none'}}>26.2</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',position:'relative',zIndex:1}}>
          <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)'}}>My Passport</div>
          <div style={{display:'flex',alignItems:'center',gap:'5px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',padding:'6px 12px',borderRadius:'20px',cursor:'pointer'}}>
            <span style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'9px',fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'rgba(255,255,255,0.5)'}}>Share Passport</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px',position:'relative',zIndex:1}}>
          <div style={{width:'60px',height:'60px',borderRadius:'50%',background:gold,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:700,color:'#ffffff',border:'2px solid rgba(255,255,255,0.15)',flexShrink:0}}>RG</div>
          <div>
            <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'26px',color:'#ffffff',letterSpacing:'0.03em',textTransform:'uppercase',lineHeight:1,marginBottom:'4px'}}>Ryan Groene</div>
            <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'10px',fontWeight:400,color:'rgba(255,255,255,0.35)',letterSpacing:'0.1em'}}>racepassportapp.com/<span style={{color:gold}}>ryan-groene</span></div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:'14px',position:'relative',zIndex:1}}>
          {[['14','Races'],['341','Miles'],['4:02','PR Marathon'],['3','Upcoming']].map(([num,lbl],i)=>(
            <div key={i} style={{textAlign:'center',flex:1,borderRight:i<3?'1px solid rgba(255,255,255,0.08)':'none'}}>
              <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'22px',color:i===2?gold:'#ffffff',lineHeight:1}}>{num}</div>
              <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'7px',fontWeight:600,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginTop:'3px'}}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
      {/* PRs */}
      <div style={{padding:'14px 20px',background:'#ffffff',borderBottom:'1px solid rgba(27,42,74,0.07)'}}>
        <SectionTitle title="Personal Records" />
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px'}}>
          {[['5K','22:14'],['10K','46:38'],['Half','1:52:04'],['Full','4:02:11']].map(([d,t])=>(
            <div key={d} style={{background:'rgba(27,42,74,0.04)',borderRadius:'8px',padding:'8px',textAlign:'center',border:'1px solid rgba(27,42,74,0.07)'}}>
              <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'8px',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(27,42,74,0.4)',marginBottom:'3px'}}>{d}</div>
              <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'14px',color:navy}}>{t}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Stamps */}
      <div style={{padding:'14px 20px',background:'#ffffff',borderBottom:'1px solid rgba(27,42,74,0.07)'}}>
        <SectionTitle title="Race Stamps" count="14 collected" />
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
          {STAMPS.map((s,i)=>(
            <div key={i} style={{aspectRatio:'1',borderRadius:'50%',border:`1.5px solid ${s.gold?gold:navy}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:s.gold?'rgba(201,168,76,0.04)':'#fff',cursor:'pointer'}}>
              <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'13px',color:s.gold?gold:navy,lineHeight:1}}>{s.dist}</div>
              <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'5px',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(27,42,74,0.35)',textAlign:'center',padding:'0 4px',marginTop:'2px',lineHeight:1.2}}>{s.name}</div>
              <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'5px',color:'rgba(27,42,74,0.22)'}}>{s.year}</div>
            </div>
          ))}
          <div style={{aspectRatio:'1',borderRadius:'50%',border:'1.5px dashed rgba(27,42,74,0.15)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>{}}>
            <div style={{fontSize:'18px',color:'rgba(27,42,74,0.2)'}}>+</div>
            <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'5.5px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(27,42,74,0.2)',textAlign:'center'}}>Next Race</div>
          </div>
        </div>
      </div>
      {/* Upcoming */}
      <div style={{padding:'14px 20px',background:'#ffffff'}}>
        <SectionTitle title="Upcoming Races" />
        {UPCOMING.map((r,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:i<UPCOMING.length-1?'1px solid rgba(27,42,74,0.06)':'none'}}>
            <div style={{width:'40px',height:'40px',borderRadius:'50%',border:`1.5px solid ${navy}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'10px',color:navy}}>{r.dist}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'12px',fontWeight:600,color:navy}}>{r.name}</div>
              <div style={{fontSize:'10px',fontWeight:300,color:'rgba(27,42,74,0.4)',marginTop:'1px'}}>{r.meta}</div>
            </div>
            <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'8px',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:gold,border:'1px solid rgba(201,168,76,0.3)',padding:'3px 7px',borderRadius:'10px',whiteSpace:'nowrap'}}>{r.days} days</div>
          </div>
        ))}
      </div>
      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#ffffff',borderTop:'1px solid rgba(27,42,74,0.08)',display:'flex',padding:'12px 0 20px',zIndex:50}}>
        {[{label:'Home',path:'/home',active:false},{label:'Discover',path:'/discover',active:false},{label:'Passport',path:'/passport',active:true},{label:'Profile',path:'/profile',active:false}].map((item,i)=>(
          <div key={i} onClick={()=>navigate(item.path)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer'}}>
            <div style={{width:'20px',height:'20px'}}>
              {i===0&&<svg viewBox="0 0 20 20" fill="none"><path d="M3 10L10 3l7 7" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5" strokeLinecap="round"/><path d="M5 8v7h4v-4h2v4h4V8" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              {i===1&&<svg viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5"/><path d="M14 14l3 3" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5" strokeLinecap="round"/></svg>}
              {i===2&&<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5"/><circle cx="10" cy="10" r="2" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5"/></svg>}
              {i===3&&<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5"/><path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={item.active?gold:'rgba(27,42,74,0.3)'} strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
            <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'8px',fontWeight:600,letterSpacing:'0.15em',textTransform:'uppercase',color:item.active?gold:'rgba(27,42,74,0.3)'}}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
function SectionTitle({title,count}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
      <span style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'9px',fontWeight:700,letterSpacing:'0.28em',textTransform:'uppercase',color:'rgba(27,42,74,0.35)'}}>{title}{count&&<span style={{color:'#C9A84C',marginLeft:'6px'}}>{count}</span>}</span>
      <div style={{flex:1,height:'1px',background:'rgba(27,42,74,0.07)'}}/>
    </div>
  )
}
