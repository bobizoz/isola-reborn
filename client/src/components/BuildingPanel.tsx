/**
 * Building Panel Component
 * UI for selecting and managing buildings
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  BuildingType,
  BuildingDefinition,
  BUILDING_DEFINITIONS,
  canAffordBuilding,
  canBuildMore,
} from '@/lib/buildings';
import { Tribe } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Home, 
  Wheat, 
  Package, 
  Hammer,
  Castle,
  Church,
  Droplet,
  Sword,
  X,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react';

interface BuildingPanelProps {
  tribe: Tribe | null;
  buildings: Building[];
  onSelectBuilding: (type: BuildingType | null) => void;
  selectedBuildingType: BuildingType | null;
  isPlacingBuilding: boolean;
}

const BUILDING_ICONS: Record<BuildingType, React.ReactNode> = {
  house: <Home className="w-5 h-5" />,
  farm: <Wheat className="w-5 h-5" />,
  storage: <Package className="w-5 h-5" />,
  workshop: <Hammer className="w-5 h-5" />,
  watchtower: <Castle className="w-5 h-5" />,
  temple: <Church className="w-5 h-5" />,
  well: <Droplet className="w-5 h-5" />,
  barracks: <Sword className="w-5 h-5" />,
};

export function BuildingPanel({
  tribe,
  buildings,
  onSelectBuilding,
  selectedBuildingType,
  isPlacingBuilding,
}: BuildingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetails, setShowDetails] = useState<BuildingType | null>(null);

  if (!tribe) {
    return (
      <div className="retro-box p-3 opacity-50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <span className="text-sm">Select a tribe to build</span>
        </div>
      </div>
    );
  }

  const tribeBuildings = buildings.filter(b => b.tribeId === tribe.id);
  const completedBuildings = tribeBuildings.filter(b => b.isComplete);
  const constructingBuildings = tribeBuildings.filter(b => !b.isComplete);

  const buildingTypes = Object.keys(BUILDING_DEFINITIONS) as BuildingType[];

  const renderBuildingCard = (type: BuildingType) => {
    const def = BUILDING_DEFINITIONS[type];
    const canAfford = canAffordBuilding(tribe, type);
    const canBuild = canBuildMore(buildings, tribe.id, type);
    const isSelected = selectedBuildingType === type;
    const count = completedBuildings.filter(b => b.type === type).length;

    return (
      <motion.div
        key={type}
        className={`
          relative p-2 rounded-lg border-2 cursor-pointer transition-all
          ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
          ${!canAfford || !canBuild ? 'opacity-50' : ''}
        `}
        whileHover={{ scale: canAfford && canBuild ? 1.02 : 1 }}
        whileTap={{ scale: canAfford && canBuild ? 0.98 : 1 }}
        onClick={() => {
          if (canAfford && canBuild) {
            onSelectBuilding(isSelected ? null : type);
          }
        }}
        onMouseEnter={() => setShowDetails(type)}
        onMouseLeave={() => setShowDetails(null)}
      >
        {/* Building icon and name */}
        <div className="flex items-center gap-2">
          <div className="text-2xl">{def.emoji}</div>
          <div className="flex-1">
            <div className="font-pixel text-xs">{def.name}</div>
            {count > 0 && (
              <div className="text-xs text-muted-foreground">
                Built: {count}{def.maxPerTribe ? `/${def.maxPerTribe}` : ''}
              </div>
            )}
          </div>
          {isSelected && (
            <Check className="w-4 h-4 text-primary" />
          )}
        </div>

        {/* Cost display */}
        <div className="flex gap-2 mt-1 text-xs">
          {def.cost.wood > 0 && (
            <span className={tribe.wood >= def.cost.wood ? 'text-green-600' : 'text-red-500'}>
              🪵{def.cost.wood}
            </span>
          )}
          {def.cost.stone > 0 && (
            <span className={tribe.stone >= def.cost.stone ? 'text-green-600' : 'text-red-500'}>
              🪨{def.cost.stone}
            </span>
          )}
          {def.cost.food > 0 && (
            <span className={tribe.food >= def.cost.food ? 'text-green-600' : 'text-red-500'}>
              🌾{def.cost.food}
            </span>
          )}
        </div>

        {/* Tooltip with details */}
        <AnimatePresence>
          {showDetails === type && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute z-50 left-0 top-full mt-1 w-48 p-2 bg-popover border rounded-lg shadow-lg"
            >
              <p className="text-xs text-muted-foreground mb-2">{def.description}</p>
              <div className="text-xs space-y-1">
                <div className="font-semibold">Effects:</div>
                {Object.entries(def.effects).map(([key, value]) => (
                  value !== undefined && (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-primary">+{typeof value === 'number' && value < 1 ? `${(value * 100).toFixed(0)}%` : value}</span>
                    </div>
                  )
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disabled overlay */}
        {(!canAfford || !canBuild) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
            <span className="text-xs text-muted-foreground">
              {!canBuild ? 'Max built' : 'Not enough resources'}
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="retro-box p-3">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer mb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span className="font-pixel text-sm">Buildings</span>
          <span className="text-xs text-muted-foreground">
            ({completedBuildings.length} built)
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Placement mode indicator */}
            {isPlacingBuilding && selectedBuildingType && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-2 bg-primary/20 rounded-lg border border-primary"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {BUILDING_DEFINITIONS[selectedBuildingType].emoji}
                    </span>
                    <span className="text-sm">
                      Click on the map to place {BUILDING_DEFINITIONS[selectedBuildingType].name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBuilding(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Building grid */}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {buildingTypes.map(renderBuildingCard)}
            </div>

            {/* Under construction list */}
            {constructingBuildings.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Hammer className="w-3 h-3 animate-pulse" />
                  Under Construction ({constructingBuildings.length})
                </div>
                <div className="space-y-1">
                  {constructingBuildings.map(building => {
                    const def = BUILDING_DEFINITIONS[building.type];
                    return (
                      <div key={building.id} className="flex items-center gap-2 text-xs">
                        <span>{def.emoji}</span>
                        <span className="flex-1">{def.name}</span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${building.constructionProgress}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-8 text-right">
                          {Math.floor(building.constructionProgress)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resources reminder */}
            <div className="mt-3 pt-3 border-t text-xs flex justify-between text-muted-foreground">
              <span>🪵 {Math.floor(tribe.wood)}</span>
              <span>🪨 {Math.floor(tribe.stone)}</span>
              <span>🌾 {Math.floor(tribe.food)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Building Progress Overlay component for showing on map
export function BuildingProgressOverlay({
  building,
  screenX,
  screenY,
  zoom,
}: {
  building: Building;
  screenX: number;
  screenY: number;
  zoom: number;
}) {
  const def = BUILDING_DEFINITIONS[building.type];
  
  if (building.isComplete) return null;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: screenX,
        top: screenY - 20 * zoom,
        transform: 'translate(-50%, -100%)',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="bg-black/70 rounded px-2 py-1 text-white text-xs whitespace-nowrap">
        <div className="flex items-center gap-1">
          <span>{def.emoji}</span>
          <span>{Math.floor(building.constructionProgress)}%</span>
        </div>
        <div className="w-full h-1 bg-gray-600 rounded-full mt-1">
          <motion.div
            className="h-full bg-yellow-400 rounded-full"
            style={{ width: `${building.constructionProgress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Building placement preview
export function BuildingPlacementPreview({
  type,
  screenX,
  screenY,
  isValid,
  zoom,
}: {
  type: BuildingType;
  screenX: number;
  screenY: number;
  isValid: boolean;
  zoom: number;
}) {
  const def = BUILDING_DEFINITIONS[type];
  const size = Math.max(def.size.width, def.size.height) * zoom;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 0.8, scale: 1 }}
    >
      {/* Building preview */}
      <div
        className={`
          flex items-center justify-center rounded-lg border-2 border-dashed
          ${isValid ? 'border-green-500 bg-green-500/20' : 'border-red-500 bg-red-500/20'}
        `}
        style={{
          width: size,
          height: size,
        }}
      >
        <span style={{ fontSize: size * 0.5 }}>{def.emoji}</span>
      </div>
      
      {/* Status indicator */}
      <div className={`
        absolute -bottom-6 left-1/2 -translate-x-1/2 
        px-2 py-0.5 rounded text-xs whitespace-nowrap
        ${isValid ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
      `}>
        {isValid ? 'Click to place' : 'Invalid position'}
      </div>
    </motion.div>
  );
}
