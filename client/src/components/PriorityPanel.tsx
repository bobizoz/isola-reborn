import { Slider } from "@/components/ui/slider";
import { GameState } from "@shared/schema";
import { Wheat, Hammer, TestTube, TreePine } from "lucide-react";

interface PriorityPanelProps {
  state: GameState;
  onUpdate: (key: keyof GameState, value: number) => void;
}

export function PriorityPanel({ state, onUpdate }: PriorityPanelProps) {
  return (
    <div className="retro-box p-4 w-full md:w-64 space-y-6">
      <h3 className="font-pixel text-sm text-center border-b border-foreground/10 pb-2">Tribal Priorities</h3>
      
      <PrioritySlider 
        label="Farming" 
        icon={<Wheat className="w-4 h-4" />}
        value={state.priorityFarming}
        onChange={(v) => onUpdate("priorityFarming", v)}
        color="bg-green-500"
      />

      <PrioritySlider 
        label="Building" 
        icon={<Hammer className="w-4 h-4" />}
        value={state.priorityBuilding}
        onChange={(v) => onUpdate("priorityBuilding", v)}
        color="bg-amber-600"
      />

      <PrioritySlider 
        label="Gathering" 
        icon={<TreePine className="w-4 h-4" />}
        value={state.priorityGathering}
        onChange={(v) => onUpdate("priorityGathering", v)}
        color="bg-stone-500"
      />

      <PrioritySlider 
        label="Research" 
        icon={<TestTube className="w-4 h-4" />}
        value={state.priorityResearch}
        onChange={(v) => onUpdate("priorityResearch", v)}
        color="bg-purple-500"
      />

      <div className="text-xs text-muted-foreground text-center pt-2 italic font-serif">
        "Guide them, do not command them."
      </div>
    </div>
  );
}

function PrioritySlider({ label, icon, value, onChange, color }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm font-retro">
        <div className="flex items-center gap-2">
          {icon}
          <span className="uppercase tracking-wider">{label}</span>
        </div>
        <span className="font-bold">{value}</span>
      </div>
      <Slider
        defaultValue={[value]}
        max={10}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        className={`[&_.bg-primary]:${color}`}
      />
    </div>
  );
}
