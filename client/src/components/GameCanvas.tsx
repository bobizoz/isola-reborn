import { useEffect, useRef } from "react";
import { Villager, Tribe, WorldEvent } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface GameCanvasProps {
  villagers: Villager[];
  tribes: Tribe[];
  worldEvents: WorldEvent[];
  resources: {
    trees: { x: number; y: number }[];
    rocks: { x: number; y: number }[];
  };
  onVillagerClick: (villager: Villager) => void;
  selectedVillagerId?: number;
  selectedTribeId?: number;
  onTribeClick?: (tribeId: number) => void;
}

export function GameCanvas({ 
  villagers, 
  tribes,
  worldEvents,
  resources, 
  onVillagerClick, 
  selectedVillagerId,
  selectedTribeId,
  onTribeClick,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Get tribe color for a villager
  const getVillagerTribeColor = (tribeId: number): string => {
    const tribe = tribes.find(t => t.id === tribeId);
    return tribe?.color || '#666666';
  };

  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-[600px] bg-[#e6dcc3] overflow-hidden rounded-xl border-4 border-[#8b7355] shadow-inner select-none cursor-crosshair"
      style={{
        backgroundImage: `
          repeating-linear-gradient(45deg, #e6dcc3 25%, transparent 25%, transparent 75%, #e6dcc3 75%, #e6dcc3),
          repeating-linear-gradient(45deg, #e6dcc3 25%, #ded4ba 25%, #ded4ba 75%, #e6dcc3 75%, #e6dcc3)
        `,
        backgroundPosition: '0 0, 10px 10px',
        backgroundSize: '20px 20px'
      }}
    >
      {/* === Tribe Territory Indicators === */}
      {tribes.map(tribe => (
        <div
          key={`territory-${tribe.id}`}
          className={`
            absolute rounded-full transition-all duration-500 pointer-events-none
            ${selectedTribeId === tribe.id ? 'opacity-40' : 'opacity-15'}
          `}
          style={{
            left: tribe.centerX - tribe.territoryRadius,
            top: tribe.centerY - tribe.territoryRadius,
            width: tribe.territoryRadius * 2,
            height: tribe.territoryRadius * 2,
            backgroundColor: tribe.color,
            border: `3px dashed ${tribe.color}`,
          }}
        />
      ))}

      {/* === Tribe Centers (Village Fires) === */}
      {tribes.map(tribe => (
        <div
          key={`center-${tribe.id}`}
          className="absolute cursor-pointer group"
          style={{
            left: tribe.centerX - 24,
            top: tribe.centerY - 24,
          }}
          onClick={() => onTribeClick?.(tribe.id)}
        >
          {/* Glow effect */}
          <div 
            className="w-12 h-12 rounded-full animate-pulse blur-xl absolute"
            style={{ backgroundColor: `${tribe.color}40` }}
          />
          {/* Fire emoji */}
          <div className="relative z-10 text-3xl text-center leading-[3rem]">🔥</div>
          {/* Tribe name label */}
          <div 
            className={`
              absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap
              text-[10px] font-pixel px-2 py-0.5 rounded shadow-sm
              transition-opacity duration-200
              ${selectedTribeId === tribe.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}
            style={{ 
              backgroundColor: tribe.color,
              color: 'white',
            }}
          >
            {tribe.name}
          </div>
          {/* Population badge */}
          <div 
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] font-bold"
            style={{ color: tribe.color }}
          >
            {villagers.filter(v => v.tribeId === tribe.id && !v.isDead).length}
          </div>
        </div>
      ))}

      {/* === World Events (Dangers) === */}
      <AnimatePresence>
        {worldEvents.map(event => (
          <motion.div
            key={event.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute pointer-events-none"
            style={{
              left: event.posX - event.radius,
              top: event.posY - event.radius,
              width: event.radius * 2,
              height: event.radius * 2,
            }}
          >
            {/* Danger zone */}
            <div 
              className={`
                w-full h-full rounded-full animate-pulse
                ${event.type === 'wildAnimal' ? 'bg-red-500/20 border-2 border-red-500/40' : ''}
                ${event.type === 'disease' ? 'bg-green-900/20 border-2 border-green-900/40' : ''}
                ${event.type === 'fire' ? 'bg-orange-500/30 border-2 border-orange-500/50' : ''}
              `}
            />
            {/* Event icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl">
              {event.type === 'wildAnimal' && '🐺'}
              {event.type === 'disease' && '☠️'}
              {event.type === 'fire' && '🔥'}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* === Environment Layer === */}
      
      {/* Trees */}
      {resources.trees.map((tree, i) => (
        <div 
          key={`tree-${i}`} 
          className="absolute text-2xl pointer-events-none"
          style={{ left: tree.x - 10, top: tree.y - 10 }}
        >
          🌲
        </div>
      ))}

      {/* Rocks */}
      {resources.rocks.map((rock, i) => (
        <div 
          key={`rock-${i}`} 
          className="absolute text-xl opacity-80 pointer-events-none"
          style={{ left: rock.x - 8, top: rock.y - 8 }}
        >
          🪨
        </div>
      ))}

      {/* River */}
      <div className="absolute top-0 right-20 w-32 h-full bg-blue-300/30 skew-x-12 border-l-4 border-blue-400/20 pointer-events-none" />

      {/* === Entity Layer (Villagers) === */}
      <AnimatePresence>
        {villagers.filter(v => !v.isDead).map((v) => {
          const tribeColor = getVillagerTribeColor(v.tribeId);
          const isFromSelectedTribe = selectedTribeId === v.tribeId;
          
          return (
            <motion.div
              key={v.id}
              className={`
                absolute cursor-pointer flex flex-col items-center group z-10
                ${isFromSelectedTribe ? 'z-20' : 'z-10'}
              `}
              initial={{ x: v.posX - 12, y: v.posY - 16, opacity: 0, scale: 0 }}
              animate={{ 
                x: v.posX - 12, 
                y: v.posY - 16, 
                opacity: isFromSelectedTribe || !selectedTribeId ? 1 : 0.5,
                scale: 1,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "tween", ease: "linear", duration: 0.1 }}
              onClick={(e) => {
                e.stopPropagation();
                onVillagerClick(v);
              }}
            >
              {/* Action Bubble */}
              {v.action !== 'idle' && (
                <div className="absolute -top-8 bg-white/90 px-2 py-1 rounded text-[10px] font-retro border border-foreground/10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                  {getActionEmoji(v.action)}
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
                className={`
                  w-6 h-8 relative shadow-sm transition-transform duration-75
                  ${selectedVillagerId === v.id ? 'scale-110 drop-shadow-md' : 'hover:scale-105'}
                  ${v.action === 'fleeing' ? 'animate-bounce' : ''}
                `}
                style={{ 
                  backgroundColor: v.action === 'sleeping' ? '#999' : v.skinColor,
                  borderRadius: '4px 4px 0 0'
                }}
              >
                {/* Hair */}
                <div className="absolute top-0 w-full h-3 rounded-t" style={{ backgroundColor: v.hairColor }} />
                
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
                    className={`h-full ${v.health < 30 ? 'bg-red-500' : v.health < 60 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                    style={{ width: `${v.health}%` }} 
                  />
                </div>

                {/* Fleeing indicator */}
                {v.action === 'fleeing' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs">😱</div>
                )}
              </div>
              
              {/* Name Tag */}
              <div className={`
                mt-1 text-[10px] font-bold font-retro px-1 rounded text-white
                ${selectedVillagerId === v.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              `}
              style={{ backgroundColor: `${tribeColor}cc` }}
              >
                {v.name}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* === Map Legend === */}
      <div className="absolute bottom-2 left-2 bg-white/80 rounded-lg p-2 text-[10px] shadow-sm">
        <div className="font-bold mb-1 text-muted-foreground">LEGEND</div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">🔥 Tribe Center</div>
          <div className="flex items-center gap-1">🌲 Forest</div>
          <div className="flex items-center gap-1">🪨 Quarry</div>
          <div className="flex items-center gap-1">🐺 Danger</div>
        </div>
      </div>
    </div>
  );
}

function getActionEmoji(action: string) {
  switch(action) {
    case 'farming': return '🌾 Farming';
    case 'building': return '🔨 Building';
    case 'research': return '🧪 Researching';
    case 'gathering': return '🪵 Gathering';
    case 'healing': return '💊 Healing';
    case 'eating': return '🍖 Eating';
    case 'sleeping': return '💤 Sleeping';
    case 'fleeing': return '🏃 Fleeing!';
    default: return '💭 Idle';
  }
}
