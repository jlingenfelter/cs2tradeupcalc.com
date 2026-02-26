// CS2 Trade Up Calculator
(function(){
'use strict';

const RARITY_ORDER=['consumer','industrial','milspec','restricted','classified','covert'];
const RARITY_LABELS={consumer:'Consumer Grade',industrial:'Industrial Grade',milspec:'Mil-Spec',restricted:'Restricted',classified:'Classified',covert:'Covert'};

let collections=[];
let selectedRarity='';

async function loadData(){
  try{
    const r=await fetch('/data/collections.json');
    collections=await r.json();
    initCalculator();
  }catch(e){console.error('Failed to load collections:',e);}
}

function nextRarity(r){
  const i=RARITY_ORDER.indexOf(r);
  return(i>=0&&i<RARITY_ORDER.length-1)?RARITY_ORDER[i+1]:null;
}

function getOutcomes(collectionId,inputRarity){
  const col=collections.find(c=>c.id===collectionId);
  if(!col)return[];
  const nr=nextRarity(inputRarity);
  if(!nr)return[];
  return col.items.filter(it=>it.rarity===nr);
}

function getAvailableRarities(){
  const rarities=new Set();
  collections.forEach(c=>{
    c.items.forEach(it=>{
      if(nextRarity(it.rarity))rarities.add(it.rarity);
    });
  });
  return RARITY_ORDER.filter(r=>rarities.has(r));
}

function getCollectionsForRarity(rarity){
  return collections.filter(c=>c.items.some(it=>it.rarity===rarity));
}

function initCalculator(){
  const container=document.getElementById('tradeup-calc');
  if(!container)return;

  const rarities=getAvailableRarities();
  selectedRarity=rarities[2]||rarities[0]||'milspec';

  // Build rarity selector
  const rarityDiv=document.createElement('div');
  rarityDiv.className='calc-field';
  rarityDiv.style.marginBottom='20px';
  rarityDiv.innerHTML=`<label for="rarity-select">Input Rarity Tier</label>
    <select id="rarity-select">${rarities.map(r=>`<option value="${r}"${r===selectedRarity?' selected':''}>${RARITY_LABELS[r]} → ${RARITY_LABELS[nextRarity(r)]||'None'}</option>`).join('')}</select>`;
  container.appendChild(rarityDiv);

  // Input rows container
  const inputsDiv=document.createElement('div');
  inputsDiv.id='input-rows';
  container.appendChild(inputsDiv);

  // Calculate button
  const btnDiv=document.createElement('div');
  btnDiv.style.cssText='margin:20px 0;text-align:center';
  btnDiv.innerHTML='<button class="btn" id="calc-btn">Calculate Trade Up</button>';
  container.appendChild(btnDiv);

  // Results container
  const resultsDiv=document.createElement('div');
  resultsDiv.id='calc-results';
  container.appendChild(resultsDiv);

  // Event listeners
  document.getElementById('rarity-select').addEventListener('change',function(){
    selectedRarity=this.value;
    renderInputRows();
  });
  document.getElementById('calc-btn').addEventListener('click',calculate);

  renderInputRows();
}

function renderInputRows(){
  const container=document.getElementById('input-rows');
  const cols=getCollectionsForRarity(selectedRarity);
  const nr=nextRarity(selectedRarity);

  let html=`<div style="margin:16px 0 8px"><strong>Add 10 Input Skins</strong> <span style="color:var(--text2);font-size:13px">(all <span class="badge badge-${selectedRarity}">${RARITY_LABELS[selectedRarity]}</span> → <span class="badge badge-${nr}">${RARITY_LABELS[nr]}</span>)</span></div>`;

  for(let i=0;i<10;i++){
    html+=`<div class="input-row">
      <div class="calc-field"><label>Collection</label><select class="col-select" data-row="${i}">${cols.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
      <div class="calc-field"><label>Skin (optional)</label><input type="text" class="skin-name" placeholder="e.g. AK-47 | Safari Mesh"></div>
      <div class="calc-field"><label>Float (optional)</label><input type="number" class="float-input" step="0.0001" min="0" max="1" placeholder="0.0000"></div>
      <div class="calc-field"><label>Input Price ($)</label><input type="number" class="price-input" step="0.01" min="0" placeholder="0.00"></div>
    </div>`;
  }
  container.innerHTML=html;
}

function calculate(){
  const resultsDiv=document.getElementById('calc-results');
  const colSelects=document.querySelectorAll('.col-select');
  const priceInputs=document.querySelectorAll('.price-input');

  // Gather input data
  const inputs=[];
  let totalCost=0;
  let valid=true;

  colSelects.forEach((sel,i)=>{
    const price=parseFloat(priceInputs[i].value)||0;
    totalCost+=price;
    inputs.push({collection:sel.value,price});
    if(price<=0)valid=false;
  });

  if(!valid){
    resultsDiv.innerHTML='<div class="card" style="text-align:center;color:var(--red)">Please enter a price for all 10 input skins.</div>';
    return;
  }

  // Count collection occurrences
  const colCounts={};
  inputs.forEach(inp=>{
    colCounts[inp.collection]=(colCounts[inp.collection]||0)+1;
  });

  // Get outcomes per collection
  const allOutcomes=[];
  for(const[colId,count]of Object.entries(colCounts)){
    const weight=count/10;
    const outcomes=getOutcomes(colId,selectedRarity);
    if(outcomes.length===0)continue;
    const perOutcome=weight/outcomes.length;
    const col=collections.find(c=>c.id===colId);
    outcomes.forEach(o=>{
      allOutcomes.push({
        name:o.name,
        collection:col?col.name:colId,
        collectionId:colId,
        probability:perOutcome,
        price:0,
        ev:0
      });
    });
  }

  if(allOutcomes.length===0){
    resultsDiv.innerHTML='<div class="card" style="text-align:center;color:var(--red)">No outcomes found. Check that the selected collections have items at the next rarity tier.</div>';
    return;
  }

  // Render outcomes
  const nr=nextRarity(selectedRarity);
  let html=`<h3 style="margin-top:24px">Possible Outcomes <span class="badge badge-${nr}">${RARITY_LABELS[nr]}</span></h3>
  <p style="font-size:13px;color:var(--text2)">This uses a simplified probability model. Weight is proportional to how many inputs belong to each collection, split evenly among that collection's outcomes.</p>
  <table class="outcomes-table">
  <thead><tr><th>Outcome</th><th>Collection</th><th>Probability</th><th>Output Price ($)</th><th>EV Contribution</th></tr></thead><tbody>`;

  allOutcomes.forEach((o,i)=>{
    html+=`<tr>
      <td>${o.name}</td>
      <td style="font-size:13px;color:var(--text2)">${o.collection}</td>
      <td style="font-weight:700">${(o.probability*100).toFixed(2)}%</td>
      <td><input type="number" class="outcome-price" data-idx="${i}" step="0.01" min="0" value="0" style="width:90px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:14px;font-family:inherit"></td>
      <td class="ev-cell" data-idx="${i}">$0.00</td>
    </tr>`;
  });

  html+=`</tbody></table>`;

  // Summary section
  html+=`<div class="result-grid" id="summary-grid" style="margin-top:24px">
    <div class="result-item"><div class="val" id="sum-cost">$${totalCost.toFixed(2)}</div><div class="lbl">Total Input Cost</div></div>
    <div class="result-item"><div class="val" id="sum-ev">$0.00</div><div class="lbl">Expected Value</div></div>
    <div class="result-item red"><div class="val" id="sum-profit">-$${totalCost.toFixed(2)}</div><div class="lbl">Profit / Loss</div></div>
    <div class="result-item red"><div class="val" id="sum-roi">-100.0%</div><div class="lbl">ROI</div></div>
  </div>
  <p style="font-size:13px;color:var(--text2);margin-top:12px">Enter output prices above to calculate expected value. Breakeven EV = $${totalCost.toFixed(2)}.</p>`;

  resultsDiv.innerHTML=html;

  // Attach price change listeners
  document.querySelectorAll('.outcome-price').forEach(inp=>{
    inp.addEventListener('input',function(){
      updateEV(allOutcomes,totalCost);
    });
  });
}

function updateEV(outcomes,totalCost){
  let totalEV=0;
  document.querySelectorAll('.outcome-price').forEach(inp=>{
    const idx=parseInt(inp.dataset.idx);
    const price=parseFloat(inp.value)||0;
    outcomes[idx].price=price;
    const ev=outcomes[idx].probability*price;
    outcomes[idx].ev=ev;
    totalEV+=ev;
    const cell=document.querySelector(`.ev-cell[data-idx="${idx}"]`);
    if(cell)cell.textContent='$'+ev.toFixed(2);
  });

  const profit=totalEV-totalCost;
  const roi=totalCost>0?((profit/totalCost)*100):0;

  document.getElementById('sum-ev').textContent='$'+totalEV.toFixed(2);
  const profitEl=document.getElementById('sum-profit');
  profitEl.textContent=(profit>=0?'$':'-$')+Math.abs(profit).toFixed(2);
  profitEl.closest('.result-item').className='result-item '+(profit>=0?'green':'red');
  const roiEl=document.getElementById('sum-roi');
  roiEl.textContent=roi.toFixed(1)+'%';
  roiEl.closest('.result-item').className='result-item '+(roi>=0?'green':'red');
}

document.addEventListener('DOMContentLoaded',loadData);
})();
