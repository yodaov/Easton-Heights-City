import {TRAITS, mkPlayer, makeState, loadPacksFromArray, rollEvent, renderText, applyEffects} from './engine.js';

const state = makeState();
let allEvents = [];
let feedIndex = -1;

const partyEl = document.getElementById('party');
const btnAdd = document.getElementById('btnAdd');
const btnPlay = document.getElementById('btnPlay');
const btnBack = document.getElementById('btnBack');
const setup = document.getElementById('setup');
const play = document.getElementById('play');
const feed = document.getElementById('feed');
const aliveCount = document.getElementById('aliveCount');
const deadCount = document.getElementById('deadCount');

btnAdd.addEventListener('click', ()=> addCard());
btnBack.addEventListener('click', ()=> { setup.classList.remove('hidden'); play.classList.add('hidden'); });

document.getElementById('btnLoadDefault').addEventListener('click', loadDefaultPacks);
document.getElementById('btnLoadFiles').addEventListener('click', loadFiles);

btnPlay.addEventListener('click', ()=>{
  if(state.players.length < 2){ alert('You need at least 2 characters.'); return; }
  setup.classList.add('hidden'); play.classList.remove('hidden');
  updateStats(); renderFeed();
});

document.getElementById('btnNext').addEventListener('click', nextEvent);
document.getElementById('btnPrev').addEventListener('click', ()=>{ if(feedIndex>0){ feedIndex--; renderFeed(); } });
document.getElementById('autoPlay').addEventListener('change', (e)=>{ if(e.target.checked) loopAuto(); });

addCard({ name:"Yodaov", gender:"male", traits:["Genius","Caveman"] });
addCard({ name:"Tiquinho", gender:"male", traits:["Attractive","Strong"] });

function addCard(opts={}){
  const p = mkPlayer(opts.name || `Player ${state.players.length+1}`, opts.gender||"male", opts.traits||[]);
  state.players.push(p);
  renderParty();
}

function removeCard(idx){
  if(state.players.length <= 2){ alert('Minimum party is 2.'); return; }
  state.players.splice(idx,1);
  renderParty();
}

function renderParty(){
  partyEl.innerHTML = '';
  state.players.forEach((p, idx)=>{
    const card = document.createElement('div'); card.className='card';
    const nameId = `name_${idx}`;
    card.innerHTML = `
      <div class="top">
        <h3>Character</h3>
        <small class="badge">${p.gender}</small>
        <button class="del" data-i="${idx}">Delete</button>
      </div>
      <div class="row">
        <input id="${nameId}" type="text" value="${p.name}" placeholder="Name"/>
        <div class="gender">
          <button data-i="${idx}" data-g="male" class="${p.gender==='male'?'on':''}">Male</button>
          <button data-i="${idx}" data-g="female" class="${p.gender==='female'?'on':''}">Female</button>
        </div>
      </div>
      <div class="traits">${TRAITS.map(t=>`<span class="trait ${p.traits.has(t)?'active':''}" data-i="${idx}" data-t="${t}">${t}</span>`).join('')}</div>
    `;
    partyEl.appendChild(card);
  });

  partyEl.querySelectorAll('input[type="text"]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const i = Number(e.target.id.split('_')[1]);
      state.players[i].name = e.target.value || `Player ${i+1}`;
    });
  });
  partyEl.querySelectorAll('.gender button').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const i = Number(btn.getAttribute('data-i'));
      const g = btn.getAttribute('data-g');
      state.players[i].gender = g;
      renderParty();
    });
  });
  partyEl.querySelectorAll('.trait').forEach(span=>{
    span.addEventListener('click', e=>{
      const i = Number(span.getAttribute('data-i'));
      const t = span.getAttribute('data-t');
      const set = state.players[i].traits;
      if(set.has(t)) set.delete(t); else set.add(t);
      span.classList.toggle('active');
    });
  });
  partyEl.querySelectorAll('button.del').forEach(btn=>{
    btn.addEventListener('click', ()=> removeCard(Number(btn.getAttribute('data-i'))));
  });
}

async function loadDefaultPacks(){
  const res = await fetch('packs/packs.json'); const list = await res.json();
  const eventsArrays = [];
  for(const f of list){ const r = await fetch(`packs/${f}`); eventsArrays.push(await r.json()); }
  allEvents = loadPacksFromArray(eventsArrays);
  alert(`Loaded ${allEvents.length} events.`);
}
async function loadFiles(){
  const files = document.getElementById('fileInput').files;
  const eventsArrays = [];
  for(const file of files){ const txt = await file.text(); eventsArrays.push(JSON.parse(txt)); }
  allEvents = loadPacksFromArray(eventsArrays);
  alert(`Loaded ${allEvents.length} events (file picker).`);
}

async function nextEvent(){
  if(state.players.filter(p=>p.alive).length < 2){ pushMsg({id:'game_over', txt:'Game over.'}); renderFeed(); return; }
  const rolled = rollEvent(state, allEvents);
  if(!rolled){ pushMsg({id:'none', txt:'No eligible events. Try again.'}); renderFeed(); return; }
  const { ev, parts } = rolled;
  const text = renderText(ev, parts);
  const logs = applyEffects(state, ev, parts);
  pushMsg({id:ev.id, txt:text, cat:ev.category, logs});
  updateStats(); renderFeed();
}

function pushMsg(m){ state.feed.push(m); feedIndex = state.feed.length - 1; }

function renderFeed(){
  feed.innerHTML = '';
  const m = state.feed[feedIndex];
  if(!m){ return; }
  const div = document.createElement('div'); div.className = 'msg';
  div.innerHTML = `<div class="id">${m.id}${m.cat ? ' · '+m.cat : ''}</div><div class="txt">${m.txt}</div>${m.logs && m.logs.length ? `<div class="id">${m.logs.join(' | ')}</div>` : ''}`;
  feed.appendChild(div); feed.scrollTop = feed.scrollHeight;
}

function updateStats(){
  const alive = state.players.filter(p=>p.alive).length;
  aliveCount.textContent = alive;
  deadCount.textContent = state.players.length - alive;
  if(alive <= 1){ document.getElementById('autoPlay').checked = false; }
}

async function loopAuto(){
  while(document.getElementById('autoPlay').checked){
    await new Promise(r=>setTimeout(r, 600));
    await nextEvent();
    if(state.players.filter(p=>p.alive).length <= 1) break;
  }
}
