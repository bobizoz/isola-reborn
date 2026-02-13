/**
 * Building System for ISOLA: REBORN
 * Defines building types, costs, effects, and construction mechanics
 */

export type BuildingType = 
  | 'house' 
  | 'farm' 
  | 'storage' 
  | 'workshop' 
  | 'watchtower'
  | 'temple'
  | 'well'
  | 'barracks';

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  emoji: string;
  description: string;
  cost: {
    wood: number;
    stone: number;
    food: number;
  };
  constructionTime: number; // Base ticks to complete
  effects: {
    populationBonus?: number; // Increases max population
    foodProduction?: number; // Food per tick multiplier
    storageBonus?: number; // Increases storage capacity
    defenseBonus?: number; // Defense rating
    techBonus?: number; // Research speed multiplier
    healingBonus?: number; // Villager healing rate
    happinessBonus?: number; // Happiness boost
    territoryBonus?: number; // Territory radius increase
  };
  size: { width: number; height: number }; // Visual size
  maxPerTribe?: number; // Optional limit per tribe
}

export interface Building {
  id: number;
  tribeId: number;
  type: BuildingType;
  posX: number;
  posY: number;
  constructionProgress: number; // 0-100
  isComplete: boolean;
  workersAssigned: number[]; // Villager IDs
  createdTick: number;
  completedTick: number | null;
  healthPoints: number;
  maxHealthPoints: number;
}

export interface ConstructionParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// Building definitions
export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
  house: {
    type: 'house',
    name: 'House',
    emoji: '🏠',
    description: 'Provides shelter and increases population capacity',
    cost: { wood: 30, stone: 10, food: 0 },
    constructionTime: 500,
    effects: {
      populationBonus: 2,
      happinessBonus: 5,
    },
    size: { width: 40, height: 40 },
  },
  farm: {
    type: 'farm',
    name: 'Farm',
    emoji: '🌾',
    description: 'Increases food production rate',
    cost: { wood: 20, stone: 5, food: 10 },
    constructionTime: 400,
    effects: {
      foodProduction: 0.15,
    },
    size: { width: 50, height: 50 },
  },
  storage: {
    type: 'storage',
    name: 'Storage',
    emoji: '📦',
    description: 'Increases resource storage capacity',
    cost: { wood: 40, stone: 15, food: 0 },
    constructionTime: 450,
    effects: {
      storageBonus: 100,
    },
    size: { width: 35, height: 35 },
  },
  workshop: {
    type: 'workshop',
    name: 'Workshop',
    emoji: '🔨',
    description: 'Boosts building speed and skill gain',
    cost: { wood: 35, stone: 20, food: 0 },
    constructionTime: 600,
    effects: {
      techBonus: 0.1,
    },
    size: { width: 45, height: 40 },
  },
  watchtower: {
    type: 'watchtower',
    name: 'Watchtower',
    emoji: '🗼',
    description: 'Increases defense and territory visibility',
    cost: { wood: 25, stone: 30, food: 0 },
    constructionTime: 550,
    effects: {
      defenseBonus: 10,
      territoryBonus: 20,
    },
    size: { width: 30, height: 50 },
    maxPerTribe: 3,
  },
  temple: {
    type: 'temple',
    name: 'Temple',
    emoji: '🏛️',
    description: 'Sacred place that boosts happiness and research',
    cost: { wood: 40, stone: 50, food: 20 },
    constructionTime: 800,
    effects: {
      happinessBonus: 15,
      techBonus: 0.2,
    },
    size: { width: 55, height: 55 },
    maxPerTribe: 1,
  },
  well: {
    type: 'well',
    name: 'Well',
    emoji: '🪣',
    description: 'Provides clean water for health and healing',
    cost: { wood: 10, stone: 25, food: 0 },
    constructionTime: 300,
    effects: {
      healingBonus: 0.1,
      happinessBonus: 3,
    },
    size: { width: 25, height: 25 },
    maxPerTribe: 2,
  },
  barracks: {
    type: 'barracks',
    name: 'Barracks',
    emoji: '⚔️',
    description: 'Training ground for warriors',
    cost: { wood: 45, stone: 35, food: 10 },
    constructionTime: 700,
    effects: {
      defenseBonus: 15,
      populationBonus: 1,
    },
    size: { width: 50, height: 45 },
    maxPerTribe: 2,
  },
};

// Helper functions
export function canAffordBuilding(
  tribe: { wood: number; stone: number; food: number },
  buildingType: BuildingType
): boolean {
  const def = BUILDING_DEFINITIONS[buildingType];
  return (
    tribe.wood >= def.cost.wood &&
    tribe.stone >= def.cost.stone &&
    tribe.food >= def.cost.food
  );
}

export function canBuildMore(
  buildings: Building[],
  tribeId: number,
  buildingType: BuildingType
): boolean {
  const def = BUILDING_DEFINITIONS[buildingType];
  if (!def.maxPerTribe) return true;
  
  const tribeBuildings = buildings.filter(
    b => b.tribeId === tribeId && b.type === buildingType
  );
  return tribeBuildings.length < def.maxPerTribe;
}

export function createBuilding(
  tribeId: number,
  type: BuildingType,
  posX: number,
  posY: number,
  currentTick: number
): Building {
  const def = BUILDING_DEFINITIONS[type];
  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    tribeId,
    type,
    posX,
    posY,
    constructionProgress: 0,
    isComplete: false,
    workersAssigned: [],
    createdTick: currentTick,
    completedTick: null,
    healthPoints: 100,
    maxHealthPoints: 100,
  };
}

export function updateBuildingConstruction(
  building: Building,
  workersCount: number,
  currentTick: number
): Building {
  if (building.isComplete) return building;

  const def = BUILDING_DEFINITIONS[building.type];
  
  // Base construction progress per tick
  const baseProgress = 100 / def.constructionTime;
  
  // More workers = faster construction (diminishing returns)
  const workerMultiplier = Math.sqrt(Math.max(1, workersCount));
  
  const newProgress = Math.min(100, building.constructionProgress + baseProgress * workerMultiplier);
  
  return {
    ...building,
    constructionProgress: newProgress,
    isComplete: newProgress >= 100,
    completedTick: newProgress >= 100 ? currentTick : null,
  };
}

export function getBuildingEffects(buildings: Building[], tribeId: number): Record<string, number> {
  const effects: Record<string, number> = {
    populationBonus: 0,
    foodProduction: 0,
    storageBonus: 0,
    defenseBonus: 0,
    techBonus: 0,
    healingBonus: 0,
    happinessBonus: 0,
    territoryBonus: 0,
  };

  buildings
    .filter(b => b.tribeId === tribeId && b.isComplete)
    .forEach(building => {
      const def = BUILDING_DEFINITIONS[building.type];
      Object.entries(def.effects).forEach(([key, value]) => {
        if (value !== undefined) {
          effects[key] = (effects[key] || 0) + value;
        }
      });
    });

  return effects;
}

// Generate construction particles
export function createConstructionParticle(buildingX: number, buildingY: number): ConstructionParticle {
  const colors = ['#d4a574', '#8b7355', '#c19a6b', '#ffd700', '#ffffff'];
  return {
    id: Date.now() + Math.random(),
    x: buildingX + (Math.random() - 0.5) * 30,
    y: buildingY + (Math.random() - 0.5) * 30,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random() * 3 - 1,
    life: 1,
    maxLife: 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 2 + Math.random() * 3,
  };
}

export function updateParticle(particle: ConstructionParticle, delta: number): ConstructionParticle {
  return {
    ...particle,
    x: particle.x + particle.vx * delta * 60,
    y: particle.y + particle.vy * delta * 60,
    vy: particle.vy + 0.1 * delta * 60, // Gravity
    life: particle.life - delta * 2,
  };
}

// Building placement validation
export function isValidBuildingPosition(
  posX: number,
  posY: number,
  buildingType: BuildingType,
  existingBuildings: Building[],
  tribeCenter: { x: number; y: number; radius: number }
): boolean {
  const def = BUILDING_DEFINITIONS[buildingType];
  const halfWidth = def.size.width / 2;
  const halfHeight = def.size.height / 2;

  // Must be within tribe territory
  const distToCenter = Math.sqrt(
    Math.pow(posX - tribeCenter.x, 2) + Math.pow(posY - tribeCenter.y, 2)
  );
  if (distToCenter > tribeCenter.radius) return false;

  // Check collision with existing buildings
  for (const building of existingBuildings) {
    const otherDef = BUILDING_DEFINITIONS[building.type];
    const otherHalfWidth = otherDef.size.width / 2;
    const otherHalfHeight = otherDef.size.height / 2;

    // Simple AABB collision check with padding
    const padding = 10;
    if (
      posX - halfWidth < building.posX + otherHalfWidth + padding &&
      posX + halfWidth > building.posX - otherHalfWidth - padding &&
      posY - halfHeight < building.posY + otherHalfHeight + padding &&
      posY + halfHeight > building.posY - otherHalfHeight - padding
    ) {
      return false;
    }
  }

  return true;
}

// Get available building types for a tribe
export function getAvailableBuildingTypes(
  tribe: { wood: number; stone: number; food: number },
  buildings: Building[],
  tribeId: number
): BuildingType[] {
  return (Object.keys(BUILDING_DEFINITIONS) as BuildingType[]).filter(type => {
    return canAffordBuilding(tribe, type) && canBuildMore(buildings, tribeId, type);
  });
}
