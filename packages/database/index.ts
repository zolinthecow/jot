import { z } from 'zod';

export const DBWorkspaceSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  path: z.string().min(1),
  createdAt: z.date(),
  version: z.number().int().nonnegative(),
});
export type DBWorkspace = z.infer<typeof DBWorkspaceSchema>;

// Replicache
export const DBReplicacheClientGroupSchema = z.object({
  id: z.string(),
  userID: z.string(),
  // Replicache requires that cookies are ordered within a client group.
  // To establish this order we simply keep a counter.
  cvrVersion: z.number().int().nonnegative(),
  createdAt: z.date(),
});
export type DBReplicacheClientGroup = z.infer<
  typeof DBReplicacheClientGroupSchema
>;

export const DBReplicacheClientSchema = z.object({
  id: z.string(),
  clientGroupID: z.string(),
  lastMutationID: z.number().int().nonnegative(),
  createdAt: z.date(),
});
export type DBReplicacheClient = z.infer<typeof DBReplicacheClientSchema>;
