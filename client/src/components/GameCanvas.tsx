/**
 * Enhanced GameCanvas with Dynamic Zoom and LOD System
 * ISOLA: REBORN - World Visualization System
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
  updateCamera,
  focusOn,
  resetCamera,
  createCamera,
  MIN_ZOOM,
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

interface GameCanvasProps {
  villagers: Villager[];
  tribes: Tribe[];
  worldEvents: WorldEvent[];
  terrain: WorldTerrain;
  onVillagerClick: (villager: Villager) => void;
  selectedVillagerId?: number;
  selectedTribeId?: number;
  onTribeClick?: (tribeId: number) => void;
  camera: CameraState;
  onCameraChange: (camera: CameraState) => void;
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

// Terrain type to emoji (for medium detail)
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
  onVillagerClick,
  selectedVillagerId,
  selectedTribeId,
  onTribeClick,
  camera,
  onCameraChange,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terrainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastDragPos, setLastDragPos] = useState({ x: 0, y: 0 });

  // Get current LOD level
  const lodLevel = getLODLevel(camera.zoom);

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

  // Draw terrain on canvas - optimized for larger world
  useEffect(() => {
    const canvas = terrainCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasSize;
    canvas.width = width;
    canvas.height = height;

    // Clear with water base color
    ctx.fillStyle = "#1a3a4a";
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
        
        // Draw terrain features (trees, rocks, vegetation) at medium+ detail
        if (lodLevel !== "strategic" && scaledCellWidth > 10) {
          const featureColor = getFeatureColor(cell);
          if (featureColor) {
            const featureSize = scaledCellWidth * 0.4;
            const featureX = screenX + scaledCellWidth * (0.3 + cell.variant * 0.4);
            const featureY = screenY + scaledCellHeight * (0.3 + cell.variant * 0.4);
            
            ctx.fillStyle = featureColor;
            if (cell.hasTree) {
              // Draw simple tree shape
              ctx.beginPath();
              ctx.arc(featureX, featureY, featureSize * 0.6, 0, Math.PI * 2);
              ctx.fill();
            } else if (cell.hasRock) {
              // Draw rock shape
              ctx.fillRect(featureX - featureSize * 0.3, featureY - featureSize * 0.2, featureSize * 0.6, featureSize * 0.4);
            } else if (cell.hasVegetation) {
              // Draw small vegetation dots
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
      
      // River gradient effect
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
  }, [camera, terrain, canvasSize, lodLevel]);

  // Camera animation loop
  useEffect(() => {
    let animationFrame: number;

    const animate = () => {
      const updatedCamera = updateCamera(camera);
      if (
        Math.abs(updatedCamera.x - camera.x) > 0.1 ||
        Math.abs(updatedCamera.y - camera.y) > 0.1 ||
        Math.abs(updatedCamera.zoom - camera.zoom) > 0.001
      ) {
        onCameraChange(updatedCamera);
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [camera, onCameraChange]);

  // Mouse wheel zoom
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

  // Mouse drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setLastDragPos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - lastDragPos.x;
      const dy = e.clientY - lastDragPos.y;

      const newCamera = panCamera(camera, dx, dy);
      onCameraChange(newCamera);

      setLastDragPos({ x: e.clientX, y: e.clientY });
    },
    [isDragging, lastDragPos, camera, onCameraChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
    onCameraChange(
      focusOn(camera, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, MIN_ZOOM)
    );
  }, [camera, onCameraChange]);

  const handleMiniMapNavigate = useCallback(
    (worldX: number, worldY: number) => {
      onCameraChange(focusOn(camera, worldX, worldY));
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
    return villagers.filter(
      (v) =>
        !v.isDead &&
        isInView(v.posX, v.posY, camera, canvasSize.width, canvasSize.height, 50)
    );
  }, [villagers, camera, canvasSize]);

  const visibleResources = useMemo(() => {
    if (lodLevel === "strategic") return [];
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
      // Strategic: Just colored dots
      return (
        <div
          key={v.id}
          className="absolute w-2 h-2 rounded-full cursor-pointer transition-transform hover:scale-150"
          style={{
            left: pos.x - 4,
            top: pos.y - 4,
            backgroundColor: tribeColor,
            opacity: isFromSelectedTribe || !selectedTribeId ? 1 : 0.4,
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
      // Medium: Colored dots with action indicator
      const actionInfo = ACTION_EMOJIS[v.action] || ACTION_EMOJIS.idle;
      return (
        <div
          key={v.id}
          className="absolute cursor-pointer flex flex-col items-center group"
          style={{
            left: pos.x - 8 * scale,
            top: pos.y - 10 * scale,
            transform: `scale(${scale})`,
            transformOrigin: "center",
            opacity: isFromSelectedTribe || !selectedTribeId ? 1 : 0.5,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onVillagerClick(v);
          }}
        >
          {/* Action emoji above */}
          <div className="text-xs mb-0.5 opacity-70">{actionInfo.emoji}</div>
          {/* Villager dot */}
          <div
            className={`w-4 h-4 rounded-full border-2 ${
              selectedVillagerId === v.id ? "ring-2 ring-yellow-400" : ""
            }`}
            style={{
              backgroundColor: v.skinColor,
              borderColor: tribeColor,
            }}
          />
        </div>
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
        transition={{ type: "tween", ease: "linear", duration: 0.1 }}
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
          {/* Hair */}
          <div
            className="absolute top-0 w-full h-3 rounded-t"
            style={{ backgroundColor: v.hairColor }}
          />

          {/* Eyes */}
          <div className="absolute top-3 left-1 w-1 h-1 bg-black rounded-full" />
          <div className="absolute top-3 right-1 w-1 h-1 bg-black rounded-full" />

          {/* Clothes with tribe color */}
          <div
            className="absolute bottom-0 w-full h-3"
            style={{ backgroundColor: tribeColor }}
          />

          {/* Health Bar (Mini) */}
          <div className="absolute -bottom-2 left-0 w-full h-1 bg-gray-300 rounded overflow-hidden">
            <div
              className={`h-full ${
                v.health < 30
                  ? "bg-red-500"
                  : v.health < 60
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${v.health}%` }}
            />
          </div>

          {/* Fleeing indicator */}
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

  // Render tribe territory and info
  const renderTribe = (tribe: Tribe) => {
    const centerPos = toScreen(tribe.centerX, tribe.centerY);
    const scaledRadius = tribe.territoryRadius * camera.zoom;
    const tribePop = villagers.filter(
      (v) => v.tribeId === tribe.id && !v.isDead
    ).length;

    if (lodLevel === "strategic") {
      // Strategic view: Large territory circles with detailed info
      return (
        <div key={`tribe-${tribe.id}`}>
          {/* Territory Circle */}
          <div
            className={`absolute rounded-full transition-all duration-300 cursor-pointer ${
              selectedTribeId === tribe.id ? "opacity-50" : "opacity-30"
            }`}
            style={{
              left: centerPos.x - scaledRadius,
              top: centerPos.y - scaledRadius,
              width: scaledRadius * 2,
              height: scaledRadius * 2,
              backgroundColor: tribe.color,
              border: `3px solid ${tribe.color}`,
            }}
            onClick={() => onTribeClick?.(tribe.id)}
          />

          {/* Tribe Info Card */}
          <div
            className="absolute bg-white/95 rounded-lg shadow-lg p-2 pointer-events-none"
            style={{
              left: centerPos.x - 60,
              top: centerPos.y - 30,
              minWidth: 120,
            }}
          >
            <div
              className="font-pixel text-sm font-bold text-center mb-1"
              style={{ color: tribe.color }}
            >
              {tribe.name}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              <div className="flex items-center gap-1">
                <span>👥</span>
                <span>{tribePop}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🍖</span>
                <span>{Math.floor(tribe.food)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🪵</span>
                <span>{Math.floor(tribe.wood)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🪨</span>
                <span>{Math.floor(tribe.stone)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Medium/Detailed: Territory indicator with fire
    return (
      <div key={`tribe-${tribe.id}`}>
        {/* Territory Circle */}
        <div
          className={`absolute rounded-full transition-all duration-500 pointer-events-none ${
            selectedTribeId === tribe.id ? "opacity-40" : "opacity-15"
          }`}
          style={{
            left: centerPos.x - scaledRadius,
            top: centerPos.y - scaledRadius,
            width: scaledRadius * 2,
            height: scaledRadius * 2,
            backgroundColor: tribe.color,
            border: `3px dashed ${tribe.color}`,
          }}
        />

        {/* Village Fire */}
        <div
          className="absolute cursor-pointer group"
          style={{
            left: centerPos.x - 24 * camera.zoom,
            top: centerPos.y - 24 * camera.zoom,
            transform: `scale(${camera.zoom})`,
            transformOrigin: "center",
          }}
          onClick={() => onTribeClick?.(tribe.id)}
        >
          {/* Glow effect */}
          <div
            className="w-12 h-12 rounded-full animate-pulse blur-xl absolute"
            style={{ backgroundColor: `${tribe.color}40` }}
          />
          {/* Fire emoji */}
          <div className="relative z-10 text-3xl text-center leading-[3rem]">
            🔥
          </div>
          {/* Tribe name label */}
          <div
            className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-pixel px-2 py-0.5 rounded shadow-sm transition-opacity duration-200 ${
              selectedTribeId === tribe.id
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
            style={{
              backgroundColor: tribe.color,
              color: "white",
            }}
          >
            {tribe.name}
          </div>
          {/* Population badge */}
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] font-bold"
            style={{ color: tribe.color }}
          >
            {tribePop}
          </div>
        </div>
      </div>
    );
  };

  // Render world event
  const renderWorldEvent = (event: WorldEvent) => {
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
        className="absolute pointer-events-none"
        style={{
          left: pos.x - scaledRadius,
          top: pos.y - scaledRadius,
          width: scaledRadius * 2,
          height: scaledRadius * 2,
        }}
      >
        {/* Danger zone */}
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
        {/* Event icon */}
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
      <div
        key={`resource-${resource.id}`}
        className="absolute pointer-events-none transition-transform"
        style={{
          left: pos.x - 10 * scale,
          top: pos.y - 10 * scale,
          fontSize: `${20 * scale}px`,
          opacity: lodLevel === "detailed" ? 1 : 0.7,
        }}
      >
        {emoji}
        {/* Amount indicator at detailed level */}
        {lodLevel === "detailed" && camera.zoom > 1.5 && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] bg-black/50 text-white px-1 rounded">
            {resource.amount}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] overflow-hidden rounded-xl border-4 border-[#8b7355] shadow-inner select-none"
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        background: "#2d4a3e", // Base color for water areas
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Terrain Canvas */}
      <canvas
        ref={terrainCanvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* World Boundary Indicator */}
      <div
        className="absolute border-4 border-dashed border-yellow-600/30 pointer-events-none"
        style={{
          left: worldToScreenX(0, camera, canvasSize.width),
          top: worldToScreenY(0, camera, canvasSize.height),
          width: WORLD_WIDTH * camera.zoom,
          height: WORLD_HEIGHT * camera.zoom,
        }}
      />

      {/* Resources Layer */}
      {visibleResources.map(renderResource)}

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

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/80 rounded-lg p-2 text-[10px] shadow-sm">
        <div className="font-bold mb-1 text-muted-foreground">LEGEND</div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">🔥 Tribe Center</div>
          <div className="flex items-center gap-1">🌲 Forest</div>
          <div className="flex items-center gap-1">🪨 Quarry</div>
          <div className="flex items-center gap-1">🐺 Danger</div>
        </div>
      </div>

      {/* LOD Indicator */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-[10px] font-mono">
        {lodLevel === "strategic" && "📍 Strategic View"}
        {lodLevel === "medium" && "🗺️ Regional View"}
        {lodLevel === "detailed" && "🔍 Detailed View"}
        <span className="ml-2 opacity-70">{Math.round(camera.zoom * 100)}%</span>
      </div>

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

      {/* Mini Map */}
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
    </div>
  );
}
