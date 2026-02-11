import { Villager } from "@shared/schema";
import { Heart, Activity, Utensils, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InspectorProps {
  villager: Villager | null;
  onClose: () => void;
  onHeal: (id: number) => void;
}

export function VillagerInspector({ villager, onClose, onHeal }: InspectorProps) {
  if (!villager) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 retro-box p-4 z-50 animate-in slide-in-from-right-10 fade-in duration-300">
      <div className="flex justify-between items-start mb-4 border-b border-foreground/10 pb-2">
        <div>
          <h3 className="text-lg font-pixel text-primary">{villager.name}</h3>
          <p className="text-sm font-retro text-muted-foreground uppercase">
            {villager.gender} • {villager.age} Years Old
          </p>
        </div>
        <button onClick={onClose} className="hover:bg-black/10 rounded p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Vitals */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <VitalRow 
            icon={<Heart className="w-4 h-4 text-red-500" />} 
            label="Health" 
            value={villager.health} 
            max={100}
            color="bg-red-500" 
          />
          <VitalRow 
            icon={<Activity className="w-4 h-4 text-blue-500" />} 
            label="Energy" 
            value={villager.energy} 
            max={100}
            color="bg-blue-500"
          />
          <VitalRow 
            icon={<Utensils className="w-4 h-4 text-orange-500" />} 
            label="Hunger" 
            value={100 - villager.hunger} 
            max={100}
            color="bg-orange-500"
          />
          <VitalRow 
            icon={<Smile className="w-4 h-4 text-yellow-500" />} 
            label="Happy" 
            value={villager.happiness} 
            max={100}
            color="bg-yellow-500"
          />
        </div>

        {/* Current State */}
        <div className="bg-black/5 p-2 rounded">
          <p className="text-xs font-bold uppercase text-muted-foreground">Current Action</p>
          <p className="font-retro text-xl capitalize">{villager.action}</p>
        </div>

        {/* Skills */}
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Skills</p>
          <div className="space-y-1 text-xs">
            <SkillBar label="Farming" value={villager.skillFarming} />
            <SkillBar label="Building" value={villager.skillBuilding} />
            <SkillBar label="Research" value={villager.skillResearch} />
            <SkillBar label="Gathering" value={villager.skillGathering} />
            <SkillBar label="Healing" value={villager.skillHealing} />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <Button 
            variant="outline" 
            className="w-full retro-btn text-xs font-pixel py-4 border-2"
            onClick={() => onHeal(villager.id)}
            disabled={villager.health >= 100}
          >
            <Heart className="w-4 h-4 mr-2" />
            Heal Villager (-10 MP)
          </Button>
        </div>
      </div>
    </div>
  );
}

function VitalRow({ icon, label, value, max, color }: any) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function SkillBar({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="w-20 font-retro uppercase text-muted-foreground">{label}</span>
      <div className="flex-1 mx-2 h-2 bg-gray-200 rounded-sm overflow-hidden border border-black/10">
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="w-6 text-right font-mono">{value}</span>
    </div>
  );
}
