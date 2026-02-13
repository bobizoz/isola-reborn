import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useGameState, useSyncGame, useUpdateVillager } from "@/hooks/use-game-api";
import { GameCanvas } from "@/components/GameCanvas";
import { ResourceBar } from "@/components/ResourceBar";
import { PriorityPanel } from "@/components/PriorityPanel";
import { VillagerInspector } from "@/components/VillagerInspector";
import { TribesOverview } from "@/components/TribesOverview";
import { EventLog } from "@/components/EventLog";
import { BuildingPanel } from "@/components/BuildingPanel";
import { SoundSettingsPanel, SoundToggleButton } from "@/components/SoundSettings";
import { advanceGameTick, spawnVillager, RESOURCES } from "@/lib/game-engine";
import { GameState, Villager, Tribe, WorldEvent, GameEvent } from "@shared/schema";
import { Loader2, Plus, RotateCcw, Settings, ChevronLeft, ChevronRight, Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CameraState, createCamera, focusOn } from "@/lib/camera";
import { WorldTerrain, generateWorld } from "@/lib/world-generator";
import { 
  Building, 
  BuildingType, 
  createBuilding, 
  updateBuildingConstruction,
  canAffordBuilding,
  isValidBuildingPosition,
  BUILDING_DEFINITIONS,
} from "@/lib/buildings";
import { useSound, SoundSettings, DEFAULT_SOUND_SETTINGS } from "@/hooks/use-sound";

export default function Game() {
  const { data: serverData, isLoading } = useGameState();
  const syncMutation = useSyncGame();
  const updateVillagerMutation = useUpdateVillager();
  const { toast } = useToast();

  // Local state for the game loop
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [villagers, setVillagers] = useState<Villager[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  
  const [selectedVillagerId, setSelectedVillagerId] = useState<number | null>(null);
  const [selectedTribeId, setSelectedTribeId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  
  // Camera state
  const [camera, setCamera] = useState<CameraState>(createCamera());
  
  // Building state
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingType, setSelectedBuildingType] = useState<BuildingType | null>(null);
  const [isPlacingBuilding, setIsPlacingBuilding] = useState(false);
  
  // Sound state
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS);
  const { 
    isInitialized: soundInitialized,
    isMuted,
    updateAmbientSounds,
    playActionSound,
    playEventSound,
    playBuildingSound,
    playUISound,
    toggleMute,
    setCategoryVolume,
  } = useSound({ 
    enabled: true, 
    masterVolume: soundSettings.masterVolume 
  });
  
  // World terrain (generated once)
  const terrain = useMemo<WorldTerrain>(() => {
    return generateWorld(42); // Fixed seed for consistent terrain
  }, []);
  
  // Refs for loop
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const syncTimerRef = useRef<NodeJS.Timeout>();

  // --- Initialization ---
  useEffect(() => {
    if (serverData) {
      setGameState(serverData.gameState);
      setTribes(serverData.tribes);
      setVillagers(serverData.villagers);
      setWorldEvents(serverData.worldEvents);
      
      // Auto-select first tribe
      if (serverData.tribes.length > 0 && !selectedTribeId) {
        setSelectedTribeId(serverData.tribes[0].id);
        // Focus camera on first tribe
        const firstTribe = serverData.tribes[0];
        setCamera(focusOn(createCamera(), firstTribe.centerX, firstTribe.centerY, 1));
      }
    }
  }, [serverData]);

  // --- Update ambient sounds when camera changes ---
  useEffect(() => {
    if (soundInitialized) {
      updateAmbientSounds(camera);
    }
  }, [camera.zoom, soundInitialized, updateAmbientSounds]);

  // --- Game Loop ---
  const animate = useCallback((time: number) => {
    if (!isPaused && lastTimeRef.current && gameState && tribes.length > 0) {
      const delta = time - lastTimeRef.current;
      
      // Run logic every ~50ms (20 ticks/sec)
      if (delta > 50) {
        const result = advanceGameTick(gameState, tribes, villagers, worldEvents);
        setGameState(result.newState);
        setTribes(result.newTribes);
        setVillagers(result.newVillagers);
        setWorldEvents(result.newEvents);
        
        // Update building construction progress
        setBuildings(prevBuildings => {
          let buildingsUpdated = false;
          const newBuildings = prevBuildings.map(building => {
            if (building.isComplete) return building;
            
            // Count workers near the building (villagers with 'building' action near this building)
            const workers = villagers.filter(v => 
              v.tribeId === building.tribeId && 
              v.action === 'building' &&
              Math.sqrt(Math.pow(v.posX - building.posX, 2) + Math.pow(v.posY - building.posY, 2)) < 100
            );
            
            const wasComplete = building.isComplete;
            const updated = updateBuildingConstruction(building, workers.length, result.newState.gameTick);
            
            // Play sounds for construction progress
            if (!wasComplete && updated.isComplete) {
              playBuildingSound('complete', building.posX, building.posY, camera);
              buildingsUpdated = true;
              toast({
                title: "🏗️ Building Complete!",
                description: `${BUILDING_DEFINITIONS[building.type].name} has been completed!`,
                duration: 3000,
              });
            } else if (workers.length > 0 && Math.random() > 0.97) {
              playBuildingSound('progress', building.posX, building.posY, camera);
            }
            
            return { ...updated, workersAssigned: workers.map(w => w.id) };
          });
          
          return newBuildings;
        });
        
        // Add new events to log
        if (result.gameEvents.length > 0) {
          setGameEvents(prev => [...prev, ...result.gameEvents].slice(-100)); // Keep last 100
          
          // Show toast and play sounds for important events
          result.gameEvents.forEach(event => {
            // Play event sound
            playEventSound(event);
            
            if (event.type === 'death') {
              toast({
                title: "☠️ A villager has died",
                description: event.message,
                variant: "destructive",
                duration: 4000,
              });
            } else if (event.type === 'immigration') {
              toast({
                title: "🌟 New arrival!",
                description: event.message,
                duration: 3000,
              });
            } else if (event.type === 'tribeSplit') {
              toast({
                title: "👥 A new tribe has formed!",
                description: event.message,
                duration: 5000,
              });
            } else if (event.type === 'disaster') {
              toast({
                title: "⚠️ Danger!",
                description: event.message,
                variant: "destructive",
                duration: 4000,
              });
            } else if (event.type === 'blessing') {
              toast({
                title: "✨ Divine blessing!",
                description: event.message,
                duration: 3000,
              });
            }
          });
        }
        
        lastTimeRef.current = time;
      }
    } else {
      lastTimeRef.current = time;
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState, tribes, villagers, worldEvents, isPaused, toast, playEventSound, playBuildingSound, camera]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // --- Auto Save (30s) ---
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      if (gameState && tribes.length > 0 && villagers.length > 0) {
        console.log("Auto-saving...");
        syncMutation.mutate({ 
          gameState, 
          tribes: tribes.map(t => ({ ...t })),
          villagers: villagers.map(v => ({ ...v })),
        });
        toast({
          title: "Game Saved",
          description: "Your world's progress has been recorded.",
          duration: 2000,
        });
      }
    }, 30000);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [gameState, tribes, villagers, syncMutation, toast]);

  // --- Handlers ---
  const handlePriorityUpdate = (key: keyof Tribe, value: number) => {
    if (!selectedTribeId) return;
    setTribes(prev => prev.map(t => 
      t.id === selectedTribeId ? { ...t, [key]: value } : t
    ));
  };

  const handleSpawnVillager = () => {
    const tribe = tribes.find(t => t.id === selectedTribeId);
    if (!tribe) {
      toast({ title: "Select a tribe first!", variant: "destructive" });
      return;
    }
    
    if (tribe.food < 50) {
      toast({ 
        title: "Not enough food!", 
        description: "Need 50 food to summon a new villager.", 
        variant: "destructive" 
      });
      return;
    }

    // Deduct cost
    setTribes(prev => prev.map(t => 
      t.id === selectedTribeId ? { ...t, food: t.food - 50 } : t
    ));

    // Create new villager
    const newVillager = spawnVillager(tribe);
    setVillagers(prev => [...prev, newVillager]);
    
    setGameEvents(prev => [...prev, {
      tick: gameState?.gameTick || 0,
      type: 'birth',
      message: `${newVillager.name} was summoned by divine power to join ${tribe.name}!`,
      tribeId: tribe.id,
      villagerId: newVillager.id,
    }]);
    
    toast({ 
      title: "🌟 Divine summoning!", 
      description: `${newVillager.name} has been brought into existence.` 
    });
  };

  const handleHealVillager = (id: number) => {
    const tribe = tribes.find(t => t.id === selectedTribeId);
    if (!tribe || tribe.techPoints < 10) {
      toast({ title: "Not enough Tech Points!", variant: "destructive" });
      return;
    }

    setTribes(prev => prev.map(t => 
      t.id === selectedTribeId ? { ...t, techPoints: t.techPoints - 10 } : t
    ));
    
    setVillagers(prev => prev.map(v => v.id === id ? { ...v, health: 100 } : v));
    toast({ title: "💖 Villager healed!", description: "Divine power restored their health." });
  };

  const handleSelectTribe = (tribeId: number) => {
    setSelectedTribeId(tribeId);
    setSelectedVillagerId(null);
    
    // Focus camera on tribe
    const tribe = tribes.find(t => t.id === tribeId);
    if (tribe) {
      setCamera(prev => focusOn(prev, tribe.centerX, tribe.centerY, 1.2));
    }
  };

  const handleToggleSetting = (setting: 'immigrationEnabled' | 'tribeSplittingEnabled' | 'randomEventsEnabled') => {
    if (!gameState) return;
    setGameState(prev => prev ? { ...prev, [setting]: !prev[setting] } : null);
  };

  const handleCameraChange = useCallback((newCamera: CameraState) => {
    setCamera(newCamera);
  }, []);

  // --- Building handlers ---
  const handleSelectBuildingType = useCallback((type: BuildingType | null) => {
    if (type) {
      setSelectedBuildingType(type);
      setIsPlacingBuilding(true);
      playUISound('click');
    } else {
      setSelectedBuildingType(null);
      setIsPlacingBuilding(false);
    }
  }, [playUISound]);

  const handlePlaceBuilding = useCallback((worldX: number, worldY: number) => {
    if (!selectedBuildingType || !selectedTribeId) return;
    
    const tribe = tribes.find(t => t.id === selectedTribeId);
    if (!tribe) return;
    
    // Check if can afford
    if (!canAffordBuilding(tribe, selectedBuildingType)) {
      toast({
        title: "Not enough resources!",
        description: "Gather more resources to construct this building.",
        variant: "destructive",
      });
      return;
    }
    
    // Check valid position
    if (!isValidBuildingPosition(
      worldX, 
      worldY, 
      selectedBuildingType, 
      buildings,
      { x: tribe.centerX, y: tribe.centerY, radius: tribe.territoryRadius }
    )) {
      toast({
        title: "Invalid location!",
        description: "Buildings must be placed within your tribe's territory.",
        variant: "destructive",
      });
      return;
    }
    
    const def = BUILDING_DEFINITIONS[selectedBuildingType];
    
    // Deduct resources
    setTribes(prev => prev.map(t => 
      t.id === selectedTribeId ? {
        ...t,
        wood: t.wood - def.cost.wood,
        stone: t.stone - def.cost.stone,
        food: t.food - def.cost.food,
      } : t
    ));
    
    // Create building
    const newBuilding = createBuilding(
      selectedTribeId,
      selectedBuildingType,
      worldX,
      worldY,
      gameState?.gameTick || 0
    );
    
    setBuildings(prev => [...prev, newBuilding]);
    
    // Play sound and show toast
    playBuildingSound('start', worldX, worldY, camera);
    playUISound('success');
    
    toast({
      title: "🏗️ Construction started!",
      description: `Building ${def.name}...`,
      duration: 2000,
    });
    
    // Reset placement mode
    setSelectedBuildingType(null);
    setIsPlacingBuilding(false);
  }, [selectedBuildingType, selectedTribeId, tribes, buildings, gameState, camera, playBuildingSound, playUISound, toast]);

  const handleCancelPlacement = useCallback(() => {
    setSelectedBuildingType(null);
    setIsPlacingBuilding(false);
  }, []);

  // --- Villager action sound handler ---
  const handleVillagerAction = useCallback((villager: Villager) => {
    playActionSound(villager, camera);
  }, [playActionSound, camera]);

  // --- Sound settings handlers ---
  const handleSoundSettingsChange = useCallback((settings: SoundSettings) => {
    setSoundSettings(settings);
  }, []);

  const handleToggleMute = useCallback(() => {
    const newMuted = toggleMute();
    setSoundSettings(prev => ({ ...prev, isMuted: newMuted ?? false }));
  }, [toggleMute]);

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
  const selectedTribe = tribes.find(t => t.id === selectedTribeId) || null;
  const selectedVillagerTribe = selectedVillager ? tribes.find(t => t.id === selectedVillager.tribeId) : null;

  return (
    <div className="min-h-screen bg-[#dcd0b3] p-2 md:p-4 font-sans text-foreground overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-3">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-pixel text-primary drop-shadow-sm">ISOLA: REBORN</h1>
            <p className="text-xs md:text-sm font-retro text-muted-foreground uppercase tracking-widest">
              Day {Math.floor(gameState.gameTick / 100)} of the New Era
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="font-pixel text-xs"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            
            <SoundToggleButton 
              isMuted={isMuted} 
              onClick={handleToggleMute} 
            />
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="font-pixel text-xs"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            {gameState.godModeEnabled && (
              <Button 
                onClick={handleSpawnVillager} 
                className="retro-btn bg-primary text-white font-pixel text-xs border-primary-foreground/20"
                disabled={!selectedTribeId}
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">Summon Villager (50 Food)</span>
                <span className="md:hidden">Summon</span>
              </Button>
            )}
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="retro-box p-4 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* World Settings */}
              <div>
                <h3 className="font-pixel text-sm mb-3">World Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Natural Immigration</span>
                    <Switch 
                      checked={gameState.immigrationEnabled} 
                      onCheckedChange={() => handleToggleSetting('immigrationEnabled')} 
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Tribe Splitting</span>
                    <Switch 
                      checked={gameState.tribeSplittingEnabled} 
                      onCheckedChange={() => handleToggleSetting('tribeSplittingEnabled')} 
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Random Events</span>
                    <Switch 
                      checked={gameState.randomEventsEnabled} 
                      onCheckedChange={() => handleToggleSetting('randomEventsEnabled')} 
                    />
                  </label>
                </div>
              </div>
              
              {/* Sound Settings */}
              <div>
                <h3 className="font-pixel text-sm mb-3">Sound Settings</h3>
                <SoundSettingsPanel
                  settings={soundSettings}
                  onSettingsChange={handleSoundSettingsChange}
                  onCategoryVolumeChange={setCategoryVolume}
                  onToggleMute={handleToggleMute}
                />
              </div>
            </div>
          </div>
        )}

        {/* Resources */}
        <ResourceBar 
          tribe={selectedTribe}
          villagers={villagers}
          totalPopulation={villagers.filter(v => !v.isDead).length}
          totalTribes={tribes.length}
          gameTick={gameState.gameTick}
          gameSpeed={gameState.gameSpeed}
        />

        {/* Main Content Grid */}
        <div className="flex gap-3">
          
          {/* Left Sidebar - Tribes & Events */}
          <aside className={`
            transition-all duration-300 flex flex-col gap-3
            ${leftPanelOpen ? 'w-72' : 'w-8'}
          `}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className="self-end md:hidden"
            >
              {leftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            
            {leftPanelOpen && (
              <>
                <TribesOverview 
                  tribes={tribes}
                  villagers={villagers}
                  selectedTribeId={selectedTribeId}
                  onSelectTribe={handleSelectTribe}
                />
                
                <BuildingPanel
                  tribe={selectedTribe}
                  buildings={buildings}
                  onSelectBuilding={handleSelectBuildingType}
                  selectedBuildingType={selectedBuildingType}
                  isPlacingBuilding={isPlacingBuilding}
                />
                
                <EventLog 
                  events={gameEvents}
                  currentTick={gameState.gameTick}
                />
              </>
            )}
          </aside>

          {/* Center: Game World */}
          <main className="flex-1 relative">
            <GameCanvas 
              villagers={villagers}
              tribes={tribes}
              worldEvents={worldEvents}
              terrain={terrain}
              buildings={buildings}
              onVillagerClick={(v) => setSelectedVillagerId(v.id)}
              selectedVillagerId={selectedVillagerId || undefined}
              selectedTribeId={selectedTribeId || undefined}
              onTribeClick={handleSelectTribe}
              camera={camera}
              onCameraChange={handleCameraChange}
              isPlacingBuilding={isPlacingBuilding}
              placingBuildingType={selectedBuildingType}
              onPlaceBuilding={handlePlaceBuilding}
              onCancelPlacement={handleCancelPlacement}
              onVillagerAction={handleVillagerAction}
            />
            
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl pointer-events-none">
                <div className="bg-white/90 px-6 py-3 rounded-lg font-pixel text-xl">
                  ⏸️ PAUSED
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar - Priority Controls */}
          <aside className="hidden lg:block">
            <PriorityPanel 
              tribe={selectedTribe} 
              onUpdate={handlePriorityUpdate} 
            />
          </aside>
        </div>

        {/* Mobile Priority Panel */}
        <div className="lg:hidden">
          <PriorityPanel 
            tribe={selectedTribe} 
            onUpdate={handlePriorityUpdate} 
          />
        </div>

        {/* Inspector Overlay */}
        <VillagerInspector 
          villager={selectedVillager}
          tribe={selectedVillagerTribe || null}
          onClose={() => setSelectedVillagerId(null)}
          onHeal={handleHealVillager}
        />
        
      </div>
    </div>
  );
}
