import { Villager, Tribe } from "@shared/schema";
import { Heart, Activity, Utensils, Smile, X, Swords, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InspectorProps {
  villager: Villager | null;
  tribe: Tribe | null;
  onClose: () => void;
  onHeal: (id: number) => void;
}

export function VillagerInspector({ villager, tribe, onClose, onHeal }: InspectorProps) {
  if (!villager) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 retro-box p-4 z-50 animate-in slide-in-from-right-10 fade-in duration-300">
      <div className="flex justify-between items-start mb-4 border-b border-foreground/10 pb-2">
        <div>
          <h3 className="text-lg font-pixel text-primary">{villager.name}</h3>
          <p className="text-sm font-retro text-muted-foreground uppercase">
            {villager.gender} • {villager.age} Years Old
          </p>
          {tribe && (
            <div className="flex items-center gap-1.5 mt-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tribe.color }}
              />
              <span className="text-xs text-muted-foreground">{tribe.name}</span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="hover:bg-black/10 rounded p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Traits */}
        {villager.traits && villager.traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {villager.traits.map((trait, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {trait}
              </Badge>
            ))}
          </div>
        )}

        {/* Thought bubble */}
        {villager.thought && (
          <div className="bg-black/5 p-2 rounded text-xs italic text-muted-foreground">
            💭 "{villager.thought}"
          </div>
        )}

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
            label="Satiety" 
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
        <div className="bg-black/5 p-2 rounded flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Current Action</p>
            <p className="font-retro text-xl capitalize">{villager.action}</p>
          </div>
          {villager.action === 'fleeing' && (
            <span className="text-2xl animate-bounce">😱</span>
          )}
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
            <SkillBar label="Combat" value={villager.skillCombat} icon={<Swords className="w-3 h-3" />} />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <Button 
            variant="outline" 
            className="w-full retro-btn text-xs font-pixel py-4 border-2"
            onClick={() => onHeal(villager.id)}
            disabled={villager.health >= 100}
          >
            <Heart className="w-4 h-4 mr-2" />
            Divine Heal (-10 Tech)
          </Button>
        </div>
      </div>
    </div>
  );
}

function VitalRow({ icon, label, value, max, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
        <span className="ml-auto font-mono">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${color}`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}

function SkillBar({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="w-20 font-retro uppercase text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </span>
      <div className="flex-1 mx-2 h-2 bg-gray-200 rounded-sm overflow-hidden border border-black/10">
        <div 
          className="h-full bg-primary transition-all duration-300" 
          style={{ width: `${value}%` }} 
        />
      </div>
      <span className="w-6 text-right font-mono">{value}</span>
    </div>
  );
}
