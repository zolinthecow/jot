import {
    type CreateWorkspaceArgs,
    CreateWorkspaceArgsSchema,
} from '@repo/replicache-schema';
import type { WriteTransaction } from 'replicache';
import { createFolder, deleteFolder, updateFolder } from './folder';

export type M = typeof mutators;

export const mutators = {
    createWorkspace: async (
        tx: WriteTransaction,
        _args: CreateWorkspaceArgs,
    ) => {
        const args = CreateWorkspaceArgsSchema.parse(_args);
        await tx.set(`workspace/${args.workspace.id}`, args.workspace);
    },
    createFolder,
    updateFolder,
    deleteFolder,
};
