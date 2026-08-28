
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const today=()=>new Date().toISOString().slice(0,10);
const stateKey='arbitrageRadar21';
let state={settings:{minProfit:15,minRoi:75,feePct:13.25},buys:[],imported:[]}, builtIn=[], communitySignals=[], gps=null;

function loadState(){try{state={...state,...JSON.parse(localStorage.getItem(stateKey)||'{}')};state.settings={minProfit:15,minRoi:75,feePct:13.25,...state.settings};}catch{}}
function saveState(){localStorage.setItem(stateKey,JSON.stringify(state))}
function go(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===id));window.scrollTo(0,0)}
function notExpired(o){return !o.expiresAt || o.expiresAt>=today()}
function allOpps(){return [...builtIn,...communitySignals,...state.imported].filter(notExpired)}
function ebaySold(q){return 'https://www.ebay.com/sch/i.html?_nkw='+encodeURIComponent(q)+'&LH_Sold=1&LH_Complete=1'}
function maps(q){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q+(gps?` near ${gps.lat.toFixed(5)},${gps.lon.toFixed(5)}`:' near me'))}
function directions(a){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(a)}

async function loadFeed(){
  try{
    const [r,c]=await Promise.all([
      fetch('./data/opportunities.json?ts='+Date.now(),{cache:'no-store'}),
      fetch('./data/community_signals.json?ts='+Date.now(),{cache:'no-store'})
    ]);
    const data=await r.json(), comm=await c.json();
    builtIn=(data.opportunities||[]).map(x=>({...x,evidenceType:x.evidenceType||((x.type==='event')?'LOCAL SALE':'RETAILER')}));
    communitySignals=comm.signals||[];
    $('#feedNote').textContent='Retailer, local-sale and community evidence loaded. Message-board reports are never treated as confirmed local stock.';
  }catch(e){$('#feedNote').textContent='Could not load one or more evidence snapshots.'}
  renderAll();
}
function renderAll(){renderMetrics();renderFilters();renderOpps();renderCommunity();renderBuys();renderNear();renderSettings()}
function renderMetrics(){
  const a=allOpps();$('#mHunt').textContent=a.filter(x=>x.decision==='HUNT').length;$('#mCheck').textContent=a.filter(x=>x.decision==='CHECK').length;$('#mFresh').textContent=a.filter(x=>x.observedAt===today()).length;$('#mBuys').textContent=state.buys.length;
}
function renderFilters(){
  const cur=$('#filterRetailer').value;const retailers=[...new Set(allOpps().map(x=>x.retailer).filter(Boolean))].sort();
  $('#filterRetailer').innerHTML='<option value="all">All sources</option>'+retailers.map(r=>`<option>${r}</option>`).join('');if(retailers.includes(cur))$('#filterRetailer').value=cur;
}
function card(o){
  const imported=o.imported?'<span class="badge imported">IMPORTED</span>':''; const ev=o.imported?'IMPORTED':(o.evidenceType||'RETAILER');
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
        <button class="primary huntLead" data-id="${o.id}">Hunt this</button>
        <a class="ghost" href="${ebaySold(o.huntFor||o.title)}" target="_blank" rel="noopener">eBay sold</a>
        ${o.address?`<a class="ghost" href="${directions(o.address)}" target="_blank" rel="noopener">Directions</a>`:''}
        ${o.sourceUrl?`<a class="ghost" href="${o.sourceUrl}" target="_blank" rel="noopener">Evidence source</a>`:''}
      </div>
    </div>
  </article>`
}
function renderOpps(){
  let a=allOpps();const d=$('#filterDecision').value,r=$('#filterRetailer').value,e=$('#filterEvidence').value;
  if(d!=='all')a=a.filter(x=>x.decision===d);if(r!=='all')a=a.filter(x=>x.retailer===r);if(e!=='all')a=a.filter(x=>(x.imported?'IMPORTED':(x.evidenceType||((x.type==='event')?'LOCAL SALE':'RETAILER')))===e);if($('#freshOnly').checked)a=a.filter(x=>x.observedAt===today());
  $('#opportunityList').innerHTML=a.length?a.map(card).join(''):'<div class="card empty">No unexpired evidence matches this filter.</div>';
  $$('.huntLead').forEach(b=>b.onclick=()=>{const o=allOpps().find(x=>x.id===b.dataset.id);if(!o)return;$('#huntItem').value=o.huntFor||o.title;$('#huntRetailer').value=o.retailer||'';if(o.observedPrice!=null)$('#buyPrice').value=o.observedPrice;updateSold();go('hunt')});
}
function updateSold(){const q=$('#huntItem').value.trim();$('#soldComps').href=ebaySold(q||'resale item')}
function evaluate(){
  const buy=+$('#buyPrice').value,resale=+$('#resalePrice').value,ship=+$('#shipping').value,other=+$('#otherCosts').value,fee=resale*(state.settings.feePct/100),profit=resale-fee-ship-other-buy,roi=buy>0?profit/buy*100:0;
  const ok=buy>0&&resale>0&&profit>=state.settings.minProfit&&roi>=state.settings.minRoi;
  const box=$('#decisionBox');box.className='decision '+(ok?'buy':'pass');
  if(!buy||!resale){box.className='decision empty';box.innerHTML='Enter the real buy price and expected resale.';return}
  box.innerHTML=`<div class="big">${ok?'BUY':'PASS'}</div><p>Estimated net profit <b>${money(profit)}</b> · ROI <b>${Math.round(roi)}%</b></p><p>${ok?'Meets your minimum profit and ROI rules.':'Does not meet your current minimum profit/ROI rules.'}</p>${ok?'<button id="saveBuy" class="primary">Save as bought</button>':''}`;
  if(ok)$('#saveBuy').onclick=()=>{state.buys.unshift({id:'b'+Date.now(),item:$('#huntItem').value,retailer:$('#huntRetailer').value,store:$('#huntStore').value,buy,resale,ship,other,profit,roi,created:new Date().toISOString()});saveState();renderAll();go('buys')}
}
function renderCommunity(){
  const el=$('#communityList');if(!el)return;const a=communitySignals.filter(notExpired);
  el.innerHTML=a.length?a.map(card).join(''):'<div class="card empty">No unexpired community signals in this snapshot.</div>';
  $$('#communityList .huntLead').forEach(b=>b.onclick=()=>{const o=communitySignals.find(x=>x.id===b.dataset.id);if(!o)return;$('#huntItem').value=o.huntFor||o.title;$('#huntRetailer').value=o.retailer||'';if(o.observedPrice!=null)$('#buyPrice').value=o.observedPrice;updateSold();go('hunt')});
}
function renderBuys(){
  $('#buyList').innerHTML=state.buys.length?state.buys.map(b=>`<article class="card buycard"><h3>${b.item||'Item'}</h3><div class="opp-meta">${b.retailer||''}${b.store?' · '+b.store:''}</div><div class="profit">${money(b.profit)} est. net</div><div class="opp-meta">Buy ${money(b.buy)} · resale ${money(b.resale)} · ROI ${Math.round(b.roi)}%</div></article>`).join(''):'<div class="card empty">No buys saved yet.</div>'
}
function renderNear(){
  const names=['Walmart','TJ Maxx','Marshalls','Burlington','Ross Dress for Less',"Ollie's Bargain Outlet",'Home Depot',"Lowe's",'Target','return bin store','liquidation overstock','estate sales','garage sales','flea market','thrift store','auction house'];
  $('#nearLinks').innerHTML=names.map(n=>`<a href="${maps(n)}" target="_blank" rel="noopener">${n}<small>Search near me ↗</small></a>`).join('')
}
function renderSettings(){
  $('#minProfit').value=state.settings.minProfit;$('#minRoi').value=state.settings.minRoi;$('#feePct').value=state.settings.feePct
}
function locate(){
  const box=$('#gpsBox');box.textContent='Requesting location…';
  navigator.geolocation?.getCurrentPosition(p=>{gps={lat:p.coords.latitude,lon:p.coords.longitude};box.innerHTML=`<b>GPS ready.</b> Accuracy about ${Math.round(p.coords.accuracy||0)} m.`;renderNear()},e=>{box.innerHTML=`<b>GPS unavailable.</b> ${e.message}. “Near me” searches still work.`},{enableHighAccuracy:true,timeout:12000,maximumAge:120000})
}
function importJson(file){
  const fr=new FileReader();fr.onload=()=>{try{const d=JSON.parse(fr.result),arr=Array.isArray(d)?d:(d.opportunities||[]);state.imported=arr.map((x,i)=>({...x,id:x.id||'imp'+Date.now()+i,imported:true,decision:['HUNT','CHECK'].includes(x.decision)?x.decision:'CHECK'}));saveState();renderAll();go('radar')}catch{alert('That JSON file is not a valid opportunity feed.')}};fr.readAsText(file)
}

loadState();
$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('#reloadFeed').onclick=loadFeed;$('#filterDecision').onchange=renderOpps;$('#filterRetailer').onchange=renderOpps;$('#filterEvidence').onchange=renderOpps;$('#freshOnly').onchange=renderOpps;
$('#useLocation').onclick=locate;$('#huntItem').oninput=updateSold;$('#evaluate').onclick=evaluate;
$('#saveSettings').onclick=()=>{state.settings={minProfit:+$('#minProfit').value||0,minRoi:+$('#minRoi').value||0,feePct:+$('#feePct').value||0};saveState();renderSettings();alert('BUY/PASS rules saved.')};
$('#importFile').onchange=e=>{if(e.target.files[0])importJson(e.target.files[0])};
go('home');loadFeed();updateSold();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
