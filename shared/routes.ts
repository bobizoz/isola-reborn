import { z } from 'zod';
import { insertVillagerSchema, insertGameStateSchema, insertTribeSchema, villagers, gameState, tribes, worldEvents } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  game: {
    get: {
      method: 'GET' as const,
      path: '/api/game' as const,
      responses: {
        200: z.object({
          gameState: z.custom<typeof gameState.$inferSelect>(),
          tribes: z.array(z.custom<typeof tribes.$inferSelect>()),
          villagers: z.array(z.custom<typeof villagers.$inferSelect>()),
          worldEvents: z.array(z.custom<typeof worldEvents.$inferSelect>()),
        }),
      },
    },
    sync: {
      method: 'POST' as const,
      path: '/api/game/sync' as const,
      input: z.object({
        gameState: insertGameStateSchema.partial(),
        tribes: z.array(insertTribeSchema.extend({ id: z.number().optional() })),
        villagers: z.array(insertVillagerSchema.extend({ id: z.number().optional() })),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    reset: {
      method: 'POST' as const,
      path: '/api/game/reset' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    }
  },
  tribes: {
    create: {
      method: 'POST' as const,
      path: '/api/tribes' as const,
      input: insertTribeSchema,
      responses: {
        201: z.custom<typeof tribes.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tribes/:id' as const,
      input: insertTribeSchema.partial(),
      responses: {
        200: z.custom<typeof tribes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tribes/:id' as const,
      responses: {
        204: z.void(),
      },
    },
  },
  villagers: {
    create: {
      method: 'POST' as const,
      path: '/api/villagers' as const,
      input: insertVillagerSchema,
      responses: {
        201: z.custom<typeof villagers.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/villagers/:id' as const,
      input: insertVillagerSchema.partial(),
      responses: {
        200: z.custom<typeof villagers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/villagers/:id' as const,
      responses: {
        204: z.void(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
