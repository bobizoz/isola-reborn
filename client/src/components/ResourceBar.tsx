import { Zap, Beef, Hammer, Gem, Users, Brain, Crown } from "lucide-react";
import { Tribe, Villager } from "@shared/schema";

interface ResourceBarProps {
  tribe: Tribe | null;
  villagers: Villager[];
  totalPopulation: number;
  totalTribes: number;
  gameTick: number;
  gameSpeed: number;
}

export function ResourceBar({ tribe, villagers, totalPopulation, totalTribes, gameTick, gameSpeed }: ResourceBarProps) {
  const tribePopulation = tribe 
    ? villagers.filter(v => v.tribeId === tribe.id && !v.isDead).length 
    : 0;

  return (
    <div className="retro-box p-3 flex flex-wrap gap-4 md:gap-6 justify-center items-center mb-4 sticky top-4 z-50">
      {/* Tribe indicator */}
      {tribe && (
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: tribe.color }}
          />
          <div className="flex flex-col">
            <span className="font-pixel text-[10px] text-muted-foreground uppercase">Selected Tribe</span>
            <span className="font-retro text-sm font-bold leading-none flex items-center gap-1">
              {tribe.name}
              {tribe.isPlayerTribe && <Crown className="w-3 h-3 text-amber-500" />}
            </span>
          </div>
        </div>
      )}
      
      <div className="h-8 w-px bg-foreground/20" />
      
      <ResourceItem 
        icon={<Users className="w-5 h-5 text-blue-600" />} 
        value={tribePopulation}
        subValue={`/ ${totalPopulation}`}
        label="Pop" 
      />
      
      <div className="h-8 w-px bg-foreground/20" />
      
      {tribe ? (
        <>
          <ResourceItem 
            icon={<Beef className="w-5 h-5 text-red-600" />} 
            value={tribe.food} 
            label="Food" 
            warning={tribe.food < 20}
          />
          <ResourceItem 
            icon={<Hammer className="w-5 h-5 text-amber-700" />} 
            value={tribe.wood} 
            label="Wood" 
          />
          <ResourceItem 
            icon={<Gem className="w-5 h-5 text-gray-600" />} 
            value={tribe.stone} 
            label="Stone" 
          />
          <ResourceItem 
            icon={<Brain className="w-5 h-5 text-purple-600" />} 
            value={tribe.techPoints} 
            label="Tech" 
          />
        </>
      ) : (
        <div className="text-sm text-muted-foreground italic">
          Select a tribe to view resources
        </div>
      )}
      
      <div className="ml-auto text-xs font-mono text-muted-foreground hidden md:flex flex-col items-end">
        <span>Day {Math.floor(gameTick / 100)} | Speed: {gameSpeed}x</span>
        <span className="text-[10px]">{totalTribes} tribe{totalTribes !== 1 ? 's' : ''} in the world</span>
      </div>
    </div>
  );
}

function ResourceItem({ 
  icon, 
  value, 
  subValue,
  label,
  warning,
}: { 
  icon: React.ReactNode, 
  value: number, 
  subValue?: string,
  label: string,
  warning?: boolean,
}) {
  return (
    <div className={`flex items-center gap-2 min-w-[70px] ${warning ? 'animate-pulse' : ''}`}>
      <div className={`p-1.5 rounded-md ${warning ? 'bg-red-100' : 'bg-black/5'}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="font-pixel text-xs text-muted-foreground uppercase">{label}</span>
        <span className={`font-retro text-xl font-bold leading-none ${warning ? 'text-red-600' : ''}`}>
          {Math.floor(value)}
          {subValue && <span className="text-sm text-muted-foreground font-normal">{subValue}</span>}
        </span>
      </div>
    </div>
  );
}
