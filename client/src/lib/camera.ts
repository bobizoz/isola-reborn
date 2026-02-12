/**
 * Camera System for ISOLA: REBORN
 * Handles zoom, pan, and smooth transitions
 */

export interface CameraState {
  x: number;           // Camera center X in world coords
  y: number;           // Camera center Y in world coords
  zoom: number;        // Zoom level (0.25 = fully zoomed out, 4 = fully zoomed in)
  targetX: number;     // Target for smooth transitions
  targetY: number;
  targetZoom: number;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
}

export const WORLD_WIDTH = 1600;   // Total world width
export const WORLD_HEIGHT = 1200;  // Total world height
export const MIN_ZOOM = 0.25;      // Strategic view - see entire world
export const MAX_ZOOM = 3;         // Detailed view - see individual villagers
export const DEFAULT_ZOOM = 1;
export const ZOOM_SPEED = 0.1;
export const PAN_LERP = 0.15;      // Smooth panning factor
export const ZOOM_LERP = 0.12;     // Smooth zoom factor

// Zoom level thresholds for LOD
export const ZOOM_STRATEGIC = 0.4;  // Below this = strategic view
export const ZOOM_MEDIUM = 0.8;     // Below this = medium detail
export const ZOOM_DETAILED = 1.5;   // Above this = full detail

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
  };
}

export function updateCamera(camera: CameraState): CameraState {
  // Smooth interpolation towards target
  const newX = camera.x + (camera.targetX - camera.x) * PAN_LERP;
  const newY = camera.y + (camera.targetY - camera.y) * PAN_LERP;
  const newZoom = camera.zoom + (camera.targetZoom - camera.zoom) * ZOOM_LERP;

  // Clamp position based on zoom
  const halfViewWidth = (WORLD_WIDTH / newZoom) / 2;
  const halfViewHeight = (WORLD_HEIGHT / newZoom) / 2;
  
  const clampedX = Math.max(halfViewWidth * 0.5, Math.min(WORLD_WIDTH - halfViewWidth * 0.5, newX));
  const clampedY = Math.max(halfViewHeight * 0.5, Math.min(WORLD_HEIGHT - halfViewHeight * 0.5, newY));

  return {
    ...camera,
    x: clampedX,
    y: clampedY,
    zoom: newZoom,
  };
}

export function zoomCamera(camera: CameraState, delta: number, mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number): CameraState {
  const zoomDelta = delta > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.targetZoom + zoomDelta));
  
  // Zoom towards mouse position
  if (newZoom !== camera.targetZoom) {
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
  
  return camera;
}

export function panCamera(camera: CameraState, dx: number, dy: number): CameraState {
  return {
    ...camera,
    targetX: camera.targetX - dx / camera.zoom,
    targetY: camera.targetY - dy / camera.zoom,
  };
}

export function focusOn(camera: CameraState, worldX: number, worldY: number, zoom?: number): CameraState {
  return {
    ...camera,
    targetX: worldX,
    targetY: worldY,
    targetZoom: zoom ?? camera.targetZoom,
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

export function isInView(x: number, y: number, camera: CameraState, canvasWidth: number, canvasHeight: number, padding: number = 50): boolean {
  const bounds = getViewBounds(camera, canvasWidth, canvasHeight);
  return x >= bounds.left - padding && x <= bounds.right + padding &&
         y >= bounds.top - padding && y <= bounds.bottom + padding;
}

// Get the LOD level based on zoom
export type LODLevel = 'strategic' | 'medium' | 'detailed';

export function getLODLevel(zoom: number): LODLevel {
  if (zoom < ZOOM_STRATEGIC) return 'strategic';
  if (zoom < ZOOM_MEDIUM) return 'medium';
  return 'detailed';
}
