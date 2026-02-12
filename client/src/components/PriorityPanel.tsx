import { Slider } from "@/components/ui/slider";
import { Tribe } from "@shared/schema";
import { Wheat, Hammer, TestTube, TreePine, Shield } from "lucide-react";

interface PriorityPanelProps {
  tribe: Tribe | null;
  onUpdate: (key: keyof Tribe, value: number) => void;
}

export function PriorityPanel({ tribe, onUpdate }: PriorityPanelProps) {
  if (!tribe) {
    return (
      <div className="retro-box p-4 w-full md:w-64">
        <h3 className="font-pixel text-sm text-center text-muted-foreground">
          Select a tribe to set priorities
        </h3>
      </div>
    );
  }

  return (
    <div className="retro-box p-4 w-full md:w-64 space-y-5">
      <div className="text-center border-b border-foreground/10 pb-2">
        <h3 className="font-pixel text-sm">Tribal Priorities</h3>
        <p className="text-[10px] text-muted-foreground mt-1" style={{ color: tribe.color }}>
          {tribe.name}
        </p>
      </div>
      
      <PrioritySlider 
        label="Farming" 
        icon={<Wheat className="w-4 h-4" />}
        value={tribe.priorityFarming}
        onChange={(v) => onUpdate("priorityFarming", v)}
        color="bg-green-500"
        description="Food production"
      />

      <PrioritySlider 
        label="Building" 
        icon={<Hammer className="w-4 h-4" />}
        value={tribe.priorityBuilding}
        onChange={(v) => onUpdate("priorityBuilding", v)}
        color="bg-amber-600"
        description="Stone & structures"
      />

      <PrioritySlider 
        label="Gathering" 
        icon={<TreePine className="w-4 h-4" />}
        value={tribe.priorityGathering}
        onChange={(v) => onUpdate("priorityGathering", v)}
        color="bg-stone-500"
        description="Wood collection"
      />

      <PrioritySlider 
        label="Research" 
        icon={<TestTube className="w-4 h-4" />}
        value={tribe.priorityResearch}
        onChange={(v) => onUpdate("priorityResearch", v)}
        color="bg-purple-500"
        description="Tech advancement"
      />

      <PrioritySlider 
        label="Defense" 
        icon={<Shield className="w-4 h-4" />}
        value={tribe.priorityDefense}
        onChange={(v) => onUpdate("priorityDefense", v)}
        color="bg-red-500"
        description="Protection & combat"
      />

      <div className="text-xs text-muted-foreground text-center pt-2 italic font-serif border-t border-foreground/10">
        "Guide them, do not command them."
      </div>
    </div>
  );
}

function PrioritySlider({ 
  label, 
  icon, 
  value, 
  onChange, 
  color,
  description,
}: { 
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  color: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm font-retro">
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex flex-col">
            <span className="uppercase tracking-wider text-xs">{label}</span>
            <span className="text-[10px] text-muted-foreground normal-case">{description}</span>
          </div>
        </div>
        <span className="font-bold text-lg">{value}</span>
      </div>
      <Slider
        value={[value]}
        max={10}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        className={`[&_.bg-primary]:${color}`}
      />
    </div>
  );
}
