import { pgTable, text, serial, integer, boolean, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Tribes table - each tribe has its own resources and territory
export const tribes = pgTable("tribes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4a90a4"), // Tribe banner color
  
  // Resources (tribe stockpile)
  food: real("food").notNull().default(100),
  wood: real("wood").notNull().default(50),
  stone: real("stone").notNull().default(0),
  techPoints: real("tech_points").notNull().default(0),
  
  // Territory center
  centerX: integer("center_x").notNull().default(400),
  centerY: integer("center_y").notNull().default(300),
  territoryRadius: integer("territory_radius").notNull().default(150),
  
  // Priorities (0-10)
  priorityFarming: integer("priority_farming").notNull().default(5),
  priorityBuilding: integer("priority_building").notNull().default(5),
  priorityResearch: integer("priority_research").notNull().default(2),
  priorityGathering: integer("priority_gathering").notNull().default(5),
  priorityDefense: integer("priority_defense").notNull().default(3),
  
  // Diplomacy standings (JSON string of tribe relations)
  diplomacy: text("diplomacy").default("{}"),
  
  // Flags
  isPlayerTribe: boolean("is_player_tribe").notNull().default(false),
  foundedTick: integer("founded_tick").notNull().default(0),
});

export const villagers = pgTable("villagers", {
  id: serial("id").primaryKey(),
  tribeId: integer("tribe_id").notNull().default(1), // Which tribe this villager belongs to
  name: text("name").notNull(),
  gender: text("gender").notNull(), // 'male', 'female'
  age: integer("age").notNull(), // in years
  
  // Vitals
  health: real("health").notNull().default(100),
  energy: real("energy").notNull().default(100),
  hunger: real("hunger").notNull().default(0),
  happiness: real("happiness").notNull().default(100),
  
  // Skills (0-100)
  skillFarming: integer("skill_farming").notNull().default(0),
  skillBuilding: integer("skill_building").notNull().default(0),
  skillResearch: integer("skill_research").notNull().default(0),
  skillGathering: integer("skill_gathering").notNull().default(0),
  skillHealing: integer("skill_healing").notNull().default(0),
  skillCombat: integer("skill_combat").notNull().default(0),

  // State & Behavior
  action: text("action").notNull().default("idle"), // idle, farming, building, eating, sleeping, fleeing
  targetX: integer("target_x"), // Current movement target
  targetY: integer("target_y"),
  isPregnant: boolean("is_pregnant").default(false),
  pregnancyProgress: integer("pregnancy_progress").default(0), // 0-100
  
  // Visuals
  skinColor: text("skin_color").notNull().default("#f5d0b0"),
  hairColor: text("hair_color").notNull().default("#4a3b2a"),
  
  // Position
  posX: real("pos_x").notNull().default(400),
  posY: real("pos_y").notNull().default(300),
  
  // Additional traits and status
  traits: text("traits").array().notNull().default(sql`ARRAY[]::text[]`),
  thought: text("thought"),
  causeOfDeath: text("cause_of_death"), // null if alive
  isDead: boolean("is_dead").notNull().default(false),
});

export const gameState = pgTable("game_state", {
  id: serial("id").primaryKey(),
  
  // Game Time
  gameTick: integer("game_tick").notNull().default(0),
  gameSpeed: integer("game_speed").notNull().default(1),
  
  // Global Settings
  godModeEnabled: boolean("god_mode_enabled").notNull().default(true),
  immigrationEnabled: boolean("immigration_enabled").notNull().default(true),
  tribeSplittingEnabled: boolean("tribe_splitting_enabled").notNull().default(true),
  randomEventsEnabled: boolean("random_events_enabled").notNull().default(true),
  
  // Event log (last N events as JSON array)
  recentEvents: text("recent_events").default("[]"),
  
  // Achievements (stored as array of strings)
  achievements: text("achievements").array().notNull().default(sql`ARRAY[]::text[]`),
  
  // Selected tribe for UI focus
  selectedTribeId: integer("selected_tribe_id").default(1),
});

// Events/Dangers on the map
export const worldEvents = pgTable("world_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'wildAnimal', 'disease', 'fire', 'storm', 'blessing'
  posX: integer("pos_x").notNull(),
  posY: integer("pos_y").notNull(),
  radius: integer("radius").notNull().default(50),
  severity: integer("severity").notNull().default(1), // 1-5
  duration: integer("duration").notNull().default(100), // ticks remaining
  affectedTribeId: integer("affected_tribe_id"), // null means affects all
});

// === SCHEMAS ===

export const insertTribeSchema = createInsertSchema(tribes).omit({ id: true });
export const insertVillagerSchema = createInsertSchema(villagers).omit({ id: true });
export const insertGameStateSchema = createInsertSchema(gameState).omit({ id: true });
export const insertWorldEventSchema = createInsertSchema(worldEvents).omit({ id: true });

// === EXPLICIT TYPES ===

export type Tribe = typeof tribes.$inferSelect;
export type InsertTribe = z.infer<typeof insertTribeSchema>;
export type Villager = typeof villagers.$inferSelect;
export type InsertVillager = z.infer<typeof insertVillagerSchema>;
export type GameState = typeof gameState.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type WorldEvent = typeof worldEvents.$inferSelect;
export type InsertWorldEvent = z.infer<typeof insertWorldEventSchema>;

// Request types
export type UpdateVillagerRequest = Partial<InsertVillager>;
export type UpdateGameStateRequest = Partial<InsertGameState>;
export type UpdateTribeRequest = Partial<InsertTribe>;

// Response types
export interface FullGameResponse {
  gameState: GameState;
  tribes: Tribe[];
  villagers: Villager[];
  worldEvents: WorldEvent[];
}

// Event types for the game log
export interface GameEvent {
  tick: number;
  type: 'birth' | 'death' | 'immigration' | 'tribeSplit' | 'disaster' | 'blessing' | 'diplomacy';
  message: string;
  tribeId?: number;
  villagerId?: number;
}

// Constants
export const TRIBE_COLORS = [
  "#4a90a4", // Blue
  "#a44a4a", // Red  
  "#4aa45a", // Green
  "#a4904a", // Gold
  "#7a4aa4", // Purple
  "#4aa4a4", // Teal
  "#a4744a", // Orange
  "#6a6a6a", // Gray
];

export const VILLAGER_NAMES = {
  male: ["Adam", "Seth", "Enoch", "Noah", "Shem", "Cain", "Abel", "Jared", "Lamech", "Methuselah", "Kenan", "Mahalalel", "Enos", "Ham", "Japheth"],
  female: ["Eve", "Sarah", "Rebekah", "Rachel", "Leah", "Miriam", "Ruth", "Naomi", "Hannah", "Deborah", "Dinah", "Tamar", "Zipporah", "Hagar", "Bilhah"],
};

export const TRAIT_POOL = [
  "Hardworking", "Lazy", "Fast Learner", "Clumsy", "Wise", "Reckless",
  "Nurturing", "Aggressive", "Curious", "Cautious", "Lucky", "Unlucky",
  "Strong", "Weak", "Charismatic", "Shy", "Brave", "Cowardly",
  "Healthy", "Frail", "Fertile", "Infertile", "Leader", "Follower"
];
