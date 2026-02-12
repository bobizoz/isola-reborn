/**
 * Enhanced Camera Controls Component for ISOLA: REBORN
 * Supports planet view, zoom, and navigation
 */

import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Home, Target, Eye, Globe2 } from 'lucide-react';
import { CameraState, MIN_ZOOM, MAX_ZOOM, getLODLevel, LODLevel, PLANET_VIEW_THRESHOLD } from '@/lib/camera';
import { Tribe } from '@shared/schema';
import { motion } from 'framer-motion';

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
  const isPlanetView = camera.zoom < PLANET_VIEW_THRESHOLD;
  
  const getLODLabel = (level: LODLevel): string => {
    switch (level) {
      case 'planet': return 'Planet View';
      case 'strategic': return 'Strategic View';
      case 'medium': return 'Regional View';
      case 'detailed': return 'Detailed View';
    }
  };
  
  const getLODColor = (level: LODLevel): string => {
    switch (level) {
      case 'planet': return 'bg-purple-500';
      case 'strategic': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'detailed': return 'bg-green-500';
    }
  };
  
  const getLODIcon = (level: LODLevel): string => {
    switch (level) {
      case 'planet': return '🌍';
      case 'strategic': return '📍';
      case 'medium': return '🗺️';
      case 'detailed': return '🔍';
    }
  };

  return (
    <motion.div 
      className="absolute top-4 right-4 flex flex-col gap-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Zoom Controls */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex flex-col gap-1">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            disabled={camera.zoom >= MAX_ZOOM}
            className="h-8 w-8 p-0 transition-colors hover:bg-primary/10"
            title="Zoom In (scroll up)"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </motion.div>
        
        {/* Zoom Slider Visual */}
        <div className="h-24 w-8 flex items-center justify-center py-1">
          <div className="relative h-full w-2 bg-gray-200 rounded-full overflow-hidden">
            {/* LOD Level markers */}
            <div className="absolute w-full h-[1px] bg-purple-400 opacity-50" style={{ bottom: '5%' }} title="Planet View" />
            <div className="absolute w-full h-[1px] bg-blue-400 opacity-50" style={{ bottom: '15%' }} title="Strategic" />
            <div className="absolute w-full h-[1px] bg-yellow-400 opacity-50" style={{ bottom: '40%' }} title="Regional" />
            <div className="absolute w-full h-[1px] bg-green-400 opacity-50" style={{ bottom: '70%' }} title="Detailed" />
            
            {/* Fill */}
            <motion.div 
              className={`absolute bottom-0 w-full rounded-full ${getLODColor(lodLevel)}`}
              animate={{ height: `${zoomPercent}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            
            {/* Handle */}
            <motion.div 
              className={`absolute w-4 h-4 rounded-full -left-1 shadow-md border-2 border-white ${getLODColor(lodLevel)}`}
              animate={{ bottom: `calc(${zoomPercent}% - 8px)` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
        
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            disabled={camera.zoom <= MIN_ZOOM}
            className="h-8 w-8 p-0 transition-colors hover:bg-primary/10"
            title="Zoom Out (scroll down)"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </motion.div>
        
        {/* Zoom percentage */}
        <div className="text-[10px] text-center text-muted-foreground font-mono">
          {Math.round(camera.zoom * 100)}%
        </div>
      </div>
      
      {/* View Mode Indicator */}
      <motion.div 
        className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2"
        layout
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <motion.div 
            className={`w-2.5 h-2.5 rounded-full ${getLODColor(lodLevel)}`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[10px] font-pixel flex items-center gap-1">
            {getLODIcon(lodLevel)} {getLODLabel(lodLevel)}
          </span>
        </div>
        
        {/* Quick View Buttons */}
        <div className="flex flex-col gap-1">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant={isPlanetView ? "default" : "outline"}
              size="sm"
              onClick={onStrategicView}
              className={`h-7 text-[10px] px-2 w-full transition-all ${
                isPlanetView ? 'bg-purple-600 hover:bg-purple-700' : ''
              }`}
              title="Planet View (see the whole world)"
            >
              <Globe2 className="w-3 h-3 mr-1" />
              Planet
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetView}
              className="h-7 text-[10px] px-2 w-full"
              title="Reset View"
            >
              <Home className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Quick Tribe Focus */}
      {tribes.length > 0 && !isPlanetView && (
        <motion.div 
          className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="text-[10px] font-pixel text-muted-foreground mb-1 flex items-center gap-1">
            <Target className="w-3 h-3" />
            Jump to Tribe
          </div>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-thin">
            {tribes.map(tribe => (
              <motion.div
                key={tribe.id}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={selectedTribeId === tribe.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFocusTribe(tribe.id)}
                  className="h-6 text-[9px] px-2 justify-start w-full transition-all"
                  style={{
                    borderColor: tribe.color,
                    color: selectedTribeId === tribe.id ? 'white' : tribe.color,
                    backgroundColor: selectedTribeId === tribe.id ? tribe.color : 'transparent',
                    boxShadow: selectedTribeId === tribe.id ? `0 2px 8px ${tribe.color}40` : 'none',
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: tribe.color }}
                  />
                  {tribe.name.substring(0, 12)}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Keyboard Shortcuts Hint */}
      <div className="bg-black/40 backdrop-blur-sm rounded-lg p-1.5 text-[8px] text-white/70">
        <div>🖱️ Scroll: Zoom</div>
        <div>🖱️ Drag: {isPlanetView ? 'Rotate' : 'Pan'}</div>
      </div>
    </motion.div>
  );
}
