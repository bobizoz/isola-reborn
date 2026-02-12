/**
 * World Generator for ISOLA: REBORN
 * Generates terrain, resources, and environmental features
 */

import { WORLD_WIDTH, WORLD_HEIGHT } from './camera';

// Terrain types
export type TerrainType = 'plains' | 'forest' | 'mountain' | 'water' | 'desert' | 'swamp';

export interface TerrainCell {
  x: number;
  y: number;
  type: TerrainType;
  elevation: number;  // 0-1
  moisture: number;   // 0-1
  fertility: number;  // 0-1, affects farming
}

export interface ResourceNode {
  id: number;
  type: 'tree' | 'rock' | 'berry' | 'fish' | 'gold' | 'iron';
  x: number;
  y: number;
  amount: number;     // Remaining resources
  maxAmount: number;
}

export interface WorldTerrain {
  cells: TerrainCell[][];
  resources: ResourceNode[];
  rivers: { x: number; y: number; width: number }[];
  cellSize: number;
}

// Simple noise function (seeded)
function seededRandom(seed: number): () => number {
  return () => {
    seed = Math.sin(seed * 9999) * 10000;
    return seed - Math.floor(seed);
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Simple 2D noise
function noise2D(x: number, y: number, seed: number): number {
  const random = seededRandom(seed + x * 12345 + y * 67890);
  return random();
}

// Interpolated noise
function smoothNoise2D(x: number, y: number, seed: number, scale: number): number {
  const sx = x / scale;
  const sy = y / scale;
  
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  
  const fx = smoothstep(sx - x0);
  const fy = smoothstep(sy - y0);
  
  const n00 = noise2D(x0, y0, seed);
  const n10 = noise2D(x1, y0, seed);
  const n01 = noise2D(x0, y1, seed);
  const n11 = noise2D(x1, y1, seed);
  
  const nx0 = lerp(n00, n10, fx);
  const nx1 = lerp(n01, n11, fx);
  
  return lerp(nx0, nx1, fy);
}

// Multi-octave noise
function fbm(x: number, y: number, seed: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise2D(x * frequency, y * frequency, seed + i * 1000, 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value / maxValue;
}

export function generateWorld(seed: number = 12345): WorldTerrain {
  const cellSize = 40; // Each cell is 40x40 pixels
  const cols = Math.ceil(WORLD_WIDTH / cellSize);
  const rows = Math.ceil(WORLD_HEIGHT / cellSize);
  
  const cells: TerrainCell[][] = [];
  const resources: ResourceNode[] = [];
  const rivers: { x: number; y: number; width: number }[] = [];
  
  let resourceId = 1;
  
  // Generate terrain cells
  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      const worldX = x * cellSize + cellSize / 2;
      const worldY = y * cellSize + cellSize / 2;
      
      // Generate noise values
      const elevation = fbm(worldX, worldY, seed, 4);
      const moisture = fbm(worldX, worldY, seed + 5000, 3);
      
      // Determine terrain type based on elevation and moisture
      let type: TerrainType = 'plains';
      
      if (elevation < 0.25) {
        type = 'water';
      } else if (elevation > 0.75) {
        type = 'mountain';
      } else if (moisture > 0.6 && elevation < 0.5) {
        type = 'swamp';
      } else if (moisture > 0.5) {
        type = 'forest';
      } else if (moisture < 0.3) {
        type = 'desert';
      }
      
      // Calculate fertility
      let fertility = 0.5;
      if (type === 'plains') fertility = 0.7 + moisture * 0.3;
      else if (type === 'forest') fertility = 0.4;
      else if (type === 'swamp') fertility = 0.3;
      else if (type === 'water' || type === 'mountain' || type === 'desert') fertility = 0.1;
      
      cells[y][x] = {
        x: worldX,
        y: worldY,
        type,
        elevation,
        moisture,
        fertility,
      };
      
      // Generate resources based on terrain
      const rand = seededRandom(seed + x * 999 + y * 111);
      
      if (type === 'forest' && rand() < 0.4) {
        resources.push({
          id: resourceId++,
          type: 'tree',
          x: worldX + (rand() - 0.5) * cellSize * 0.8,
          y: worldY + (rand() - 0.5) * cellSize * 0.8,
          amount: 50 + Math.floor(rand() * 50),
          maxAmount: 100,
        });
      }
      
      if (type === 'mountain' && rand() < 0.25) {
        resources.push({
          id: resourceId++,
          type: rand() < 0.7 ? 'rock' : (rand() < 0.5 ? 'iron' : 'gold'),
          x: worldX + (rand() - 0.5) * cellSize * 0.6,
          y: worldY + (rand() - 0.5) * cellSize * 0.6,
          amount: 30 + Math.floor(rand() * 70),
          maxAmount: 100,
        });
      }
      
      if (type === 'plains' && rand() < 0.1) {
        resources.push({
          id: resourceId++,
          type: 'berry',
          x: worldX + (rand() - 0.5) * cellSize * 0.8,
          y: worldY + (rand() - 0.5) * cellSize * 0.8,
          amount: 20 + Math.floor(rand() * 30),
          maxAmount: 50,
        });
      }
      
      if (type === 'water' && rand() < 0.15) {
        resources.push({
          id: resourceId++,
          type: 'fish',
          x: worldX + (rand() - 0.5) * cellSize * 0.6,
          y: worldY + (rand() - 0.5) * cellSize * 0.6,
          amount: 40 + Math.floor(rand() * 40),
          maxAmount: 80,
        });
      }
    }
  }
  
  // Generate rivers
  const riverCount = 2 + Math.floor(seededRandom(seed + 7777)() * 3);
  for (let i = 0; i < riverCount; i++) {
    const rand = seededRandom(seed + i * 3333);
    let rx = rand() * WORLD_WIDTH;
    let ry = 0;
    
    while (ry < WORLD_HEIGHT) {
      rivers.push({ x: rx, y: ry, width: 20 + rand() * 30 });
      rx += (rand() - 0.5) * 60;
      ry += 20 + rand() * 20;
    }
  }
  
  return {
    cells,
    resources,
    rivers,
    cellSize,
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

export function getTerrainColor(type: TerrainType, elevation: number): string {
  switch (type) {
    case 'water':
      const waterDepth = 1 - elevation * 2;
      return `rgb(${60 + waterDepth * 40}, ${120 + waterDepth * 30}, ${180 + waterDepth * 20})`;
    case 'plains':
      return `rgb(${160 + elevation * 40}, ${180 + elevation * 30}, ${100 + elevation * 20})`;
    case 'forest':
      return `rgb(${50 + elevation * 30}, ${100 + elevation * 40}, ${50 + elevation * 20})`;
    case 'mountain':
      const gray = 100 + elevation * 80;
      return `rgb(${gray}, ${gray - 10}, ${gray - 20})`;
    case 'desert':
      return `rgb(${220 + elevation * 20}, ${200 + elevation * 20}, ${150 + elevation * 20})`;
    case 'swamp':
      return `rgb(${80 + elevation * 20}, ${100 + elevation * 20}, ${70 + elevation * 20})`;
    default:
      return '#666';
  }
}
