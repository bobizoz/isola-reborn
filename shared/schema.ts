import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const villagers = pgTable("villagers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  gender: text("gender").notNull(), // 'male', 'female'
  age: integer("age").notNull(), // in years
  
  // Vitals
  health: integer("health").notNull().default(100),
  energy: integer("energy").notNull().default(100),
  hunger: integer("hunger").notNull().default(0),
  happiness: integer("happiness").notNull().default(100),
  
  // Skills (0-100)
  skillFarming: integer("skill_farming").notNull().default(0),
  skillBuilding: integer("skill_building").notNull().default(0),
  skillResearch: integer("skill_research").notNull().default(0),
  skillGathering: integer("skill_gathering").notNull().default(0),
  skillHealing: integer("skill_healing").notNull().default(0),

  // State & Behavior
  action: text("action").notNull().default("idle"), // idle, farming, building, eating, sleeping
  isPregnant: boolean("is_pregnant").default(false),
  pregnancyProgress: integer("pregnancy_progress").default(0), // 0-100
  
  // Visuals
  skinColor: text("skin_color").notNull().default("#f5d0b0"),
  hairColor: text("hair_color").notNull().default("#4a3b2a"),
  
  // Position
  posX: integer("pos_x").notNull().default(400),
  posY: integer("pos_y").notNull().default(300),
});

export const gameState = pgTable("game_state", {
  id: serial("id").primaryKey(),
  // Resources
  food: integer("food").notNull().default(50),
  wood: integer("wood").notNull().default(50),
  stone: integer("stone").notNull().default(0),
  techPoints: integer("tech_points").notNull().default(0),
  
  // Game Settings & Time
  gameTick: integer("game_tick").notNull().default(0),
  gameSpeed: integer("game_speed").notNull().default(1),
  
  // Global Priorities (0-10)
  priorityFarming: integer("priority_farming").notNull().default(5),
  priorityBuilding: integer("priority_building").notNull().default(5),
  priorityResearch: integer("priority_research").notNull().default(2),
  priorityGathering: integer("priority_gathering").notNull().default(5),
});

// === SCHEMAS ===

export const insertVillagerSchema = createInsertSchema(villagers).omit({ id: true });
export const insertGameStateSchema = createInsertSchema(gameState).omit({ id: true });

// === EXPLICIT TYPES ===

export type Villager = typeof villagers.$inferSelect;
export type InsertVillager = z.infer<typeof insertVillagerSchema>;
export type GameState = typeof gameState.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;

// Request types
export type UpdateVillagerRequest = Partial<InsertVillager>;
export type UpdateGameStateRequest = Partial<InsertGameState>;
export type SpawnVillagerRequest = {
  name?: string;
  gender?: 'male' | 'female';
  age?: number;
  parents?: [number, number]; // Optional IDs of parents
};

// Response types
export interface FullGameResponse {
  gameState: GameState;
  villagers: Villager[];
}
