import type { DBReplicacheClientGroup, DBWorkspace } from '@repo/database';
import type { AuthUser } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import type { PatchOperation, PullResponse } from 'replicache';
import type { DatabasePool } from 'slonik';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import {
    getAllFilesByID,
    getAllFoldersByID,
    maybeGetWorkspace,
    searchFiles,
    searchFolders,
    searchWorkspaces,
} from '../utils/db';
import {
    type CVR,
    type CVREntries,
    cvrEntriesFromSearch,
    diffCVR,
    getCVRFromCache,
    getClientGroup,
    isCVRDiffEmpty,
    putClientGroup,
    searchClients,
    upsertCVRInCache,
} from '../utils/replicache';

const CookieSchema = z.object({
    order: z.number(),
    cvrID: z.string(),
});
type Cookie = z.infer<typeof CookieSchema>;
const PullRequestSchema = z.object({
    clientGroupID: z.string(),
    cookie: z.union([CookieSchema, z.null()]),
});
type PullRequest = z.infer<typeof PullRequestSchema>;

type Entity = {
    id: string;
    [key: string]: unknown;
};

type CVRTx = {
    entities: Record<
        string,
        { dels: Array<string>; puts: Readonly<Array<Entity>> }
    >;
    clients: CVREntries;
    nextCVR: CVR;
    nextCVRVersion: number;
} | null;

export async function _handlePull(
    pool: DatabasePool,
    userID: string,
    requestBody: PullRequest,
): Promise<PullResponse> {
    console.log('Processing workspace pull:', JSON.stringify(requestBody));
    const pull = PullRequestSchema.parse(requestBody);

    // Fetch CVR
    const { clientGroupID } = pull;
    console.log('GETTING CVR FOR', pull.cookie?.cvrID);
    const prevCVR = getCVRFromCache(pull.cookie?.cvrID);
    // Base CVR is just prev CVR or nothing
    const baseCVR = prevCVR ?? {};
    console.log('CVR COMPARE', [prevCVR, baseCVR]);

    const txRes = await pool.transaction<CVRTx>(async (tx) => {
        const baseClientGroupRecord = await getClientGroup(
            tx,
            clientGroupID,
            userID,
        );

        const userWorkspaceSearch = await searchWorkspaces(tx, [userID]);
        const userFolderSearch = await searchFolders(tx, { userID });
        const userFileSearch = await searchFiles(tx, { userID });
        const clientMeta = await searchClients(tx, clientGroupID);

        console.log('GOT SEARCH RESULTS:', {
            baseClientGroupRecord,
            clientMeta,
            userWorkspaceSearch,
            userFileSearch,
            userFolderSearch,
        });

        // Build next CVR
        const nextCVR: CVR = {
            workspace: cvrEntriesFromSearch(userWorkspaceSearch),
            folders: cvrEntriesFromSearch(userFolderSearch),
            files: cvrEntriesFromSearch(userFileSearch),
            client: cvrEntriesFromSearch(clientMeta),
        };
        console.log('NEXT CVR:', nextCVR);

        // Diff prev and next CVR
        const diff = diffCVR(baseCVR, nextCVR);
        console.log('DIFF:', diff);

        if (prevCVR && isCVRDiffEmpty(diff)) {
            console.log('NOTHING TO DO');
            return null;
        }

        // Get actual entities that should be updated
        const newWorkspace: Array<DBWorkspace> = [];
        const userWorkspace = await maybeGetWorkspace(tx, { userID });
        if (userWorkspace) {
            newWorkspace.push(userWorkspace);
        }
        const newFiles = await getAllFilesByID(tx, { IDs: diff.files.puts });
        const newFolders = await getAllFoldersByID(tx, {
            IDs: diff.folders.puts,
        });

        // Get list of clients that are changed
        const clients: CVREntries = {};
        for (const clientID of diff.client.puts) {
            clients[clientID] = nextCVR.client[clientID];
        }
        console.log('CLIENTS TO CHANGE:', clients);

        // New CVRVersion
        const baseCVRVersion = pull.cookie?.order ?? 0;
        const nextCVRVersion =
            Math.max(baseCVRVersion, baseClientGroupRecord.cvrVersion) + 1;

        // Create a new ClientGroupRecord
        const nextClientGroupRecord: Omit<
            DBReplicacheClientGroup,
            'createdAt'
        > = {
            ...baseClientGroupRecord,
            cvrVersion: nextCVRVersion,
        };
        console.log(nextClientGroupRecord);
        await putClientGroup(tx, nextClientGroupRecord);

        return {
            entities: {
                workspace: {
                    dels: diff.workspace.dels,
                    puts: newWorkspace,
                },
                folders: {
                    dels: diff.folders.dels,
                    puts: newFolders,
                },
                files: {
                    dels: diff.files.dels,
                    puts: newFiles,
                },
            },
            clients,
            nextCVR,
            nextCVRVersion,
        };
    }, 3);

    // If diff is empty then return no-op pull response
    if (txRes == null) {
        return {
            cookie: pull.cookie,
            lastMutationIDChanges: {},
            patch: [],
        };
    }

    const { entities, clients, nextCVR, nextCVRVersion } = txRes;

    const cvrID = uuid();
    upsertCVRInCache(cvrID, nextCVR);

    const patch: PatchOperation[] = [];
    if (prevCVR === undefined) {
        // If there was no prev cvr then do a full sync
        patch.push({ op: 'clear' });
    }

    for (const [name, { puts, dels }] of Object.entries(entities)) {
        for (const id of dels) {
            patch.push({
                op: 'del',
                key: `${name}/${id}`,
            });
        }
        for (const entity of puts) {
            patch.push({
                op: 'put',
                key: `${name}/${entity.id}`,
                // @ts-expect-error I disagree with their type
                value: entity,
            });
        }
    }

    const cookie: Cookie = {
        order: nextCVRVersion,
        cvrID,
    };

    const lastMutationIDChanges = clients;

    return {
        cookie,
        lastMutationIDChanges,
        patch,
    };
}

export async function handlePull(
    pool: DatabasePool,
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const pullResult = await _handlePull(
            pool,
            (res.locals.user as AuthUser).id,
            req.body,
        );
        res.status(200).json(pullResult);
    } catch (err) {
        console.error('[ERROR IN PULL]:', err);
        res.status(500).send('Internal server error');
    }
}
