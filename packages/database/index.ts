import { z } from 'zod';

export const DBWorkspaceSchema = z.object({
    id: z.string().uuid(),
    userID: z.string().uuid(),
    path: z.string().min(1),
    name: z.string().min(1),
    createdAt: z.date(),
});
export type DBWorkspace = z.infer<typeof DBWorkspaceSchema>;

export const DBFolderSchema = z.object({
    id: z.string().uuid(),
    userID: z.string().uuid(),
    parentFolderID: z.string().uuid().optional(),
    workspaceID: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    createdAt: z.date(),
});
export type DBFolder = z.infer<typeof DBFolderSchema>;

export const DBFileSchema = z.object({
    id: z.string().uuid(),
    userID: z.string().uuid(),
    workspaceID: z.string().uuid(),
    parentFolderIDs: z.array(z.string().uuid()).optional(),
    name: z.string(),
    fileType: z.string(),
    linkedFileID: z.string().uuid().optional(),
    content: z.string(),
    contentLink: z.string().optional(),
    createdAt: z.date(),
});
export type DBFile = z.infer<typeof DBFileSchema>;

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
