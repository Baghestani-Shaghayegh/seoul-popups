// FIGMA DETAIL + DISCOVER SYNC — run once via the Figma MCP `use_figma` tool,
// fileKey = Z5fRYglyLx4lh7zz8z3sEq. Makes the Detail frame info-only (Directions + Official page
// instead of price/Get tickets) and sets the Discover selected filter chip to purple.
// The Home frame is ALREADY synced. Run this when the Figma Starter rate limit resets.
const F='Inter';for(const s of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) await figma.loadFontAsync({family:F,style:s});
const rgb=h=>{h=h.replace('#','');return {r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};};
const solid=(h,o)=>({type:'SOLID',color:rgb(h),opacity:o==null?1:o});
const T=(str,size,style,color)=>{const t=figma.createText();t.fontName={family:F,style:style||'Regular'};t.fontSize=size;t.characters=str;t.fills=[solid(color||'#2B2532')];t.lineHeight={value:size*1.2,unit:'PIXELS'};return t;};
const AF=(name,dir,o)=>{o=o||{};const f=figma.createFrame();f.name=name;f.layoutMode=dir;f.itemSpacing=o.gap!=null?o.gap:0;f.paddingLeft=o.pl!=null?o.pl:(o.px||0);f.paddingRight=o.pr!=null?o.pr:(o.px||0);f.paddingTop=o.pt!=null?o.pt:(o.py||0);f.paddingBottom=o.pb!=null?o.pb:(o.py||0);f.primaryAxisSizingMode='AUTO';f.counterAxisSizingMode='AUTO';if(o.pa)f.primaryAxisAlignItems=o.pa;if(o.ca)f.counterAxisAlignItems=o.ca;f.fills=o.fill?[solid(o.fill)]:[];if(o.radius)f.cornerRadius=o.radius;return f;};
const icon=(inner,stroke,size,sw)=>{const n=figma.createNodeFromSvg(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw||2}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`);n.resize(size,size);return n;};
const page=figma.currentPage;
const det=page.findOne(n=>n.name==='mgn2 · Detail');
if(det){const cta=det.findOne(n=>n.name==='cta');
 if(cta){[...cta.children].forEach(c=>c.remove());
  const ghost=AF('ghost','HORIZONTAL',{radius:16,pl:18,pr:18,pt:15,pb:15,gap:8,ca:'CENTER',fill:'#F7F2F4'});ghost.strokes=[solid('#E7DEE8')];ghost.strokeWeight=1;ghost.appendChild(icon('<path d="M12 22s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.6"/>','#2B2532',18,2));ghost.appendChild(T('Directions',14,'Extra Bold','#2B2532'));
  const sp=AF('sp','HORIZONTAL',{});sp.layoutGrow=1;
  const buy=AF('buy','HORIZONTAL',{radius:16,pl:26,pr:22,pt:15,pb:15,gap:8,ca:'CENTER',fill:'#EE5D8C'});buy.appendChild(T('Official page',15,'Extra Bold','#FFFFFF'));buy.appendChild(icon('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>','#FFFFFF',16,2.2));
  cta.appendChild(ghost);cta.appendChild(sp);cta.appendChild(buy);
 }}
const dis=page.findOne(n=>n.name==='mgn2 · Discover');
if(dis){const pills=dis.findAll(n=>n.name==='pill');
 for(const p of pills){const t=p.findOne(n=>n.type==='TEXT');if(t&&t.characters==='All'){p.fills=[solid('#6A4BD1')];p.strokes=[solid('#6A4BD1')];}}}
