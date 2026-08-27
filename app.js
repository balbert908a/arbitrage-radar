const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const money = n => `$${Number(n || 0).toFixed(2)}`;
const pct = n => `${Math.round(Number(n || 0))}%`;
const nowISO = () => new Date().toISOString();
const daysAgo = n => new Date(Date.now()-n*86400000).toISOString();

const defaults = {
  settings: { minProfit:15, minRoi:100, maxBuy:50, fee:13.25, radius:35, travel:0.35, categories:'toys, tools, electronics, collectibles, small home goods', exclude:'oversized, freight' },
  deals: [],
  inventory: [], watch: []
};



const retailerCatalog = [
  {name:'Home Depot',mode:'live-store-possible'},
  {name:'Walmart',mode:'live-store-possible'},
  {name:"Lowe's",mode:'live-store-possible'},
  {name:'Target',mode:'live-store-possible'},
  {name:'Dollar General',mode:'in-store-hunt'},
  {name:'TJ Maxx',mode:'online-clearance-lead'},
  {name:'Marshalls',mode:'online-clearance-lead'},
  {name:'Burlington',mode:'online-clearance-lead'},
  {name:'Ross Dress for Less',mode:'in-store-hunt'},
  {name:"Ollie's Bargain Outlet",mode:'in-store-hunt'},
  {name:'Five Below',mode:'in-store-hunt'},
  {name:'Dollar Tree',mode:'in-store-hunt'},
  {name:'Family Dollar',mode:'in-store-hunt'},
  {name:'Walgreens',mode:'in-store-hunt'},
  {name:'CVS',mode:'in-store-hunt'},
  {name:"Macy's",mode:'online-clearance-lead'},
  {name:"Kohl's",mode:'online-clearance-lead'},
  {name:'Best Buy',mode:'online-clearance-lead'},
  {name:'Staples',mode:'online-clearance-lead'},
  {name:'Office Depot',mode:'online-clearance-lead'},
  {name:'Tractor Supply',mode:'in-store-hunt'},
  {name:'Harbor Freight',mode:'in-store-hunt'}
];

const sourceCatalog = [
  {id:'returns',name:'Return & Bin Stores',icon:'📦',priority:95,queries:['bin store','return store','Amazon returns store','returns liquidation store','liquidation bins'],why:'High-variance returned/overstock inventory; restock day and bin-price schedule can matter more than lowest-price day.'},
  {id:'liquidation',name:'Liquidation / Overstock',icon:'🏷️',priority:90,queries:['liquidation store','overstock store','liquidation warehouse','closeout store'],why:'Retail returns, closeouts and shelf pulls can create deep discounts on shippable merchandise.'},
  {id:'estate',name:'Estate Sales',icon:'🏠',priority:92,queries:['estate sales today','estate sale company'],why:'Strong treasure potential for jewelry, sterling, watches, collectibles, tools and vintage household goods.'},
  {id:'garage',name:'Garage / Yard Sales',icon:'🪧',priority:78,queries:['garage sales today','yard sales today'],why:'Low acquisition cost and negotiability; quality varies, so descriptions and photos matter.'},
  {id:'flea',name:'Flea Markets',icon:'🧺',priority:82,queries:['flea market','swap meet'],why:'Many sellers in one stop; useful for collectibles, tools, vintage goods and repeat sourcing relationships.'},
  {id:'thrift',name:'Thrift Stores',icon:'♻️',priority:80,queries:['thrift store','charity thrift store','resale shop'],why:'Steady replenishment and broad categories; best when paired with Hunt Mode and sold comps.'},
  {id:'auction',name:'Auctions',icon:'🔨',priority:88,queries:['auction house','liquidation auction','estate auction'],why:'Lots can contain large value gaps, but buyer premium and lot-level risk must be included.'},
  {id:'clearance',name:'Retail Clearance',icon:'🏬',priority:86,queries:['TJ Maxx','Marshalls','Burlington','Ross Dress for Less',"Ollie's Bargain Outlet",'Home Depot','Walmart',"Lowe's",'Target','Dollar General','Five Below','Dollar Tree','Family Dollar','Walgreens','CVS',"Macy's","Kohl's",'Best Buy','Staples','Office Depot','Tractor Supply','Harbor Freight'],why:'Structured products and barcodes make resale math easier. TJ Maxx/Marshalls/Burlington online markdowns are leads, not proof of local shelf price; other chains may be in-store Hunt Mode only.'}
];

function getTreasureTerms(){
  try{return JSON.parse(localStorage.getItem('arbitrageTreasureTerms')) || ['sterling','gold jewelry','watches','tools','toys','sports collectibles','sealed electronics'];}
  catch{return ['sterling','watches','tools','toys'];}
}
function saveTreasureTerms(terms){localStorage.setItem('arbitrageTreasureTerms',JSON.stringify(terms));}
function renderTreasure(){
  const terms=getTreasureTerms();
  const input=$('#treasureInput'); if(input) input.value=terms.join(', ');
  const chips=$('#treasureChips'); if(chips) chips.innerHTML=terms.map(t=>`<span class="chip">${escapeHtml(t)}</span>`).join('');
}
function renderTodaySources(){
  const el=$('#todaySources'); if(!el)return;
  el.innerHTML=sourceCatalog.slice(0,8).map(x=>`<button class="source-tile" data-source="${x.id}" data-go="nearby"><span>${x.icon}</span><strong>${escapeHtml(x.name)}</strong><small>Priority ${x.priority}</small></button>`).join('');
  $$('.source-tile').forEach(b=>b.addEventListener('click',()=>{ const sel=$('#sourceType'); if(sel) sel.value=b.dataset.source; }));
}

const LEGACY_DEMO_IDS = new Set(['d1','d2','d3','d4','d5','d6']);
function evidenceForDeal(d){
  if(d.evidence) return d.evidence;
  if(d.source==='LIVE') return 'LIVE STORE PRICE';
  if(d.source==='IMPORTED') return 'VERIFY IN STORE';
  return 'MANUAL';
}
function normalizeDeal(d){
  return {...d, source:d.source || 'MANUAL'};
}
function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem('arbitrageRadarState'));
    if(!saved) return structuredClone(defaults);
    const cleanedDeals=(saved.deals||[])
      .filter(d=>!LEGACY_DEMO_IDS.has(String(d.id)))
      .map(normalizeDeal);
    const migrated={settings:{...defaults.settings,...saved.settings}, deals:cleanedDeals, inventory:saved.inventory||[], watch:saved.watch||[]};
    localStorage.setItem('arbitrageRadarState', JSON.stringify(migrated));
    return migrated;
  } catch { return structuredClone(defaults); }
}
let state = loadState();
function saveState(){ localStorage.setItem('arbitrageRadarState', JSON.stringify(state)); }

function calcDeal(d){
  const fee = d.resalePrice * (state.settings.fee/100);
  const profit = d.resalePrice - d.clearancePrice - (d.shipping||0) - fee;
  const roi = d.clearancePrice > 0 ? (profit/d.clearancePrice)*100 : 9999;
  const markdown = d.regularPrice > 0 ? (1-d.clearancePrice/d.regularPrice)*100 : 0;
  const confidenceWeight = {High:1,Medium:.78,Low:.52}[d.confidence] || .65;
  const freshnessDays = Math.max(0,(Date.now()-new Date(d.lastSeen||Date.now()).getTime())/86400000);
  const freshness = Math.max(.45,1-(freshnessDays*.15));
  const travelPenalty = (d.miles||0)*state.settings.travel;
  const score = Math.max(0, Math.min(100, (profit*2.1 + Math.min(roi,400)*.08 + markdown*.18)*confidenceWeight*freshness - travelPenalty));
  return {fee,profit,roi,markdown,score,freshnessDays};
}


function normText(v){ return String(v||'').trim().toLowerCase(); }
function sourcingStats(){
  const groups={};
  (state.inventory||[]).forEach(x=>{
    const retailer=(x.retailer||'').trim(), store=(x.store||'').trim();
    if(!retailer && !store) return;
    const key=`${normText(retailer)}|${normText(store)}`;
    if(!groups[key]) groups[key]={retailer:retailer||'Independent / other',store,buys:0,profit:0,spend:0};
    groups[key].buys++;
    groups[key].profit += Number(x.profit||0);
    groups[key].spend += Number(x.buyPrice||0);
  });
  return Object.values(groups).map(g=>({
    ...g,
    avgProfit:g.buys?g.profit/g.buys:0,
    roi:g.spend?g.profit/g.spend*100:0,
    score:Math.round(Math.min(100, g.buys*12 + Math.max(0,g.avgProfit)*1.6 + Math.min(35,Math.max(0,g.roi)*.12)))
  })).sort((a,b)=>b.score-a.score || b.profit-a.profit);
}
function historyScoreForPlace(place){
  const name=normText(place?.name), address=normText(place?.address);
  let best=0;
  sourcingStats().forEach(s=>{
    const r=normText(s.retailer), st=normText(s.store);
    const retailerMatch=r && (name.includes(r)||r.includes(name));
    const storeMatch=st && (name.includes(st)||address.includes(st));
    if(retailerMatch || storeMatch) best=Math.max(best,s.score);
  });
  return best;
}

const DISCOVERY_CATEGORIES=[
  ['Priority retailers','Walmart TJ Maxx Marshalls Burlington Ross Ollies Lowes Home Depot Target'],
  ['Return & bin stores','bin store return store Amazon returns liquidation bins'],
  ['Liquidation / overstock','liquidation store overstock store closeout store'],
  ['Thrift / resale','thrift store resale store consignment store'],
  ['Flea markets','flea market'],
  ['Estate sales','estate sales'],
  ['Garage / yard sales','garage sales yard sales'],
  ['Auctions','auction house local auctions']
];
function mapsNearbyUrl(query){
  const q=encodeURIComponent(query);
  const lat=Number(localPos?.lat), lon=Number(localPos?.lon);
  return Number.isFinite(lat)&&Number.isFinite(lon)
    ? `https://www.google.com/maps/search/?api=1&query=${q}&center=${lat},${lon}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}
function renderDiscoveryButtons(){
  const el=$('#discoveryButtons'); if(!el) return;
  el.innerHTML=DISCOVERY_CATEGORIES.map(([label,q])=>`<a class="discovery-btn" href="${mapsNearbyUrl(q)}" target="_blank" rel="noopener"><strong>${escapeHtml(label)}</strong><small>Search near me ↗</small></a>`).join('');
}

function renderSourcingHistory(){
  const stats=sourcingStats(), el=$('#sourcingHistory'), priority=$('#personalPriority');
  const empty='<div class="empty-state">No sourcing history yet. In Hunt Mode, add the retailer/location and tap <strong>Save as bought</strong>. Radar will learn which places actually make you money.</div>';
  if(el) el.innerHTML=stats.length?stats.slice(0,8).map((s,i)=>`<div class="history-row"><div><strong>${i+1}. ${escapeHtml(s.retailer)}</strong>${s.store?` <span class="muted">· ${escapeHtml(s.store)}</span>`:''}<small>${s.buys} buy${s.buys===1?'':'s'} · ${money(s.profit)} est. profit · ${Math.round(s.roi)}% ROI</small></div><div class="history-score">${s.score}</div></div>`).join(''):empty;
  if(priority){
    if(!stats.length) priority.innerHTML='<strong>Personal sourcing:</strong> Start saving real buys in Hunt Mode and TODAY will learn which retailers deserve your time.';
    else {
      const s=stats[0];
      priority.innerHTML=`<div><div class="eyebrow">PERSONAL PRIORITY</div><strong>${escapeHtml(s.retailer)}${s.store?` · ${escapeHtml(s.store)}`:''}</strong><p>${s.buys} recorded buy${s.buys===1?'':'s'} · ${money(s.profit)} estimated profit. Your sourcing score: <b>${s.score}</b>.</p></div>`;
    }
  }
}

function renderMetrics(){
  const qualified = state.deals.map(d=>({...d,...calcDeal(d)})).filter(d=>d.profit>=state.settings.minProfit && d.roi>=state.settings.minRoi && d.miles<=state.settings.radius);
  const pennies = state.deals.filter(d=>d.clearancePrice<=.01).length;
  const bestProfit = qualified.length ? Math.max(...qualified.map(d=>d.profit)) : 0;
  const stores = new Set(qualified.map(d=>`${d.retailer}|${d.store}`)).size;
  $('#metrics').innerHTML = [
    [qualified.length,'Qualified flips'],[pennies,'Penny candidates'],[stores,'Stores worth checking'],[money(bestProfit),'Best est. profit']
  ].map(([a,b])=>`<div class="metric"><strong>${a}</strong><span>${b}</span></div>`).join('');
}

function retailerOptions(){
  const current = $('#retailerFilter').value;
  const retailers=[...new Set([...retailerCatalog.map(r=>r.name),...state.deals.map(d=>d.retailer)])].sort((a,b)=>a.localeCompare(b));
  $('#retailerFilter').innerHTML='<option value="all">All retailers</option>'+retailers.map(r=>`<option>${escapeHtml(r)}</option>`).join('');
  if(retailers.includes(current)) $('#retailerFilter').value=current;
}

function dealCard(d){
  const c=calcDeal(d);
  const penny=d.clearancePrice<=.01;
  return `<article class="deal-card" data-id="${d.id}">
    <div class="deal-main">
      <div class="deal-topline"><span class="retailer">${escapeHtml(d.retailer)}</span><span class="data-source ${String(d.source||'MANUAL').toLowerCase()}">${escapeHtml(d.source||'MANUAL')}</span><span class="evidence mini">${escapeHtml(d.evidence||evidenceForDeal(d))}</span><span class="store">${escapeHtml(d.store)} · ${d.miles} mi</span><span class="confidence ${d.confidence.toLowerCase()}">${d.confidence}</span>${penny?'<span class="penny-badge">PENNY WATCH</span>':''}${d.newMarkdown?'<span class="markdown-badge">NEW MARKDOWN</span>':''}</div>
      <div class="deal-title">${escapeHtml(d.item)}</div>
      <div class="deal-stats">
        <span class="stat">Buy <b>${money(d.clearancePrice)}</b></span><span class="stat">Was ${money(d.regularPrice)}</span><span class="stat">Markdown <b>${pct(c.markdown)}</b></span><span class="stat">Resale ${money(d.resalePrice)}</span><span class="stat">Profit <b>${money(c.profit)}</b></span><span class="stat">ROI <b>${pct(c.roi)}</b></span><span class="stat">Qty ~${d.quantity}</span>
      </div>
    </div>
    <div class="deal-score"><div class="score">${Math.round(c.score)}</div><div class="score-label">Opportunity score</div><button class="ghost route-btn" data-store="${encodeURIComponent(d.store+' '+d.retailer)}">Route</button></div>
  </article>`;
}

function getFilteredDeals(){
  const mode=$('#modeFilter').value, retailer=$('#retailerFilter').value;
  const minProfit=Number($('#minProfitFilter').value||0), maxMiles=Number($('#maxMilesFilter').value||999);
  return state.deals.map(d=>({...d,_calc:calcDeal(d)})).filter(d=>{
    if(retailer!=='all'&&d.retailer!==retailer)return false;
    if(d._calc.profit<minProfit||d.miles>maxMiles)return false;
    if(mode==='penny'&&d.clearancePrice>.01)return false;
    if(mode==='70'&&d._calc.markdown<70)return false;
    if(mode==='new'&&!d.newMarkdown)return false;
    return true;
  }).sort((a,b)=> mode==='profit' ? b._calc.profit-a._calc.profit : b._calc.score-a._calc.score);
}

function renderDeals(){
  retailerOptions();
  const deals=getFilteredDeals();
  $('#radarDeals').innerHTML=deals.length?deals.map(dealCard).join(''):'<div class="empty">No opportunities match these rules yet.</div>';
  const top=state.deals.map(d=>({...d,_calc:calcDeal(d)})).filter(d=>d._calc.profit>=state.settings.minProfit&&d.miles<=state.settings.radius).sort((a,b)=>b._calc.score-a._calc.score).slice(0,4);
  $('#topDeals').innerHTML=top.length?top.map(dealCard).join(''):'<div class="empty">Add or import clearance finds to start ranking trips.</div>';
}

function renderSettings(){
  const s=state.settings;
  $('#settingMinProfit').value=s.minProfit; $('#settingMinRoi').value=s.minRoi; $('#settingMaxBuy').value=s.maxBuy; $('#settingFee').value=s.fee; $('#settingRadius').value=s.radius; $('#settingTravel').value=s.travel; $('#settingCategories').value=s.categories; $('#settingExclude').value=s.exclude;
  $('#minProfitFilter').value=s.minProfit; $('#maxMilesFilter').value=s.radius;
}

function renderInventory(){
  $('#inventoryList').innerHTML = state.inventory.length ? state.inventory.slice().reverse().map(x=>{
    const listing=makeListing(x);
    return `<article class="inventory-card"><div class="title">${escapeHtml(x.item||'Unidentified item')}</div>${(x.retailer||x.store)?`<div class="inventory-source">${escapeHtml(x.retailer||'Source')}${x.store?` · ${escapeHtml(x.store)}`:''}</div>`:''}<div class="inventory-meta">Bought ${money(x.buyPrice)} · target ${money(x.salePrice)} · est. profit ${money(x.profit)} · ${new Date(x.created).toLocaleDateString()}</div><div class="listing-box">${escapeHtml(listing)}</div><div class="actions" style="margin-top:10px"><button class="ghost copy-listing" data-id="${x.id}">Copy listing starter</button><button class="ghost remove-inventory" data-id="${x.id}">Remove</button></div></article>`;
  }).join('') : '<div class="empty">Nothing bought yet. When Hunt Mode says BUY, save the item here.</div>';
}

function makeListing(x){
  const name=(x.item||'Item').trim();
  const barcode=x.barcode?` UPC ${x.barcode}`:'';
  const title=`${name}${barcode}`.slice(0,80);
  return `${title}\n\nPre-owned/new item as shown. Please review photos for exact condition and included components.\n\nUPC: ${x.barcode||'N/A'}\nTarget price: ${money(x.salePrice)}\n\nShips carefully packed.`;
}


async function refreshClearanceFeed(){
  const url=(state.settings.feedUrl||'').trim();
  if(!url){ alert('Add a clearance feed URL in Tools first. This app will not invent live retailer data.'); return; }
  try{
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct=res.headers.get('content-type')||'';
    let rows=[];
    if(ct.includes('application/json') || url.toLowerCase().endsWith('.json')){
      const data=await res.json();
      rows=Array.isArray(data)?data:(data.deals||[]);
    }else{
      const text=await res.text();
      const lines=text.trim().split(/\r?\n/);
      if(lines.length<2) throw new Error('Feed has no rows');
      const headers=lines[0].split(',').map(s=>s.trim());
      rows=lines.slice(1).map(line=>{
        const vals=line.split(',').map(s=>s.trim());
        return Object.fromEntries(headers.map((h,i)=>[h,vals[i]??'']));
      });
    }
    const now=nowISO();
    const mapped=rows.map((r,i)=>({
      id:String(r.id||`live-${Date.now()}-${i}`),
      retailer:r.retailer||r.store||'Unknown retailer',
      store:r.storeName||r.location||r.store||'',
      item:r.item||r.title||r.product||'Unknown item',
      buy:+(r.buy??r.price??r.clearancePrice??0),
      was:+(r.was??r.regularPrice??r.msrp??0),
      resale:+(r.resale??r.estimatedResale??0),
      distance:+(r.distance??0),
      confidence:r.confidence||'Medium',
      qty:+(r.qty??r.quantity??0),
      penny:/^(true|1|yes)$/i.test(String(r.penny??'')) || +(r.buy??r.price??0)===0.01,
      newMarkdown:/^(true|1|yes)$/i.test(String(r.newMarkdown??'')),
      lastSeen:r.lastSeen||r.updatedAt||now,
      source:'LIVE', evidence:r.evidence||r.evidenceType||'LIVE STORE PRICE'
    })).filter(d=>d.buy>=0 && d.item);
    state.deals=mapped;
    saveState(); renderAll();
    alert(`Loaded ${mapped.length} live/imported feed opportunities.`);
  }catch(err){
    alert(`Could not refresh feed: ${err.message}`);
  }
}

function renderAll(){ renderMetrics(); renderDeals(); renderInventory(); renderSettings(); renderTodaySources(); renderTreasure(); renderSourcingHistory(); renderDiscoveryButtons(); bindDynamic(); }
function bindDynamic(){
  $$('.route-btn').forEach(b=>b.onclick=()=>window.open(`https://www.google.com/maps/search/?api=1&query=${b.dataset.store}`,'_blank'));
  $$('.copy-listing').forEach(b=>b.onclick=()=>{const x=state.inventory.find(i=>i.id===b.dataset.id); navigator.clipboard?.writeText(makeListing(x)); b.textContent='Copied'; setTimeout(()=>b.textContent='Copy listing starter',1200)});
  $$('.remove-inventory').forEach(b=>b.onclick=()=>{state.inventory=state.inventory.filter(i=>i.id!==b.dataset.id);saveState();renderInventory();bindDynamic()});
}

function navigate(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));

['modeFilter','retailerFilter','minProfitFilter','maxMilesFilter'].forEach(id=>$('#'+id).addEventListener('input',()=>{renderDeals();bindDynamic()}));

$('#addDealBtn').onclick=()=>$('#dealDialog').showModal();
$('#submitDeal').onclick=e=>{
  e.preventDefault();
  const f=new FormData($('#dealForm'));
  const d={id:'d'+Date.now(),retailer:f.get('retailer'),store:f.get('store'),item:f.get('item'),category:f.get('category')||'',regularPrice:+f.get('regularPrice'),clearancePrice:+f.get('clearancePrice'),resalePrice:+f.get('resalePrice'),shipping:+f.get('shipping')||0,quantity:+f.get('quantity')||0,miles:+f.get('miles')||0,confidence:f.get('confidence'),upc:f.get('upc')||'',newMarkdown:f.get('newMarkdown')==='on',lastSeen:nowISO(),source:'MANUAL',evidence:'MANUAL'};
  state.deals.push(d);saveState();$('#dealDialog').close();$('#dealForm').reset();renderAll();
};

$('#saveSettingsBtn').onclick=()=>{
  state.settings={minProfit:+$('#settingMinProfit').value,minRoi:+$('#settingMinRoi').value,maxBuy:+$('#settingMaxBuy').value,fee:+$('#settingFee').value,radius:+$('#settingRadius').value,travel:+$('#settingTravel').value,categories:$('#settingCategories').value,exclude:$('#settingExclude').value};
  saveState();renderAll();$('#saveSettingsBtn').textContent='Saved';setTimeout(()=>$('#saveSettingsBtn').textContent='Save settings',1200);
};
$('#clearDealsBtn').onclick=()=>{
  if(!confirm('Clear all manual/imported clearance opportunities? Your buys, watchlist and settings will be kept.')) return;
  state.deals=[]; saveState(); renderAll();
};

function huntCalc(){
  const buy=+$('#buyPrice').value||0,sale=+$('#salePrice').value||0,ship=+$('#shippingCost').value||0,other=+$('#otherCost').value||0;
  const fee=sale*(state.settings.fee/100),profit=sale-buy-ship-other-fee,roi=buy>0?(profit/buy)*100:0;
  const buyOk=profit>=state.settings.minProfit&&roi>=state.settings.minRoi&&buy<=state.settings.maxBuy;
  const reason=buyOk?'Meets your profit, ROI and max-buy rules.':[`profit ${money(profit)} vs ${money(state.settings.minProfit)} minimum`,`ROI ${pct(roi)} vs ${pct(state.settings.minRoi)} minimum`,`${money(buy)} buy vs ${money(state.settings.maxBuy)} max`].filter((r,i)=>[profit<state.settings.minProfit,roi<state.settings.minRoi,buy>state.settings.maxBuy][i]).join(' · ');
  $('#verdict').className=`verdict ${buyOk?'buy':'pass'}`;
  $('#verdict').innerHTML=`<h3>${buyOk?'BUY':'PASS'}</h3><p>${reason}</p><div class="verdict-grid"><div>Est. profit<strong>${money(profit)}</strong></div><div>ROI<strong>${pct(roi)}</strong></div><div>Marketplace fee<strong>${money(fee)}</strong></div></div>`;
  return {buy,sale,ship,other,fee,profit,roi,buyOk};
}
$('#calculateBtn').onclick=huntCalc;

$('#saveInventoryBtn').onclick=()=>{
  const c=huntCalc();
  state.inventory.push({id:'i'+Date.now(),item:$('#huntName').value||'Unidentified item',barcode:$('#huntBarcode').value,retailer:$('#huntRetailer')?.value||'',store:$('#huntStore')?.value||'',buyPrice:c.buy,salePrice:c.sale,shipping:c.ship,other:c.other,profit:c.profit,created:nowISO()});saveState();renderInventory();bindDynamic();$('#saveInventoryBtn').textContent='Saved';setTimeout(()=>$('#saveInventoryBtn').textContent='Save as bought',1200);
};
$('#saveWatchBtn').onclick=()=>{state.watch.push({id:'w'+Date.now(),item:$('#huntName').value,barcode:$('#huntBarcode').value,buyPrice:+$('#buyPrice').value,salePrice:+$('#salePrice').value,created:nowISO()});saveState();$('#saveWatchBtn').textContent='Watching';setTimeout(()=>$('#saveWatchBtn').textContent='Watch item',1200)};

$('#photoInput').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file);const p=$('#photoPreview');p.style.backgroundImage=`url(${url})`;p.classList.remove('hidden')};

let stream, scanTimer;
$('#scanBtn').onclick=async()=>{
  $('#scanDialog').showModal();
  const status=$('#scannerStatus');
  if(!('BarcodeDetector' in window)){status.textContent='This browser does not expose BarcodeDetector. Type the UPC, or use Chrome/Android with barcode support.';return;}
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});$('#scannerVideo').srcObject=stream;
    const detector=new BarcodeDetector({formats:['upc_a','upc_e','ean_13','ean_8','code_128']});
    scanTimer=setInterval(async()=>{try{const codes=await detector.detect($('#scannerVideo'));if(codes.length){$('#huntBarcode').value=codes[0].rawValue;closeScanner();}}catch{}},450);
    status.textContent='Point the camera at the barcode.';
  }catch(err){status.textContent='Camera unavailable. You can still type the UPC manually.';}
};
function closeScanner(){if(scanTimer)clearInterval(scanTimer);if(stream)stream.getTracks().forEach(t=>t.stop());$('#scanDialog').close();}
$('#closeScanner').onclick=closeScanner;

$('#importBtn').onclick=()=>$('#csvInput').click();
$('#csvInput').onchange=async e=>{
  const file=e.target.files?.[0]; if(!file)return;
  const text=await file.text(); const rows=parseCSV(text); if(!rows.length)return alert('No rows found.');
  const headers=rows[0].map(h=>h.trim());
  const required=['retailer','store','item','regularPrice','clearancePrice','resalePrice'];
  if(!required.every(h=>headers.includes(h)))return alert(`CSV needs: ${required.join(', ')}`);
  const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
  rows.slice(1).filter(r=>r.some(Boolean)).forEach(r=>state.deals.push({id:'d'+Date.now()+Math.random(),retailer:r[idx.retailer]||'',store:r[idx.store]||'',item:r[idx.item]||'',category:r[idx.category]||'',regularPrice:+r[idx.regularPrice]||0,clearancePrice:+r[idx.clearancePrice]||0,resalePrice:+r[idx.resalePrice]||0,shipping:+r[idx.shipping]||0,quantity:+r[idx.quantity]||1,miles:+r[idx.miles]||0,confidence:r[idx.confidence]||'Medium',upc:r[idx.upc]||'',newMarkdown:/^(true|1|yes)$/i.test(r[idx.newMarkdown]||''),lastSeen:r[idx.lastSeen]||nowISO(),source:'IMPORTED',evidence:'VERIFY IN STORE'}));
  saveState();renderAll(); e.target.value='';
};
function parseCSV(text){let out=[],row=[],field='',quote=false;for(let i=0;i<text.length;i++){let ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){field+='"';i++;}else quote=!quote;}else if(ch===','&&!quote){row.push(field);field='';}else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);out.push(row);row=[];field='';}else field+=ch;}if(field.length||row.length){row.push(field);out.push(row)}return out;}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}

let deferredPrompt;
const installDialog=$('#installDialog');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;$('#installBtn').textContent='Installed';});
$('#installBtn').onclick=()=>{
  ['installReady','installHosted','installLocal'].forEach(id=>$('#'+id).classList.add('hidden'));
  if(window.matchMedia('(display-mode: standalone)').matches){$('#installHosted').innerHTML='<p><strong>Arbitrage Radar is already installed.</strong></p>';$('#installHosted').classList.remove('hidden');}
  else if(deferredPrompt) $('#installReady').classList.remove('hidden');
  else if(location.protocol==='http:'||location.protocol==='https:') $('#installHosted').classList.remove('hidden');
  else $('#installLocal').classList.remove('hidden');
  installDialog.showModal();
};
$('#confirmInstallBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installDialog.close();};
$('#closeInstall').onclick=()=>installDialog.close();
if('serviceWorker' in navigator && (location.protocol==='http:'||location.protocol==='https:')) navigator.serviceWorker.register('./sw.js').catch(()=>{});

const requestedView=new URLSearchParams(location.search).get('view');
if(requestedView && ['dashboard','radar','nearby','hunt','inventory','tools','settings'].includes(requestedView)) setTimeout(()=>navigate(requestedView),0);

renderAll();huntCalc();

// V4 GPS Local Sourcing Radar. We open live map/search discovery instead of pretending
// the static app has real-time business, sale-event or retailer inventory feeds.
let lastGps=null;
function sourceScore(source, radius){
  const radiusPenalty=Math.max(0,(Number(radius)-10)*.18);
  return Math.max(1,Math.min(99,Math.round(source.priority-radiusPenalty)));
}
function mapUrl(query,lat,lon){
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lon},12z`;
}
function webSearchUrl(query,lat,lon){
  // Google web search complements Maps for event-style sources like estate and garage sales.
  return `https://www.google.com/search?q=${encodeURIComponent(query+' near '+lat.toFixed(3)+','+lon.toFixed(3))}`;
}
function sourceCard(source,latitude,longitude,radius){
  const score=sourceScore(source,radius);
  const eventLike=['estate','garage','auction'].includes(source.id);
  const treasure=getTreasureTerms().slice(0,6).join(', ');
  const aliases=source.queries.slice(0,4).map(q=>`<button class="mini-search" data-q="${escapeHtml(q)}" data-lat="${latitude}" data-lon="${longitude}">${escapeHtml(q)}</button>`).join('');
  return `<article class="card source-card2"><div class="source-head"><div class="source-icon">${source.icon}</div><div><h3>${escapeHtml(source.name)}</h3><div class="meta">Discovery priority ${score}/100 · ${radius} mi radius</div></div></div><p>${escapeHtml(source.why)}</p>${eventLike?`<div class="signal"><strong>Treasure watch:</strong> ${escapeHtml(treasure)}</div>`:''}<div class="query-pills">${aliases}</div><div class="actions"><button class="primary source-search" data-id="${source.id}" data-lat="${latitude}" data-lon="${longitude}">Search live nearby</button>${eventLike?`<button class="ghost event-search" data-id="${source.id}" data-lat="${latitude}" data-lon="${longitude}">Search current listings</button>`:''}</div></article>`;
}
function bindLocalSearchButtons(){
  $$('.source-search').forEach(b=>b.onclick=()=>{
    const source=sourceCatalog.find(x=>x.id===b.dataset.id); if(!source)return;
    window.open(mapUrl(source.queries[0],+b.dataset.lat,+b.dataset.lon),'_blank');
  });
  $$('.mini-search').forEach(b=>b.onclick=()=>window.open(mapUrl(b.dataset.q,+b.dataset.lat,+b.dataset.lon),'_blank'));
  $$('.event-search').forEach(b=>b.onclick=()=>{
    const source=sourceCatalog.find(x=>x.id===b.dataset.id); if(!source)return;
    const terms=getTreasureTerms().slice(0,4).join(' ');
    window.open(webSearchUrl(`${source.queries[0]} ${terms}`,+b.dataset.lat,+b.dataset.lon),'_blank');
  });
}
function renderLocalSources(latitude,longitude){
  const radius=$('#nearRadius').value;
  const selected=$('#sourceType').value;
  const sources=selected==='all'?sourceCatalog:sourceCatalog.filter(x=>x.id===selected);
  $('#nearbyResults').innerHTML=sources.map(x=>sourceCard(x,latitude,longitude,radius)).join('');
  bindLocalSearchButtons();
}
function gpsSearch(){
  const status=$('#locationStatus');
  if(!navigator.geolocation){status.textContent='Geolocation is not supported by this browser.';return;}
  status.textContent='Getting your location…';
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude,longitude}=pos.coords; lastGps={latitude,longitude}; const radius=$('#nearRadius').value;
    status.innerHTML=`<strong>GPS ready.</strong> Searching a ${radius}-mile sourcing radius. Live results open in Maps/search so hours and business listings stay current.`;
    renderLocalSources(latitude,longitude);
  },err=>status.textContent=`Location unavailable: ${err.message}. Radar and Hunt Mode still work without GPS.` ,{enableHighAccuracy:true,timeout:10000,maximumAge:300000});
}
$('#gpsBtn')?.addEventListener('click',gpsSearch);
$('#searchAreaBtn')?.addEventListener('click',async()=>{const center=(typeof mapSearchCenter!=='undefined'&&mapSearchCenter)||lastGps;if(center){lastGps={latitude:center.latitude,longitude:center.longitude};await renderLocalSources(center.latitude,center.longitude);}else gpsSearch();});
$('#nearRadius')?.addEventListener('change',()=>{if(lastGps)renderLocalSources(lastGps.latitude,lastGps.longitude);});
$('#sourceType')?.addEventListener('change',()=>{if(lastGps)renderLocalSources(lastGps.latitude,lastGps.longitude);});
$('#saveTreasureBtn')?.addEventListener('click',()=>{
  const terms=$('#treasureInput').value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
  saveTreasureTerms(terms);renderTreasure(); if(lastGps)renderLocalSources(lastGps.latitude,lastGps.longitude);
});
renderTodaySources();renderTreasure();


// ===== Arbitrage Radar Release 1.0 additions =====
// Live local discovery uses OpenStreetMap/Overpass data in the browser.
// Event-style sources (estate/garage sales) use current web/map searches because
// there is no universal free structured event feed.

const RELEASE_VERSION='1.7';
let livePlaces=[];
let routeStops=(()=>{try{return JSON.parse(localStorage.getItem('arbitrageRouteStops'))||[]}catch{return[]}})();
function saveRoute(){localStorage.setItem('arbitrageRouteStops',JSON.stringify(routeStops));renderRoute();}
function rad(n){return n*Math.PI/180}
function milesBetween(a,b,c,d){const R=3958.8,dl=rad(c-a),dn=rad(d-b);const x=Math.sin(dl/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function osmCenter(el){return {lat:el.lat??el.center?.lat,lon:el.lon??el.center?.lon};}
function classifyPlace(tags={}){
  const text=`${tags.name||''} ${tags.shop||''} ${tags.amenity||''} ${tags.description||''}`.toLowerCase();
  if(/bin store|returns?|amazon return|liquidation bin|pallet/.test(text)) return 'returns';
  if(/liquidat|overstock|closeout|outlet/.test(text)) return 'liquidation';
  if(/flea|swap meet|marketplace/.test(text)) return 'flea';
  if(/auction/.test(text)) return 'auction';
  if(/thrift|charity|second.?hand|resale|goodwill|salvation army/.test(text)) return 'thrift';
  if(/home depot|walmart|lowe|target|dollar general|tj maxx|t\.?j\.? maxx|marshalls|burlington|ross dress|ollie|five below|dollar tree|family dollar|walgreens|cvs|macy|kohl|best buy|staples|office depot|tractor supply|harbor freight|department_store/.test(text)) return 'clearance';
  return 'thrift';
}
function sourceById(id){return sourceCatalog.find(x=>x.id===id)||sourceCatalog.find(x=>x.id==='thrift');}
function addressFrom(tags={}){
  const parts=[tags['addr:housenumber'],tags['addr:street'],tags['addr:city'],tags['addr:state']].filter(Boolean);
  return parts.join(' ')||tags['addr:full']||'Address available in Maps';
}
function placeKey(p){return `${p.name}|${Number(p.lat).toFixed(5)}|${Number(p.lon).toFixed(5)}`}
function addRouteStop(place){
  if(routeStops.some(x=>placeKey(x)===placeKey(place)))return;
  if(routeStops.length>=8){alert('Route is limited to 8 saved stops for a reliable mobile Maps handoff.');return;}
  routeStops.push({name:place.name,lat:place.lat,lon:place.lon,address:place.address||'',source:place.source});saveRoute();
}
function renderRoute(){
  const el=$('#routeStops'),sum=$('#routeSummary');if(!el||!sum)return;
  sum.textContent=routeStops.length?`${routeStops.length} stop${routeStops.length===1?'':'s'} saved. Open them as one sourcing trip.`:'No stops saved yet.';
  el.innerHTML=routeStops.length?routeStops.map((x,i)=>`<div class="route-stop"><div><strong>${i+1}. ${escapeHtml(x.name)}</strong><br><small>${escapeHtml(sourceById(x.source)?.name||'Source')} · ${escapeHtml(x.address||'')}</small></div><button class="ghost route-remove" data-i="${i}">Remove</button></div>`).join(''):'';
  $$('.route-remove').forEach(b=>b.onclick=()=>{routeStops.splice(+b.dataset.i,1);saveRoute()});
}
function openSavedRoute(){
  if(!routeStops.length)return alert('Save at least one local opportunity to your route first.');
  if(routeStops.length===1){window.open(`https://www.google.com/maps/dir/?api=1&destination=${routeStops[0].lat},${routeStops[0].lon}`,'_blank');return;}
  const origin=lastGps?`${lastGps.latitude},${lastGps.longitude}`:'';
  const destination=routeStops[routeStops.length-1];
  const waypoints=routeStops.slice(0,-1).map(x=>`${x.lat},${x.lon}`).join('|');
  const url=`https://www.google.com/maps/dir/?api=1${origin?`&origin=${encodeURIComponent(origin)}`:''}&destination=${destination.lat},${destination.lon}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
  window.open(url,'_blank');
}
$('#openRouteBtn')?.addEventListener('click',openSavedRoute);
$('#clearRouteBtn')?.addEventListener('click',()=>{routeStops=[];saveRoute()});
renderRoute();

function ebayQuery(){return ($('#huntBarcode')?.value||$('#huntName')?.value||'').trim();}
function openEbaySearch(sold){
  const q=ebayQuery();if(!q)return alert('Enter an item name or UPC in Hunt Mode first.');
  const extra=sold?'&LH_Sold=1&LH_Complete=1':'';
  window.open(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}${extra}&_sop=13`,'_blank');
}
$('#soldCompsBtn')?.addEventListener('click',()=>openEbaySearch(true));
$('#activeListingsBtn')?.addEventListener('click',()=>openEbaySearch(false));
$('#toolCompsBtn')?.addEventListener('click',()=>{navigate('hunt');setTimeout(()=>openEbaySearch(true),50)});

function overpassQuery(lat,lon,radiusMiles){
  const meters=Math.min(Number(radiusMiles||25),50)*1609.344;
  return `[out:json][timeout:25];(
    nwr["shop"~"second_hand|charity|outlet|department_store"](around:${Math.round(meters)},${lat},${lon});
    nwr["amenity"="marketplace"](around:${Math.round(meters)},${lat},${lon});
    nwr["name"~"thrift|resale|second hand|liquidation|overstock|closeout|bin store|returns|flea|swap meet|auction|Goodwill|Salvation Army|Home Depot|Walmart|Lowe|Target|Dollar General|TJ Maxx|T.J. Maxx|Marshalls|Burlington|Ross Dress|Ollie|Five Below|Dollar Tree|Family Dollar|Walgreens|CVS|Macy|Kohl|Best Buy|Staples|Office Depot|Tractor Supply|Harbor Freight",i](around:${Math.round(meters)},${lat},${lon});
  );out center tags;`;
}
async function fetchLivePlaces(lat,lon,radius){
  const query=overpassQuery(lat,lon,radius);
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let lastErr;
  for(const endpoint of endpoints){
    try{
      const controller=new AbortController();const t=setTimeout(()=>controller.abort(),18000);
      const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query),signal:controller.signal});clearTimeout(t);
      if(!r.ok)throw new Error(`Live directory returned ${r.status}`);
      const data=await r.json();
      const seen=new Set();
      return (data.elements||[]).map(el=>{
        const c=osmCenter(el),tags=el.tags||{};if(!c.lat||!c.lon)return null;
        const name=tags.name||tags.brand||'Local sourcing location';const source=classifyPlace(tags);
        return {name,source,lat:c.lat,lon:c.lon,distance:milesBetween(lat,lon,c.lat,c.lon),address:addressFrom(tags),hours:tags.opening_hours||'',website:tags.website||tags['contact:website']||''};
      }).filter(Boolean).filter(p=>{const k=placeKey(p);if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.distance-b.distance).slice(0,60);
    }catch(e){lastErr=e;}
  }
  throw lastErr||new Error('Live local directory unavailable');
}
function placeCard(p){
  const src=sourceById(p.source);
  return `<article class="card place-card"><div class="source-head"><div class="source-icon">${src.icon}</div><div><h3>${escapeHtml(p.name)}</h3><div class="meta"><span class="live-badge">LIVE DIRECTORY</span> · <span class="distance">${p.distance.toFixed(1)} mi</span> · ${escapeHtml(src.name)}</div></div></div><div class="address">${escapeHtml(p.address)}</div>${historyScoreForPlace(p)?`<div class="personal-match">★ Your sourcing score: ${historyScoreForPlace(p)}</div>`:''}${p.hours?`<div class="hours">Hours: ${escapeHtml(p.hours)}</div>`:''}<div class="actions" style="margin-top:12px"><button class="primary place-route" data-k="${encodeURIComponent(placeKey(p))}">Directions</button><button class="ghost place-save" data-k="${encodeURIComponent(placeKey(p))}">+ Route</button>${p.website?`<button class="ghost place-web" data-k="${encodeURIComponent(placeKey(p))}">Website</button>`:''}</div></article>`;
}
function eventDiscoveryCards(lat,lon,radius,selected){
  const ids=selected==='all'?['estate','garage']:['estate','garage'].includes(selected)?[selected]:[];
  if(!ids.length)return '';
  return `<div class="source-section-title"><h3>Current sale listings</h3><p>Estate and garage sales change too quickly for a reliable static directory. These searches use your current GPS area.</p></div>`+ids.map(id=>sourceCard(sourceById(id),lat,lon,radius)).join('');
}
function bindLivePlaceButtons(){
  $$('.place-route').forEach(b=>b.onclick=()=>{const k=decodeURIComponent(b.dataset.k),p=livePlaces.find(x=>placeKey(x)===k);if(p)window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`,'_blank')});
  $$('.place-save').forEach(b=>b.onclick=()=>{const k=decodeURIComponent(b.dataset.k),p=livePlaces.find(x=>placeKey(x)===k);if(p){addRouteStop(p);b.textContent='Saved'}});
  $$('.place-web').forEach(b=>b.onclick=()=>{const k=decodeURIComponent(b.dataset.k),p=livePlaces.find(x=>placeKey(x)===k);if(p?.website)window.open(p.website,'_blank')});
  bindLocalSearchButtons();
}

let sourcingMap=null,userMapMarker=null,mapLayerGroup=null,mapSearchCenter=null;
const sourceMarkerClass={returns:'returns',liquidation:'liquidation',estate:'estate',garage:'garage',flea:'flea',thrift:'thrift',auction:'auction',clearance:'clearance'};
function ensureMap(lat,lon){
  const el=$('#sourcingMap'); if(!el)return;
  if(typeof L==='undefined'){
    el.innerHTML='<div class="map-fallback">Interactive map library could not load. The ranked list and Directions buttons still work.</div>';
    return;
  }
  if(!sourcingMap){
    sourcingMap=L.map(el,{zoomControl:true}).setView([lat,lon],11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(sourcingMap);
    mapLayerGroup=L.layerGroup().addTo(sourcingMap);
    sourcingMap.on('moveend',()=>{const c=sourcingMap.getCenter();mapSearchCenter={latitude:c.lat,longitude:c.lng};const b=$('#searchAreaBtn');if(b)b.textContent='Search this map area';});
  } else sourcingMap.setView([lat,lon],sourcingMap.getZoom()||11);
  mapSearchCenter={latitude:lat,longitude:lon};
  if(userMapMarker)sourcingMap.removeLayer(userMapMarker);
  userMapMarker=L.circleMarker([lat,lon],{radius:8,weight:3,color:'#ffffff',fillColor:'#7cf5b8',fillOpacity:1}).addTo(sourcingMap).bindPopup('<strong>Your search center</strong>');
  setTimeout(()=>sourcingMap.invalidateSize(),80);
}
function markerIcon(source){
  if(typeof L==='undefined')return null;
  return L.divIcon({className:'radar-map-marker-wrap',html:`<div class="radar-map-marker ${sourceMarkerClass[source]||'thrift'}"></div>`,iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-13]});
}
function renderMapPlaces(lat,lon,selected){
  ensureMap(lat,lon); if(!sourcingMap||!mapLayerGroup)return;
  mapLayerGroup.clearLayers();
  const allowed=selected==='all'?livePlaces:livePlaces.filter(p=>p.source===selected);
  allowed.forEach(p=>{
    const src=sourceById(p.source);
    const dir=`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
    const popup=`<div class="map-popup"><strong>${escapeHtml(p.name)}</strong><br><span>${p.distance.toFixed(1)} mi · ${escapeHtml(src.name)}</span><br><a href="${dir}" target="_blank" rel="noopener">Directions</a></div>`;
    L.marker([p.lat,p.lon],{icon:markerIcon(p.source),title:p.name}).addTo(mapLayerGroup).bindPopup(popup);
  });
  const count=$('#mapCount');if(count)count.textContent=`${allowed.length} MAPPED`;
  const legend=$('#mapLegend');if(legend){
    const ids=[...new Set(allowed.map(p=>p.source))];
    legend.innerHTML=ids.length?ids.map(id=>`<span class="legend-item"><i class="legend-dot ${sourceMarkerClass[id]||'thrift'}"></i>${escapeHtml(sourceById(id).name)}</span>`).join(''):'<span class="micro">No mapped matches for this filter yet.</span>';
  }
}

function renderLiveResults(lat,lon,radius,selected){
  renderMapPlaces(lat,lon,selected);
  const allowed=selected==='all'?livePlaces:livePlaces.filter(p=>p.source===selected);
  let html='';
  if(allowed.length){html+=`<div class="source-section-title"><h3>Places found near you</h3><p>${allowed.length} live directory result${allowed.length===1?'':'s'} matched this view. Distance is straight-line; use Directions for actual driving distance.</p></div>${allowed.map(placeCard).join('')}`;}
  else if(!['estate','garage'].includes(selected)){html+='<div class="data-note">No structured local-directory matches were found for this source. Use the live search cards below; some liquidation/bin businesses are not categorized consistently in map databases.</div>';}
  html+=eventDiscoveryCards(lat,lon,radius,selected);
  // Keep discovery cards for categories that are often inconsistently tagged.
  const discoveryIds=selected==='all'?['returns','liquidation','flea','auction','clearance']:(!['estate','garage'].includes(selected)?[selected]:[]);
  if(discoveryIds.length){html+=`<div class="source-section-title"><h3>Broader live searches</h3><p>Use these when a business or event is missing from the structured directory.</p></div>`+discoveryIds.map(id=>sourceCard(sourceById(id),lat,lon,radius)).join('');}
  $('#nearbyResults').innerHTML=html;bindLivePlaceButtons();
}

// Override V4's local renderer with release behavior.
async function renderLocalSources(latitude,longitude){
  const radius=$('#nearRadius').value,selected=$('#sourceType').value,status=$('#locationStatus');
  $('#nearbyResults').innerHTML='<div class="card loading-card"><strong>Scanning the local area…</strong><p>Checking live map-directory data and preparing current event searches.</p></div>';
  status.innerHTML=`<strong>GPS ready.</strong> Scanning a ${radius}-mile sourcing radius.`;
  try{
    livePlaces=await fetchLivePlaces(latitude,longitude,radius);
    status.innerHTML=`<strong>Live local scan complete.</strong> Found ${livePlaces.length} mapped sourcing locations. Event searches remain live links because estate/garage listings change constantly.`;
  }catch(err){
    livePlaces=[];
    status.innerHTML=`<strong>GPS ready.</strong> <span class="danger-text">Automatic mapped-place discovery is unavailable right now.</span> Current Maps/web searches are still available below.`;
  }
  renderLiveResults(latitude,longitude,radius,selected);
}
async function gpsSearch(){
  const status=$('#locationStatus');
  if(!navigator.geolocation){status.textContent='Geolocation is not supported by this browser.';return;}
  status.textContent='Getting your location…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude,longitude}=pos.coords;lastGps={latitude,longitude};await renderLocalSources(latitude,longitude);
  },err=>status.textContent=`Location unavailable: ${err.message}. Radar and Hunt Mode still work without GPS.`,{enableHighAccuracy:true,timeout:12000,maximumAge:180000});
}

// Update installed-app text without relying on network.
if(window.matchMedia('(display-mode: standalone)').matches){const b=$('#installBtn');if(b)b.textContent='Installed';}

const _rf=$('#refreshFeedBtn'); if(_rf) _rf.addEventListener('click',refreshClearanceFeed);

const _fi=$('#feedUrlInput'), _fs=$('#saveFeedUrlBtn');
if(_fi) _fi.value=state.settings.feedUrl||'';
if(_fs) _fs.addEventListener('click',()=>{
  state.settings.feedUrl=(_fi?.value||'').trim();
  saveState();
  alert(state.settings.feedUrl?'Feed URL saved.':'Feed URL cleared.');
});


// ===== Release 1.7 Near Me stability controller =====
(function(){
  const byId=id=>document.getElementById(id);
  const set=(id,v)=>{const e=byId(id);if(e)e.textContent=v;};
  const categories=[
    ['Walmart','Walmart'],['TJ Maxx','TJ Maxx'],['Marshalls','Marshalls'],
    ['Burlington','Burlington'],['Ross','Ross Dress for Less'],
    ["Ollie's","Ollie's Bargain Outlet"],['Home Depot','Home Depot'],
    ["Lowe's","Lowe's"],['Target','Target'],['Return / bin stores','bin store returns liquidation'],
    ['Liquidation / overstock','liquidation overstock closeout store'],
    ['Thrift / resale','thrift resale consignment store'],['Flea markets','flea market'],
    ['Estate sales','estate sales'],['Garage / yard sales','garage sales yard sales'],
    ['Auctions','auction house']
  ];
  let stableGps=null;

  function coords(){
    if(stableGps) return stableGps;
    if(typeof lastGps!=='undefined' && lastGps && Number.isFinite(+lastGps.latitude) && Number.isFinite(+lastGps.longitude))
      return {lat:+lastGps.latitude,lon:+lastGps.longitude};
    return null;
  }
  function mapsHref(q){
    const c=coords();
    const query=c?`${q} near ${c.lat.toFixed(5)},${c.lon.toFixed(5)}`:`${q} near me`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  function renderReliable(){
    const el=byId('reliableDiscoveryButtons'); if(!el)return;
    el.innerHTML=categories.map(([label,q])=>`<a class="discovery-btn" href="${mapsHref(q)}" target="_blank" rel="noopener"><strong>${label}</strong><small>Find near me ↗</small></a>`).join('');
  }
  function gpsState(kind,title,detail){
    const dot=byId('gpsDot'); if(dot)dot.className='status-dot '+kind;
    set('gpsStatusText',title);set('gpsDetail',detail);
    set('diagGps',kind==='ok'?'OK':kind==='error'?'FAILED':'WAITING');
  }
  function diagnostics(){
    set('diagHttps',location.protocol==='https:'?'OK':'REQUIRED');
    set('diagMap',typeof L!=='undefined'?'LOADED':'FAILED');
    if(!navigator.geolocation){set('diagPermission','UNAVAILABLE');gpsState('error','GPS: unavailable','This browser does not support geolocation.');return;}
    if(navigator.permissions&&navigator.permissions.query){
      navigator.permissions.query({name:'geolocation'}).then(r=>{
        set('diagPermission',String(r.state).toUpperCase());
        r.onchange=()=>set('diagPermission',String(r.state).toUpperCase());
      }).catch(()=>set('diagPermission','UNKNOWN'));
    }else set('diagPermission','ASK ON USE');
  }
  function centerBaseMap(lat,lon){
    try{
      if(typeof sourcingMap!=='undefined' && sourcingMap && sourcingMap.setView) sourcingMap.setView([lat,lon],12);
      else if(typeof map!=='undefined' && map && map.setView) map.setView([lat,lon],12);
    }catch(e){}
  }
  function requestGps(){
    if(!navigator.geolocation){gpsState('error','GPS: unavailable','Geolocation is unavailable. Use the retailer buttons below.');return;}
    gpsState('waiting','GPS: requesting…','Waiting up to 15 seconds for your phone.');
    const status=byId('locationStatus'); if(status)status.textContent='Requesting your phone location…';
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude,lon=pos.coords.longitude;
      stableGps={lat,lon};
      try{lastGps={latitude:lat,longitude:lon};}catch(e){}
      gpsState('ok','GPS: ready',`${lat.toFixed(5)}, ${lon.toFixed(5)} · accuracy about ${Math.round(pos.coords.accuracy||0)} m`);
      set('diagPermission','GRANTED');
      if(status)status.innerHTML='<strong>GPS ready.</strong> Nearby search buttons are ready. Mapped-place discovery is optional.';
      centerBaseMap(lat,lon);
      renderReliable();
      // Attempt the existing mapped discovery, but never let it block the reliable controls.
      try{
        if(typeof renderLocalSources==='function'){
          await renderLocalSources(lat,lon);
          set('diagDirectory',Array.isArray(window.livePlaces)&&window.livePlaces.length?'OK':'OPTIONAL');
        }
      }catch(e){ set('diagDirectory','UNAVAILABLE'); }
    },err=>{
      const why={1:'Location permission was denied.',2:'Your phone could not determine a location.',3:'The location request timed out.'}[err.code]||err.message||'Unknown location error.';
      gpsState('error','GPS: failed',why+' The buttons below still work using Google Maps “near me.”');
      if(err.code===1)set('diagPermission','DENIED');
      if(status)status.innerHTML=`<strong>GPS unavailable.</strong> ${why} Use the nearby search buttons below.`;
      renderReliable();
    },{enableHighAccuracy:true,timeout:15000,maximumAge:120000});
  }

  document.addEventListener('DOMContentLoaded',()=>{
    diagnostics();renderReliable();
    const gps=byId('gpsBtn'),retry=byId('retryGpsBtn');
    if(gps)gps.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();requestGps();},true);
    if(retry)retry.addEventListener('click',e=>{e.preventDefault();requestGps();});
  });
})();
