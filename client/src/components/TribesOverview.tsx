import { Tribe, Villager } from "@shared/schema";
import { Users, Beef, Hammer, Gem, Brain, Crown, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TribesOverviewProps {
  tribes: Tribe[];
  villagers: Villager[];
  selectedTribeId: number | null;
  onSelectTribe: (tribeId: number) => void;
}

export function TribesOverview({ tribes, villagers, selectedTribeId, onSelectTribe }: TribesOverviewProps) {
  const getTribePopulation = (tribeId: number) => 
    villagers.filter(v => v.tribeId === tribeId && !v.isDead).length;

  const getTribeStats = (tribe: Tribe) => {
    const pop = getTribePopulation(tribe.id);
    const tribeVillagers = villagers.filter(v => v.tribeId === tribe.id && !v.isDead);
    const avgHealth = tribeVillagers.length > 0 
      ? tribeVillagers.reduce((sum, v) => sum + v.health, 0) / tribeVillagers.length 
      : 0;
    return { pop, avgHealth };
  };

  return (
    <div className="retro-box p-3 w-full md:w-72">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-foreground/10">
        <Crown className="w-4 h-4 text-amber-500" />
        <h3 className="font-pixel text-sm">All Tribes</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-black/10 px-2 py-0.5 rounded">
          {tribes.length}
        </span>
      </div>
      
      <ScrollArea className="h-[280px] pr-2">
        <div className="space-y-2">
          {tribes.map(tribe => {
            const { pop, avgHealth } = getTribeStats(tribe);
            const isSelected = selectedTribeId === tribe.id;
            
            return (
              <div
                key={tribe.id}
                onClick={() => onSelectTribe(tribe.id)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-all duration-200 border-2
                  ${isSelected 
                    ? 'bg-primary/10 border-primary shadow-md' 
                    : 'bg-black/5 border-transparent hover:bg-black/10 hover:border-black/10'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: tribe.color }}
                  />
                  <span className="font-retro text-sm font-bold truncate flex-1">
                    {tribe.name}
                  </span>
                  {tribe.isPlayerTribe && (
                    <Crown className="w-3 h-3 text-amber-500" />
                  )}
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                </div>
                
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-3 h-3 text-blue-500" />
                    <span>{pop} villagers</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3 text-green-500" />
                    <span>{tribe.centerX}, {tribe.centerY}</span>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="mt-3 pt-2 border-t border-black/10 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <ResourceMini icon={<Beef className="w-3 h-3 text-red-500" />} value={Math.floor(tribe.food)} label="Food" />
                      <ResourceMini icon={<Hammer className="w-3 h-3 text-amber-600" />} value={Math.floor(tribe.wood)} label="Wood" />
                      <ResourceMini icon={<Gem className="w-3 h-3 text-gray-500" />} value={Math.floor(tribe.stone)} label="Stone" />
                      <ResourceMini icon={<Brain className="w-3 h-3 text-purple-500" />} value={Math.floor(tribe.techPoints)} label="Tech" />
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Avg Health:</span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${avgHealth > 60 ? 'bg-green-500' : avgHealth > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${avgHealth}%` }}
                        />
                      </div>
                      <span className="font-mono">{Math.round(avgHealth)}%</span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <span>Founded: Day {Math.floor(tribe.foundedTick / 100)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {tribes.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No tribes exist yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ResourceMini({ icon, value, label }: { icon: React.ReactNode, value: number, label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-black/5 rounded px-2 py-1">
      {icon}
      <span className="font-bold">{value}</span>
      <span className="text-muted-foreground text-[10px]">{label}</span>
    </div>
  );
}
