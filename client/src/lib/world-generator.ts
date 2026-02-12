/**
 * Enhanced World Generator for ISOLA: REBORN
 * Generates terrain, resources, and environmental features
 * Optimized for 3200x2400 world with rich visual detail
 */

import { WORLD_WIDTH, WORLD_HEIGHT } from './camera';

// Terrain types with sub-variants for visual variety
export type TerrainType = 'plains' | 'forest' | 'mountain' | 'water' | 'desert' | 'swamp' | 'beach' | 'snow' | 'deepwater';

export interface TerrainCell {
  x: number;
  y: number;
  type: TerrainType;
  elevation: number;  // 0-1
  moisture: number;   // 0-1
  fertility: number;  // 0-1, affects farming
  variant: number;    // 0-1 for visual variety within type
  temperature: number; // 0-1, affects biome
  hasTree: boolean;   // For forest detail
  hasRock: boolean;   // For mountain detail
  hasVegetation: boolean; // For plains/swamp detail
}

export interface ResourceNode {
  id: number;
  type: 'tree' | 'rock' | 'berry' | 'fish' | 'gold' | 'iron' | 'herbs' | 'mushroom';
  x: number;
  y: number;
  amount: number;     // Remaining resources
  maxAmount: number;
  variant: number;    // Visual variant
}

export interface WorldTerrain {
  cells: TerrainCell[][];
  resources: ResourceNode[];
  rivers: { x: number; y: number; width: number; depth: number }[];
  cellSize: number;
  biomes: { name: string; centerX: number; centerY: number; radius: number }[];
}

// Improved seeded random
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s * 9999.1) * 10000;
    return s - Math.floor(s);
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Improved 2D noise with gradient-based approach
function gradientNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  
  // Gradient vectors
  const grad = (hash: number, dx: number, dy: number): number => {
    const h = hash & 3;
    const u = h < 2 ? dx : dy;
    const v = h < 2 ? dy : dx;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  };
  
  // Hash function
  const hash = (px: number, py: number): number => {
    const n = Math.sin(px * 127.1 + py * 311.7 + seed) * 43758.5453;
    return Math.floor((n - Math.floor(n)) * 256);
  };
  
  const n00 = grad(hash(ix, iy), fx, fy);
  const n10 = grad(hash(ix + 1, iy), fx - 1, fy);
  const n01 = grad(hash(ix, iy + 1), fx, fy - 1);
  const n11 = grad(hash(ix + 1, iy + 1), fx - 1, fy - 1);
  
  const sx = smootherstep(fx);
  const sy = smootherstep(fy);
  
  const nx0 = lerp(n00, n10, sx);
  const nx1 = lerp(n01, n11, sx);
  
  return (lerp(nx0, nx1, sy) + 1) * 0.5;
}

// Multi-octave fractal noise
function fbm(x: number, y: number, seed: number, octaves: number = 5, persistence: number = 0.5): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 0.008; // Adjusted for larger world
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += gradientNoise2D(x * frequency, y * frequency, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  
  return value / maxValue;
}

// Domain warping for more organic terrain
function warpedFbm(x: number, y: number, seed: number): number {
  const warpX = fbm(x, y, seed + 100, 3) * 80;
  const warpY = fbm(x, y, seed + 200, 3) * 80;
  return fbm(x + warpX, y + warpY, seed, 5);
}

// Temperature based on latitude and elevation
function calculateTemperature(y: number, elevation: number, seed: number): number {
  const latitudeFactor = 1 - Math.abs(y - WORLD_HEIGHT / 2) / (WORLD_HEIGHT / 2);
  const elevationFactor = 1 - elevation * 0.5;
  const noise = fbm(y * 2, 0, seed + 7777, 2) * 0.2;
  return Math.max(0, Math.min(1, latitudeFactor * elevationFactor + noise));
}

export function generateWorld(seed: number = 12345): WorldTerrain {
  const cellSize = 32; // Smaller cells for more detail
  const cols = Math.ceil(WORLD_WIDTH / cellSize);
  const rows = Math.ceil(WORLD_HEIGHT / cellSize);
  
  const cells: TerrainCell[][] = [];
  const resources: ResourceNode[] = [];
  const rivers: { x: number; y: number; width: number; depth: number }[] = [];
  const biomes: { name: string; centerX: number; centerY: number; radius: number }[] = [];
  
  let resourceId = 1;
  const rand = seededRandom(seed);
  
  // Pre-generate biome centers for distinct regions
  const numBiomes = 8 + Math.floor(rand() * 6);
  for (let i = 0; i < numBiomes; i++) {
    biomes.push({
      name: ['Verdant Valley', 'Shadow Woods', 'Golden Plains', 'Crystal Peaks', 'Misty Marshes', 'Sun Desert', 'Frost Highlands'][i % 7],
      centerX: rand() * WORLD_WIDTH,
      centerY: rand() * WORLD_HEIGHT,
      radius: 300 + rand() * 500,
    });
  }
  
  // Generate terrain cells
  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      const worldX = x * cellSize + cellSize / 2;
      const worldY = y * cellSize + cellSize / 2;
      
      // Generate noise values with domain warping for organic shapes
      const elevation = warpedFbm(worldX, worldY, seed);
      const moisture = fbm(worldX + 5000, worldY + 5000, seed + 5000, 4, 0.6);
      const variant = fbm(worldX * 2, worldY * 2, seed + 8888, 2) * 0.5 + rand() * 0.5;
      const temperature = calculateTemperature(worldY, elevation, seed);
      
      // Determine terrain type based on elevation, moisture, and temperature
      let type: TerrainType = 'plains';
      
      // Deep water
      if (elevation < 0.2) {
        type = 'deepwater';
      }
      // Shallow water
      else if (elevation < 0.28) {
        type = 'water';
      }
      // Beach transition
      else if (elevation < 0.32 && elevation >= 0.28) {
        type = 'beach';
      }
      // Snow at high elevation or cold temperature
      else if (elevation > 0.82 || (elevation > 0.7 && temperature < 0.25)) {
        type = 'snow';
      }
      // Mountain
      else if (elevation > 0.7) {
        type = 'mountain';
      }
      // Swamp in low wet areas
      else if (moisture > 0.65 && elevation < 0.45) {
        type = 'swamp';
      }
      // Forest in moist areas
      else if (moisture > 0.5 && temperature > 0.3) {
        type = 'forest';
      }
      // Desert in dry hot areas
      else if (moisture < 0.3 && temperature > 0.6) {
        type = 'desert';
      }
      
      // Calculate fertility
      let fertility = 0.5;
      if (type === 'plains') fertility = 0.7 + moisture * 0.3;
      else if (type === 'forest') fertility = 0.4 + moisture * 0.2;
      else if (type === 'swamp') fertility = 0.3 + moisture * 0.2;
      else if (type === 'beach') fertility = 0.2;
      else if (type === 'water' || type === 'deepwater' || type === 'mountain' || type === 'snow' || type === 'desert') fertility = 0.1;
      
      // Environmental details
      const hasTree = type === 'forest' && rand() < 0.35;
      const hasRock = (type === 'mountain' || type === 'snow') && rand() < 0.25;
      const hasVegetation = (type === 'plains' && rand() < 0.15) || (type === 'swamp' && rand() < 0.3);
      
      cells[y][x] = {
        x: worldX,
        y: worldY,
        type,
        elevation,
        moisture,
        fertility,
        variant,
        temperature,
        hasTree,
        hasRock,
        hasVegetation,
      };
    }
  }
  
  // Second pass: Generate resources based on terrain
  const resourceRand = seededRandom(seed + 4444);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = cells[y][x];
      const worldX = cell.x;
      const worldY = cell.y;
      
      // Trees in forests (dense)
      if (cell.type === 'forest' && resourceRand() < 0.25) {
        // Add multiple trees per cell for dense forests
        const treeCount = 1 + Math.floor(resourceRand() * 2);
        for (let t = 0; t < treeCount; t++) {
          resources.push({
            id: resourceId++,
            type: 'tree',
            x: worldX + (resourceRand() - 0.5) * cellSize * 0.9,
            y: worldY + (resourceRand() - 0.5) * cellSize * 0.9,
            amount: 40 + Math.floor(resourceRand() * 60),
            maxAmount: 100,
            variant: Math.floor(resourceRand() * 4), // Different tree types
          });
        }
      }
      
      // Rocks and minerals in mountains
      if ((cell.type === 'mountain' || cell.type === 'snow') && resourceRand() < 0.2) {
        const mineralType = resourceRand();
        resources.push({
          id: resourceId++,
          type: mineralType < 0.6 ? 'rock' : (mineralType < 0.85 ? 'iron' : 'gold'),
          x: worldX + (resourceRand() - 0.5) * cellSize * 0.7,
          y: worldY + (resourceRand() - 0.5) * cellSize * 0.7,
          amount: 30 + Math.floor(resourceRand() * 70),
          maxAmount: 100,
          variant: Math.floor(resourceRand() * 3),
        });
      }
      
      // Berries and herbs in plains
      if (cell.type === 'plains' && resourceRand() < 0.08) {
        resources.push({
          id: resourceId++,
          type: resourceRand() < 0.6 ? 'berry' : 'herbs',
          x: worldX + (resourceRand() - 0.5) * cellSize * 0.8,
          y: worldY + (resourceRand() - 0.5) * cellSize * 0.8,
          amount: 20 + Math.floor(resourceRand() * 40),
          maxAmount: 60,
          variant: Math.floor(resourceRand() * 3),
        });
      }
      
      // Fish in water
      if ((cell.type === 'water' || cell.type === 'deepwater') && resourceRand() < 0.1) {
        resources.push({
          id: resourceId++,
          type: 'fish',
          x: worldX + (resourceRand() - 0.5) * cellSize * 0.6,
          y: worldY + (resourceRand() - 0.5) * cellSize * 0.6,
          amount: 40 + Math.floor(resourceRand() * 50),
          maxAmount: 90,
          variant: Math.floor(resourceRand() * 2),
        });
      }
      
      // Mushrooms in swamps
      if (cell.type === 'swamp' && resourceRand() < 0.12) {
        resources.push({
          id: resourceId++,
          type: 'mushroom',
          x: worldX + (resourceRand() - 0.5) * cellSize * 0.8,
          y: worldY + (resourceRand() - 0.5) * cellSize * 0.8,
          amount: 15 + Math.floor(resourceRand() * 25),
          maxAmount: 40,
          variant: Math.floor(resourceRand() * 3),
        });
      }
      
      // Occasional trees in plains (scattered)
      if (cell.type === 'plains' && resourceRand() < 0.03) {
        resources.push({
          id: resourceId++,
          type: 'tree',
          x: worldX + (resourceRand() - 0.5) * cellSize * 0.8,
          y: worldY + (resourceRand() - 0.5) * cellSize * 0.8,
          amount: 30 + Math.floor(resourceRand() * 40),
          maxAmount: 70,
          variant: Math.floor(resourceRand() * 4),
        });
      }
    }
  }
  
  // Generate rivers - more varied
  const riverRand = seededRandom(seed + 7777);
  const riverCount = 4 + Math.floor(riverRand() * 4);
  for (let i = 0; i < riverCount; i++) {
    let rx = riverRand() * WORLD_WIDTH;
    let ry = riverRand() < 0.5 ? 0 : WORLD_HEIGHT * riverRand() * 0.3;
    const direction = riverRand() < 0.7 ? 1 : -1; // Mostly flowing down
    
    while (ry >= 0 && ry < WORLD_HEIGHT && rx >= 0 && rx < WORLD_WIDTH) {
      const width = 15 + riverRand() * 35 + Math.sin(ry * 0.01) * 10;
      const depth = 0.5 + riverRand() * 0.5;
      rivers.push({ x: rx, y: ry, width, depth });
      
      // Meandering
      rx += (riverRand() - 0.5) * 50 + Math.sin(ry * 0.005) * 30;
      ry += direction * (15 + riverRand() * 25);
      
      // Occasional branching
      if (riverRand() < 0.02) {
        rx += (riverRand() - 0.5) * 100;
      }
    }
  }
  
  return {
    cells,
    resources,
    rivers,
    cellSize,
    biomes,
  };
}

export function getTerrainAt(terrain: WorldTerrain, worldX: number, worldY: number): TerrainCell | null {
  const col = Math.floor(worldX / terrain.cellSize);
  const row = Math.floor(worldY / terrain.cellSize);
  
  if (row >= 0 && row < terrain.cells.length && col >= 0 && col < terrain.cells[row].length) {
    return terrain.cells[row][col];
  }
  return null;
}

// Enhanced color palette with gradients and variation
export function getTerrainColor(type: TerrainType, elevation: number, variant: number = 0.5, temperature: number = 0.5): string {
  const v = variant * 20 - 10; // -10 to 10 variation
  
  switch (type) {
    case 'deepwater':
      const deepBlue = 30 + elevation * 30 + v;
      return `rgb(${Math.max(20, 30 + v)}, ${Math.max(50, 70 + v)}, ${Math.min(180, 150 + deepBlue)})`;
      
    case 'water':
      const waterShade = elevation * 40;
      return `rgb(${60 + waterShade + v}, ${130 + waterShade + v}, ${190 + v})`;
      
    case 'beach':
      return `rgb(${230 + v}, ${215 + v}, ${170 + v})`;
      
    case 'plains':
      const greenVar = elevation * 25 + v;
      const yellowTint = temperature * 20;
      return `rgb(${145 + greenVar + yellowTint}, ${175 + greenVar}, ${90 + greenVar - yellowTint})`;
      
    case 'forest':
      const forestShade = elevation * 35 + v;
      const darkForest = variant < 0.3;
      return darkForest 
        ? `rgb(${30 + forestShade}, ${75 + forestShade}, ${35 + forestShade})`
        : `rgb(${45 + forestShade}, ${95 + forestShade}, ${45 + forestShade})`;
      
    case 'mountain':
      const gray = 95 + elevation * 70 + v;
      const brownTint = (1 - temperature) * 15;
      return `rgb(${gray + brownTint}, ${gray - 5}, ${gray - brownTint - 10})`;
      
    case 'snow':
      const snowBright = 220 + elevation * 30 + v;
      return `rgb(${Math.min(255, snowBright)}, ${Math.min(255, snowBright + 5)}, ${Math.min(255, snowBright + 10)})`;
      
    case 'desert':
      const sandVar = elevation * 20 + v;
      return `rgb(${215 + sandVar}, ${190 + sandVar}, ${140 + sandVar})`;
      
    case 'swamp':
      const swampGreen = elevation * 25 + v;
      return `rgb(${70 + swampGreen}, ${95 + swampGreen}, ${60 + swampGreen})`;
      
    default:
      return '#666';
  }
}

// Get terrain feature color for additional details
export function getFeatureColor(cell: TerrainCell): string | null {
  if (cell.hasTree) {
    const shade = cell.variant * 30;
    return `rgb(${25 + shade}, ${55 + shade}, ${25 + shade})`;
  }
  if (cell.hasRock) {
    const shade = 80 + cell.variant * 40;
    return `rgb(${shade}, ${shade - 5}, ${shade - 10})`;
  }
  if (cell.hasVegetation) {
    const shade = cell.variant * 20;
    return `rgb(${100 + shade}, ${140 + shade}, ${80 + shade})`;
  }
  return null;
}
