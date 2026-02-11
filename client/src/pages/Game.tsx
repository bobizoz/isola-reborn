import { useEffect, useState, useRef } from "react";
import { useGameState, useSyncGame, useCreateVillager, useUpdateVillager } from "@/hooks/use-game-api";
import { GameCanvas } from "@/components/GameCanvas";
import { ResourceBar } from "@/components/ResourceBar";
import { PriorityPanel } from "@/components/PriorityPanel";
import { VillagerInspector } from "@/components/VillagerInspector";
import { advanceGameTick, RESOURCES } from "@/lib/game-engine";
import { GameState, Villager } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Game() {
  const { data: serverData, isLoading } = useGameState();
  const syncMutation = useSyncGame();
  const createVillagerMutation = useCreateVillager();
  const updateVillagerMutation = useUpdateVillager();
  const { toast } = useToast();

  // Local state for the game loop (performance)
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [villagers, setVillagers] = useState<Villager[]>([]);
  const [selectedVillagerId, setSelectedVillagerId] = useState<number | null>(null);
  
  // Refs for loop
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const syncTimerRef = useRef<NodeJS.Timeout>();

  // --- Initialization ---
  useEffect(() => {
    if (serverData) {
      setGameState(serverData.gameState);
      setVillagers(serverData.villagers);
    }
  }, [serverData]);

  // --- Game Loop ---
  const animate = (time: number) => {
    if (lastTimeRef.current && gameState && villagers.length > 0) {
      const delta = time - lastTimeRef.current;
      
      // Run logic every ~50ms (20 ticks/sec)
      if (delta > 50) {
        const { newState, newVillagers } = advanceGameTick(gameState, villagers);
        setGameState(newState);
        setVillagers(newVillagers);
        lastTimeRef.current = time;
      }
    } else {
      lastTimeRef.current = time;
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameState, villagers]);

  // --- Auto Save (30s) ---
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      if (gameState && villagers.length > 0) {
        console.log("Auto-saving...");
        syncMutation.mutate({ 
          gameState, 
          villagers: villagers.map(v => {
            const { id, ...rest } = v; 
            return { ...rest, id }; // Ensure schema match
          })
        });
        toast({
          title: "Game Saved",
          description: "Your tribe's progress has been recorded.",
          duration: 2000,
        });
      }
    }, 30000);

    return () => clearInterval(syncTimerRef.current);
  }, [gameState, villagers]);

  // --- Handlers ---

  const handlePriorityUpdate = (key: keyof GameState, value: number) => {
    if (!gameState) return;
    setGameState(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleSpawnVillager = () => {
    if ((gameState?.food || 0) < 100) {
      toast({ title: "Not enough food!", description: "Need 100 food to attract a new villager.", variant: "destructive" });
      return;
    }

    // Deduct cost locally
    setGameState(prev => prev ? ({ ...prev, food: prev.food - 100 }) : null);

    createVillagerMutation.mutate({
      name: "Newcomer",
      gender: Math.random() > 0.5 ? "male" : "female",
      age: 18,
      skinColor: "#f5d0b0",
      hairColor: "#4a3b2a",
      posX: 400,
      posY: 550, // Walk in from bottom
    }, {
      onSuccess: (newVillager) => {
        setVillagers(prev => [...prev, newVillager]);
        toast({ title: "A new villager joined!", description: "Welcome to the tribe." });
      }
    });
  };

  const handleHealVillager = (id: number) => {
    if ((gameState?.techPoints || 0) < 10) {
      toast({ title: "Not enough Tech Points!", variant: "destructive" });
      return;
    }

    setGameState(prev => prev ? ({ ...prev, techPoints: prev.techPoints - 10 }) : null);
    
    // Optimistic update
    setVillagers(prev => prev.map(v => v.id === id ? { ...v, health: 100 } : v));
    updateVillagerMutation.mutate({ id, health: 100 });
  };

  // --- Render ---

  if (isLoading || !gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#e6dcc3]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <h1 className="font-pixel text-xl text-primary animate-pulse">Loading Isola...</h1>
        </div>
      </div>
    );
  }

  const selectedVillager = villagers.find(v => v.id === selectedVillagerId) || null;

  return (
    <div className="min-h-screen bg-[#dcd0b3] p-4 font-sans text-foreground overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-pixel text-primary drop-shadow-sm">ISOLA: REBORN</h1>
            <p className="text-sm font-retro text-muted-foreground uppercase tracking-widest">
              Day {Math.floor(gameState.gameTick / 100)} of the New Era
            </p>
          </div>
          <Button onClick={handleSpawnVillager} className="retro-btn bg-primary text-white font-pixel text-xs border-primary-foreground/20">
            <Plus className="w-4 h-4 mr-2" />
            Spawn Villager (100 Food)
          </Button>
        </header>

        {/* Resources */}
        <ResourceBar state={gameState} population={villagers.length} />

        {/* Main Content Grid */}
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Left: Priority Controls */}
          <aside className="hidden md:block">
            <PriorityPanel state={gameState} onUpdate={handlePriorityUpdate} />
          </aside>

          {/* Center: Game World */}
          <main className="flex-1 relative">
            <GameCanvas 
              villagers={villagers} 
              resources={RESOURCES}
              onVillagerClick={(v) => setSelectedVillagerId(v.id)}
              selectedVillagerId={selectedVillagerId || undefined}
            />
            
            {/* Mobile-only priority toggle could go here */}
          </main>
        </div>

        {/* Inspector Overlay */}
        <VillagerInspector 
          villager={selectedVillager} 
          onClose={() => setSelectedVillagerId(null)}
          onHeal={handleHealVillager}
        />
        
      </div>
    </div>
  );
}
