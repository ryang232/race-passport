import { useNavigate } from 'react-router-dom'
const navy='#1B2A4A', gold='#C9A84C'
const STAMPS=[{dist:'140.6',name:'IRONMAN World',year:'2023',gold:true},{dist:'26.2',name:'NYC Marathon',year:'2024',gold:false},{dist:'70.3',name:'Eagleman',year:'2025',gold:true},{dist:'26.2',name:'Marine Corps',year:'2023',gold:false},{dist:'13.1',name:'Cherry Blossom',year:'2025',gold:false},{dist:'10K',name:'Bay Bridge',year:'2024',gold:false},{dist:'10K',name:'Capitol Hill',year:'2024',gold:false},{dist:'50K',name:'Seneca Creek',year:'2022',gold:true},{dist:'5K',name:'Hot Cider',year:'2023',gold:false},{dist:'5K',name:'Turkey Trot',year:'2023',gold:false},{dist:'13.1',name:'Parks Half',year:'2022',gold:false},{dist:'5K',name:'Suds & Soles',year:'2024',gold:false}]
export default function PublicProfile(){
  const navigate=useNavigate()
  return(
    <div style={{minHeight:'100vh',background:'#f5f4f0',fontFamily:'Barlow, sans-serif'}}>
      {/* Top bar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',background:'#ffffff',borderBottom:'1px solid rgba(27,42,74,0.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{width:'7px',height:'7px',background:gold,borderRadius:'50%'}}/>
          <span style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'16px',letterSpacing:'0.18em',color:navy}}>Race Passport</span>
        </div>
        <div onClick={()=>navigate('/create-account')} style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'9px',fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',background:navy,color:'#ffffff',padding:'7px 14px',borderRadius:'2px',cursor:'pointer'}}>Create Yours →</div>
      </div>
      {/* Hero */}
      <div style={{background:navy,padding:'24px 20px 28px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:'-20px',top:'50%',transform:'translateY(-50%)',fontFamily:'"Bebas Neue", sans-serif',fontSize:'110px',color:'transparent',WebkitTextStroke:'1px rgba(255,255,255,0.05)',pointerEvents:'none'}}>26.2</div>
        <div style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',padding:'4px 10px',borderRadius:'20px',marginBottom:'16px'}}>
          <span style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'8px',fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.4)'}}>Public Passport</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px',position:'relative',zIndex:1}}>
          <div style={{width:'64px',height:'64px',borderRadius:'50%',background:gold,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:700,color:'#ffffff',border:'2px solid rgba(255,255,255,0.15)',flexShrink:0}}>RG</div>
          <div>
            <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'28px',color:'#ffffff',textTransform:'uppercase',letterSpacing:'0.03em',lineHeight:1,marginBottom:'4px'}}>Ryan Groene</div>
            <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'10px',fontWeight:400,color:'rgba(255,255,255,0.3)',letterSpacing:'0.1em',marginBottom:'8px'}}>racepassportapp.com/ryan-groene</div>
            <div style={{fontSize:'11px',fontWeight:300,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>Triathlete · Runner · <strong style={{color:'rgba(255,255,255,0.75)',fontWeight:500}}>IRONMAN 70.3 Finisher</strong><br/>Highland, MD 🇺🇸</div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:'16px',position:'relative',zIndex:1}}>
          {[['14','Races'],['341','Miles'],['4:02','PR Marathon'],['3','Upcoming']].map(([num,lbl],i)=>(
            <div key={i} style={{textAlign:'center',flex:1,borderRight:i<3?'1px solid rgba(255,255,255,0.08)':'none'}}>
              <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'22px',color:i===2?gold:'#ffffff',lineHeight:1}}>{num}</div>
              <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'7px',fontWeight:600,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginTop:'3px'}}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
      {/* PRs */}
      <div style={{padding:'14px 20px',background:'#ffffff',borderBottom:'8px solid #f5f4f0'}}>
        <PubSection title="Personal Records" />
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
      <div style={{padding:'14px 20px',background:'#ffffff',borderBottom:'8px solid #f5f4f0'}}>
        <PubSection title="Race Stamps · 14 collected" />
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
          {STAMPS.map((s,i)=>(
            <div key={i} style={{aspectRatio:'1',borderRadius:'50%',border:`1.5px solid ${s.gold?gold:navy}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:s.gold?'rgba(201,168,76,0.05)':'#fff',cursor:'pointer'}}>
              <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'12px',color:s.gold?gold:navy,lineHeight:1}}>{s.dist}</div>
              <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'5px',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(27,42,74,0.35)',textAlign:'center',padding:'0 4px',marginTop:'2px'}}>{s.name}</div>
              <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'5px',color:'rgba(27,42,74,0.22)'}}>{s.year}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Upcoming */}
      <div style={{padding:'14px 20px',background:'#ffffff',borderBottom:'8px solid #f5f4f0'}}>
        <PubSection title="Upcoming Races" />
        {[{dist:'26.2',name:'Marine Corps Marathon',meta:'Oct 26 · Washington, DC',days:'92'},{dist:'70.3',name:'IRONMAN 70.3 Atlantic City',meta:'Sept 14 · Atlantic City, NJ',days:'49'}].map((r,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:i===0?'1px solid rgba(27,42,74,0.06)':'none'}}>
            <div style={{width:'38px',height:'38px',borderRadius:'50%',border:`1.5px solid ${navy}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'9px',color:navy}}>{r.dist}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'12px',fontWeight:600,color:navy}}>{r.name}</div>
              <div style={{fontSize:'9px',fontWeight:300,color:'rgba(27,42,74,0.4)',marginTop:'1px'}}>{r.meta}</div>
            </div>
            <div style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'8px',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:gold,border:'1px solid rgba(201,168,76,0.3)',padding:'3px 7px',borderRadius:'10px',whiteSpace:'nowrap'}}>{r.days} days</div>
          </div>
        ))}
      </div>
      {/* CTA */}
      <div style={{margin:'0 20px 20px',background:navy,borderRadius:'10px',padding:'24px',textAlign:'center',position:'relative',overflow:'hidden',marginTop:'8px'}}>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontFamily:'"Bebas Neue", sans-serif',fontSize:'80px',color:'transparent',WebkitTextStroke:'1px rgba(255,255,255,0.04)',pointerEvents:'none',whiteSpace:'nowrap'}}>26.2</div>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{fontFamily:'"Bebas Neue", sans-serif',fontSize:'24px',color:'#ffffff',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'6px'}}>Build Your Passport</div>
          <div style={{fontSize:'12px',fontWeight:300,color:'rgba(255,255,255,0.4)',marginBottom:'16px',lineHeight:1.6}}>One place for every race you've ever run.<br/>Free for every runner.</div>
          <div onClick={()=>navigate('/create-account')} style={{display:'inline-block',background:gold,color:'#ffffff',fontFamily:'"Barlow Condensed", sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'0.22em',textTransform:'uppercase',padding:'12px 24px',borderRadius:'2px',cursor:'pointer'}}>Claim Your Passport →</div>
        </div>
      </div>
    </div>
  )
}
function PubSection({title}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
      <span style={{fontFamily:'"Barlow Condensed", sans-serif',fontSize:'9px',fontWeight:700,letterSpacing:'0.28em',textTransform:'uppercase',color:'rgba(27,42,74,0.35)',whiteSpace:'nowrap'}}>{title}</span>
      <div style={{flex:1,height:'1px',background:'rgba(27,42,74,0.07)'}}/>
    </div>
  )
}
