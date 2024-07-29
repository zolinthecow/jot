import {
    type CreateWorkspaceArgs,
    CreateWorkspaceArgsSchema,
} from '@repo/replicache-schema';
import type { WriteTransaction } from 'replicache';

export type M = typeof mutators;

export const mutators = {
    createWorkspace: async (
        tx: WriteTransaction,
        _args: CreateWorkspaceArgs,
    ) => {
        const args = CreateWorkspaceArgsSchema.parse(_args);
        await tx.set(`workspace/${args.workspace.id}`, args.workspace);
    },
};
