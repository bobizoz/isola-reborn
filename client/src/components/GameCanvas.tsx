import { useEffect, useRef } from "react";
import { Villager } from "@shared/schema";
import { motion } from "framer-motion";

interface GameCanvasProps {
  villagers: Villager[];
  resources: {
    trees: { x: number; y: number }[];
    rocks: { x: number; y: number }[];
  };
  onVillagerClick: (villager: Villager) => void;
  selectedVillagerId?: number;
}

export function GameCanvas({ villagers, resources, onVillagerClick, selectedVillagerId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

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
      {/* --- Environment Layer --- */}
      
      {/* Central Fire / Village Center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none">
        <div className="w-full h-full bg-orange-500/20 rounded-full animate-pulse blur-xl absolute" />
        <div className="relative z-10 text-4xl text-center leading-[4rem]">🔥</div>
      </div>

      {/* Trees */}
      {resources.trees.map((tree, i) => (
        <div 
          key={`tree-${i}`} 
          className="absolute text-2xl"
          style={{ left: tree.x, top: tree.y }}
        >
          🌲
        </div>
      ))}

      {/* Rocks */}
      {resources.rocks.map((rock, i) => (
        <div 
          key={`rock-${i}`} 
          className="absolute text-xl opacity-80"
          style={{ left: rock.x, top: rock.y }}
        >
          🪨
        </div>
      ))}

      {/* River */}
      <div className="absolute top-0 right-20 w-32 h-full bg-blue-300/30 skew-x-12 border-l-4 border-blue-400/20 pointer-events-none" />


      {/* --- Entity Layer --- */}
      {villagers.map((v) => (
        <motion.div
          key={v.id}
          className="absolute cursor-pointer flex flex-col items-center group z-10"
          initial={{ x: v.posX, y: v.posY }}
          animate={{ x: v.posX, y: v.posY }}
          transition={{ type: "tween", ease: "linear", duration: 0.1 }} // Smooth 100ms movement matching tick rate
          onClick={(e) => {
            e.stopPropagation();
            onVillagerClick(v);
          }}
        >
          {/* Action Bubble */}
          {v.action !== 'idle' && (
            <div className="absolute -top-8 bg-white/90 px-2 py-1 rounded text-[10px] font-retro border border-foreground/10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
              {getActionEmoji(v.action)}
            </div>
          )}

          {/* Selection Ring */}
          {selectedVillagerId === v.id && (
            <div className="absolute w-8 h-8 -bottom-1 border-2 border-accent rounded-full animate-ping opacity-75" />
          )}

          {/* Villager Sprite */}
          <div 
            className={`
              w-6 h-8 relative shadow-sm transition-transform duration-75
              ${selectedVillagerId === v.id ? 'scale-110 drop-shadow-md' : 'hover:scale-105'}
            `}
            style={{ 
              backgroundColor: v.action === 'sleeping' ? '#999' : v.skinColor,
              borderRadius: '4px 4px 0 0'
            }}
          >
            {/* Hair */}
            <div className="absolute top-0 w-full h-3 rounded-t" style={{ backgroundColor: v.hairColor }} />
            
            {/* Eyes (Pixel) */}
            <div className="absolute top-3 left-1 w-1 h-1 bg-black rounded-full" />
            <div className="absolute top-3 right-1 w-1 h-1 bg-black rounded-full" />
            
            {/* Clothes */}
            <div className="absolute bottom-0 w-full h-3 bg-primary/80" />
            
            {/* Health Bar (Mini) */}
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gray-300 rounded overflow-hidden">
              <div 
                className={`h-full ${v.health < 30 ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{ width: `${v.health}%` }} 
              />
            </div>
          </div>
          
          {/* Name Tag (Only on hover or selection) */}
          <div className={`mt-1 text-[10px] font-bold font-retro bg-black/50 text-white px-1 rounded ${selectedVillagerId === v.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {v.name}
          </div>
        </motion.div>
      ))}
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
    default: return 'Idle';
  }
}
