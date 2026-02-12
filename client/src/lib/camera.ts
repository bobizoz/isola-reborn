/**
 * Enhanced Camera System for ISOLA: REBORN
 * Handles zoom, pan, rotation, and smooth transitions
 * Supports planet view with globe effect at extreme zoom-out
 */

export interface CameraState {
  x: number;           // Camera center X in world coords
  y: number;           // Camera center Y in world coords
  zoom: number;        // Zoom level (0.05 = planet view, 3 = detailed view)
  targetX: number;     // Target for smooth transitions
  targetY: number;
  targetZoom: number;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  // Planet view rotation
  rotation: number;    // World rotation in radians
  targetRotation: number;
  rotationVelocity: number; // For momentum-based rotation
  // View mode
  isPlanetView: boolean; // True when in globe mode
}

export const WORLD_WIDTH = 3200;   // Total world width
export const WORLD_HEIGHT = 2400;  // Total world height

// Enhanced zoom range for planet view
export const MIN_ZOOM = 0.05;      // Planet view - see entire world as globe
export const MAX_ZOOM = 3;         // Detailed view - see individual villagers
export const DEFAULT_ZOOM = 0.8;   // Default zoom
export const PLANET_VIEW_THRESHOLD = 0.12; // Below this = planet/globe view

export const ZOOM_SPEED = 0.08;     // Reduced for smoother zoom
export const PAN_LERP = 0.12;       // Smooth panning factor
export const ZOOM_LERP = 0.08;      // Smoother zoom factor for cinematic feel
export const ROTATION_LERP = 0.1;   // Rotation smoothness
export const ROTATION_DECAY = 0.95; // Momentum decay for rotation

// Zoom level thresholds for LOD
export const ZOOM_PLANET = 0.12;   // Planet view
export const ZOOM_STRATEGIC = 0.25; // Strategic view
export const ZOOM_MEDIUM = 0.5;     // Medium detail
export const ZOOM_DETAILED = 1.0;   // Full detail

export function createCamera(): CameraState {
  return {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    zoom: DEFAULT_ZOOM,
    targetX: WORLD_WIDTH / 2,
    targetY: WORLD_HEIGHT / 2,
    targetZoom: DEFAULT_ZOOM,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    rotation: 0,
    targetRotation: 0,
    rotationVelocity: 0,
    isPlanetView: false,
  };
}

export function updateCamera(camera: CameraState): CameraState {
  // Smooth interpolation towards target with easing
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  
  const panLerp = PAN_LERP * (camera.zoom < PLANET_VIEW_THRESHOLD ? 0.5 : 1);
  const zoomLerp = ZOOM_LERP;
  
  const newX = camera.x + (camera.targetX - camera.x) * panLerp;
  const newY = camera.y + (camera.targetY - camera.y) * panLerp;
  const newZoom = camera.zoom + (camera.targetZoom - camera.zoom) * zoomLerp;
  
  // Smooth rotation with momentum
  let newRotation = camera.rotation;
  let newRotationVelocity = camera.rotationVelocity;
  
  if (Math.abs(camera.targetRotation - camera.rotation) > 0.001) {
    newRotation = camera.rotation + (camera.targetRotation - camera.rotation) * ROTATION_LERP;
  }
  
  // Apply rotation momentum
  if (Math.abs(newRotationVelocity) > 0.001) {
    newRotation += newRotationVelocity;
    newRotationVelocity *= ROTATION_DECAY;
  }

  // Clamp position based on zoom (less restrictive in planet view)
  const isPlanetView = newZoom < PLANET_VIEW_THRESHOLD;
  
  let clampedX = newX;
  let clampedY = newY;
  
  if (!isPlanetView) {
    const halfViewWidth = (WORLD_WIDTH / newZoom) / 2;
    const halfViewHeight = (WORLD_HEIGHT / newZoom) / 2;
    clampedX = Math.max(halfViewWidth * 0.3, Math.min(WORLD_WIDTH - halfViewWidth * 0.3, newX));
    clampedY = Math.max(halfViewHeight * 0.3, Math.min(WORLD_HEIGHT - halfViewHeight * 0.3, newY));
  } else {
    // In planet view, center on world
    clampedX = WORLD_WIDTH / 2;
    clampedY = WORLD_HEIGHT / 2;
  }

  return {
    ...camera,
    x: clampedX,
    y: clampedY,
    zoom: newZoom,
    rotation: newRotation,
    rotationVelocity: newRotationVelocity,
    isPlanetView,
  };
}

export function zoomCamera(
  camera: CameraState, 
  delta: number, 
  mouseX: number, 
  mouseY: number, 
  canvasWidth: number, 
  canvasHeight: number
): CameraState {
  // Variable zoom speed based on current zoom level for smoother feel
  const zoomFactor = camera.targetZoom < 0.2 ? ZOOM_SPEED * 0.5 : ZOOM_SPEED;
  const zoomDelta = delta > 0 ? -zoomFactor : zoomFactor;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.targetZoom * (1 + zoomDelta)));
  
  // Zoom towards mouse position (disabled in planet view)
  if (newZoom !== camera.targetZoom && newZoom >= PLANET_VIEW_THRESHOLD) {
    const worldX = screenToWorldX(mouseX, camera, canvasWidth);
    const worldY = screenToWorldY(mouseY, camera, canvasHeight);
    
    const zoomRatio = newZoom / camera.targetZoom;
    const newTargetX = worldX - (worldX - camera.targetX) * zoomRatio;
    const newTargetY = worldY - (worldY - camera.targetY) * zoomRatio;
    
    return {
      ...camera,
      targetX: newTargetX,
      targetY: newTargetY,
      targetZoom: newZoom,
    };
  }
  
  // Planet view - zoom but center on world
  if (newZoom < PLANET_VIEW_THRESHOLD) {
    return {
      ...camera,
      targetX: WORLD_WIDTH / 2,
      targetY: WORLD_HEIGHT / 2,
      targetZoom: newZoom,
    };
  }
  
  return {
    ...camera,
    targetZoom: newZoom,
  };
}

export function panCamera(camera: CameraState, dx: number, dy: number): CameraState {
  // In planet view, panning rotates instead
  if (camera.zoom < PLANET_VIEW_THRESHOLD) {
    return {
      ...camera,
      rotationVelocity: dx * 0.002, // Convert drag to rotation
      targetRotation: camera.targetRotation + dx * 0.005,
    };
  }
  
  return {
    ...camera,
    targetX: camera.targetX - dx / camera.zoom,
    targetY: camera.targetY - dy / camera.zoom,
  };
}

export function rotateWorld(camera: CameraState, deltaRotation: number): CameraState {
  return {
    ...camera,
    targetRotation: camera.targetRotation + deltaRotation,
    rotationVelocity: deltaRotation * 0.5,
  };
}

export function focusOn(camera: CameraState, worldX: number, worldY: number, zoom?: number): CameraState {
  const targetZoom = zoom ?? camera.targetZoom;
  return {
    ...camera,
    targetX: worldX,
    targetY: worldY,
    targetZoom: Math.max(PLANET_VIEW_THRESHOLD, targetZoom), // Don't focus in planet view
  };
}

export function toPlanetView(camera: CameraState): CameraState {
  return {
    ...camera,
    targetX: WORLD_WIDTH / 2,
    targetY: WORLD_HEIGHT / 2,
    targetZoom: MIN_ZOOM + 0.02,
    targetRotation: 0,
  };
}

export function resetCamera(): CameraState {
  return createCamera();
}

// Coordinate conversion utilities
export function screenToWorldX(screenX: number, camera: CameraState, canvasWidth: number): number {
  return camera.x + (screenX - canvasWidth / 2) / camera.zoom;
}

export function screenToWorldY(screenY: number, camera: CameraState, canvasHeight: number): number {
  return camera.y + (screenY - canvasHeight / 2) / camera.zoom;
}

export function worldToScreenX(worldX: number, camera: CameraState, canvasWidth: number): number {
  return (worldX - camera.x) * camera.zoom + canvasWidth / 2;
}

export function worldToScreenY(worldY: number, camera: CameraState, canvasHeight: number): number {
  return (worldY - camera.y) * camera.zoom + canvasHeight / 2;
}

export function getViewBounds(camera: CameraState, canvasWidth: number, canvasHeight: number) {
  const halfViewWidth = canvasWidth / camera.zoom / 2;
  const halfViewHeight = canvasHeight / camera.zoom / 2;
  
  return {
    left: camera.x - halfViewWidth,
    right: camera.x + halfViewWidth,
    top: camera.y - halfViewHeight,
    bottom: camera.y + halfViewHeight,
  };
}

export function isInView(
  x: number, 
  y: number, 
  camera: CameraState, 
  canvasWidth: number, 
  canvasHeight: number, 
  padding: number = 50
): boolean {
  // Everything is in view in planet mode
  if (camera.zoom < PLANET_VIEW_THRESHOLD) return true;
  
  const bounds = getViewBounds(camera, canvasWidth, canvasHeight);
  return x >= bounds.left - padding && x <= bounds.right + padding &&
         y >= bounds.top - padding && y <= bounds.bottom + padding;
}

// Get the LOD level based on zoom
export type LODLevel = 'planet' | 'strategic' | 'medium' | 'detailed';

export function getLODLevel(zoom: number): LODLevel {
  if (zoom < ZOOM_PLANET) return 'planet';
  if (zoom < ZOOM_STRATEGIC) return 'strategic';
  if (zoom < ZOOM_MEDIUM) return 'medium';
  return 'detailed';
}

// Calculate planet sphere distortion for a point
export function applyPlanetDistortion(
  x: number, 
  y: number, 
  centerX: number, 
  centerY: number, 
  radius: number,
  rotation: number = 0
): { x: number; y: number; scale: number; visible: boolean } {
  // Normalize to -1 to 1
  const nx = ((x - centerX) / radius);
  const ny = ((y - centerY) / radius);
  
  // Apply rotation
  const rotatedNx = nx * Math.cos(rotation) - ny * Math.sin(rotation) * 0.3;
  const rotatedNy = ny;
  
  // Check if point is on visible hemisphere
  const distFromCenter = Math.sqrt(rotatedNx * rotatedNx + rotatedNy * rotatedNy);
  if (distFromCenter > 1) {
    return { x, y, scale: 0, visible: false };
  }
  
  // Calculate z depth (sphere surface)
  const z = Math.sqrt(Math.max(0, 1 - rotatedNx * rotatedNx - rotatedNy * rotatedNy));
  
  // Apply spherical projection
  const projectedX = centerX + rotatedNx * radius * 0.95;
  const projectedY = centerY + rotatedNy * radius * 0.95;
  
  // Scale based on depth (further = smaller)
  const scale = 0.5 + z * 0.5;
  
  return { 
    x: projectedX, 
    y: projectedY, 
    scale, 
    visible: z > 0.1 
  };
}

// Get zoom percentage for display
export function getZoomPercentage(zoom: number): number {
  return Math.round(zoom * 100);
}
