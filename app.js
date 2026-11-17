/* Splitz application logic. OCR and bill parsing live here, separate from the UI. */
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let people=[{id:1,name:'You'},...Array.from({length:9},(_,i)=>({id:i+2,name:'Friend '+(i+1)}))];
let nextPerson=11,nextItem=1,items=[],billImage=null,CUR='Rs';
const money=n=>CUR+(CUR.length>1?' ':'')+(Number(n)||0).toFixed(2);
function setCurrency(){CUR='Rs';document.querySelectorAll('.cur').forEach(e=>e.textContent='Rs ')}
function calculate(){
 const sub=items.reduce((s,i)=>s+Math.max(0,Number(i.price)||0),0),tax=Math.max(0,+$('#tax').value||0),disc=Math.max(0,+$('#discount').value||0),net=Math.max(0,sub+tax-disc);
 const shares=people.map(p=>{const raw=items.reduce((s,it)=>s+(it.people.includes(p.id)&&it.people.length?(+it.price||0)/it.people.length:0),0);return{name:p.name,raw,total:sub?raw/sub*net:0}});
 $('#subtotal').textContent=money(sub);$('#taxView').textContent=money(tax);$('#discountView').textContent='−'+money(disc);$('#grand').textContent=money(net);
 $('#shares').innerHTML=shares.map(s=>`<div class="splitline"><span>${esc(s.name)} <span class="muted small">(${money(s.raw)} items)</span></span><strong>${money(s.total)}</strong></div>`).join('');
 return{sub,tax,disc,net,shares};
}
function renderPeople(){
 $('#count').textContent=people.length+' people';
 $('#people').innerHTML=people.map(p=>`<div class="person"><input data-person="${p.id}" aria-label="Person name" value="${esc(p.name)}"><button class="danger" data-remove="${p.id}" ${people.length===1?'disabled':''}>×</button></div>`).join('');
}
function renderItems(){
 $('#items').innerHTML=items.map(it=>`<div class="item"><input data-name="${it.id}" aria-label="Item name" value="${esc(it.name)}"><input data-price="${it.id}" type="number" min="0" step=".01" aria-label="Price" value="${it.price}"><div class="who">${people.map(p=>`<button class="chip ${it.people.includes(p.id)?'active':''}" data-assign="${it.id}" data-to="${p.id}">${esc(p.name)}</button>`).join('')}<button class="chip" data-delete="${it.id}">Remove</button></div></div>`).join('');
}
function render(){renderPeople();renderItems();calculate()}
function addPeople(n,names){
 if(names){for(const name of names.filter(x=>x.trim()))people.push({id:nextPerson++,name:name.trim()})}
 else for(let k=0;k<Math.min(500,Math.max(1,n));k++){let i=people.length;while(people.some(p=>p.name==='Friend '+i))i++;people.push({id:nextPerson++,name:'Friend '+i})}
 render();
}
function bulkAdd(){const v=$('#bulk').value.trim();if(!v){addPeople(1);return}if(/^\d+$/.test(v))addPeople(+v);else addPeople(0,v.split(/[,;\n]+/));$('#bulk').value=''}
$('#add').onclick=()=>addPeople(1);$('#add5').onclick=()=>addPeople(5);$('#bulkAdd').onclick=bulkAdd;
$('#bulk').onkeydown=e=>{if(e.key==='Enter')bulkAdd()};
$('#addItem').onclick=()=>{items.push({id:nextItem++,name:'New item',price:0,people:[people[0].id]});render()};
document.addEventListener('input',e=>{
 if(e.target.dataset.person){const p=people.find(x=>x.id==e.target.dataset.person);if(p)p.name=e.target.value;renderItems();calculate()}
 if(e.target.dataset.name){const i=items.find(x=>x.id==e.target.dataset.name);if(i)i.name=e.target.value}
 if(e.target.dataset.price){const i=items.find(x=>x.id==e.target.dataset.price);if(i)i.price=+e.target.value||0;calculate()}
 if(['tax','discount'].includes(e.target.id))calculate();
});
document.addEventListener('click',e=>{
 if(e.target.dataset.assign){const it=items.find(x=>x.id==e.target.dataset.assign),id=+e.target.dataset.to;it.people=it.people.includes(id)?it.people.filter(x=>x!==id):[...it.people,id];render()}
 if(e.target.dataset.remove){people=people.filter(p=>p.id!=e.target.dataset.remove);items.forEach(i=>i.people=i.people.filter(x=>x!=e.target.dataset.remove));render()}
 if(e.target.dataset.delete){items=items.filter(i=>i.id!=e.target.dataset.delete);render()}
 if(e.target.dataset.pick)$('#'+e.target.dataset.pick).click();
});
function pickFile(e){const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){$('#status').textContent='Please select an image file.';return}billImage=f;$('#preview').src=URL.createObjectURL(f);$('#preview').style.display='block';$('#status').textContent='Photo ready. Tap Read bill with OCR.';e.target.value=''}
['gallery','files','camera'].forEach(id=>$('#'+id).onchange=pickFile);

const TAX=/\b(cgst|sgst|igst|utgst|gst|vat|cess|service\s*(charge|tax))\b/i;
const DISC=/\b(discount|disc(?:ount)?|coupon|promo)\b/i;
const GRAND=/(grand\s*total|net\s*(amount|payable)|bill\s*(total|amount)|amount\s*(due|payable)|total\s*payable|bill\s*amt)/i;
const SUB=/(sub\s*-?\s*total|total\s*amount|^total\b)/i;
const META=/\b(invoice|bill\s*(no|number)|gstin|fssai|phone|mobile|cashier|waiter|steward|table|covers?|date|time|address|thank|visit|round\s*off|payment|upi|visa|mastercard|kot\s*no|hsn|sac|tin|state|pin\s*code)\b/i;
// Address fragments must never become purchasable line items (e.g. the 16 in Sector 16).
const ADDRESS=/\b(sector|market|faridabad|haryana|street|st(?:reet)?\.?|road|rd\.?|avenue|lane|block|plot|phase|industrial\s+area|colony|nagar|pin\s*code|postal\s*code)\b/i;
function parseMoney(s){
 let x=String(s).replace(/[₹$]/g,'').replace(/\b(?:rs\.?|inr|aed)\b/ig,'').replace(/\s/g,'').replace(/[^\d,.-]/g,'');
 if(!x)return NaN;const c=x.lastIndexOf(','),d=x.lastIndexOf('.');
 if(c>=0&&d>=0){const k=Math.max(c,d);return Number(x.slice(0,k).replace(/[.,]/g,'')+'.'+x.slice(k+1).replace(/[.,]/g,''))}
 if(c>=0){const tail=x.length-c-1;return tail===2?Number(x.slice(0,c).replace(/,/g,'')+'.'+x.slice(c+1)):Number(x.replace(/,/g,''))}
 return Number(x);
}
/* Cluster Tesseract word boxes into physical text rows, then retain left-to-right order. */
function wordsToRows(words){
 const ws=(words||[]).filter(w=>w.text&&String(w.text).trim()&&(w.confidence==null||w.confidence>12)).map(w=>({text:String(w.text).trim(),x:(w.bbox.x0+w.bbox.x1)/2,y:(w.bbox.y0+w.bbox.y1)/2,h:w.bbox.y1-w.bbox.y0}));
 ws.sort((a,b)=>a.y-b.y||a.x-b.x);const rows=[];
 // Use a deliberately tight baseline tolerance: thermal receipts often have
 // closely spaced rows, and merging two rows corrupts both names and amounts.
 for(const w of ws){let best=null,bestDiff=Infinity;for(const r of rows){const diff=Math.abs(r.cy-w.y),tol=Math.max(4,Math.min(10,(r.h+w.h)*.20));if(diff<tol&&diff<bestDiff){best=r;bestDiff=diff}}
  if(!best)rows.push({cy:w.y,h:w.h,words:[w]});else{best.words.push(w);best.cy=best.words.reduce((a,z)=>a+z.y,0)/best.words.length;best.h=Math.max(best.h,w.h)}
 }
 return rows.sort((a,b)=>a.cy-b.cy).map(r=>r.words.sort((a,b)=>a.x-b.x));
}
function finishResult(r){
 r.items=r.items.slice(0,100);r.sum=r.items.reduce((s,i)=>s+i.price,0);
 const checks=[];if(r.subtotal>0)checks.push(Math.abs(r.sum-r.subtotal));if(r.total>0)checks.push(Math.abs(r.sum+r.tax-r.discount-r.total));
 r.diff=checks.length?Math.min(...checks):null;r.ok=r.diff!==null&&r.diff<=2;
 return r;
}
function parseOcr(data){
 const rows=wordsToRows(data.words),found=[];let tax=0,discount=0,subtotal=0,total=0,pending=-1;const lines=rows.map(row=>row.map(w=>w.text).join(' '));
 const numeric=/^(?:₹|rs\.?|inr|aed|\$)?-?\d[\d,]*(?:[.,]\d{1,2})?$/i;
 const moneyWords=row=>row.filter(w=>numeric.test(w.text.replace(/[|]/g,''))).map(w=>({...w,value:parseMoney(w.text)})).filter(w=>Number.isFinite(w.value));
 // Restrict item extraction to the table body. Footer totals/tax must never
 // become purchasable items even when OCR misses words such as CGST or SGST.
 let header=rows.findIndex(row=>{const t=row.map(w=>w.text).join(' ').toLowerCase();return /item|description/.test(t)&&/(qty|quantity)/.test(t)&&/(price|amount)/.test(t)});
 if(header<0)header=rows.findIndex(row=>moneyWords(row).length>=2&&row.some(w=>/[a-z]{2}/i.test(w.text)));
 const footer=rows.findIndex((row,i)=>i>(header<0?0:header)&&/(sub.?total|total\s*qty|cgst|sgst|igst|grand\s*total|round.?off|thank.?you|visit.?again)/i.test(row.map(w=>w.text).join(' ')));
 // Read receipt summary values separately from item rows.
 for(let i=0;i<rows.length;i++){
  const line=lines[i],nums=moneyWords(rows[i]),last=nums.at(-1);
  if(/grand\s*total|net\s*(amount|payable)|bill\s*(total|amount)|amount\s*(due|payable)|total\s*payable/i.test(line)){if(last)total=Math.abs(last.value);continue}
  if(/sub.?total|total\s*amount/i.test(line)){if(last)subtotal=Math.abs(last.value);continue}
  if(/cgst|sgst|igst|utgst|gst|vat|cess|service\s*(charge|tax)/i.test(line)){if(last)tax+=Math.abs(last.value);continue}
  if(/discount|coupon|promo/i.test(line)){if(last)discount+=Math.abs(last.value);continue}
 }
 const stop=footer<0?rows.length:footer;
 for(let i=Math.max(0,header+1);i<stop;i++){
  const row=rows[i],line=lines[i],nums=moneyWords(row),first=nums[0],last=nums.at(-1);
  if(!nums.length){if(pending>=0&&/[A-Za-z]{2}/.test(line)&&line.length<65&&!META.test(line)&&!ADDRESS.test(line))found[pending].name+=' '+line;continue}
  if(nums.length<2){
   // A lone number is only accepted if it sits in the far-right amount column.
   if(!last||last.x<Math.max(0,...row.map(w=>w.x))*.72)continue;
  }
  if(!first||!last||last.value<=0||last.value>9999999)continue;
  const name=row.filter(w=>w.x<first.x-2&&!numeric.test(w.text.replace(/[|]/g,''))).map(w=>w.text).join(' ').replace(/^[#\d.)-]+\s*/,'').replace(/\s+/g,' ').trim();
  if(!/[A-Za-z]{2}/.test(name)||TAX.test(name)||DISC.test(name)||META.test(name)||ADDRESS.test(name))continue;
  // Rightmost numeric column is the extended line amount (not unit rate).
  found.push({name:name.slice(0,75),price:Math.abs(last.value)});pending=found.length-1;
 }
 return finishResult({items:found,tax,discount,subtotal,total,rawText:lines.join('\n')});
}
function parseFallbackText(text){
 const found=[];let tax=0,discount=0,subtotal=0,total=0,pending=-1;
 for(const line0 of text.split(/\r?\n/)){const line=line0.trim();if(!line)continue;
  const matches=[...line.matchAll(/(?:₹|rs\.?|inr|aed|\$)?\s*-?\d[\d,]*(?:[.,]\d{1,2})?/gi)].map(m=>({value:parseMoney(m[0]),index:m.index})).filter(m=>Number.isFinite(m.value));const last=matches.at(-1);
  if(TAX.test(line)){if(last)tax+=Math.abs(last.value);continue}if(DISC.test(line)){if(last)discount+=Math.abs(last.value);continue}
  if(GRAND.test(line)){if(last)total=Math.abs(last.value);continue}if(SUB.test(line)){if(last)subtotal=Math.abs(last.value);continue}
  if(!last){if(pending>=0&&/[A-Za-z]{2}/.test(line)&&line.length<60)found[pending].name+=' '+line;continue}
  if(META.test(line)||ADDRESS.test(line)||last.value<=0)continue;const name=line.slice(0,last.index).replace(/^\s*\d{1,3}[.)]?\s*/,'').trim();
  if(/[A-Za-z]{2}/.test(name)&&!TAX.test(name)&&!DISC.test(name)){found.push({name,price:Math.abs(last.value)});pending=found.length-1}
 }
 return finishResult({items:found,tax,discount,subtotal,total,rawText:text});
}
function preprocessVariants(image){
 const maxSide=2400,scale=Math.min(2.5,maxSide/Math.max(image.width,image.height)),w=Math.max(1,Math.round(image.width*scale)),h=Math.max(1,Math.round(image.height*scale));
 const original=document.createElement('canvas');original.width=w;original.height=h;const ctx=original.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);
 const src=ctx.getImageData(0,0,w,h),gray=new Uint8Array(w*h);for(let p=0,j=0;p<src.data.length;p+=4,j++)gray[j]=.299*src.data[p]+.587*src.data[p+1]+.114*src.data[p+2];
 const W=w+1,integral=new Float64Array(W*(h+1));for(let y=1;y<=h;y++){let row=0;for(let x=1;x<=w;x++){row+=gray[(y-1)*w+x-1];integral[y*W+x]=integral[(y-1)*W+x]+row}}
 const binary=document.createElement('canvas');binary.width=w;binary.height=h;const bctx=binary.getContext('2d'),out=bctx.createImageData(w,h),rad=Math.max(12,Math.round(w/28));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x1=Math.max(0,x-rad),x2=Math.min(w-1,x+rad),y1=Math.max(0,y-rad),y2=Math.min(h-1,y+rad),n=(x2-x1+1)*(y2-y1+1),sum=integral[(y2+1)*W+x2+1]-integral[y1*W+x2+1]-integral[(y2+1)*W+x1]+integral[y1*W+x1],v=gray[y*w+x]<sum/n*.88?0:255,k=(y*w+x)*4;out.data[k]=out.data[k+1]=out.data[k+2]=v;out.data[k+3]=255}
 bctx.putImageData(out,0,0);return[original,binary];
}
function loadImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=reject;img.src=url})}
function applyScan(result){
 setCurrency();
 items=result.items.map(x=>({id:nextItem++,name:x.name,price:x.price,people:[people[0].id]}));
 $('#tax').value=(result.tax||0).toFixed(2);$('#discount').value=(result.discount||0).toFixed(2);render();
 let msg=`Found ${result.items.length} items · detected item subtotal ${money(result.sum)}.`;
 if(result.tax)msg+=` Tax/charges ${money(result.tax)}.`;
 if(result.ok)msg+=' Printed total appears to match.';else if(result.diff!==null)msg+=` Check receipt totals: difference ${money(result.diff)}.`;else msg+=' Verify all prices and totals manually.';
 $('#status').textContent=msg;$('#raw').textContent=result.rawText||'';$('#rawWrap').hidden=false;
}
$('#scan').onclick=async()=>{
 if(!billImage){$('#status').textContent='Choose a bill photo first.';return}
 if(!window.Tesseract){$('#status').textContent='OCR engine did not load. Check internet and reload.';return}
 const button=$('#scan');button.disabled=true;let worker;
 try{
  $('#status').textContent='Preparing receipt image…';const variants=preprocessVariants(await loadImage(billImage));
  worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')$('#status').textContent='Reading receipt… '+Math.round((m.progress||0)*100)+'%'}});
  let best=null;
  for(let i=0;i<variants.length;i++){
   for(const psm of ['4','6','11']){
    await worker.setParameters({tessedit_pageseg_mode:psm,preserve_interword_spaces:'1'});
    const data=(await worker.recognize(variants[i])).data,parsed=parseOcr(data);
    if(!best||((parsed.ok?1000:0)+parsed.items.length*2-(parsed.diff??10000))>((best.ok?1000:0)+best.items.length*2-(best.diff??10000)))best=parsed;
    
   }
   
  }
  if(!best?.items.length){const data=(await worker.recognize(variants[0])).data;best=parseFallbackText(data.text)}
  if(best?.items.length)applyScan(best);else $('#status').textContent='Could not confidently identify item rows. Try a clearer, straight-on photo or enter items manually.';
 }catch(err){console.error(err);$('#status').textContent='Could not scan this image. Try a clearer photo or enter items manually.'}
 finally{if(worker)try{await worker.terminate()}catch(e){}button.disabled=false}
};
$('#sample').onclick=()=>{items=[{id:nextItem++,name:'Veg Hakka Noodles',price:220,people:[1,2]},{id:nextItem++,name:'Margherita Pizza',price:360,people:[2]},{id:nextItem++,name:'Cold Coffee',price:140,people:[1]}];$('#tax').value=36;$('#discount').value=50;render();$('#status').textContent='Sample loaded.'};
$('#copy').onclick=async()=>{const c=calculate(),summary='Splitz — Bill split\n'+c.shares.map(s=>s.name+': '+money(s.total)).join('\n')+'\nTotal: '+money(c.net);try{await navigator.clipboard.writeText(summary);$('#copyStatus').textContent='Split summary copied.'}catch(e){$('#copyStatus').textContent=summary}};
$('#reset').onclick=()=>{people=[{id:1,name:'You'},...Array.from({length:9},(_,i)=>({id:i+2,name:'Friend '+(i+1)}))];nextPerson=11;nextItem=1;items=[];setCurrency();$('#tax').value=0;$('#discount').value=0;billImage=null;$('#preview').removeAttribute('src');$('#preview').style.display='none';$('#rawWrap').hidden=true;$('#status').textContent='Start with a photo of your bill.';render()};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
