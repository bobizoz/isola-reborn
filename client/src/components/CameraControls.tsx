/**
 * Camera Controls Component for ISOLA: REBORN
 * Zoom in/out buttons, reset view, zoom indicator
 */

import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, Home, Target, Eye } from 'lucide-react';
import { CameraState, MIN_ZOOM, MAX_ZOOM, getLODLevel, LODLevel } from '@/lib/camera';
import { Tribe } from '@shared/schema';

interface CameraControlsProps {
  camera: CameraState;
  tribes: Tribe[];
  selectedTribeId: number | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFocusTribe: (tribeId: number) => void;
  onStrategicView: () => void;
}

export function CameraControls({
  camera,
  tribes,
  selectedTribeId,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFocusTribe,
  onStrategicView,
}: CameraControlsProps) {
  const zoomPercent = Math.round((camera.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM) * 100);
  const lodLevel = getLODLevel(camera.zoom);
  
  const getLODLabel = (level: LODLevel): string => {
    switch (level) {
      case 'strategic': return 'Strategic View';
      case 'medium': return 'Regional View';
      case 'detailed': return 'Detailed View';
    }
  };
  
  const getLODColor = (level: LODLevel): string => {
    switch (level) {
      case 'strategic': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'detailed': return 'bg-green-500';
    }
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      {/* Zoom Controls */}
      <div className="bg-white/90 rounded-lg shadow-lg p-2 flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          disabled={camera.zoom >= MAX_ZOOM}
          className="h-8 w-8 p-0"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        {/* Zoom Slider Visual */}
        <div className="h-20 w-8 flex items-center justify-center">
          <div className="relative h-full w-2 bg-gray-200 rounded-full">
            <div 
              className="absolute bottom-0 w-full bg-primary rounded-full transition-all"
              style={{ height: `${zoomPercent}%` }}
            />
            <div 
              className="absolute w-4 h-4 bg-primary rounded-full -left-1 transition-all shadow-md"
              style={{ bottom: `calc(${zoomPercent}% - 8px)` }}
            />
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          disabled={camera.zoom <= MIN_ZOOM}
          className="h-8 w-8 p-0"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        {/* Zoom percentage */}
        <div className="text-[10px] text-center text-muted-foreground font-mono">
          {Math.round(camera.zoom * 100)}%
        </div>
      </div>
      
      {/* View Mode Indicator */}
      <div className="bg-white/90 rounded-lg shadow-lg p-2">
        <div className="flex items-center gap-1 mb-1">
          <div className={`w-2 h-2 rounded-full ${getLODColor(lodLevel)}`} />
          <span className="text-[10px] font-pixel">{getLODLabel(lodLevel)}</span>
        </div>
        
        {/* Quick View Buttons */}
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onStrategicView}
            className="h-7 text-[10px] px-2"
            title="Strategic View (see all factions)"
          >
            <Eye className="w-3 h-3 mr-1" />
            Map
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onResetView}
            className="h-7 text-[10px] px-2"
            title="Reset View"
          >
            <Home className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>
      
      {/* Quick Tribe Focus */}
      {tribes.length > 0 && (
        <div className="bg-white/90 rounded-lg shadow-lg p-2">
          <div className="text-[10px] font-pixel text-muted-foreground mb-1">Jump to Tribe</div>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {tribes.map(tribe => (
              <Button
                key={tribe.id}
                variant={selectedTribeId === tribe.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFocusTribe(tribe.id)}
                className="h-6 text-[9px] px-2 justify-start"
                style={{
                  borderColor: tribe.color,
                  color: selectedTribeId === tribe.id ? 'white' : tribe.color,
                  backgroundColor: selectedTribeId === tribe.id ? tribe.color : 'transparent',
                }}
              >
                <Target className="w-3 h-3 mr-1" />
                {tribe.name.substring(0, 12)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
