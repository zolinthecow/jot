import {
    CreateFolderArgsSchema,
    CreateWorkspaceArgsSchema,
    DeleteFolderArgsSchema,
    UpdateFolderArgsSchema,
} from '@repo/replicache-schema';
import type { AuthUser } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import type { ReadonlyJSONValue } from 'replicache';
import type { DatabasePool, DatabaseTransactionConnection } from 'slonik';
import { z } from 'zod';
import {
    getClient,
    getClientGroup,
    putClient,
    putClientGroup,
} from '../utils/replicache';
import createWorkspace from './createWorkspace';
import { createFolder, deleteFolder, updateFolder } from './folder';

const MutationSchema = z.object({
    id: z.number(),
    clientID: z.string(),
    name: z.string(),
    args: z.any(),
});
type Mutation = z.infer<typeof MutationSchema>;

const PushRequestSchema = z.object({
    clientGroupID: z.string(),
    mutations: z.array(MutationSchema),
});
export type Affected = {
    workspaceIDs: string[];
    folderIDs: string[];
    fileIDs: string[];
};

async function _handlePush(
    pool: DatabasePool,
    userID: string,
    requestBody: ReadonlyJSONValue,
): Promise<void> {
    console.log('PROCESSING PUSH:', JSON.stringify(requestBody, null, 2));

    const push = PushRequestSchema.parse(requestBody);

    const allAffected = {
        workspaceIDs: new Set<string>(),
    };

    for (const mutation of push.mutations) {
        try {
            const affected = await processMutation(
                pool,
                userID,
                push.clientGroupID,
                mutation,
                false,
            );
            // Data object specific
            for (const workspaceID of affected.workspaceIDs) {
                allAffected.workspaceIDs.add(workspaceID);
            }
        } catch (e) {
            await processMutation(
                pool,
                userID,
                push.clientGroupID,
                mutation,
                true,
            );
        }
    }

    // Implement poke later
}

export async function handlePush(
    pool: DatabasePool,
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const pushResult = await _handlePush(
            pool,
            (res.locals.user as AuthUser).id,
            req.body,
        );
        res.status(200).json(pushResult);
    } catch (err) {
        console.error('[ERROR IN PUSH]:', err);
        res.status(500).send('Internal server error');
    }
}

async function processMutation(
    pool: DatabasePool,
    userID: string,
    clientGroupID: string,
    mutation: Mutation,
    // Allow one retry
    errorMode: boolean,
): Promise<Affected> {
    return await pool.transaction<Affected>(async (tx) => {
        let affected: Affected = {
            workspaceIDs: [],
            folderIDs: [],
            fileIDs: [],
        };

        console.log(
            'PROCESSING MUTATION:',
            errorMode,
            JSON.stringify(mutation, null, 2),
        );

        // Check if user owns client group
        const clientGroup = await getClientGroup(tx, clientGroupID, userID);
        const baseClient = await getClient(
            tx,
            mutation.clientID,
            clientGroupID,
        );

        const nextMutationID = baseClient.lastMutationID + 1;

        // rollback and skip if already processed
        if (mutation.id < nextMutationID) {
            console.log(`MUTATION ${mutation.id} ALREADY PROCESSED - SKIPPING`);
            return affected;
        }

        // Rollback and error if in the future
        if (mutation.id > nextMutationID) {
            throw new Error(
                `MUTATION ${mutation.id} IS FROM THE FUTURE - ABORT`,
            );
        }

        if (!errorMode) {
            try {
                affected = await mutate(tx, userID, mutation);
            } catch (e) {
                console.error(
                    'Error executing mutation:',
                    JSON.stringify(mutation),
                    e,
                );
                throw e;
            }
        }

        const nextClient = {
            id: mutation.clientID,
            clientGroupID,
            lastMutationID: nextMutationID,
        };
        await putClientGroup(tx, clientGroup);
        await putClient(tx, nextClient);

        console.log('PROCESSED');
        return affected;
    });
}

// Business logic
async function mutate(
    tx: DatabaseTransactionConnection,
    userID: string,
    mutation: Mutation,
): Promise<Affected> {
    switch (mutation.name) {
        case 'createWorkspace':
            return await createWorkspace(
                tx,
                userID,
                CreateWorkspaceArgsSchema.parse(mutation.args),
            );
        case 'createFolder':
            return await createFolder(
                tx,
                userID,
                CreateFolderArgsSchema.parse(mutation.args),
            );
        case 'updateFolder':
            return await updateFolder(
                tx,
                userID,
                UpdateFolderArgsSchema.parse(mutation.args),
            );
        case 'deleteFolder':
            return await deleteFolder(
                tx,
                userID,
                DeleteFolderArgsSchema.parse(mutation.args),
            );
        default:
            return {
                workspaceIDs: [],
                folderIDs: [],
                fileIDs: [],
            };
    }
}
