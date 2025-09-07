import {DEFAULT_LOCATIONS, ZONES_BY_LOC, makeDefaultState, eligibleEvents, pickParticipants, renderText, applyEffects, getRelationship, tickCooldowns} from './engine.js';

const state = makeDefaultState();
let allEvents = []; // merged from packs

// UI refs
const selLocation = document.getElementById('selLocation');
const selZone = document.getElementById('selZone');
const selRange = document.getElementById('selRange');
const eventId = document.getElementById('eventId');
const eventCategory = document.getElementById('eventCategory');
const eventText = document.getElementById('eventText');
const debug = document.getElementById('debug');

// Populate selects
function refreshLocationZone(){
  selLocation.innerHTML = DEFAULT_LOCATIONS.map(l=>`<option>${l}</option>`).join('');
  selLocation.value = state.location;
  refreshZoneOptions();
}
function refreshZoneOptions(){
  const zones = ZONES_BY_LOC[state.location] || [];
  selZone.innerHTML = zones.map(z=>`<option>${z}</option>`).join('');
  state.zone = zones[0] || null;
}

refreshLocationZone();
selLocation.addEventListener('change', ()=>{
  state.location = selLocation.value;
  refreshZoneOptions();
});
selZone.addEventListener('change', ()=>{ state.zone = selZone.value; });
selRange.addEventListener('change', ()=>{ state.range = selRange.value; });

document.querySelectorAll('.flag').forEach(cb=>{
  cb.addEventListener('change', ()=>{
    if(cb.checked) state.envFlags.add(cb.value); else state.envFlags.delete(cb.value);
  });
});

// Roster
function renderRoster(){
  const roster = document.getElementById('roster');
  roster.innerHTML = '';
  for(const p of state.players){
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<h3>${p.alive ? '🟢' : '🔴'} ${p.name}</h3>
      <div>traits: ${[...p.traits].map(t=>`<span class="badge">${t}</span>`).join('')}</div>
      <div>items: ${[...p.items].map(t=>`<span class="badge">${t}</span>`).join('') || '—'}</div>
      <div>flags: ${[...p.flags].map(t=>`<span class="badge">${t}</span>`).join('') || '—'}</div>`;
    roster.appendChild(el);
  }
}
renderRoster();

// Loading packs
async function loadDefaultPacks(){
  const resp = await fetch('packs/packs.json');
  const list = await resp.json();
  await loadPacks(list);
}
async function loadPacks(files){
  allEvents = [];
  for(const f of files){
    const res = await fetch(`packs/${f}`);
    const data = await res.json();
    const events = data.events || data; // support array-only
    allEvents.push(...events);
  }
  console.log('loaded events:', allEvents.length);
  eventText.textContent = `Carregado: ${allEvents.length} eventos`;
}
document.getElementById('btnLoadDefault').addEventListener('click', loadDefaultPacks);

document.getElementById('btnLoadFiles').addEventListener('click', async ()=>{
  const files = document.getElementById('fileInput').files;
  allEvents = [];
  for(const file of files){
    const text = await file.text();
    const data = JSON.parse(text);
    allEvents.push(...(data.events || data));
  }
  eventText.textContent = `Carregado: ${allEvents.length} eventos (via input)`;
});

// Rolling events
document.getElementById('btnRoll').addEventListener('click', ()=>{
  if(allEvents.length===0){ eventText.textContent = 'Carregue um pack primeiro.'; return; }
  tickCooldowns(state);
  // try 1,2,3 participants randomly
  const counts = [1,2,3];
  const participants = counts[Math.floor(Math.random()*counts.length)];
  const pool = eligibleEvents(state, allEvents, participants);
  if(pool.length===0){
    eventText.textContent = 'Nenhum evento elegível neste estado.';
    return;
  }
  const ev = pool[Math.floor(Math.random()*pool.length)].item;
  const parts = pickParticipants(state, participants);
  if(!parts){ eventText.textContent = 'Participantes insuficientes.'; return; }
  // relationship filter if needed
  if(ev.conditions && ev.conditions.relationship){
    const rel = getRelationship(state, parts[0], parts[1]);
    if(rel !== ev.conditions.relationship){
      eventText.textContent = `Filtro de relacionamento falhou (${rel} != ${ev.conditions.relationship}). Tente de novo.`;
      return;
    }
  }
  const txt = renderText(ev, parts);
  eventId.textContent = ev.id;
  eventCategory.textContent = `categoria: ${ev.category} — participantes: ${ev.participants}`;
  eventText.textContent = txt;

  const log = [];
  applyEffects(state, ev, parts, log);
  debug.textContent = log.length ? 'efeitos: ' + log.join(' | ') : 'efeitos: (nenhum ou não implementado)';
  renderRoster();
});
