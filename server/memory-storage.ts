/**
 * In-memory storage for CodeSandbox/browser environments
 * No database required - all data stored in memory
 */

import {
  type Villager,
  type InsertVillager,
  type GameState,
  type InsertGameState,
  type Tribe,
  type InsertTribe,
  type WorldEvent,
  type FullGameResponse,
  VILLAGER_NAMES,
  TRIBE_COLORS,
  TRAIT_POOL,
} from "@shared/schema";
import { IStorage } from "./storage";

// Helper functions for random generation
function randomName(gender: 'male' | 'female'): string {
  const names = VILLAGER_NAMES[gender];
  return names[Math.floor(Math.random() * names.length)];
}

function randomTraits(count: number = 2): string[] {
  const shuffled = [...TRAIT_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomSkinColor(): string {
  const colors = ["#f5d0b0", "#d4a574", "#8d5524", "#c68642", "#e0ac69", "#ffdbac"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function randomHairColor(): string {
  const colors = ["#4a3b2a", "#2c1810", "#8b4513", "#d4a574", "#1a1a1a", "#8b0000", "#ffd700"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export class MemoryStorage implements IStorage {
  private gameStateData: GameState | null = null;
  private tribesData: Tribe[] = [];
  private villagersData: Villager[] = [];
  private worldEventsData: WorldEvent[] = [];
  private nextId = 1;

  private generateId(): number {
    return this.nextId++;
  }

  async getGameState(): Promise<FullGameResponse> {
    if (!this.gameStateData) {
      // Initialize with default game state
      this.gameStateData = {
        id: 1,
        gameTick: 0,
        gameSpeed: 1,
        godModeEnabled: true,
        immigrationEnabled: true,
        tribeSplittingEnabled: true,
        randomEventsEnabled: true,
        recentEvents: "[]",
        achievements: [],
        selectedTribeId: 1,
      };
      
      // Seed initial data
      await this.seedInitialData();
    }
    
    return {
      gameState: this.gameStateData,
      tribes: [...this.tribesData],
      villagers: [...this.villagersData],
      worldEvents: [...this.worldEventsData],
    };
  }

  async seedInitialData() {
    // Create the initial player tribe
    const playerTribe: Tribe = {
      id: this.generateId(),
      name: "The First Tribe",
      color: TRIBE_COLORS[0],
      food: 150,
      wood: 75,
      stone: 25,
      techPoints: 0,
      centerX: 1200,
      centerY: 1000,
      territoryRadius: 220,
      priorityFarming: 5,
      priorityBuilding: 5,
      priorityResearch: 2,
      priorityGathering: 5,
      priorityDefense: 3,
      diplomacy: "{}",
      isPlayerTribe: true,
      foundedTick: 0,
    };
    
    this.tribesData.push(playerTribe);

    // Seed 3-4 initial villagers
    const numVillagers = Math.random() > 0.5 ? 4 : 3;
    
    // First villager - adult male
    this.villagersData.push({
      id: this.generateId(),
      tribeId: playerTribe.id,
      name: randomName("male"),
      gender: "male",
      age: 20 + Math.floor(Math.random() * 10),
      health: 100,
      energy: 100,
      hunger: 0,
      happiness: 100,
      posX: playerTribe.centerX - 20 + Math.random() * 40,
      posY: playerTribe.centerY - 20 + Math.random() * 40,
      skillFarming: 15 + Math.floor(Math.random() * 20),
      skillBuilding: 10 + Math.floor(Math.random() * 15),
      skillResearch: 0,
      skillGathering: 10 + Math.floor(Math.random() * 15),
      skillHealing: 0,
      skillCombat: 0,
      action: "idle",
      targetX: null,
      targetY: null,
      isPregnant: false,
      pregnancyProgress: 0,
      traits: randomTraits(2),
      skinColor: randomSkinColor(),
      hairColor: randomHairColor(),
      thought: null,
      causeOfDeath: null,
      isDead: false,
    });
    
    // Second villager - adult female
    this.villagersData.push({
      id: this.generateId(),
      tribeId: playerTribe.id,
      name: randomName("female"),
      gender: "female",
      age: 18 + Math.floor(Math.random() * 10),
      health: 100,
      energy: 100,
      hunger: 0,
      happiness: 100,
      posX: playerTribe.centerX - 20 + Math.random() * 40,
      posY: playerTribe.centerY - 20 + Math.random() * 40,
      skillFarming: 10 + Math.floor(Math.random() * 20),
      skillBuilding: 0,
      skillResearch: 10 + Math.floor(Math.random() * 15),
      skillGathering: 0,
      skillHealing: 5 + Math.floor(Math.random() * 10),
      skillCombat: 0,
      action: "idle",
      targetX: null,
      targetY: null,
      isPregnant: false,
      pregnancyProgress: 0,
      traits: randomTraits(2),
      skinColor: randomSkinColor(),
      hairColor: randomHairColor(),
      thought: null,
      causeOfDeath: null,
      isDead: false,
    });
    
    // Third villager
    const thirdGender = Math.random() > 0.5 ? "male" : "female";
    this.villagersData.push({
      id: this.generateId(),
      tribeId: playerTribe.id,
      name: randomName(thirdGender as 'male' | 'female'),
      gender: thirdGender,
      age: 16 + Math.floor(Math.random() * 6),
      health: 100,
      energy: 100,
      hunger: 0,
      happiness: 100,
      posX: playerTribe.centerX - 20 + Math.random() * 40,
      posY: playerTribe.centerY - 20 + Math.random() * 40,
      skillFarming: 0,
      skillBuilding: 0,
      skillResearch: 0,
      skillGathering: 10 + Math.floor(Math.random() * 15),
      skillHealing: 0,
      skillCombat: 0,
      action: "idle",
      targetX: null,
      targetY: null,
      isPregnant: false,
      pregnancyProgress: 0,
      traits: randomTraits(2),
      skinColor: randomSkinColor(),
      hairColor: randomHairColor(),
      thought: null,
      causeOfDeath: null,
      isDead: false,
    });
    
    // Fourth villager (50% chance)
    if (numVillagers === 4) {
      const fourthGender = Math.random() > 0.5 ? "male" : "female";
      this.villagersData.push({
        id: this.generateId(),
        tribeId: playerTribe.id,
        name: randomName(fourthGender as 'male' | 'female'),
        gender: fourthGender,
        age: 5 + Math.floor(Math.random() * 15),
        health: 100,
        energy: 100,
        hunger: 0,
        happiness: 100,
        posX: playerTribe.centerX - 20 + Math.random() * 40,
        posY: playerTribe.centerY - 20 + Math.random() * 40,
        skillFarming: 0,
        skillBuilding: 0,
        skillResearch: 0,
        skillGathering: 0,
        skillHealing: 0,
        skillCombat: 0,
        action: "idle",
        targetX: null,
        targetY: null,
        isPregnant: false,
        pregnancyProgress: 0,
        traits: randomTraits(1),
        skinColor: randomSkinColor(),
        hairColor: randomHairColor(),
        thought: null,
        causeOfDeath: null,
        isDead: false,
      });
    }
  }

  async updateGameState(updates: Partial<InsertGameState>): Promise<GameState> {
    if (!this.gameStateData) {
      await this.getGameState();
    }
    
    this.gameStateData = { ...this.gameStateData!, ...updates } as GameState;
    return this.gameStateData;
  }

  async resetGame(): Promise<void> {
    this.gameStateData = null;
    this.tribesData = [];
    this.villagersData = [];
    this.worldEventsData = [];
    this.nextId = 1;
    await this.getGameState();
  }

  async createTribe(tribe: InsertTribe): Promise<Tribe> {
    const newTribe: Tribe = {
      ...tribe,
      id: this.generateId(),
      food: tribe.food ?? 100,
      wood: tribe.wood ?? 50,
      stone: tribe.stone ?? 0,
      techPoints: tribe.techPoints ?? 0,
      priorityFarming: tribe.priorityFarming ?? 5,
      priorityBuilding: tribe.priorityBuilding ?? 5,
      priorityResearch: tribe.priorityResearch ?? 2,
      priorityGathering: tribe.priorityGathering ?? 5,
      priorityDefense: tribe.priorityDefense ?? 3,
      diplomacy: tribe.diplomacy ?? "{}",
      isPlayerTribe: tribe.isPlayerTribe ?? false,
      foundedTick: tribe.foundedTick ?? 0,
    } as Tribe;
    
    this.tribesData.push(newTribe);
    return newTribe;
  }

  async updateTribe(id: number, updates: Partial<InsertTribe>): Promise<Tribe> {
    const index = this.tribesData.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Tribe ${id} not found`);
    
    this.tribesData[index] = { ...this.tribesData[index], ...updates };
    return this.tribesData[index];
  }

  async deleteTribe(id: number): Promise<void> {
    this.villagersData = this.villagersData.filter(v => v.tribeId !== id);
    this.tribesData = this.tribesData.filter(t => t.id !== id);
  }

  async createVillager(villager: InsertVillager): Promise<Villager> {
    const newVillager: Villager = {
      ...villager,
      id: this.generateId(),
      health: villager.health ?? 100,
      energy: villager.energy ?? 100,
      hunger: villager.hunger ?? 0,
      happiness: villager.happiness ?? 100,
      skillFarming: villager.skillFarming ?? 0,
      skillBuilding: villager.skillBuilding ?? 0,
      skillResearch: villager.skillResearch ?? 0,
      skillGathering: villager.skillGathering ?? 0,
      skillHealing: villager.skillHealing ?? 0,
      skillCombat: villager.skillCombat ?? 0,
      action: villager.action ?? "idle",
      targetX: villager.targetX ?? null,
      targetY: villager.targetY ?? null,
      isPregnant: villager.isPregnant ?? false,
      pregnancyProgress: villager.pregnancyProgress ?? 0,
      traits: villager.traits ?? [],
      thought: villager.thought ?? null,
      causeOfDeath: villager.causeOfDeath ?? null,
      isDead: villager.isDead ?? false,
    } as Villager;
    
    this.villagersData.push(newVillager);
    return newVillager;
  }

  async updateVillager(id: number, updates: Partial<InsertVillager>): Promise<Villager> {
    const index = this.villagersData.findIndex(v => v.id === id);
    if (index === -1) throw new Error(`Villager ${id} not found`);
    
    this.villagersData[index] = { ...this.villagersData[index], ...updates };
    return this.villagersData[index];
  }

  async deleteVillager(id: number): Promise<void> {
    this.villagersData = this.villagersData.filter(v => v.id !== id);
  }

  async syncGame(
    stateUpdates: Partial<InsertGameState>,
    tribesList: any[],
    villagersList: any[]
  ): Promise<void> {
    if (Object.keys(stateUpdates).length > 0) {
      await this.updateGameState(stateUpdates);
    }
    
    // Sync tribes
    for (const t of tribesList) {
      const index = this.tribesData.findIndex(tr => tr.id === t.id);
      if (index >= 0) {
        this.tribesData[index] = { ...this.tribesData[index], ...t };
      } else {
        this.tribesData.push(t);
      }
    }
    
    // Sync villagers
    for (const v of villagersList) {
      if (v.isDead && v.id) {
        this.villagersData = this.villagersData.filter(vl => vl.id !== v.id);
      } else {
        const index = this.villagersData.findIndex(vl => vl.id === v.id);
        if (index >= 0) {
          this.villagersData[index] = { ...this.villagersData[index], ...v };
        } else if (!v.isDead) {
          this.villagersData.push(v);
        }
      }
    }
  }
}
