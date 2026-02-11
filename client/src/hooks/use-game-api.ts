import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertVillager, type UpdateVillagerRequest, type InsertGameState, type Villager } from "@shared/schema";

// === GAME STATE HOOKS ===

export function useGameState() {
  return useQuery({
    queryKey: [api.game.get.path],
    queryFn: async () => {
      const res = await fetch(api.game.get.path);
      if (!res.ok) throw new Error("Failed to load game state");
      return api.game.get.responses[200].parse(await res.json());
    },
    // We handle local updates optimistically in the game loop, 
    // so we don't want frequent refetches overwriting the loop state
    staleTime: Infinity, 
  });
}

export function useSyncGame() {
  return useMutation({
    mutationFn: async (data: { 
      gameState: Partial<InsertGameState>, 
      villagers: (InsertVillager & { id?: number })[] 
    }) => {
      const res = await fetch(api.game.sync.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save game");
      return api.game.sync.responses[200].parse(await res.json());
    },
  });
}

export function useResetGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.game.reset.path, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset game");
      return api.game.reset.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.game.get.path] });
    },
  });
}

// === VILLAGER HOOKS ===

export function useCreateVillager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertVillager) => {
      const res = await fetch(api.villagers.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to spawn villager");
      return api.villagers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.game.get.path] });
    },
  });
}

export function useUpdateVillager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateVillagerRequest) => {
      const url = buildUrl(api.villagers.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update villager");
      return api.villagers.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // In a real-time game, we might not want to invalidate aggressively to avoid jitter
      // But for single actions like 'rename' it's fine
      queryClient.invalidateQueries({ queryKey: [api.game.get.path] });
    },
  });
}

export function useDeleteVillager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.villagers.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete villager");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.game.get.path] });
    },
  });
}
