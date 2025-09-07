// Lightweight event engine for Easton Heights packs
export const DEFAULT_LOCATIONS = [
  "High Buildings","Medium Buildings","Old Mall","Old Industry","Old Warehouse","Old School",
  "Old Hospital","Subway Station","Suburb District","Big Outlet","Dense Forest","Deep Lake","Botafogo Stadium"
];

export const ZONES_BY_LOC = {
  "High Buildings": ["rooftop","stairwell","maintenance room","elevator corridor","balcony","lobby"],
  "Medium Buildings": ["rooftop","stairwell","lobby","maintenance room","balcony"],
  "Old Mall": ["food court","service corridor","escalator","loading bay","cinema hall"],
  "Old Industry": ["catwalk","boiler room","kiln floor","warehouse bay","control room"],
  "Old Warehouse": ["loading dock","stack aisles","office nook","mezzanine"],
  "Old School": ["hallway","gym","science lab","staircase","cafeteria"],
  "Old Hospital": ["ward","basement","operating room","morgue","corridor"],
  "Subway Station": ["platform","service tunnel","tracks","ticket hall","maintenance alcove"],
  "Suburb District": ["alley","empty lot","backyard","rooftop shed","street corner"],
  "Big Outlet": ["parking deck","main corridor","service ramp","storage cage"],
  "Dense Forest": ["ravine","root tangle","mud hollow","clearing"],
  "Deep Lake": ["pier","slippery rock","shallows"],
  "Botafogo Stadium": ["stands","locker tunnel","dugout","concourse"],
};

export function makeDefaultState(){
  const players = [
    mkPlayer("Ana", ["Ninja","Aware"], ["Rope"]),
    mkPlayer("Beto", ["Shooter"], ["class:firearm:smg","scope"]),
    mkPlayer("Carla", ["Genius","Devious"], ["Tear gas grenade"]),
    mkPlayer("Diego", ["Fighter"], ["class:melee:blunt"]),
    mkPlayer("Eva", ["Runner","Attractive"], []),
    mkPlayer("Felipe", ["Caveman","Indomitable"], []),
  ];
  const relationships = {}; // key "A|B" -> type
  return {
    location: "Old Mall",
    zone: "food court",
    range: "close",
    envFlags: new Set(), // night, rain, fog
    cooldowns: {},       // tag -> remaining turns
    players,
    relationships
  };
}

export function mkPlayer(name, traits=[], items=[]) {
  return {
    name,
    alive: true,
    traits: new Set(traits),
    items: new Set(items),
    flags: new Set(), // e.g., bleeding, injured, on_rooftop
    stealth: "off",
    groupState: "solo",
    zone: null
  };
}

export function setRelationship(state, a, b, type){
  const key = pairKey(a.name,b.name);
  state.relationships[key] = type;
}

export function getRelationship(state, a, b){
  const key = pairKey(a.name,b.name);
  return state.relationships[key] || "strangers";
}

function pairKey(a,b){ return [a,b].sort().join("|"); }

export function tickCooldowns(state){
  for(const k of Object.keys(state.cooldowns)){
    if(state.cooldowns[k] > 0) state.cooldowns[k] -= 1;
  }
}

export function choiceWeighted(arr){ // arr of {item, w}
  const total = arr.reduce((s,x)=>s+x.w,0);
  let r = Math.random() * total;
  for(const x of arr){
    if((r -= x.w) <= 0) return x.item;
  }
  return arr[arr.length-1].item;
}

export function eligibleEvents(state, events, participants=2){
  const pool = [];
  for(const ev of events){
    if(ev.participants !== participants) continue;
    if(!conditionsPass(state, ev.conditions || {})) continue;
    pool.push({item: ev, w: ev.weight ?? 5});
  }
  return pool;
}

function anyMatch(setLike, arr){
  for(const v of arr) if(setLike.has(v)) return true;
  return false;
}

export function conditionsPass(state, cond){
  // Global-ish
  if(cond.locationsAny && !cond.locationsAny.includes(state.location)) return false;
  if(cond.zoneAny && !cond.zoneAny.includes(state.zone)) return false;
  if(cond.range && cond.range !== state.range && cond.range !== "any") return false;
  if(cond.flagsAny){
    // env flags only in this starter (primal_on/on_rooftop/etc. ignored here)
    if(!cond.flagsAny.some(f => state.envFlags.has(f))) return false;
  }
  if(cond.cooldownTag && (state.cooldowns[cond.cooldownTag] ?? 0) > 0) return false;
  // Relationship gate is checked later against chosen A,B pair.
  return true;
}

export function pickParticipants(state, count){
  const alive = state.players.filter(p=>p.alive);
  if(alive.length < count) return null;
  // naive shuffle
  const arr = alive.slice().sort(()=>Math.random()-0.5);
  return arr.slice(0, count);
}

export function renderText(ev, parts){
  let txt = ev.text;
  const names = ["{A}","{B}","{C}"];
  for(let i=0;i<parts.length;i++){
    txt = txt.replaceAll(names[i], parts[i].name);
  }
  return txt;
}

// Minimal effects runner (subset)
export function applyEffects(state, ev, parts, log){
  const effs = ev.effects || [];
  for(const e of effs){
    switch(e.do){
      case "start_cooldown":
        state.cooldowns[e.tag] = Math.max(state.cooldowns[e.tag]||0, e.turns||3);
        log.push(`cooldown:${e.tag}=${state.cooldowns[e.tag]}`);
        break;
      case "set_relationship":
        {
          const a = nameToPlayer(state, parts, e.a||"{A}");
          const b = nameToPlayer(state, parts, e.b||"{B}");
          setRelationship(state, a, b, e.type);
          log.push(`rel:${a.name}<->${b.name}=${e.type}`);
        }
        break;
      case "toggle_stealth":
        {
          const who = nameToPlayer(state, parts, e.who||"{A}");
        if(!who) break;
        who.stealth = e.state;
        log.push(`stealth:${who.name}=${e.state}`);
        }
        break;
      case "set_flag":
        {
          const who = nameToPlayer(state, parts, e.who||"{A}");
          if(who) { who.flags.add(e.flag); log.push(`flag(${who.name}):+${e.flag}`); }
          else { /* treat as env */ state.envFlags.add(e.flag); log.push(`env:+${e.flag}`); }
        }
        break;
      case "clear_flag":
        {
          const who = nameToPlayer(state, parts, e.who||"{A}");
          if(who) { who.flags.delete(e.flag); log.push(`flag(${who.name}):-${e.flag}`); }
          else { state.envFlags.delete(e.flag); log.push(`env:-${e.flag}`); }
        }
        break;
      case "move":
        state.location = e.to;
        // Reset zone to first available
        state.zone = (ZONES_BY_LOC[e.to]||[])[0] || null;
        log.push(`move:location=${state.location}`);
        break;
      case "set_zone":
        {
          const who = nameToPlayer(state, parts, e.who||"{A}");
          if(who){ who.zone = e.zone; log.push(`zone(${who.name})=${e.zone}`); }
          else { state.zone = e.zone; log.push(`zone=${e.zone}`); }
        }
        break;
      case "give_item":
        {
          const who = nameToPlayer(state, parts, e.to||"{A}");
          if(who) { who.items.add(e.item); log.push(`item(${who.name})+=${e.item}`); }
        }
        break;
      case "injure":
        {
          const who = nameToPlayer(state, parts, e.who||"{B}");
          if(!who) break;
          who.flags.add(e.severity==="lethal_hit_check" ? "bleeding" : "injured");
          log.push(`injure:${who.name}:${e.severity}`);
        }
        break;
      case "heal":
        {
          const who = nameToPlayer(state, parts, e.who||"{B}");
          if(!who) break;
          who.flags.delete("injured"); who.flags.delete("bleeding");
          log.push(`heal:${who.name}`);
        }
        break;
      case "kill":
        {
          const who = nameToPlayer(state, parts, e.who||"{B}");
          if(!who) break;
          who.alive = false; // typo fixed below
        }
        break;
      case "set_primal":
        {
          const who = nameToPlayer(state, parts, e.who||"{A}");
          if(who){ who.flags.add("primal_on"); log.push(`primal(${who.name})=on`); }
        }
        break;
      case "flee_check":
        log.push("flee:attempt");
        break;
      case "roll_combat":
        {
          const a = nameToPlayer(state, parts, e.a||"{A}");
          const b = nameToPlayer(state, parts, e.b||"{B}");
          if(!a||!b) break;
          const win = Math.random()<0.5 ? a : b;
          const lose = win===a ? b : a;
          const lethal = Math.random()<0.5;
          if(lethal){ lose.alive = false; log.push(`combat:${win.name} kills ${lose.name}`); }
          else { lose.flags.add("injured"); log.push(`combat:${win.name} injures ${lose.name}`); }
        }
        break;
    }
  }
}

function nameToPlayer(state, parts, token){
  if(token==="{A}") return parts[0];
  if(token==="{B}") return parts[1];
  if(token==="{C}") return parts[2];
  return state.players.find(p=>p.name===token) || null;
}
