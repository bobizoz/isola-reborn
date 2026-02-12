import { GameState, Villager, Tribe, WorldEvent, GameEvent, VILLAGER_NAMES, TRIBE_COLORS, TRAIT_POOL } from "@shared/schema";

/**
 * Enhanced Game Engine with:
 * - Multi-tribe support
 * - Natural immigration system
 * - Tribe splitting mechanics  
 * - Survival mechanics (random events, deaths, avoidance)
 * - Resource management per tribe
 */

// === CONSTANTS ===
const MOVEMENT_SPEED = 2;
const HUNGER_RATE = 0.04;
const ENERGY_RATE = 0.025;
const HEALING_RATE = 0.15;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;

// Immigration settings
const IMMIGRATION_CHANCE_PER_TICK = 0.0003; // ~once per 3000 ticks
const MIN_IMMIGRATION_INTERVAL = 2000; // Minimum ticks between immigrants

// Tribe splitting settings
const MIN_POP_FOR_SPLIT = 8;
const SPLIT_CHANCE_PER_TICK = 0.0001;
const MIN_SPLIT_INTERVAL = 5000;

// Survival settings  
const STARVATION_THRESHOLD = 95;
const DEATH_FROM_STARVATION_CHANCE = 0.005;
const RANDOM_EVENT_CHANCE = 0.0002;
const DISEASE_SPREAD_CHANCE = 0.1;
const WILDLIFE_ATTACK_CHANCE = 0.0001;
const ACCIDENT_CHANCE = 0.00005;

// World resources (static locations)
const RESOURCES = {
  trees: [
    { x: 100, y: 100 }, { x: 150, y: 50 }, { x: 50, y: 150 },
    { x: 700, y: 500 }, { x: 650, y: 550 }, { x: 720, y: 450 },
    { x: 200, y: 400 }, { x: 180, y: 450 },
  ],
  rocks: [
    { x: 600, y: 100 }, { x: 700, y: 50 }, { x: 750, y: 120 },
    { x: 100, y: 500 }, { x: 50, y: 550 },
  ],
  waterSources: [
    { x: 750, y: 300 },
  ],
  dangers: [] as { x: number; y: number; type: string; severity: number }[],
};

// === HELPER FUNCTIONS ===
const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

function randomName(gender: 'male' | 'female'): string {
  const names = VILLAGER_NAMES[gender];
  return names[Math.floor(Math.random() * names.length)];
}

function randomTraits(count: number = 2): string[] {
  const shuffled = [...TRAIT_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomSkinColor(): string {
  const colors = ["#f5d0b0", "#d4a574", "#8d5524", "#c68642", "#e0ac69", "#ffdbac"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function randomHairColor(): string {
  const colors = ["#4a3b2a", "#2c1810", "#8b4513", "#d4a574", "#1a1a1a", "#8b0000", "#ffd700"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generateTribeName(): string {
  const prefixes = ["The", "Clan of the", "Children of", "People of the", "Tribe of"];
  const names = ["Mountain", "River", "Forest", "Stone", "Sun", "Moon", "Wolf", "Bear", "Eagle", "Serpent", "Oak", "Storm", "Dawn", "Shadow", "Fire", "Wind"];
  const suffixes = ["", " Clan", " People", " Folk", ""];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${name}${suffix}`;
}

// === MAIN GAME TICK FUNCTION ===
export interface TickResult {
  newState: GameState;
  newTribes: Tribe[];
  newVillagers: Villager[];
  newEvents: WorldEvent[];
  gameEvents: GameEvent[];
}

let lastImmigrationTick = 0;
let lastSplitTick = 0;

export function advanceGameTick(
  currentState: GameState,
  currentTribes: Tribe[],
  currentVillagers: Villager[],
  currentEvents: WorldEvent[]
): TickResult {
  const newState = { ...currentState, gameTick: currentState.gameTick + 1 };
  const gameEvents: GameEvent[] = [];
  
  // Filter out dead villagers at the start
  let newVillagers = currentVillagers.filter(v => !v.isDead);
  let newTribes = currentTribes.map(t => ({ ...t }));
  let newEvents = [...currentEvents];
  
  // Update dangers from events
  RESOURCES.dangers = newEvents
    .filter(e => ['wildAnimal', 'fire', 'disease'].includes(e.type))
    .map(e => ({ x: e.posX, y: e.posY, type: e.type, severity: e.severity }));

  // === PROCESS EACH TRIBE ===
  for (const tribe of newTribes) {
    const tribeVillagers = newVillagers.filter(v => v.tribeId === tribe.id && !v.isDead);
    
    // Process each villager in this tribe
    for (let i = 0; i < tribeVillagers.length; i++) {
      const v = tribeVillagers[i];
      let villager = { ...v };
      
      // --- 1. Vital Decay ---
      villager.hunger = Math.min(100, villager.hunger + HUNGER_RATE);
      villager.energy = Math.max(0, villager.energy - ENERGY_RATE);
      
      // Starvation damage
      if (villager.hunger >= STARVATION_THRESHOLD) {
        villager.health = Math.max(0, villager.health - 0.15);
        
        // Death from starvation
        if (villager.health <= 0 || (villager.hunger >= 100 && Math.random() < DEATH_FROM_STARVATION_CHANCE)) {
          villager.isDead = true;
          villager.causeOfDeath = "starvation";
          gameEvents.push({
            tick: newState.gameTick,
            type: 'death',
            message: `${villager.name} of ${tribe.name} died from starvation.`,
            tribeId: tribe.id,
            villagerId: villager.id,
          });
          continue;
        }
      }
      
      // Recovery when sleeping
      if (villager.action === 'sleeping') {
        villager.energy = Math.min(100, villager.energy + 0.6);
        villager.health = Math.min(100, villager.health + HEALING_RATE);
      }
      
      // --- 2. Danger Detection & Avoidance ---
      const nearbyDanger = RESOURCES.dangers.find(d => dist(villager.posX, villager.posY, d.x, d.y) < 80);
      
      if (nearbyDanger && villager.action !== 'fleeing') {
        // Chance to notice danger based on traits
        const noticeChance = villager.traits?.includes('Cautious') ? 0.9 : 
                           villager.traits?.includes('Reckless') ? 0.3 : 0.6;
        
        if (Math.random() < noticeChance) {
          villager.action = 'fleeing';
          // Flee away from danger
          const fleeAngle = Math.atan2(villager.posY - nearbyDanger.y, villager.posX - nearbyDanger.x);
          villager.targetX = Math.round(clamp(villager.posX + Math.cos(fleeAngle) * 150, 50, MAP_WIDTH - 50));
          villager.targetY = Math.round(clamp(villager.posY + Math.sin(fleeAngle) * 150, 50, MAP_HEIGHT - 50));
        } else {
          // Didn't notice - might get hurt
          if (nearbyDanger.type === 'wildAnimal' && Math.random() < 0.02 * nearbyDanger.severity) {
            const damage = 15 + Math.random() * 20 * nearbyDanger.severity;
            villager.health -= damage;
            
            if (villager.health <= 0) {
              villager.isDead = true;
              villager.causeOfDeath = "wildlife attack";
              gameEvents.push({
                tick: newState.gameTick,
                type: 'death',
                message: `${villager.name} of ${tribe.name} was killed by a wild animal!`,
                tribeId: tribe.id,
                villagerId: villager.id,
              });
              continue;
            }
          } else if (nearbyDanger.type === 'disease' && Math.random() < DISEASE_SPREAD_CHANCE) {
            villager.health -= 5 + Math.random() * 10;
            if (villager.health <= 0) {
              villager.isDead = true;
              villager.causeOfDeath = "disease";
              gameEvents.push({
                tick: newState.gameTick,
                type: 'death',
                message: `${villager.name} of ${tribe.name} succumbed to disease.`,
                tribeId: tribe.id,
                villagerId: villager.id,
              });
              continue;
            }
          }
        }
      }
      
      // --- 3. Random Accidents ---
      if (Math.random() < ACCIDENT_CHANCE) {
        const accidentTypes = ["fell from a tree", "had a hunting accident", "was struck by lightning", "drowned crossing a river"];
        const accident = accidentTypes[Math.floor(Math.random() * accidentTypes.length)];
        
        // Lucky trait reduces accident severity
        const severity = villager.traits?.includes('Lucky') ? 0.5 : 1;
        const damage = (20 + Math.random() * 40) * severity;
        
        villager.health -= damage;
        if (villager.health <= 0) {
          villager.isDead = true;
          villager.causeOfDeath = accident;
          gameEvents.push({
            tick: newState.gameTick,
            type: 'death',
            message: `${villager.name} of ${tribe.name} ${accident}.`,
            tribeId: tribe.id,
            villagerId: villager.id,
          });
          continue;
        }
      }
      
      // --- 4. Decision Logic (AI) ---
      // Emergency: Eat if hungry and tribe has food
      if (villager.hunger > 65 && villager.action !== 'eating' && tribe.food > 0) {
        villager.action = 'eating';
        villager.targetX = tribe.centerX;
        villager.targetY = tribe.centerY;
      }
      
      // Emergency: Sleep if exhausted
      if (villager.energy < 15 && villager.action !== 'sleeping') {
        villager.action = 'sleeping';
        villager.targetX = tribe.centerX + (Math.random() - 0.5) * 40;
        villager.targetY = tribe.centerY + (Math.random() - 0.5) * 40;
      }
      
      // Done fleeing?
      if (villager.action === 'fleeing') {
        const fleeTarget = villager.targetX && villager.targetY;
        if (fleeTarget && dist(villager.posX, villager.posY, villager.targetX!, villager.targetY!) < 10) {
          villager.action = 'idle';
          villager.targetX = null;
          villager.targetY = null;
        }
      }
      
      // Pick new task if idle
      if (villager.action === 'idle') {
        const roll = Math.random() * 30;
        const p = tribe;
        
        if (roll < p.priorityFarming) {
          villager.action = 'farming';
          villager.targetX = tribe.centerX - 80 + Math.random() * 40;
          villager.targetY = tribe.centerY + 40 + Math.random() * 40;
        } else if (roll < p.priorityFarming + p.priorityBuilding) {
          villager.action = 'building';
          const rock = RESOURCES.rocks[Math.floor(Math.random() * RESOURCES.rocks.length)];
          villager.targetX = rock.x;
          villager.targetY = rock.y;
        } else if (roll < p.priorityFarming + p.priorityBuilding + p.priorityGathering) {
          villager.action = 'gathering';
          const tree = RESOURCES.trees[Math.floor(Math.random() * RESOURCES.trees.length)];
          villager.targetX = tree.x;
          villager.targetY = tree.y;
        } else {
          villager.action = 'research';
          villager.targetX = tribe.centerX;
          villager.targetY = tribe.centerY - 30;
        }
      }
      
      // --- 5. Movement ---
      if (villager.targetX !== null && villager.targetY !== null) {
        const d = dist(villager.posX, villager.posY, villager.targetX, villager.targetY);
        const speed = villager.action === 'fleeing' ? MOVEMENT_SPEED * 2 : MOVEMENT_SPEED;
        
        if (d > 8) {
          const angle = Math.atan2(villager.targetY - villager.posY, villager.targetX - villager.posX);
          villager.posX = clamp(villager.posX + Math.cos(angle) * speed, 10, MAP_WIDTH - 10);
          villager.posY = clamp(villager.posY + Math.sin(angle) * speed, 10, MAP_HEIGHT - 10);
        } else {
          // Arrived - perform work
          performWork(villager, tribe, newState);
          
          // Random chance to finish task
          if (Math.random() < 0.008) {
            villager.action = 'idle';
            villager.targetX = null;
            villager.targetY = null;
          }
        }
      } else {
        // Wander near tribe center
        if (Math.random() < 0.03) {
          villager.posX = clamp(villager.posX + (Math.random() - 0.5) * 15, 
            tribe.centerX - tribe.territoryRadius, tribe.centerX + tribe.territoryRadius);
          villager.posY = clamp(villager.posY + (Math.random() - 0.5) * 15,
            tribe.centerY - tribe.territoryRadius, tribe.centerY + tribe.territoryRadius);
        }
      }
      
      // Update villager in array
      const idx = newVillagers.findIndex(nv => nv.id === villager.id);
      if (idx !== -1) newVillagers[idx] = villager;
    }
  }
  
  // === IMMIGRATION SYSTEM ===
  if (newState.immigrationEnabled && newState.gameTick - lastImmigrationTick > MIN_IMMIGRATION_INTERVAL) {
    if (Math.random() < IMMIGRATION_CHANCE_PER_TICK) {
      // Pick a random tribe for immigrant to join (weighted by tribe size - smaller tribes more likely)
      const aliveTribes = newTribes.filter(t => 
        newVillagers.filter(v => v.tribeId === t.id && !v.isDead).length > 0
      );
      
      if (aliveTribes.length > 0) {
        const weights = aliveTribes.map(t => {
          const pop = newVillagers.filter(v => v.tribeId === t.id && !v.isDead).length;
          return Math.max(1, 10 - pop); // Smaller tribes are more attractive
        });
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        let targetTribe = aliveTribes[0];
        for (let i = 0; i < aliveTribes.length; i++) {
          roll -= weights[i];
          if (roll <= 0) {
            targetTribe = aliveTribes[i];
            break;
          }
        }
        
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        const immigrant: Villager = {
          id: Date.now() + Math.floor(Math.random() * 10000),
          tribeId: targetTribe.id,
          name: randomName(gender),
          gender,
          age: 16 + Math.floor(Math.random() * 20),
          health: 70 + Math.random() * 30,
          energy: 50 + Math.random() * 30,
          hunger: 20 + Math.random() * 30,
          happiness: 60 + Math.random() * 30,
          skillFarming: Math.floor(Math.random() * 20),
          skillBuilding: Math.floor(Math.random() * 20),
          skillResearch: Math.floor(Math.random() * 15),
          skillGathering: Math.floor(Math.random() * 25),
          skillHealing: Math.floor(Math.random() * 10),
          skillCombat: Math.floor(Math.random() * 15),
          action: 'idle',
          targetX: null,
          targetY: null,
          isPregnant: false,
          pregnancyProgress: 0,
          skinColor: randomSkinColor(),
          hairColor: randomHairColor(),
          posX: Math.random() > 0.5 ? 10 : MAP_WIDTH - 10,
          posY: 100 + Math.random() * (MAP_HEIGHT - 200),
          traits: randomTraits(2),
          thought: "Looking for a new home...",
          causeOfDeath: null,
          isDead: false,
        };
        
        newVillagers.push(immigrant);
        lastImmigrationTick = newState.gameTick;
        
        gameEvents.push({
          tick: newState.gameTick,
          type: 'immigration',
          message: `${immigrant.name} has joined ${targetTribe.name} seeking a new life!`,
          tribeId: targetTribe.id,
          villagerId: immigrant.id,
        });
      }
    }
  }
  
  // === TRIBE SPLITTING ===
  if (newState.tribeSplittingEnabled && newState.gameTick - lastSplitTick > MIN_SPLIT_INTERVAL) {
    for (const tribe of newTribes) {
      const tribePop = newVillagers.filter(v => v.tribeId === tribe.id && !v.isDead);
      
      if (tribePop.length >= MIN_POP_FOR_SPLIT && Math.random() < SPLIT_CHANCE_PER_TICK) {
        // Split! Take 2-3 villagers to form new tribe
        const splitCount = 2 + Math.floor(Math.random() * 2);
        const splitters = tribePop.slice(0, splitCount);
        
        // Find a new location for the tribe
        let newCenterX: number = 400;
        let newCenterY: number = 300;
        let attempts = 0;
        do {
          newCenterX = 100 + Math.random() * (MAP_WIDTH - 200);
          newCenterY = 100 + Math.random() * (MAP_HEIGHT - 200);
          attempts++;
        } while (
          attempts < 20 && 
          newTribes.some(t => dist(t.centerX, t.centerY, newCenterX, newCenterY) < 200)
        );
        
        // Create new tribe
        const newTribeId = Date.now() + Math.floor(Math.random() * 10000);
        const usedColors = newTribes.map(t => t.color);
        const availableColors = TRIBE_COLORS.filter(c => !usedColors.includes(c));
        const newColor = availableColors.length > 0 
          ? availableColors[Math.floor(Math.random() * availableColors.length)]
          : TRIBE_COLORS[Math.floor(Math.random() * TRIBE_COLORS.length)];
        
        const newTribe: Tribe = {
          id: newTribeId,
          name: generateTribeName(),
          color: newColor,
          food: Math.floor(tribe.food * 0.3),
          wood: Math.floor(tribe.wood * 0.3),
          stone: Math.floor(tribe.stone * 0.3),
          techPoints: Math.floor(tribe.techPoints * 0.2),
          centerX: Math.round(newCenterX),
          centerY: Math.round(newCenterY),
          territoryRadius: 120,
          priorityFarming: tribe.priorityFarming,
          priorityBuilding: tribe.priorityBuilding,
          priorityResearch: tribe.priorityResearch,
          priorityGathering: tribe.priorityGathering,
          priorityDefense: tribe.priorityDefense,
          diplomacy: "{}",
          isPlayerTribe: false,
          foundedTick: newState.gameTick,
        };
        
        // Deduct resources from original tribe
        const tribeIdx = newTribes.findIndex(t => t.id === tribe.id);
        if (tribeIdx !== -1) {
          newTribes[tribeIdx].food -= newTribe.food;
          newTribes[tribeIdx].wood -= newTribe.wood;
          newTribes[tribeIdx].stone -= newTribe.stone;
        }
        
        newTribes.push(newTribe);
        
        // Move villagers to new tribe
        for (const splitter of splitters) {
          const vIdx = newVillagers.findIndex(v => v.id === splitter.id);
          if (vIdx !== -1) {
            newVillagers[vIdx].tribeId = newTribeId;
            newVillagers[vIdx].posX = newCenterX + (Math.random() - 0.5) * 40;
            newVillagers[vIdx].posY = newCenterY + (Math.random() - 0.5) * 40;
          }
        }
        
        lastSplitTick = newState.gameTick;
        
        gameEvents.push({
          tick: newState.gameTick,
          type: 'tribeSplit',
          message: `${splitters.map(s => s.name).join(', ')} have left ${tribe.name} to form ${newTribe.name}!`,
          tribeId: newTribeId,
        });
        
        break; // Only one split per tick
      }
    }
  }
  
  // === RANDOM WORLD EVENTS ===
  if (newState.randomEventsEnabled && Math.random() < RANDOM_EVENT_CHANCE) {
    const eventTypes = ['wildAnimal', 'disease', 'blessing'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    // Target a random area near a tribe
    const targetTribe = newTribes[Math.floor(Math.random() * newTribes.length)];
    const eventX = targetTribe.centerX + (Math.random() - 0.5) * targetTribe.territoryRadius * 2;
    const eventY = targetTribe.centerY + (Math.random() - 0.5) * targetTribe.territoryRadius * 2;
    
    if (eventType === 'blessing') {
      // Give bonus resources
      const tribeIdx = newTribes.findIndex(t => t.id === targetTribe.id);
      if (tribeIdx !== -1) {
        newTribes[tribeIdx].food += 30 + Math.random() * 50;
        gameEvents.push({
          tick: newState.gameTick,
          type: 'blessing',
          message: `The gods have blessed ${targetTribe.name} with abundant food!`,
          tribeId: targetTribe.id,
        });
      }
    } else {
      // Create a danger event
      const newEvent: WorldEvent = {
        id: Date.now(),
        type: eventType,
        posX: Math.round(clamp(eventX, 50, MAP_WIDTH - 50)),
        posY: Math.round(clamp(eventY, 50, MAP_HEIGHT - 50)),
        radius: 50 + Math.floor(Math.random() * 50),
        severity: 1 + Math.floor(Math.random() * 3),
        duration: 200 + Math.floor(Math.random() * 300),
        affectedTribeId: null,
      };
      
      newEvents.push(newEvent);
      
      const eventMessages: Record<string, string> = {
        wildAnimal: `A dangerous beast has been spotted near ${targetTribe.name}!`,
        disease: `A plague has broken out near ${targetTribe.name}!`,
        fire: `A fire has started near ${targetTribe.name}'s territory!`,
      };
      
      gameEvents.push({
        tick: newState.gameTick,
        type: 'disaster',
        message: eventMessages[eventType] || `A mysterious event occurred near ${targetTribe.name}`,
        tribeId: targetTribe.id,
      });
    }
  }
  
  // === UPDATE EVENT DURATIONS ===
  newEvents = newEvents
    .map(e => ({ ...e, duration: e.duration - 1 }))
    .filter(e => e.duration > 0);
  
  // Filter out dead villagers for final result
  newVillagers = newVillagers.filter(v => !v.isDead);
  
  // Remove tribes with no villagers
  const tribesWithPop = new Set(newVillagers.map(v => v.tribeId));
  newTribes = newTribes.filter(t => tribesWithPop.has(t.id) || t.isPlayerTribe);

  return {
    newState,
    newTribes,
    newVillagers,
    newEvents,
    gameEvents,
  };
}

function performWork(villager: Villager, tribe: Tribe, state: GameState) {
  const skillBonus = (skill: number) => 1 + skill * 0.015;
  
  if (villager.action === 'eating') {
    if (tribe.food > 0) {
      tribe.food = Math.max(0, tribe.food - 0.08);
      villager.hunger = Math.max(0, villager.hunger - 1.2);
      if (villager.hunger <= 5) {
        villager.action = 'idle';
        villager.targetX = null;
        villager.targetY = null;
      }
    } else {
      villager.action = 'idle';
      villager.targetX = null;
      villager.targetY = null;
    }
  } else if (villager.action === 'gathering') {
    tribe.wood += 0.04 * skillBonus(villager.skillGathering);
    if (Math.random() < 0.0008) villager.skillGathering = Math.min(100, villager.skillGathering + 1);
  } else if (villager.action === 'farming') {
    tribe.food += 0.05 * skillBonus(villager.skillFarming);
    if (Math.random() < 0.0008) villager.skillFarming = Math.min(100, villager.skillFarming + 1);
  } else if (villager.action === 'building') {
    tribe.stone += 0.02 * skillBonus(villager.skillBuilding);
    if (Math.random() < 0.0008) villager.skillBuilding = Math.min(100, villager.skillBuilding + 1);
  } else if (villager.action === 'research') {
    tribe.techPoints += 0.015 * skillBonus(villager.skillResearch);
    if (Math.random() < 0.0008) villager.skillResearch = Math.min(100, villager.skillResearch + 1);
  }
}

// God-mode power: Spawn a villager for a tribe
export function spawnVillager(tribe: Tribe): Villager {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    tribeId: tribe.id,
    name: randomName(gender),
    gender,
    age: 16 + Math.floor(Math.random() * 15),
    health: 100,
    energy: 80 + Math.random() * 20,
    hunger: Math.random() * 20,
    happiness: 70 + Math.random() * 30,
    skillFarming: Math.floor(Math.random() * 15),
    skillBuilding: Math.floor(Math.random() * 15),
    skillResearch: Math.floor(Math.random() * 10),
    skillGathering: Math.floor(Math.random() * 20),
    skillHealing: Math.floor(Math.random() * 10),
    skillCombat: Math.floor(Math.random() * 10),
    action: 'idle',
    targetX: null,
    targetY: null,
    isPregnant: false,
    pregnancyProgress: 0,
    skinColor: randomSkinColor(),
    hairColor: randomHairColor(),
    posX: tribe.centerX + (Math.random() - 0.5) * 60,
    posY: tribe.centerY + (Math.random() - 0.5) * 60,
    traits: randomTraits(2),
    thought: "Summoned by the gods!",
    causeOfDeath: null,
    isDead: false,
  };
}

export { RESOURCES };
