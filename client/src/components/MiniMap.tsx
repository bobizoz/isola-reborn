/**
 * MiniMap Component for ISOLA: REBORN
 * Shows overview of entire world with viewport indicator
 */

import { useRef, useEffect, useCallback } from 'react';
import { CameraState, WORLD_WIDTH, WORLD_HEIGHT, getViewBounds } from '@/lib/camera';
import { Tribe, Villager, WorldEvent } from '@shared/schema';
import { WorldTerrain, getTerrainColor } from '@/lib/world-generator';

interface MiniMapProps {
  camera: CameraState;
  tribes: Tribe[];
  villagers: Villager[];
  worldEvents: WorldEvent[];
  terrain: WorldTerrain;
  canvasWidth: number;
  canvasHeight: number;
  onNavigate: (worldX: number, worldY: number) => void;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 135;

export function MiniMap({
  camera,
  tribes,
  villagers,
  worldEvents,
  terrain,
  canvasWidth,
  canvasHeight,
  onNavigate,
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const scaleX = MINIMAP_WIDTH / WORLD_WIDTH;
  const scaleY = MINIMAP_HEIGHT / WORLD_HEIGHT;
  
  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    
    // Draw terrain (simplified)
    const cellsPerRow = Math.ceil(WORLD_WIDTH / terrain.cellSize);
    const cellsPerCol = Math.ceil(WORLD_HEIGHT / terrain.cellSize);
    const miniCellWidth = MINIMAP_WIDTH / cellsPerRow;
    const miniCellHeight = MINIMAP_HEIGHT / cellsPerCol;
    
    for (let row = 0; row < terrain.cells.length; row++) {
      for (let col = 0; col < terrain.cells[row].length; col++) {
        const cell = terrain.cells[row][col];
        ctx.fillStyle = getTerrainColor(cell.type, cell.elevation, cell.variant, cell.temperature);
        ctx.fillRect(
          col * miniCellWidth,
          row * miniCellHeight,
          miniCellWidth + 0.5,
          miniCellHeight + 0.5
        );
      }
    }
    
    // Draw tribe territories
    tribes.forEach(tribe => {
      const x = tribe.centerX * scaleX;
      const y = tribe.centerY * scaleY;
      const radius = tribe.territoryRadius * scaleX;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = tribe.color + '40';
      ctx.fill();
      ctx.strokeStyle = tribe.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Tribe center marker
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = tribe.color;
      ctx.fill();
    });
    
    // Draw villager clusters (simplified as dots)
    const villagerGroups = new Map<string, { x: number; y: number; count: number; color: string }>();
    villagers.filter(v => !v.isDead).forEach(v => {
      const gridKey = `${Math.floor(v.posX / 50)},${Math.floor(v.posY / 50)}`;
      const tribe = tribes.find(t => t.id === v.tribeId);
      if (!villagerGroups.has(gridKey)) {
        villagerGroups.set(gridKey, { x: v.posX, y: v.posY, count: 1, color: tribe?.color || '#666' });
      } else {
        const group = villagerGroups.get(gridKey)!;
        group.count++;
      }
    });
    
    villagerGroups.forEach(group => {
      ctx.beginPath();
      ctx.arc(group.x * scaleX, group.y * scaleY, Math.min(4, 1 + group.count * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = group.color;
      ctx.fill();
    });
    
    // Draw world events
    worldEvents.forEach(event => {
      ctx.beginPath();
      ctx.arc(event.posX * scaleX, event.posY * scaleY, 4, 0, Math.PI * 2);
      ctx.fillStyle = event.type === 'wildAnimal' ? '#ff4444' : 
                      event.type === 'disease' ? '#44ff44' : '#ff8800';
      ctx.fill();
    });
    
    // Draw viewport rectangle
    const bounds = getViewBounds(camera, canvasWidth, canvasHeight);
    const viewX = bounds.left * scaleX;
    const viewY = bounds.top * scaleY;
    const viewW = (bounds.right - bounds.left) * scaleX;
    const viewH = (bounds.bottom - bounds.top) * scaleY;
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewX - 1, viewY - 1, viewW + 2, viewH + 2);
    
  }, [camera, tribes, villagers, worldEvents, terrain, canvasWidth, canvasHeight, scaleX, scaleY]);
  
  // Handle click to navigate
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;
    
    onNavigate(x, y);
  }, [scaleX, scaleY, onNavigate]);
  
  return (
    <div className="absolute bottom-4 right-4 bg-black/70 rounded-lg p-1 border-2 border-white/30 shadow-lg">
      <div className="text-[9px] text-white/70 text-center mb-1 font-pixel">WORLD MAP</div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="rounded cursor-pointer"
        onClick={handleClick}
      />
      <div className="flex justify-between text-[8px] text-white/50 px-1 mt-1">
        <span>Click to navigate</span>
        <span>{Math.round(camera.zoom * 100)}%</span>
      </div>
    </div>
  );
}
