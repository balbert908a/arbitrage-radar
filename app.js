
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const today = () => new Date().toISOString().slice(0,10);
const stateKey = 'arbitrageRadar23';

let state = {
  settings:{minProfit:15,minRoi:75,feePct:13.25},
  buys:[],
  imported:[],
  scans:[],
  activeLeadId:null
};
let builtIn = [];
let communitySignals = [];
let gps = null;
let mediaStream = null;
let scanLoopToken = 0;
let currentPhotoData = null;

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(stateKey)||'{}');
    state = {...state,...saved};
    state.settings = {minProfit:15,minRoi:75,feePct:13.25,...(saved.settings||{})};
    state.buys = saved.buys||[];
    state.imported = saved.imported||[];
    state.scans = saved.scans||[];
  }catch{}
}
function saveState(){ localStorage.setItem(stateKey, JSON.stringify(state)); }
function go(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  $$('nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
  window.scrollTo(0,0);
}
function notExpired(o){ return !o.expiresAt || o.expiresAt >= today(); }
function allOpps(){ return [...builtIn,...communitySignals,...state.imported].filter(notExpired); }

function ebaySold(q){ return 'https://www.ebay.com/sch/i.html?_nkw='+encodeURIComponent(q)+'&LH_Sold=1&LH_Complete=1'; }
function ebayActive(q){ return 'https://www.ebay.com/sch/i.html?_nkw='+encodeURIComponent(q); }
function googleQ(q){ return 'https://www.google.com/search?q='+encodeURIComponent(q); }
function maps(q){ return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q+(gps?` near ${gps.lat.toFixed(5)},${gps.lon.toFixed(5)}`:' near me')); }
function directions(a){ return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(a); }

async function loadFeed(){
  try{
    const [r,c] = await Promise.all([
      fetch('./data/opportunities.json?ts='+Date.now(),{cache:'no-store'}),
      fetch('./data/community_signals.json?ts='+Date.now(),{cache:'no-store'})
    ]);
    const data = await r.json(), comm = await c.json();
    builtIn = (data.opportunities||[]).map(x=>({...x,evidenceType:x.evidenceType||((x.type==='event')?'LOCAL SALE':'RETAILER')}));
    communitySignals = comm.signals||[];
    $('#feedNote').textContent = 'Retailer, local-sale and community evidence loaded. Community reports are not treated as confirmed local stock.';
  }catch{
    $('#feedNote').textContent = 'Could not load one or more evidence snapshots.';
  }
  renderAll();
}

function renderAll(){
  renderMetrics(); renderFilters(); renderOpps(); renderCommunity();
  renderBuys(); renderNear(); renderSettings(); renderActiveLead(); renderScanHistory();
}

function renderMetrics(){
  const a=allOpps();
  $('#mHunt').textContent=a.filter(x=>x.decision==='HUNT').length;
  $('#mCheck').textContent=a.filter(x=>x.decision==='CHECK').length;
  $('#mFresh').textContent=a.filter(x=>x.observedAt===today()).length;
  $('#mBuys').textContent=state.buys.length;
}

function renderFilters(){
  const cur=$('#filterRetailer').value;
  const retailers=[...new Set(allOpps().map(x=>x.retailer).filter(Boolean))].sort();
  $('#filterRetailer').innerHTML='<option value="all">All sources</option>'+retailers.map(r=>`<option>${r}</option>`).join('');
  if(retailers.includes(cur)) $('#filterRetailer').value=cur;
}

function card(o){
  const imported=o.imported?'<span class="badge imported">IMPORTED</span>':'';
  const ev=o.imported?'IMPORTED':(o.evidenceType||'RETAILER');
  const price=o.observedPrice!=null?`<div class="price">${money(o.observedPrice)} <span class="opp-meta">${o.referencePrice!=null?`was ${money(o.referencePrice)}`:''}</span></div>`:'';
  const event=o.eventDates?`<div class="eventline">${o.eventDates}</div>`:'';
  const address=o.address?`<div class="opp-meta">${o.address}</div>`:'';
  return `<article class="card opp">
    <div><span class="badge ${o.decision.toLowerCase()}">${o.decision}</span>${imported}</div>
    <div>
      <div class="opp-top"><div><strong>${o.retailer||'Source'}</strong><h3>${o.title}</h3></div><div class="source-line">${o.locationStatus||''}</div></div>
      ${price}${event}${address}
      <div class="evidence">${o.evidence||'Evidence not provided.'}</div>
      <div class="source-line"><b>${ev}</b> · Observed ${o.observedAt||'unknown'}${o.expiresAt?` · expires ${o.expiresAt}`:''} · ${o.sourceName||'source'}</div>
      <div class="actions">
        <button class="primary huntLead" data-id="${o.id}">Take to scanner</button>
        <a class="ghost" href="${ebaySold(o.huntFor||o.title)}" target="_blank" rel="noopener">eBay sold</a>
        ${o.address?`<a class="ghost" href="${directions(o.address)}" target="_blank" rel="noopener">Directions</a>`:''}
        ${o.sourceUrl?`<a class="ghost" href="${o.sourceUrl}" target="_blank" rel="noopener">Evidence source</a>`:''}
      </div>
    </div>
  </article>`;
}

function renderOpps(){
  let a=allOpps();
  const d=$('#filterDecision').value, r=$('#filterRetailer').value, e=$('#filterEvidence').value;
  if(d!=='all') a=a.filter(x=>x.decision===d);
  if(r!=='all') a=a.filter(x=>x.retailer===r);
  if(e!=='all') a=a.filter(x=>(x.imported?'IMPORTED':(x.evidenceType||((x.type==='event')?'LOCAL SALE':'RETAILER')))===e);
  if($('#freshOnly').checked) a=a.filter(x=>x.observedAt===today());
  $('#opportunityList').innerHTML=a.length?a.map(card).join(''):'<div class="card empty">No unexpired evidence matches this filter.</div>';
  bindLeadButtons('#opportunityList');
}

function renderCommunity(){
  const el=$('#communityList'); if(!el) return;
  const a=communitySignals.filter(notExpired);
  el.innerHTML=a.length?a.map(card).join(''):'<div class="card empty">No unexpired community signals in this snapshot.</div>';
  bindLeadButtons('#communityList');
}

function bindLeadButtons(scope){
  $$(`${scope} .huntLead`).forEach(b=>b.onclick=()=>{
    const o=allOpps().find(x=>x.id===b.dataset.id);
    if(!o) return;
    state.activeLeadId=o.id; saveState();
    $('#huntItem').value=o.huntFor||o.title;
    $('#huntRetailer').value=o.retailer||'';
    if(o.observedPrice!=null) $('#buyPrice').value=o.observedPrice;
    if(o.address) $('#huntStore').value=o.address;
    updateSearchLinks(); renderActiveLead(); go('hunt');
  });
}

function renderActiveLead(){
  const box=$('#activeLeadBox'); if(!box) return;
  const o=allOpps().find(x=>x.id===state.activeLeadId);
  if(!o){
    box.innerHTML='No Radar lead selected. You can still scan any item.';
    return;
  }
  box.innerHTML=`<b>Active Radar lead:</b> ${o.title}<br><span class="opp-meta">${o.retailer||''} · ${o.evidenceType||'RETAILER'} · observed ${o.observedAt||'unknown'}</span>
  <div class="actions"><button id="clearActiveLead" class="ghost">Clear lead</button></div>`;
  $('#clearActiveLead').onclick=()=>{state.activeLeadId=null;saveState();renderActiveLead();};
}

function updateSearchLinks(){
  const q = ($('#huntBarcode').value.trim()+' '+$('#huntItem').value.trim()).trim() || 'resale item';
  $('#soldComps').href=ebaySold(q);
  $('#activeListings').href=ebayActive(q);
  $('#googleSearch').href=googleQ(q);
}

async function startScanner(){
 const status=$('#scanStatus'),video=$('#scanVideo');
 if(!navigator.mediaDevices?.getUserMedia){status.textContent='Camera scanning unavailable. Type the UPC or take a photo.';return}
 if(!('BarcodeDetector' in window)){status.textContent='Live barcode detection unavailable. Type the UPC or take a photo.';return}
 try{
  const supported=await BarcodeDetector.getSupportedFormats?.(),preferred=['upc_a','upc_e','ean_13','ean_8','code_128','qr_code'];
  const formats=supported?.length?preferred.filter(f=>supported.includes(f)):preferred,detector=new BarcodeDetector(formats.length?{formats}:undefined);
  mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  video.hidden=false;video.srcObject=mediaStream;await video.play();status.textContent='Scanning… hold barcode steady.';const token=++scanLoopToken;
  const loop=async()=>{if(token!==scanLoopToken||!mediaStream)return;try{const r=await detector.detect(video),code=r?.[0]?.rawValue||'';if(code){$('#huntBarcode').value=code;$('#detectedCode').textContent=code;updateSearchLinks();$('#scanGoogle').href=googleQ(code);$('#scanEbaySold').href=ebaySold(code);$('#scanResultActions').hidden=false;status.textContent='Barcode captured. Identify it or check sold comps.';saveScan({kind:'barcode',barcode:code});stopScanner();return}}catch{}setTimeout(loop,300)};loop()
 }catch(e){status.textContent='Could not start camera: '+e.message;video.hidden=true}
}
function stopScanner(){
  ++scanLoopToken;
  if(mediaStream){
    mediaStream.getTracks().forEach(t=>t.stop());
    mediaStream=null;
  }
  const v=$('#scanVideo');if(v){v.srcObject=null;v.hidden=true;}
}

function saveScan(extra={}){
  const rec={
    id:'s'+Date.now(),
    created:new Date().toISOString(),
    barcode:$('#huntBarcode').value.trim(),
    item:$('#huntItem').value.trim(),
    retailer:$('#huntRetailer').value.trim(),
    store:$('#huntStore').value.trim(),
    buyPrice:+$('#buyPrice').value||null,
    activeLeadId:state.activeLeadId||null,
    photo:currentPhotoData||null,
    ...extra
  };
  state.scans.unshift(rec);
  state.scans=state.scans.slice(0,30);
  saveState(); renderScanHistory();
  return rec;
}

function renderScanHistory(){
  const el=$('#scanHistory'); if(!el) return;
  if(!state.scans.length){ el.innerHTML='<div class="empty">No scans or sightings saved yet.</div>'; return; }
  el.innerHTML=state.scans.slice(0,12).map(s=>`<article class="scan-row">
    <div><b>${s.item||s.barcode||'Unidentified item'}</b><div class="opp-meta">${s.barcode?`UPC ${s.barcode} · `:''}${s.retailer||''}${s.store?` · ${s.store}`:''}</div><div class="opp-meta">${new Date(s.created).toLocaleString()}</div></div>
    <div class="actions"><button class="ghost reuseScan" data-id="${s.id}">Use again</button></div>
  </article>`).join('');
  $$('.reuseScan').forEach(b=>b.onclick=()=>{
    const s=state.scans.find(x=>x.id===b.dataset.id); if(!s) return;
    $('#huntBarcode').value=s.barcode||''; $('#huntItem').value=s.item||'';
    $('#huntRetailer').value=s.retailer||''; $('#huntStore').value=s.store||'';
    if(s.buyPrice!=null) $('#buyPrice').value=s.buyPrice;
    updateSearchLinks(); go('hunt');
  });
}

function evaluate(){
  const buy=+$('#buyPrice').value, resale=+$('#resalePrice').value, ship=+$('#shipping').value, other=+$('#otherCosts').value;
  const fee=resale*(state.settings.feePct/100), profit=resale-fee-ship-other-buy, roi=buy>0?profit/buy*100:0;
  const ok=buy>0&&resale>0&&profit>=state.settings.minProfit&&roi>=state.settings.minRoi;
  const box=$('#decisionBox');
  if(!buy||!resale){
    box.className='decision empty';
    box.innerHTML='Enter the actual buy price and expected resale.';
    return;
  }
  box.className='decision '+(ok?'buy':'pass');
  box.innerHTML=`<div class="big">${ok?'BUY':'PASS'}</div>
  <p>Estimated net profit <b>${money(profit)}</b> · ROI <b>${Math.round(roi)}%</b></p>
  <p>${ok?'Meets your minimum profit and ROI rules.':'Does not meet your current minimum profit/ROI rules.'}</p>
  ${ok?'<button id="saveBuy" class="primary">Save as bought</button>':''}`;
  saveScan({kind:'evaluation',expectedResale:resale,profit,roi,decision:ok?'BUY':'PASS'});
  if(ok) $('#saveBuy').onclick=()=>{
    state.buys.unshift({
      id:'b'+Date.now(),
      item:$('#huntItem').value,
      barcode:$('#huntBarcode').value,
      retailer:$('#huntRetailer').value,
      store:$('#huntStore').value,
      buy,resale,ship,other,profit,roi,
      activeLeadId:state.activeLeadId||null,
      created:new Date().toISOString()
    });
    saveState(); renderAll(); go('buys');
  };
}

function renderBuys(){
  $('#buyList').innerHTML=state.buys.length?state.buys.map(b=>`<article class="card buycard">
    <h3>${b.item||b.barcode||'Item'}</h3>
    <div class="opp-meta">${b.barcode?`UPC ${b.barcode} · `:''}${b.retailer||''}${b.store?' · '+b.store:''}</div>
    <div class="profit">${money(b.profit)} est. net</div>
    <div class="opp-meta">Buy ${money(b.buy)} · resale ${money(b.resale)} · ROI ${Math.round(b.roi)}%</div>
  </article>`).join(''):'<div class="card empty">No buys saved yet.</div>';
}

function renderNear(){
  const names=['Walmart','TJ Maxx','Marshalls','Burlington','Ross Dress for Less',"Ollie's Bargain Outlet",'Home Depot',"Lowe's",'Target','return bin store','liquidation overstock','estate sales','garage sales','flea market','thrift store','auction house'];
  $('#nearLinks').innerHTML=names.map(n=>`<a href="${maps(n)}" target="_blank" rel="noopener">${n}<small>Search near me ↗</small></a>`).join('');
}

function renderSettings(){
  $('#minProfit').value=state.settings.minProfit;
  $('#minRoi').value=state.settings.minRoi;
  $('#feePct').value=state.settings.feePct;
}

function locate(){
  const box=$('#gpsBox'); box.textContent='Requesting location…';
  navigator.geolocation?.getCurrentPosition(
    p=>{gps={lat:p.coords.latitude,lon:p.coords.longitude}; box.innerHTML=`<b>GPS ready.</b> Accuracy about ${Math.round(p.coords.accuracy||0)} m.`; renderNear();},
    e=>{box.innerHTML=`<b>GPS unavailable.</b> ${e.message}. “Near me” searches still work.`},
    {enableHighAccuracy:true,timeout:12000,maximumAge:120000}
  );
}

function useGpsForStore(){
  if(gps){
    $('#huntStore').value=`${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}`;
    return;
  }
  navigator.geolocation?.getCurrentPosition(
    p=>{gps={lat:p.coords.latitude,lon:p.coords.longitude}; $('#huntStore').value=`${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}`;},
    e=>alert('Could not get location: '+e.message),
    {enableHighAccuracy:true,timeout:12000}
  );
}

function importJson(file){
  const fr=new FileReader();
  fr.onload=()=>{
    try{
      const d=JSON.parse(fr.result), arr=Array.isArray(d)?d:(d.opportunities||[]);
      state.imported=arr.map((x,i)=>({...x,id:x.id||'imp'+Date.now()+i,imported:true,decision:['HUNT','CHECK'].includes(x.decision)?x.decision:'CHECK'}));
      saveState(); renderAll(); go('radar');
    }catch{ alert('That JSON file is not a valid opportunity feed.'); }
  };
  fr.readAsText(file);
}

function handlePhoto(file){
 if(!file)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=1000,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);currentPhotoData=c.toDataURL('image/jpeg',0.72);$('#photoPreview').src=currentPhotoData;$('#photoBox').hidden=false;};img.src=reader.result};reader.readAsDataURL(file)
}

loadState();
$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('#reloadFeed').onclick=loadFeed;
$('#filterDecision').onchange=renderOpps;
$('#filterRetailer').onchange=renderOpps;
$('#filterEvidence').onchange=renderOpps;
$('#freshOnly').onchange=renderOpps;
$('#useLocation').onclick=locate;

$('#huntItem').oninput=updateSearchLinks;
$('#huntBarcode').oninput=()=>{updateSearchLinks();const code=$('#huntBarcode').value.trim();if(code){$('#detectedCode').textContent=code;$('#scanGoogle').href=googleQ(code);$('#scanEbaySold').href=ebaySold(code);$('#scanResultActions').hidden=false;}};
$('#evaluate').onclick=evaluate;
$('#saveSighting').onclick=()=>{saveScan({kind:'sighting'}); alert('Sighting saved.');};
$('#startScan').onclick=startScanner;
$('#stopScan').onclick=stopScanner;
$('#fillGpsStore').onclick=useGpsForStore;

$('#takePhoto').onclick=()=>$('#photoInput').click();
$('#retakePhoto').onclick=()=>$('#photoInput').click();
$('#photoInput').onchange=e=>handlePhoto(e.target.files?.[0]);
$('#clearPhoto').onclick=()=>{currentPhotoData=null;$('#photoInput').value='';$('#photoBox').hidden=true;$('#photoPreview').removeAttribute('src');};
$('#continueItem').onclick=()=>{$('#huntItem').focus();$('#huntItem').scrollIntoView({behavior:'smooth',block:'center'});};

$('#saveSettings').onclick=()=>{
  state.settings={minProfit:+$('#minProfit').value||0,minRoi:+$('#minRoi').value||0,feePct:+$('#feePct').value||0};
  saveState(); renderSettings(); alert('BUY/PASS rules saved.');
};
$('#importFile').onchange=e=>{if(e.target.files[0])importJson(e.target.files[0]);};

window.addEventListener('pagehide',stopScanner);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScanner();});

go('home'); loadFeed(); updateSearchLinks();
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
