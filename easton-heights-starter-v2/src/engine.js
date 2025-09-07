export const TRAITS = ["Simp","Strong","Genius","Devious","Weak","Runner","Slug","Tall","Short","Dumb","Gay","Attractive","Ugly","Villain","Loner","Scared","Ninja","Fighter","Shooter","Caveman","Gangsta","Cold","Indomitable","Aware"];

export const CLASS_ALIASES = {
  "class:melee:blunt": "blunt weapon",
  "class:melee:piercing": "piercing weapon",
  "class:melee:cutting": "blade",
  "class:melee:temporary": "improvised weapon",
  "class:melee:special": "special melee",
  "class:firearm:pistol": "pistol",
  "class:firearm:revolver": "revolver",
  "class:firearm:assault": "assault rifle",
  "class:firearm:smg": "submachine gun",
  "class:firearm:sniper": "sniper rifle",
  "class:firearm:rocket": "rocket launcher",
  "class:firearm:shotgun": "shotgun"
};

export function makeState(){
  const players = [];
  const relationships = {}; // "A|B" -> type
  return {
    players,
    relationships,
    packs: [],
    envFlags: new Set(),
    turn: 0,
    feed: [],
  };
}

export function mkPlayer(name, gender="male", traits=[]){
  return { name, gender, alive: true, traits: new Set(traits), items: new Set(), flags: new Set(), stealth:"off" };
}

export function addRelationship(state, a, b, type){
  const key = pairKey(a.name, b.name);
  state.relationships[key] = type;
}

export function getRelationship(state, a, b){
  const key = pairKey(a.name, b.name);
  return state.relationships[key] || "strangers";
}

function pairKey(a,b){ return [a,b].sort().join("|"); }

export function loadPacksFromArray(eventsArrays){
  const merged = [];
  for(const arr of eventsArrays){
    const events = Array.isArray(arr) ? arr : (arr.events || []);
    merged.push(...events);
  }
  return merged;
}

export function rollEvent(state, allEvents, maxTries=50){
  const alive = state.players.filter(p=>p.alive);
  if(alive.length < 2) return null;
  const shuffle = arr => arr.sort(()=>Math.random()-0.5);

  for(let t=0; t<maxTries; t++){
    const count = pickCount(allEvents);
    if(alive.length < count) continue;
    const parts = shuffle(alive.slice()).slice(0, count);

    const pool = filterEligible(state, allEvents, parts);
    if(pool.length === 0) continue;

    const ev = pool[Math.floor(Math.random()*pool.length)];
    return { ev, parts };
  }
  return null;
}

function pickCount(events){
  const counts = [...new Set(events.map(e=>e.participants))];
  if(counts.includes(2)) return 2;
  return counts[Math.floor(Math.random()*counts.length)];
}

function filterEligible(state, events, parts){
  const A = parts[0], B = parts[1], C = parts[2];
  const rel = (A && B) ? getRelationship(state, A, B) : null;

  return events.filter(e=>{
    if(!e || !e.participants || e.participants !== parts.length) return false;
    const c = e.conditions || {};

    if(c.relationship && rel && c.relationship !== rel) return false;

    if(c.requiresTraitsAny){
      if(!hasAny(A.traits, c.requiresTraitsAny)) return false;
    }
    if(c.forbidsTraitsAny){
      if(hasAny(A.traits, c.forbidsTraitsAny)) return false;
    }

    if(c.itemsAny){
      if(!hasAny(A.items, c.itemsAny)) return false;
    }

    if(c.flagsAny){
      let ok=false; for(const f of c.flagsAny){ if(state.envFlags.has(f)){ ok=true; break; } }
      if(!ok) return false;
    }
    return true;
  });
}

function hasAny(setLike, arr){
  for(const v of arr){ if(setLike.has(v)) return true; }
  return false;
}

export function applyEffects(state, ev, parts){
  const log = [];
  const effs = ev.effects || [];
  for(const e of effs){
    switch(e.do){
      case "set_relationship": {
        const a = tokenTo(parts, e.a||"{A}"); const b = tokenTo(parts, e.b||"{B}");
        if(a && b){ addRelationship(state, a, b, e.type||"allies"); log.push(`${a.name}↔${b.name}=${e.type}`); }
        break;
      }
      case "toggle_stealth": {
        const who = tokenTo(parts, e.who||"{A}"); if(who){ who.stealth = e.state||"off"; log.push(`stealth(${who.name})=${who.stealth}`); }
        break;
      }
      case "give_item": {
        const who = tokenTo(parts, e.to||"{A}"); if(who){ who.items.add(e.item||"item"); log.push(`item(${who.name})+=${e.item}`); }
        break;
      }
      case "injure": {
        const who = tokenTo(parts, e.who||"{B}"); if(who){ who.flags.add("injured"); if(e.severity==="lethal_hit_check"){ if(Math.random()<0.5){ who.alive=false; log.push(`☠ ${who.name}`); } else { who.flags.add("bleeding"); log.push(`bleeding(${who.name})`); } } else { log.push(`injured(${who.name})`); } }
        break;
      }
      case "heal": {
        const who = tokenTo(parts, e.who||"{B}"); if(who){ who.flags.delete("injured"); who.flags.delete("bleeding"); log.push(`heal(${who.name})`); }
        break;
      }
      case "kill": {
        const who = tokenTo(parts, e.who||"{B}"); if(who){ who.alive=false; log.push(`☠ ${who.name}`); }
        break;
      }
      default: break;
    }
  }
  return log;
}

export function renderText(ev, parts){
  let txt = ev.text || "";
  const names = ["{A}","{B}","{C}"];
  for(let i=0;i<parts.length;i++){ txt = txt.replaceAll(names[i], parts[i].name); }
  if(txt.includes("{ITEM}")){
    const A = parts[0];
    let item = [...A.items][0];
    if(!item){
      const c = ev.conditions || {};
      if(c.itemsAny){ item = CLASS_ALIASES[c.itemsAny[0]] || c.itemsAny[0]; }
      else { item = "weapon"; }
    } else { item = CLASS_ALIASES[item] || item; }
    txt = txt.replaceAll("{ITEM}", item);
  }
  return txt;
}

function tokenTo(parts, token){
  if(token==="{A}") return parts[0];
  if(token==="{B}") return parts[1];
  if(token==="{C}") return parts[2];
  return null;
}
