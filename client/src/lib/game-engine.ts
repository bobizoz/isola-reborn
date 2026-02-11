import { GameState, Villager } from "@shared/schema";

/**
 * Pure function to advance game state by one tick.
 * This runs on the client for smooth prediction and syncs to server occasionally.
 */

// Constants for simulation balance
const MOVEMENT_SPEED = 2; // Pixels per tick
const HUNGER_RATE = 0.05;
const ENERGY_RATE = 0.03;
const HEALING_RATE = 0.1;
const RESOURCE_GAIN = 1;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;

// Simple distance helper
const dist = (x1: number, y1: number, x2: number, y2: number) => 
  Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

// Resources on map (static for now, could be dynamic)
const RESOURCES = {
  trees: [{x: 100, y: 100}, {x: 150, y: 50}, {x: 50, y: 150}, {x: 700, y: 500}, {x: 650, y: 550}],
  rocks: [{x: 600, y: 100}, {x: 700, y: 50}, {x: 750, y: 120}],
  center: {x: 400, y: 300}, // Village center / storage / fire
};

export function advanceGameTick(
  currentState: GameState, 
  currentVillagers: Villager[]
): { newState: GameState; newVillagers: Villager[] } {
  
  const newState = { ...currentState, gameTick: currentState.gameTick + 1 };
  const newVillagers = currentVillagers.map(v => {
    let villager = { ...v };

    // --- 1. Vital Decay ---
    villager.hunger = Math.min(100, villager.hunger + HUNGER_RATE);
    villager.energy = Math.max(0, villager.energy - ENERGY_RATE);

    // If hungry, health drops
    if (villager.hunger > 90) villager.health = Math.max(0, villager.health - 0.1);
    
    // If sleeping, regain energy
    if (villager.action === 'sleeping') {
      villager.energy = Math.min(100, villager.energy + 0.5);
      villager.health = Math.min(100, villager.health + HEALING_RATE);
    }

    // --- 2. Decision Logic (AI) ---
    // Simple state machine
    
    // EMERGENCY: Eat if hungry
    if (villager.hunger > 70 && villager.action !== 'eating' && newState.food > 0) {
      villager.action = 'eating';
    }

    // EMERGENCY: Sleep if tired
    if (villager.energy < 10 && villager.action !== 'sleeping') {
      villager.action = 'sleeping';
    }

    // IDLE: Pick a new task based on priorities
    if (villager.action === 'idle') {
      const roll = Math.random() * 40; // Total weight approx
      const p = newState;
      
      // Simple weighted random choice
      if (roll < p.priorityFarming) villager.action = 'farming';
      else if (roll < p.priorityFarming + p.priorityBuilding) villager.action = 'building';
      else if (roll < p.priorityFarming + p.priorityBuilding + p.priorityGathering) villager.action = 'gathering';
      else villager.action = 'research';
    }

    // --- 3. Action Execution & Movement ---
    const target = getTargetForAction(villager.action);
    
    if (target) {
      const d = dist(villager.posX, villager.posY, target.x, target.y);
      
      // Move towards target
      if (d > 10) {
        const angle = Math.atan2(target.y - villager.posY, target.x - villager.posX);
        villager.posX += Math.cos(angle) * MOVEMENT_SPEED;
        villager.posY += Math.sin(angle) * MOVEMENT_SPEED;
      } else {
        // Arrived at target, perform work
        performWork(villager, newState);
        
        // Return to idle after some time (random chance to finish task)
        if (Math.random() < 0.01) {
          villager.action = 'idle';
        }
      }
    } else {
      // Wander randomly if no target (e.g. idle)
      if (Math.random() < 0.05) {
        villager.posX += (Math.random() - 0.5) * 20;
        villager.posY += (Math.random() - 0.5) * 20;
        // Keep in bounds
        villager.posX = Math.max(0, Math.min(MAP_WIDTH, villager.posX));
        villager.posY = Math.max(0, Math.min(MAP_HEIGHT, villager.posY));
      }
    }

    return villager;
  });

  return { newState, newVillagers };
}

function getTargetForAction(action: string): {x: number, y: number} | null {
  switch (action) {
    case 'eating': return RESOURCES.center; // Go to food storage
    case 'sleeping': return RESOURCES.center; // Go to hut
    case 'gathering': return RESOURCES.trees[Math.floor(Math.random() * RESOURCES.trees.length)];
    case 'building': return RESOURCES.rocks[Math.floor(Math.random() * RESOURCES.rocks.length)]; // Mine rocks for building
    case 'farming': return { x: RESOURCES.center.x - 100, y: RESOURCES.center.y }; // Field near center
    default: return null;
  }
}

function performWork(villager: Villager, state: GameState) {
  // Simple resource gathering logic
  // In a real implementation, this would likely be more complex
  if (villager.action === 'eating') {
    if (state.food > 0) {
      state.food -= 0.1; // Eat food
      villager.hunger = Math.max(0, villager.hunger - 1);
      if (villager.hunger <= 0) villager.action = 'idle'; // Done eating
    } else {
      villager.action = 'idle'; // No food!
    }
  } else if (villager.action === 'gathering') {
    state.wood += 0.05 + (villager.skillGathering * 0.01);
    if (Math.random() < 0.001) villager.skillGathering++;
  } else if (villager.action === 'farming') {
    state.food += 0.05 + (villager.skillFarming * 0.01);
    if (Math.random() < 0.001) villager.skillFarming++;
  } else if (villager.action === 'building') {
    state.stone += 0.02 + (villager.skillBuilding * 0.01);
    if (Math.random() < 0.001) villager.skillBuilding++;
  } else if (villager.action === 'research') {
    state.techPoints += 0.01 + (villager.skillResearch * 0.01);
    if (Math.random() < 0.001) villager.skillResearch++;
  }
}

export { RESOURCES };
