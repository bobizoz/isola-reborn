import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Get full game state
  app.get(api.game.get.path, async (req, res) => {
    try {
      const data = await storage.getGameState();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load game" });
    }
  });

  // Sync / Save game
  app.post(api.game.sync.path, async (req, res) => {
    try {
      const { gameState, villagers } = req.body;
      await storage.syncGame(gameState, villagers);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to sync game" });
    }
  });
  
  // Reset game
  app.post(api.game.reset.path, async (req, res) => {
    await storage.resetGame();
    res.json({ success: true });
  });

  // Villager CRUD
  app.post(api.villagers.create.path, async (req, res) => {
    try {
      const input = api.villagers.create.input.parse(req.body);
      const villager = await storage.createVillager(input);
      res.status(201).json(villager);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch(api.villagers.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.villagers.update.input.parse(req.body);
      const villager = await storage.updateVillager(id, input);
      if (!villager) return res.status(404).json({ message: "Villager not found" });
      res.json(villager);
    } catch (err) {
      res.status(400).json({ message: "Invalid update" });
    }
  });

  app.delete(api.villagers.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteVillager(id);
    res.status(204).send();
  });

  return httpServer;
}
