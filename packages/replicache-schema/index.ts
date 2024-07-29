import { z } from 'zod';

import { DBWorkspaceSchema } from '@repo/database';

export const ReplicacheWorkspaceSchema = DBWorkspaceSchema.omit({
    createdAt: true,
});
export type ReplicacheWorkspace = z.infer<typeof ReplicacheWorkspaceSchema>;

export const CreateWorkspaceArgsSchema = z.object({
    workspace: ReplicacheWorkspaceSchema,
});
export type CreateWorkspaceArgs = z.infer<typeof CreateWorkspaceArgsSchema>;
