import { db } from "./db";
import {
  villagers,
  gameState,
  type Villager,
  type InsertVillager,
  type GameState,
  type InsertGameState,
  type FullGameResponse
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Game State
  getGameState(): Promise<FullGameResponse>;
  updateGameState(state: Partial<InsertGameState>): Promise<GameState>;
  resetGame(): Promise<void>;
  
  // Villagers
  createVillager(villager: InsertVillager): Promise<Villager>;
  updateVillager(id: number, updates: Partial<InsertVillager>): Promise<Villager>;
  deleteVillager(id: number): Promise<void>;
  syncGame(state: Partial<InsertGameState>, villagersList: any[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getGameState(): Promise<FullGameResponse> {
    // Get or create initial game state
    let state = await db.select().from(gameState).limit(1);
    
    if (state.length === 0) {
      const [newState] = await db.insert(gameState).values({
        food: 100,
        wood: 50,
        stone: 0,
        techPoints: 0,
        gameSpeed: 1,
        priorityFarming: 5,
        priorityBuilding: 5,
        priorityResearch: 2,
        priorityGathering: 5
      }).returning();
      state = [newState];
      
      // Seed initial villagers if new game
      await this.seedVillagers();
    }
    
    const allVillagers = await db.select().from(villagers);
    
    return {
      gameState: state[0],
      villagers: allVillagers
    };
  }
  
  async seedVillagers() {
    const seeds: InsertVillager[] = [
      { name: "Adam", gender: "male", age: 20, posX: 400, posY: 300, skillFarming: 20, skillBuilding: 10, traits: ["Hardworking", "Fast Learner"] },
      { name: "Eve", gender: "female", age: 19, posX: 420, posY: 300, skillFarming: 15, skillResearch: 10, traits: ["Wise", "Nurturing"] },
      { name: "Cain", gender: "male", age: 2, posX: 410, posY: 320, traits: ["Curious"] },
    ];
    
    await db.insert(villagers).values(seeds);
  }

  async updateGameState(updates: Partial<InsertGameState>): Promise<GameState> {
    const [updated] = await db.update(gameState)
      .set(updates)
      // Assuming single player single row for MVP, ID 1 or just update all
      .where(eq(gameState.id, 1)) // We might need to handle ID fetching better
      .returning();
      
    // Fallback if update fails (e.g. ID mismatch), try fetching any
    if (!updated) {
       const all = await db.select().from(gameState);
       if (all.length > 0) {
         return (await db.update(gameState).set(updates).where(eq(gameState.id, all[0].id)).returning())[0];
       }
    }
    return updated;
  }

  async resetGame(): Promise<void> {
    await db.delete(villagers);
    await db.delete(gameState);
    await this.getGameState(); // Re-seeds
  }

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
  
  async syncGame(stateUpdates: Partial<InsertGameState>, villagersList: any[]): Promise<void> {
    // 1. Update global state
    if (Object.keys(stateUpdates).length > 0) {
      await this.updateGameState(stateUpdates);
    }
    
    // 2. Upsert villagers (simplified sync)
    // For MVP, we might just update existing ones and insert new ones.
    // Handling deletions in sync is trickier, maybe ignore for now or handle explicitly.
    
    for (const v of villagersList) {
      if (v.id) {
        await db.update(villagers).set(v).where(eq(villagers.id, v.id));
      } else {
        await db.insert(villagers).values(v);
      }
    }
  }
}

export const storage = new DatabaseStorage();
