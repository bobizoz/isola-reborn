import { db } from "./db";
import {
  villagers,
  gameState,
  tribes,
  worldEvents,
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
import { eq } from "drizzle-orm";

export interface IStorage {
  // Game State
  getGameState(): Promise<FullGameResponse>;
  updateGameState(state: Partial<InsertGameState>): Promise<GameState>;
  resetGame(): Promise<void>;
  
  // Tribes
  createTribe(tribe: InsertTribe): Promise<Tribe>;
  updateTribe(id: number, updates: Partial<InsertTribe>): Promise<Tribe>;
  deleteTribe(id: number): Promise<void>;
  
  // Villagers
  createVillager(villager: InsertVillager): Promise<Villager>;
  updateVillager(id: number, updates: Partial<InsertVillager>): Promise<Villager>;
  deleteVillager(id: number): Promise<void>;
  
  // Sync
  syncGame(state: Partial<InsertGameState>, tribesList: any[], villagersList: any[]): Promise<void>;
}

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

export class DatabaseStorage implements IStorage {
  async getGameState(): Promise<FullGameResponse> {
    // Get or create initial game state
    let state = await db.select().from(gameState).limit(1);
    
    if (state.length === 0) {
      const [newState] = await db.insert(gameState).values({
        gameSpeed: 1,
        godModeEnabled: true,
        immigrationEnabled: true,
        tribeSplittingEnabled: true,
        randomEventsEnabled: true,
        selectedTribeId: 1,
      }).returning();
      state = [newState];
      
      // Seed initial tribe and villagers if new game
      await this.seedInitialData();
    }
    
    const allTribes = await db.select().from(tribes);
    const allVillagers = await db.select().from(villagers);
    const allEvents = await db.select().from(worldEvents);
    
    return {
      gameState: state[0],
      tribes: allTribes,
      villagers: allVillagers,
      worldEvents: allEvents,
    };
  }
  
  async seedInitialData() {
    // Create the initial player tribe
    const [playerTribe] = await db.insert(tribes).values({
      name: "The First Tribe",
      color: TRIBE_COLORS[0],
      food: 150,
      wood: 75,
      stone: 25,
      techPoints: 0,
      centerX: 400,
      centerY: 300,
      territoryRadius: 150,
      isPlayerTribe: true,
      foundedTick: 0,
    }).returning();

    // Seed 3-4 initial villagers (random between 3 and 4)
    const numVillagers = Math.random() > 0.5 ? 4 : 3;
    const initialVillagers: InsertVillager[] = [];
    
    // First villager - adult male
    initialVillagers.push({
      tribeId: playerTribe.id,
      name: randomName("male"),
      gender: "male",
      age: 20 + Math.floor(Math.random() * 10),
      posX: playerTribe.centerX - 20 + Math.random() * 40,
      posY: playerTribe.centerY - 20 + Math.random() * 40,
      skillFarming: 15 + Math.floor(Math.random() * 20),
      skillBuilding: 10 + Math.floor(Math.random() * 15),
      skillGathering: 10 + Math.floor(Math.random() * 15),
      traits: randomTraits(2),
      skinColor: randomSkinColor(),
      hairColor: randomHairColor(),
    });
    
    // Second villager - adult female
    initialVillagers.push({
      tribeId: playerTribe.id,
      name: randomName("female"),
      gender: "female",
      age: 18 + Math.floor(Math.random() * 10),
      posX: playerTribe.centerX - 20 + Math.random() * 40,
      posY: playerTribe.centerY - 20 + Math.random() * 40,
      skillFarming: 10 + Math.floor(Math.random() * 20),
      skillResearch: 10 + Math.floor(Math.random() * 15),
      skillHealing: 5 + Math.floor(Math.random() * 10),
      traits: randomTraits(2),
      skinColor: randomSkinColor(),
      hairColor: randomHairColor(),
    });
    
    // Third villager - young adult
    const thirdGender = Math.random() > 0.5 ? "male" : "female";
    initialVillagers.push({
      tribeId: playerTribe.id,
      name: randomName(thirdGender),
      gender: thirdGender,
      age: 16 + Math.floor(Math.random() * 6),
      posX: playerTribe.centerX - 20 + Math.random() * 40,
      posY: playerTribe.centerY - 20 + Math.random() * 40,
      skillGathering: 10 + Math.floor(Math.random() * 15),
      traits: randomTraits(2),
      skinColor: randomSkinColor(),
      hairColor: randomHairColor(),
    });
    
    // Fourth villager (50% chance)
    if (numVillagers === 4) {
      const fourthGender = Math.random() > 0.5 ? "male" : "female";
      initialVillagers.push({
        tribeId: playerTribe.id,
        name: randomName(fourthGender),
        gender: fourthGender,
        age: 5 + Math.floor(Math.random() * 15), // Could be child or young adult
        posX: playerTribe.centerX - 20 + Math.random() * 40,
        posY: playerTribe.centerY - 20 + Math.random() * 40,
        traits: randomTraits(1),
        skinColor: randomSkinColor(),
        hairColor: randomHairColor(),
      });
    }
    
    await db.insert(villagers).values(initialVillagers);
  }

  async updateGameState(updates: Partial<InsertGameState>): Promise<GameState> {
    const all = await db.select().from(gameState);
    if (all.length === 0) {
      const [newState] = await db.insert(gameState).values(updates as any).returning();
      return newState;
    }
    
    const [updated] = await db.update(gameState)
      .set(updates)
      .where(eq(gameState.id, all[0].id))
      .returning();
      
    return updated;
  }

  async resetGame(): Promise<void> {
    await db.delete(worldEvents);
    await db.delete(villagers);
    await db.delete(tribes);
    await db.delete(gameState);
    await this.getGameState(); // Re-seeds
  }

  // Tribe operations
  async createTribe(tribe: InsertTribe): Promise<Tribe> {
    const [newTribe] = await db.insert(tribes).values(tribe).returning();
    return newTribe;
  }

  async updateTribe(id: number, updates: Partial<InsertTribe>): Promise<Tribe> {
    const [updated] = await db.update(tribes)
      .set(updates)
      .where(eq(tribes.id, id))
      .returning();
    return updated;
  }

  async deleteTribe(id: number): Promise<void> {
    // Also delete all villagers of this tribe
    await db.delete(villagers).where(eq(villagers.tribeId, id));
    await db.delete(tribes).where(eq(tribes.id, id));
  }

  // Villager operations
  async createVillager(villager: InsertVillager): Promise<Villager> {
    const [newVillager] = await db.insert(villagers).values(villager).returning();
    return newVillager;
  }

  async updateVillager(id: number, updates: Partial<InsertVillager>): Promise<Villager> {
    const [updated] = await db.update(villagers)
      .set(updates)
      .where(eq(villagers.id, id))
      .returning();
    return updated;
  }

  async deleteVillager(id: number): Promise<void> {
    await db.delete(villagers).where(eq(villagers.id, id));
  }
  
  async syncGame(
    stateUpdates: Partial<InsertGameState>, 
    tribesList: any[], 
    villagersList: any[]
  ): Promise<void> {
    // 1. Update global state
    if (Object.keys(stateUpdates).length > 0) {
      await this.updateGameState(stateUpdates);
    }
    
    // 2. Sync tribes
    for (const t of tribesList) {
      if (t.id) {
        await db.update(tribes).set(t).where(eq(tribes.id, t.id));
      } else {
        await db.insert(tribes).values(t);
      }
    }
    
    // 3. Sync villagers - handle dead villagers by deleting them
    const deadVillagerIds = villagersList
      .filter(v => v.isDead && v.id)
      .map(v => v.id);
    
    for (const v of villagersList) {
      if (v.isDead && v.id) {
        // Delete dead villagers from DB
        await db.delete(villagers).where(eq(villagers.id, v.id));
      } else if (v.id) {
        await db.update(villagers).set(v).where(eq(villagers.id, v.id));
      } else if (!v.isDead) {
        await db.insert(villagers).values(v);
      }
    }
  }
}

export const storage = new DatabaseStorage();
