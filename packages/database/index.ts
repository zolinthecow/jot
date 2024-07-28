import { z } from 'zod';

export const DBWorkspaceSchema = z.object({
  userId: z.string().uuid(),
  path: z.string().min(1),
  createdAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
});

export type DBWorkspace = z.infer<typeof DBWorkspaceSchema>;
