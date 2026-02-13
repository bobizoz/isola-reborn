/**
 * Enhanced GameCanvas with Planet View and Dynamic Zoom
 * ISOLA: REBORN - AAA Quality World Visualization System
 */

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Villager, Tribe, WorldEvent } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import {
  CameraState,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  worldToScreenX,
  worldToScreenY,
  screenToWorldX,
  screenToWorldY,
  isInView,
  getLODLevel,
  LODLevel,
  zoomCamera,
  panCamera,
  rotateWorld,
  updateCamera,
  focusOn,
  resetCamera,
  toPlanetView,
  createCamera,
  MIN_ZOOM,
  PLANET_VIEW_THRESHOLD,
  applyPlanetDistortion,
  getZoomPercentage,
} from "@/lib/camera";
import {
  WorldTerrain,
  ResourceNode,
  getTerrainColor,
  getFeatureColor,
  TerrainType,
  TerrainCell,
} from "@/lib/world-generator";
import { MiniMap } from "./MiniMap";
import { CameraControls } from "./CameraControls";

import { 
  Building, 
  BuildingType, 
  BUILDING_DEFINITIONS, 
  ConstructionParticle,
  createConstructionParticle,
  updateParticle,
  isValidBuildingPosition,
} from "@/lib/buildings";

interface GameCanvasProps {
  villagers: Villager[];
  tribes: Tribe[];
  worldEvents: WorldEvent[];
  terrain: WorldTerrain;
  buildings: Building[];
  onVillagerClick: (villager: Villager) => void;
  selectedVillagerId?: number;
  selectedTribeId?: number;
  onTribeClick?: (tribeId: number) => void;
  camera: CameraState;
  onCameraChange: (camera: CameraState) => void;
  // Building placement props
  isPlacingBuilding?: boolean;
  placingBuildingType?: BuildingType | null;
  onPlaceBuilding?: (worldX: number, worldY: number) => void;
  onCancelPlacement?: () => void;
  // Sound callbacks
  onVillagerAction?: (villager: Villager) => void;
}

// Action emoji mapping
const ACTION_EMOJIS: Record<string, { emoji: string; label: string }> = {
  farming: { emoji: "🌾", label: "Farming" },
  building: { emoji: "🔨", label: "Building" },
  research: { emoji: "🧪", label: "Researching" },
  gathering: { emoji: "🪵", label: "Gathering" },
  healing: { emoji: "💊", label: "Healing" },
  eating: { emoji: "🍖", label: "Eating" },
  sleeping: { emoji: "💤", label: "Sleeping" },
  fleeing: { emoji: "🏃", label: "Fleeing!" },
  idle: { emoji: "💭", label: "Idle" },
};

// Resource type to emoji
const RESOURCE_EMOJIS: Record<string, string> = {
  tree: "🌲",
  rock: "🪨",
  berry: "🫐",
  fish: "🐟",
  gold: "💎",
  iron: "⚙️",
  herbs: "🌿",
  mushroom: "🍄",
};

// Terrain type to emoji
const TERRAIN_ICONS: Record<TerrainType, string> = {
  plains: "",
  forest: "🌲",
  mountain: "⛰️",
  water: "🌊",
  deepwater: "🌊",
  desert: "🏜️",
  swamp: "🌿",
  beach: "🏖️",
  snow: "❄️",
};

export function GameCanvas({
  villagers,
  tribes,
  worldEvents,
  terrain,
  buildings,
  onVillagerClick,
  selectedVillagerId,
  selectedTribeId,
  onTribeClick,
  camera,
  onCameraChange,
  isPlacingBuilding = false,
  placingBuildingType = null,
  onPlaceBuilding,
  onCancelPlacement,
  onVillagerAction,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terrainCanvasRef = useRef<HTMLCanvasElement>(null);
  const planetCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastDragPos, setLastDragPos] = useState({ x: 0, y: 0 });
  const [hoveredTribe, setHoveredTribe] = useState<Tribe | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Building placement state
  const [buildingPreviewPos, setBuildingPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [constructionParticles, setConstructionParticles] = useState<ConstructionParticle[]>([]);
  
  // Particle animation for buildings under construction
  useEffect(() => {
    if (buildings.length === 0) return;
    
    const interval = setInterval(() => {
      const constructingBuildings = buildings.filter(b => !b.isComplete);
      
      if (constructingBuildings.length > 0 && Math.random() > 0.7) {
        const building = constructingBuildings[Math.floor(Math.random() * constructingBuildings.length)];
        setConstructionParticles(prev => [...prev, createConstructionParticle(building.posX, building.posY)]);
      }
      
      // Update existing particles
      setConstructionParticles(prev => 
        prev
          .map(p => updateParticle(p, 0.016))
          .filter(p => p.life > 0)
      );
    }, 50);
    
    return () => clearInterval(interval);
  }, [buildings]);
  
  // Track villager actions for sound effects
  useEffect(() => {
    if (!onVillagerAction) return;
    
    const interval = setInterval(() => {
      // Only trigger sounds for visible villagers with active actions
      villagers.forEach(villager => {
        if (villager.action && villager.action !== 'idle' && Math.random() > 0.95) {
          onVillagerAction(villager);
        }
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [villagers, onVillagerAction]);

  // Get current LOD level
  const lodLevel = getLODLevel(camera.zoom);
  const isPlanetView = camera.zoom < PLANET_VIEW_THRESHOLD;

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw planet view globe effect
  useEffect(() => {
    if (!isPlanetView) return;
    
    const canvas = planetCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const { width, height } = canvasSize;
    canvas.width = width;
    canvas.height = height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Calculate globe parameters
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;
    
    // Draw space background with stars
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(0, 0, width, height);
    
    // Draw stars
    const starCount = 150;
    for (let i = 0; i < starCount; i++) {
      const sx = (Math.sin(i * 12.34) * 0.5 + 0.5) * width;
      const sy = (Math.cos(i * 7.89) * 0.5 + 0.5) * height;
      const brightness = 0.3 + Math.sin(Date.now() * 0.001 + i) * 0.3;
      const size = 1 + Math.random() * 1.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw outer atmosphere glow
    const atmosphereGradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.9,
      centerX, centerY, radius * 1.3
    );
    atmosphereGradient.addColorStop(0, "rgba(100, 180, 255, 0.3)");
    atmosphereGradient.addColorStop(0.5, "rgba(100, 180, 255, 0.15)");
    atmosphereGradient.addColorStop(1, "rgba(100, 180, 255, 0)");
    ctx.fillStyle = atmosphereGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw the planet surface
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    
    // Sample terrain at lower resolution for performance
    const resolution = 4;
    const cellSize = terrain.cellSize;
    const cols = Math.ceil(WORLD_WIDTH / (cellSize * resolution));
    const rows = Math.ceil(WORLD_HEIGHT / (cellSize * resolution));
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const worldX = col * cellSize * resolution + cellSize * resolution / 2;
        const worldY = row * cellSize * resolution + cellSize * resolution / 2;
        
        // Map world coords to sphere
        const normalizedX = (worldX / WORLD_WIDTH - 0.5) * 2;
        const normalizedY = (worldY / WORLD_HEIGHT - 0.5) * 2;
        
        // Apply rotation
        const rotatedX = normalizedX * Math.cos(camera.rotation) - normalizedY * Math.sin(camera.rotation) * 0.2;
        const rotatedY = normalizedY;
        
        // Check if on visible hemisphere
        const dist = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
        if (dist > 1) continue;
        
        // Spherical projection
        const z = Math.sqrt(1 - dist * dist);
        const projX = centerX + rotatedX * radius;
        const projY = centerY + rotatedY * radius;
        
        // Get terrain color
        const cellRow = Math.floor(worldY / cellSize);
        const cellCol = Math.floor(worldX / cellSize);
        const cell = terrain.cells[cellRow]?.[cellCol];
        
        if (cell) {
          let color = getTerrainColor(cell.type, cell.elevation, cell.variant, cell.temperature);
          
          // Apply lighting (simple directional)
          const lightAngle = Math.PI * 0.25;
          const lightX = Math.cos(lightAngle);
          const lightZ = Math.sin(lightAngle);
          const lighting = 0.4 + 0.6 * Math.max(0, rotatedX * lightX + z * lightZ);
          
          // Parse and apply lighting
          const rgb = hexToRgb(color);
          if (rgb) {
            const r = Math.round(rgb.r * lighting);
            const g = Math.round(rgb.g * lighting);
            const b = Math.round(rgb.b * lighting);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          } else {
            ctx.fillStyle = color;
          }
          
          const pixelSize = (radius * 2 / cols) * 1.2;
          ctx.fillRect(projX - pixelSize / 2, projY - pixelSize / 2, pixelSize, pixelSize);
        }
      }
    }
    
    // Draw tribe territories on planet
    tribes.forEach((tribe) => {
      const normalizedX = (tribe.centerX / WORLD_WIDTH - 0.5) * 2;
      const normalizedY = (tribe.centerY / WORLD_HEIGHT - 0.5) * 2;
      
      const rotatedX = normalizedX * Math.cos(camera.rotation) - normalizedY * Math.sin(camera.rotation) * 0.2;
      const rotatedY = normalizedY;
      
      const dist = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
      if (dist > 0.95) return;
      
      const z = Math.sqrt(1 - Math.min(1, dist * dist));
      const projX = centerX + rotatedX * radius;
      const projY = centerY + rotatedY * radius;
      
      // Territory glow
      const glowRadius = (tribe.territoryRadius / WORLD_WIDTH) * radius * 2 * z;
      const territoryGradient = ctx.createRadialGradient(
        projX, projY, 0,
        projX, projY, glowRadius
      );
      territoryGradient.addColorStop(0, `${tribe.color}80`);
      territoryGradient.addColorStop(0.7, `${tribe.color}30`);
      territoryGradient.addColorStop(1, `${tribe.color}00`);
      
      ctx.fillStyle = territoryGradient;
      ctx.beginPath();
      ctx.arc(projX, projY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Territory marker
      ctx.fillStyle = tribe.color;
      ctx.beginPath();
      ctx.arc(projX, projY, 5 * z + 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Glow effect
      ctx.shadowColor = tribe.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(projX, projY, 3 * z + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    
    ctx.restore();
    
    // Draw planet edge highlight
    const edgeGradient = ctx.createRadialGradient(
      centerX - radius * 0.3, centerY - radius * 0.3, 0,
      centerX, centerY, radius
    );
    edgeGradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    edgeGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.02)");
    edgeGradient.addColorStop(1, "rgba(0, 0, 0, 0.3)");
    ctx.fillStyle = edgeGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw planet shadow
    const shadowGradient = ctx.createLinearGradient(
      centerX - radius, centerY,
      centerX + radius, centerY
    );
    shadowGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    shadowGradient.addColorStop(0.6, "rgba(0, 0, 0, 0)");
    shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
  }, [isPlanetView, camera, terrain, tribes, canvasSize]);

  // Draw terrain on canvas - optimized for larger world
  useEffect(() => {
    if (isPlanetView) return; // Skip when in planet view
    
    const canvas = terrainCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasSize;
    canvas.width = width;
    canvas.height = height;

    // Clear with deep color
    ctx.fillStyle = "#0f2027";
    ctx.fillRect(0, 0, width, height);

    // Calculate visible area
    const cellSize = terrain.cellSize;
    const scaledCellWidth = cellSize * camera.zoom;
    const scaledCellHeight = cellSize * camera.zoom;
    
    // Calculate visible cell range for optimization
    const viewLeft = camera.x - (width / 2) / camera.zoom - cellSize;
    const viewRight = camera.x + (width / 2) / camera.zoom + cellSize;
    const viewTop = camera.y - (height / 2) / camera.zoom - cellSize;
    const viewBottom = camera.y + (height / 2) / camera.zoom + cellSize;
    
    const startCol = Math.max(0, Math.floor(viewLeft / cellSize));
    const endCol = Math.min(terrain.cells[0]?.length || 0, Math.ceil(viewRight / cellSize));
    const startRow = Math.max(0, Math.floor(viewTop / cellSize));
    const endRow = Math.min(terrain.cells.length, Math.ceil(viewBottom / cellSize));

    // Draw terrain cells - only visible ones
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const cell = terrain.cells[row]?.[col];
        if (!cell) continue;

        const screenX = worldToScreenX(cell.x - cellSize / 2, camera, width);
        const screenY = worldToScreenY(cell.y - cellSize / 2, camera, height);

        // Draw base terrain with enhanced colors
        ctx.fillStyle = getTerrainColor(cell.type, cell.elevation, cell.variant, cell.temperature);
        ctx.fillRect(screenX, screenY, scaledCellWidth + 1, scaledCellHeight + 1);
        
        // Draw terrain features at medium+ detail
        if (lodLevel !== "strategic" && lodLevel !== "planet" && scaledCellWidth > 10) {
          const featureColor = getFeatureColor(cell);
          if (featureColor) {
            const featureSize = scaledCellWidth * 0.4;
            const featureX = screenX + scaledCellWidth * (0.3 + cell.variant * 0.4);
            const featureY = screenY + scaledCellHeight * (0.3 + cell.variant * 0.4);
            
            ctx.fillStyle = featureColor;
            if (cell.hasTree) {
              ctx.beginPath();
              ctx.arc(featureX, featureY, featureSize * 0.6, 0, Math.PI * 2);
              ctx.fill();
            } else if (cell.hasRock) {
              ctx.fillRect(featureX - featureSize * 0.3, featureY - featureSize * 0.2, featureSize * 0.6, featureSize * 0.4);
            } else if (cell.hasVegetation) {
              ctx.beginPath();
              ctx.arc(featureX, featureY, featureSize * 0.3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    // Draw rivers with improved rendering
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    terrain.rivers.forEach((point) => {
      if (point.x < viewLeft - 50 || point.x > viewRight + 50 || 
          point.y < viewTop - 50 || point.y > viewBottom + 50) return;
      
      const screenX = worldToScreenX(point.x, camera, width);
      const screenY = worldToScreenY(point.y, camera, height);
      const riverWidth = point.width * camera.zoom;
      
      const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, riverWidth * 0.7);
      gradient.addColorStop(0, `rgba(80, 140, 180, ${0.7 * point.depth})`);
      gradient.addColorStop(1, `rgba(60, 120, 160, ${0.4 * point.depth})`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, riverWidth * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw subtle grid at detailed level only
    if (lodLevel === "detailed" && scaledCellWidth > 20) {
      ctx.strokeStyle = "rgba(0,0,0,0.03)";
      ctx.lineWidth = 1;

      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const cell = terrain.cells[row]?.[col];
          if (!cell) continue;

          const screenX = worldToScreenX(cell.x - cellSize / 2, camera, width);
          const screenY = worldToScreenY(cell.y - cellSize / 2, camera, height);

          ctx.strokeRect(screenX, screenY, scaledCellWidth, scaledCellHeight);
        }
      }
    }
  }, [camera, terrain, canvasSize, lodLevel, isPlanetView]);

  // Smooth camera animation loop
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      
      // Cap delta to prevent jumps
      if (delta > 0 && delta < 100) {
        const updatedCamera = updateCamera(camera);
        const needsUpdate =
          Math.abs(updatedCamera.x - camera.x) > 0.01 ||
          Math.abs(updatedCamera.y - camera.y) > 0.01 ||
          Math.abs(updatedCamera.zoom - camera.zoom) > 0.0001 ||
          Math.abs(updatedCamera.rotation - camera.rotation) > 0.0001 ||
          Math.abs(updatedCamera.rotationVelocity) > 0.0001;
          
        if (needsUpdate) {
          onCameraChange(updatedCamera);
        }
      }
      
      lastTime = time;
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [camera, onCameraChange]);

  // Mouse wheel zoom with smooth transition
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newCamera = zoomCamera(
        camera,
        e.deltaY,
        mouseX,
        mouseY,
        canvasSize.width,
        canvasSize.height
      );
      onCameraChange(newCamera);
    },
    [camera, canvasSize, onCameraChange]
  );

  // Mouse drag pan/rotate
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setLastDragPos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Update building preview position
      if (isPlacingBuilding && placingBuildingType) {
        const worldX = screenToWorldX(localX, camera, canvasSize.width);
        const worldY = screenToWorldY(localY, camera, canvasSize.height);
        setBuildingPreviewPos({ x: worldX, y: worldY });
      }
      
      if (!isDragging) return;

      const dx = e.clientX - lastDragPos.x;
      const dy = e.clientY - lastDragPos.y;

      const newCamera = panCamera(camera, dx, dy);
      onCameraChange(newCamera);

      setLastDragPos({ x: e.clientX, y: e.clientY });
    },
    [isDragging, lastDragPos, camera, onCameraChange, isPlacingBuilding, placingBuildingType, canvasSize]
  );

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    
    // Handle building placement on click
    if (isPlacingBuilding && placingBuildingType && buildingPreviewPos && onPlaceBuilding && !isDragging) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const worldX = screenToWorldX(localX, camera, canvasSize.width);
      const worldY = screenToWorldY(localY, camera, canvasSize.height);
      
      // Check if valid position before placing
      const selectedTribe = tribes.find(t => t.id === selectedTribeId);
      if (selectedTribe) {
        const isValid = isValidBuildingPosition(
          worldX,
          worldY,
          placingBuildingType,
          buildings,
          { x: selectedTribe.centerX, y: selectedTribe.centerY, radius: selectedTribe.territoryRadius }
        );
        
        if (isValid) {
          onPlaceBuilding(worldX, worldY);
        }
      }
    }
  }, [isPlacingBuilding, placingBuildingType, buildingPreviewPos, onPlaceBuilding, camera, canvasSize, tribes, selectedTribeId, buildings, isDragging]);

  // Camera control handlers
  const handleZoomIn = useCallback(() => {
    const newCamera = zoomCamera(
      camera,
      -100,
      canvasSize.width / 2,
      canvasSize.height / 2,
      canvasSize.width,
      canvasSize.height
    );
    onCameraChange(newCamera);
  }, [camera, canvasSize, onCameraChange]);

  const handleZoomOut = useCallback(() => {
    const newCamera = zoomCamera(
      camera,
      100,
      canvasSize.width / 2,
      canvasSize.height / 2,
      canvasSize.width,
      canvasSize.height
    );
    onCameraChange(newCamera);
  }, [camera, canvasSize, onCameraChange]);

  const handleResetView = useCallback(() => {
    onCameraChange(resetCamera());
  }, [onCameraChange]);

  const handleFocusTribe = useCallback(
    (tribeId: number) => {
      const tribe = tribes.find((t) => t.id === tribeId);
      if (tribe) {
        onCameraChange(focusOn(camera, tribe.centerX, tribe.centerY, 1.2));
        onTribeClick?.(tribeId);
      }
    },
    [camera, tribes, onCameraChange, onTribeClick]
  );

  const handleStrategicView = useCallback(() => {
    onCameraChange(toPlanetView(camera));
  }, [camera, onCameraChange]);

  const handleRotateLeft = useCallback(() => {
    onCameraChange(rotateWorld(camera, -0.2));
  }, [camera, onCameraChange]);

  const handleRotateRight = useCallback(() => {
    onCameraChange(rotateWorld(camera, 0.2));
  }, [camera, onCameraChange]);

  const handleMiniMapNavigate = useCallback(
    (worldX: number, worldY: number) => {
      onCameraChange(focusOn(camera, worldX, worldY, Math.max(0.4, camera.zoom)));
    },
    [camera, onCameraChange]
  );

  // Get tribe color for a villager
  const getVillagerTribeColor = useCallback(
    (tribeId: number): string => {
      const tribe = tribes.find((t) => t.id === tribeId);
      return tribe?.color || "#666666";
    },
    [tribes]
  );

  // Visible entities filtering
  const visibleVillagers = useMemo(() => {
    if (isPlanetView) return [];
    return villagers.filter(
      (v) =>
        !v.isDead &&
        isInView(v.posX, v.posY, camera, canvasSize.width, canvasSize.height, 50)
    );
  }, [villagers, camera, canvasSize, isPlanetView]);

  const visibleResources = useMemo(() => {
    if (lodLevel === "strategic" || lodLevel === "planet") return [];
    return terrain.resources.filter((r) =>
      isInView(r.x, r.y, camera, canvasSize.width, canvasSize.height, 30)
    );
  }, [terrain.resources, camera, canvasSize, lodLevel]);

  // Transform helper for world to screen
  const toScreen = useCallback(
    (worldX: number, worldY: number) => ({
      x: worldToScreenX(worldX, camera, canvasSize.width),
      y: worldToScreenY(worldY, camera, canvasSize.height),
    }),
    [camera, canvasSize]
  );

  // Render villager based on LOD
  const renderVillager = (v: Villager) => {
    const pos = toScreen(v.posX, v.posY);
    const tribeColor = getVillagerTribeColor(v.tribeId);
    const isFromSelectedTribe = selectedTribeId === v.tribeId;
    const scale = Math.min(1.5, Math.max(0.4, camera.zoom));

    if (lodLevel === "strategic") {
      return (
        <motion.div
          key={v.id}
          className="absolute w-2 h-2 rounded-full cursor-pointer"
          initial={{ scale: 0 }}
          animate={{ 
            scale: 1,
            x: pos.x - 4,
            y: pos.y - 4,
          }}
          whileHover={{ scale: 1.5 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            backgroundColor: tribeColor,
            opacity: isFromSelectedTribe || !selectedTribeId ? 1 : 0.4,
            boxShadow: `0 0 6px ${tribeColor}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onVillagerClick(v);
            onTribeClick?.(v.tribeId);
          }}
        />
      );
    }

    if (lodLevel === "medium") {
      const actionInfo = ACTION_EMOJIS[v.action] || ACTION_EMOJIS.idle;
      return (
        <motion.div
          key={v.id}
          className="absolute cursor-pointer flex flex-col items-center group"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: scale,
            opacity: isFromSelectedTribe || !selectedTribeId ? 1 : 0.5,
            x: pos.x - 8 * scale,
            y: pos.y - 10 * scale,
          }}
          whileHover={{ scale: scale * 1.2 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={(e) => {
            e.stopPropagation();
            onVillagerClick(v);
          }}
        >
          <div className="text-xs mb-0.5 opacity-70">{actionInfo.emoji}</div>
          <div
            className={`w-4 h-4 rounded-full border-2 ${
              selectedVillagerId === v.id ? "ring-2 ring-yellow-400" : ""
            }`}
            style={{
              backgroundColor: v.skinColor,
              borderColor: tribeColor,
              boxShadow: `0 0 8px ${tribeColor}50`,
            }}
          />
        </motion.div>
      );
    }

    // Detailed: Full villager sprite
    return (
      <motion.div
        key={v.id}
        className={`absolute cursor-pointer flex flex-col items-center group z-10 ${
          isFromSelectedTribe ? "z-20" : "z-10"
        }`}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          x: pos.x - 12 * scale,
          y: pos.y - 16 * scale,
          opacity: isFromSelectedTribe || !selectedTribeId ? 1 : 0.5,
          scale: scale,
        }}
        exit={{ opacity: 0, scale: 0 }}
        whileHover={{ scale: scale * 1.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => {
          e.stopPropagation();
          onVillagerClick(v);
        }}
      >
        {/* Action Bubble */}
        {v.action !== "idle" && (
          <div className="absolute -top-8 bg-white/90 px-2 py-1 rounded text-[10px] font-retro border border-foreground/10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
            {ACTION_EMOJIS[v.action]?.emoji} {ACTION_EMOJIS[v.action]?.label}
          </div>
        )}

        {/* Selection Ring */}
        {selectedVillagerId === v.id && (
          <div className="absolute w-8 h-8 -bottom-1 border-2 border-accent rounded-full animate-ping opacity-75" />
        )}

        {/* Tribe Color Indicator Ring */}
        <div
          className="absolute w-7 h-9 -bottom-0.5 rounded-t-full opacity-30"
          style={{ backgroundColor: tribeColor }}
        />

        {/* Villager Sprite */}
        <div
          className={`w-6 h-8 relative shadow-sm transition-transform duration-75 ${
            selectedVillagerId === v.id
              ? "scale-110 drop-shadow-md"
              : "hover:scale-105"
          } ${v.action === "fleeing" ? "animate-bounce" : ""}`}
          style={{
            backgroundColor: v.action === "sleeping" ? "#999" : v.skinColor,
            borderRadius: "4px 4px 0 0",
          }}
        >
          <div
            className="absolute top-0 w-full h-3 rounded-t"
            style={{ backgroundColor: v.hairColor }}
          />
          <div className="absolute top-3 left-1 w-1 h-1 bg-black rounded-full" />
          <div className="absolute top-3 right-1 w-1 h-1 bg-black rounded-full" />
          <div
            className="absolute bottom-0 w-full h-3"
            style={{ backgroundColor: tribeColor }}
          />
          <div className="absolute -bottom-2 left-0 w-full h-1 bg-gray-300 rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                v.health < 30
                  ? "bg-red-500"
                  : v.health < 60
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${v.health}%` }}
            />
          </div>
          {v.action === "fleeing" && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs">
              😱
            </div>
          )}
        </div>

        {/* Name Tag */}
        <div
          className={`mt-1 text-[10px] font-bold font-retro px-1 rounded text-white ${
            selectedVillagerId === v.id
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
          style={{ backgroundColor: `${tribeColor}cc` }}
        >
          {v.name}
        </div>
      </motion.div>
    );
  };

  // Render tribe territory and info with hover effect
  const renderTribe = (tribe: Tribe) => {
    if (isPlanetView) return null;
    
    const centerPos = toScreen(tribe.centerX, tribe.centerY);
    const scaledRadius = tribe.territoryRadius * camera.zoom;
    const tribePop = villagers.filter(
      (v) => v.tribeId === tribe.id && !v.isDead
    ).length;
    const isHovered = hoveredTribe?.id === tribe.id;
    const isSelected = selectedTribeId === tribe.id;

    if (lodLevel === "strategic") {
      return (
        <motion.div 
          key={`tribe-${tribe.id}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Territory Circle with pulse effect */}
          <motion.div
            className="absolute rounded-full cursor-pointer"
            animate={{
              scale: isHovered ? 1.05 : 1,
              opacity: isSelected ? 0.5 : isHovered ? 0.4 : 0.25,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{
              left: centerPos.x - scaledRadius,
              top: centerPos.y - scaledRadius,
              width: scaledRadius * 2,
              height: scaledRadius * 2,
              backgroundColor: tribe.color,
              border: `3px solid ${tribe.color}`,
              boxShadow: isHovered ? `0 0 30px ${tribe.color}60` : `0 0 15px ${tribe.color}30`,
            }}
            onClick={() => onTribeClick?.(tribe.id)}
            onMouseEnter={() => setHoveredTribe(tribe)}
            onMouseLeave={() => setHoveredTribe(null)}
          />

          {/* Tribe Info Card - enhanced hover popup */}
          <AnimatePresence>
            {(isHovered || isSelected) && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-3 pointer-events-none z-50"
                style={{
                  left: centerPos.x - 80,
                  top: centerPos.y - 60,
                  minWidth: 160,
                  border: `2px solid ${tribe.color}`,
                }}
              >
                <div
                  className="font-pixel text-base font-bold text-center mb-2"
                  style={{ color: tribe.color }}
                >
                  {tribe.name}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">👥</span>
                    <span className="font-medium">{tribePop} people</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🍖</span>
                    <span className="font-medium">{Math.floor(tribe.food)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🪵</span>
                    <span className="font-medium">{Math.floor(tribe.wood)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🪨</span>
                    <span className="font-medium">{Math.floor(tribe.stone)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <span className="text-base">⚡</span>
                    <span className="font-medium">{Math.floor(tribe.techPoints)} tech</span>
                  </div>
                </div>
                {/* Status indicator */}
                <div className="mt-2 pt-2 border-t border-gray-200 text-center text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Thriving
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    // Medium/Detailed: Territory indicator with fire
    return (
      <div key={`tribe-${tribe.id}`}>
        {/* Territory Circle */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          animate={{
            opacity: isSelected ? 0.35 : 0.15,
            scale: isHovered ? 1.02 : 1,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{
            left: centerPos.x - scaledRadius,
            top: centerPos.y - scaledRadius,
            width: scaledRadius * 2,
            height: scaledRadius * 2,
            backgroundColor: tribe.color,
            border: `3px dashed ${tribe.color}`,
            boxShadow: `inset 0 0 50px ${tribe.color}20`,
          }}
        />

        {/* Village Fire with hover effect */}
        <motion.div
          className="absolute cursor-pointer group"
          style={{
            left: centerPos.x - 24 * camera.zoom,
            top: centerPos.y - 24 * camera.zoom,
            transform: `scale(${camera.zoom})`,
            transformOrigin: "center",
          }}
          whileHover={{ scale: camera.zoom * 1.15 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          onClick={() => onTribeClick?.(tribe.id)}
          onMouseEnter={() => setHoveredTribe(tribe)}
          onMouseLeave={() => setHoveredTribe(null)}
        >
          <div
            className="w-12 h-12 rounded-full animate-pulse blur-xl absolute"
            style={{ backgroundColor: `${tribe.color}40` }}
          />
          <div className="relative z-10 text-3xl text-center leading-[3rem]">
            🔥
          </div>
          <div
            className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-pixel px-2 py-0.5 rounded shadow-sm transition-all duration-200 ${
              isSelected || isHovered
                ? "opacity-100 scale-110"
                : "opacity-0 group-hover:opacity-100"
            }`}
            style={{
              backgroundColor: tribe.color,
              color: "white",
            }}
          >
            {tribe.name}
          </div>
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] font-bold"
            style={{ color: tribe.color }}
          >
            {tribePop}
          </div>
        </motion.div>

        {/* Detailed hover card in medium/detailed view */}
        <AnimatePresence>
          {isHovered && (lodLevel === "medium" || lodLevel === "detailed") && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-2 pointer-events-none z-50"
              style={{
                left: centerPos.x + 30,
                top: centerPos.y - 40,
                minWidth: 140,
                border: `2px solid ${tribe.color}`,
              }}
            >
              <div className="font-pixel text-sm font-bold mb-1" style={{ color: tribe.color }}>
                {tribe.name}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div>👥 {tribePop}</div>
                <div>🍖 {Math.floor(tribe.food)}</div>
                <div>🪵 {Math.floor(tribe.wood)}</div>
                <div>🪨 {Math.floor(tribe.stone)}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Render world event
  const renderWorldEvent = (event: WorldEvent) => {
    if (isPlanetView) return null;
    
    const pos = toScreen(event.posX, event.posY);
    const scaledRadius = event.radius * camera.zoom;

    if (!isInView(event.posX, event.posY, camera, canvasSize.width, canvasSize.height, event.radius)) {
      return null;
    }

    return (
      <motion.div
        key={event.id}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute pointer-events-none"
        style={{
          left: pos.x - scaledRadius,
          top: pos.y - scaledRadius,
          width: scaledRadius * 2,
          height: scaledRadius * 2,
        }}
      >
        <div
          className={`w-full h-full rounded-full animate-pulse ${
            event.type === "wildAnimal"
              ? "bg-red-500/20 border-2 border-red-500/40"
              : ""
          } ${
            event.type === "disease"
              ? "bg-green-900/20 border-2 border-green-900/40"
              : ""
          } ${
            event.type === "fire"
              ? "bg-orange-500/30 border-2 border-orange-500/50"
              : ""
          }`}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ fontSize: `${Math.max(16, 24 * camera.zoom)}px` }}
        >
          {event.type === "wildAnimal" && "🐺"}
          {event.type === "disease" && "☠️"}
          {event.type === "fire" && "🔥"}
        </div>
      </motion.div>
    );
  };

  // Render resource
  const renderResource = (resource: ResourceNode) => {
    const pos = toScreen(resource.x, resource.y);
    const scale = Math.min(1.2, Math.max(0.6, camera.zoom));
    const emoji = RESOURCE_EMOJIS[resource.type] || "📦";

    return (
      <motion.div
        key={`resource-${resource.id}`}
        className="absolute pointer-events-none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{
          left: pos.x - 10 * scale,
          top: pos.y - 10 * scale,
          fontSize: `${20 * scale}px`,
          opacity: lodLevel === "detailed" ? 1 : 0.7,
        }}
      >
        {emoji}
        {lodLevel === "detailed" && camera.zoom > 1.5 && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] bg-black/50 text-white px-1 rounded">
            {resource.amount}
          </div>
        )}
      </motion.div>
    );
  };

  // Get view mode label
  const getViewModeLabel = () => {
    if (isPlanetView) return "🌍 Planet View";
    if (lodLevel === "strategic") return "📍 Strategic View";
    if (lodLevel === "medium") return "🗺️ Regional View";
    return "🔍 Detailed View";
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] overflow-hidden rounded-xl border-4 border-[#8b7355] shadow-inner select-none"
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        background: isPlanetView ? "#0a0a15" : "#2d4a3e",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Planet View Canvas */}
      <canvas
        ref={planetCanvasRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
          isPlanetView ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Terrain Canvas */}
      <canvas
        ref={terrainCanvasRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
          isPlanetView ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      />

      {/* World Boundary Indicator (not in planet view) */}
      {!isPlanetView && (
        <motion.div
          className="absolute border-4 border-dashed border-yellow-600/30 pointer-events-none"
          animate={{
            left: worldToScreenX(0, camera, canvasSize.width),
            top: worldToScreenY(0, camera, canvasSize.height),
            width: WORLD_WIDTH * camera.zoom,
            height: WORLD_HEIGHT * camera.zoom,
          }}
          transition={{ type: "tween", duration: 0.05 }}
        />
      )}

      {/* Resources Layer */}
      {visibleResources.map(renderResource)}

      {/* Buildings Layer */}
      {!isPlanetView && buildings.map((building) => {
        const screenX = worldToScreenX(building.posX, camera, canvasSize.width);
        const screenY = worldToScreenY(building.posY, camera, canvasSize.height);
        const def = BUILDING_DEFINITIONS[building.type];
        const scale = Math.min(1.5, Math.max(0.3, camera.zoom));
        const size = Math.max(def.size.width, def.size.height) * scale;
        
        // Check if visible
        if (screenX < -size || screenX > canvasSize.width + size ||
            screenY < -size || screenY > canvasSize.height + size) {
          return null;
        }
        
        const isUnderConstruction = !building.isComplete;
        const tribe = tribes.find(t => t.id === building.tribeId);
        
        return (
          <motion.div
            key={`building-${building.id}`}
            className="absolute"
            style={{
              left: screenX - size / 2,
              top: screenY - size / 2,
              width: size,
              height: size,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: isUnderConstruction ? 0.7 : 1,
            }}
          >
            {/* Building base */}
            <div 
              className={`
                w-full h-full rounded-lg flex items-center justify-center
                ${isUnderConstruction ? 'border-2 border-dashed animate-pulse' : 'shadow-md'}
              `}
              style={{
                backgroundColor: isUnderConstruction ? `${tribe?.color || '#666'}40` : `${tribe?.color || '#666'}80`,
                borderColor: tribe?.color || '#666',
              }}
            >
              <span 
                style={{ fontSize: size * 0.5 }}
                className={isUnderConstruction ? 'opacity-50' : ''}
              >
                {def.emoji}
              </span>
            </div>
            
            {/* Construction progress bar */}
            {isUnderConstruction && (
              <div className="absolute -bottom-2 left-0 right-0 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${building.constructionProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
            
            {/* Workers indicator */}
            {isUnderConstruction && building.workersAssigned.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-primary text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">
                {building.workersAssigned.length}
              </div>
            )}
            
            {/* Building name on hover (detailed view only) */}
            {lodLevel === 'detailed' && (
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] bg-black/70 text-white px-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                {def.name} {isUnderConstruction && `(${Math.floor(building.constructionProgress)}%)`}
              </div>
            )}
          </motion.div>
        );
      })}
      
      {/* Construction Particles */}
      {!isPlanetView && constructionParticles.map((particle) => {
        const screenX = worldToScreenX(particle.x, camera, canvasSize.width);
        const screenY = worldToScreenY(particle.y, camera, canvasSize.height);
        
        return (
          <motion.div
            key={particle.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: screenX,
              top: screenY,
              width: particle.size * camera.zoom,
              height: particle.size * camera.zoom,
              backgroundColor: particle.color,
              opacity: particle.life,
            }}
          />
        );
      })}
      
      {/* Building Placement Preview */}
      {isPlacingBuilding && placingBuildingType && buildingPreviewPos && !isPlanetView && (
        (() => {
          const screenX = worldToScreenX(buildingPreviewPos.x, camera, canvasSize.width);
          const screenY = worldToScreenY(buildingPreviewPos.y, camera, canvasSize.height);
          const def = BUILDING_DEFINITIONS[placingBuildingType];
          const scale = Math.min(1.5, Math.max(0.3, camera.zoom));
          const size = Math.max(def.size.width, def.size.height) * scale;
          
          const selectedTribe = tribes.find(t => t.id === selectedTribeId);
          const isValid = selectedTribe ? isValidBuildingPosition(
            buildingPreviewPos.x,
            buildingPreviewPos.y,
            placingBuildingType,
            buildings,
            { x: selectedTribe.centerX, y: selectedTribe.centerY, radius: selectedTribe.territoryRadius }
          ) : false;
          
          return (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                left: screenX - size / 2,
                top: screenY - size / 2,
                width: size,
                height: size,
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
            >
              <div 
                className={`
                  w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center
                  ${isValid ? 'border-green-500 bg-green-500/30' : 'border-red-500 bg-red-500/30'}
                `}
              >
                <span style={{ fontSize: size * 0.5 }}>{def.emoji}</span>
              </div>
              <div className={`
                absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs whitespace-nowrap
                ${isValid ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
              `}>
                {isValid ? 'Click to place' : 'Invalid position'}
              </div>
            </motion.div>
          );
        })()
      )}

      {/* Tribe Territories */}
      {tribes.map(renderTribe)}

      {/* World Events (Dangers) */}
      <AnimatePresence>
        {worldEvents.map(renderWorldEvent)}
      </AnimatePresence>

      {/* Villagers Layer */}
      <AnimatePresence>
        {visibleVillagers.map(renderVillager)}
      </AnimatePresence>

      {/* Planet View Tribe Labels */}
      {isPlanetView && (
        <div className="absolute inset-0 pointer-events-none">
          {tribes.map((tribe) => {
            const normalizedX = (tribe.centerX / WORLD_WIDTH - 0.5) * 2;
            const normalizedY = (tribe.centerY / WORLD_HEIGHT - 0.5) * 2;
            const rotatedX = normalizedX * Math.cos(camera.rotation) - normalizedY * Math.sin(camera.rotation) * 0.2;
            const rotatedY = normalizedY;
            const dist = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
            
            if (dist > 0.85) return null;
            
            const radius = Math.min(canvasSize.width, canvasSize.height) * 0.38;
            const centerX = canvasSize.width / 2;
            const centerY = canvasSize.height / 2;
            const projX = centerX + rotatedX * radius;
            const projY = centerY + rotatedY * radius;
            const z = Math.sqrt(1 - Math.min(1, dist * dist));
            
            return (
              <motion.div
                key={`planet-tribe-${tribe.id}`}
                className="absolute pointer-events-auto cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: z > 0.3 ? 1 : 0,
                  x: projX - 40,
                  y: projY + 15,
                }}
                whileHover={{ scale: 1.1 }}
                onClick={() => handleFocusTribe(tribe.id)}
                style={{ zIndex: Math.floor(z * 100) }}
              >
                <div 
                  className="px-2 py-1 rounded-lg text-white text-xs font-pixel whitespace-nowrap shadow-lg"
                  style={{ 
                    backgroundColor: `${tribe.color}dd`,
                    transform: `scale(${0.7 + z * 0.3})`,
                  }}
                >
                  {tribe.name}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Map Legend */}
      {!isPlanetView && (
        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg p-2 text-[10px] shadow-sm">
          <div className="font-bold mb-1 text-muted-foreground">LEGEND</div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">🔥 Tribe Center</div>
            <div className="flex items-center gap-1">🌲 Forest</div>
            <div className="flex items-center gap-1">🪨 Quarry</div>
            <div className="flex items-center gap-1">🐺 Danger</div>
          </div>
        </div>
      )}

      {/* View Mode Indicator */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2">
        <span>{getViewModeLabel()}</span>
        <span className="opacity-70">|</span>
        <span className="opacity-70">{getZoomPercentage(camera.zoom)}%</span>
      </div>

      {/* Planet View Rotation Controls */}
      {isPlanetView && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRotateLeft}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            ↺
          </motion.button>
          <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs">
            Drag to rotate
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRotateRight}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            ↻
          </motion.button>
        </div>
      )}

      {/* Planet View Instructions */}
      {isPlanetView && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm text-white/80 px-3 py-2 rounded-lg text-xs max-w-[200px]"
        >
          <div className="font-bold mb-1">🌍 Planet View</div>
          <div className="opacity-70 space-y-1">
            <div>• Scroll to zoom in</div>
            <div>• Click tribe to focus</div>
            <div>• Drag to rotate</div>
          </div>
        </motion.div>
      )}

      {/* Camera Controls */}
      <CameraControls
        camera={camera}
        tribes={tribes}
        selectedTribeId={selectedTribeId ?? null}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onFocusTribe={handleFocusTribe}
        onStrategicView={handleStrategicView}
      />

      {/* Mini Map (not in planet view) */}
      {!isPlanetView && (
        <MiniMap
          camera={camera}
          tribes={tribes}
          villagers={villagers}
          worldEvents={worldEvents}
          terrain={terrain}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          onNavigate={handleMiniMapNavigate}
        />
      )}
    </div>
  );
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
