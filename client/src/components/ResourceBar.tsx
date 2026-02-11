import { Zap, Beef, Hammer, Gem, Users, Brain } from "lucide-react";
import { GameState } from "@shared/schema";

interface ResourceBarProps {
  state: GameState;
  population: number;
}

export function ResourceBar({ state, population }: ResourceBarProps) {
  return (
    <div className="retro-box p-3 flex flex-wrap gap-4 md:gap-8 justify-center items-center mb-4 sticky top-4 z-50">
      <ResourceItem 
        icon={<Users className="w-5 h-5 text-blue-600" />} 
        value={population} 
        label="Pop" 
      />
      <div className="h-8 w-px bg-foreground/20" />
      
      <ResourceItem 
        icon={<Beef className="w-5 h-5 text-red-600" />} 
        value={state.food} 
        label="Food" 
      />
      <ResourceItem 
        icon={<Hammer className="w-5 h-5 text-amber-700" />} 
        value={state.wood} 
        label="Wood" 
      />
      <ResourceItem 
        icon={<Gem className="w-5 h-5 text-gray-600" />} 
        value={state.stone} 
        label="Stone" 
      />
      <ResourceItem 
        icon={<Brain className="w-5 h-5 text-purple-600" />} 
        value={state.techPoints} 
        label="Tech" 
      />
      
      <div className="ml-auto text-xs font-mono text-muted-foreground hidden md:block">
        Tick: {state.gameTick} | Spd: {state.gameSpeed}x
      </div>
    </div>
  );
}

function ResourceItem({ icon, value, label }: { icon: React.ReactNode, value: number, label: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="p-1.5 bg-black/5 rounded-md">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="font-pixel text-xs text-muted-foreground uppercase">{label}</span>
        <span className="font-retro text-2xl font-bold leading-none">{Math.floor(value)}</span>
      </div>
    </div>
  );
}
