import {
    type DBReplicacheClientGroup,
    type DBWorkspace,
    DBWorkspaceSchema,
} from '@repo/database';
import type { AuthUser } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import type {
    PatchOperation,
    PullResponse,
    PullResponseOKV1,
    ReadonlyJSONValue,
} from 'replicache';
import { type DatabasePool, sql } from 'slonik';
import { ulid } from 'ulid';
import { z } from 'zod';
import { getUserWorkspace } from '../utils/db';
import {
    type CVR,
    type CVREntries,
    type SearchResult,
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
    entities: Record<string, { dels: Array<string>; puts: Array<Entity> }>;
    clients: CVREntries;
    nextCVR: CVR;
    nextCVRVersion: number;
} | null;

export async function handleWorkspaceGet(
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

        const userWorkspace = await getUserWorkspace(tx, { userId: userID });
        const clientMeta = await searchClients(tx, clientGroupID);

        console.log('GOT SEARCH RESULTS:', {
            baseClientGroupRecord,
            clientMeta,
            userWorkspace,
        });

        // Build next CVR
        const userWorkspaceSearch: Array<SearchResult> = [];
        if (userWorkspace) {
            userWorkspaceSearch.push({
                id: userWorkspace.id,
                rowversion: userWorkspace.version,
            });
        }

        const nextCVR: CVR = {
            workspace: cvrEntriesFromSearch(userWorkspaceSearch),
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

        // Already got the entities from the workspace query
        const newWorkspace: Array<DBWorkspace> = [];
        if (userWorkspace) {
            newWorkspace.push(userWorkspace);
        }

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

    const cvrID = ulid();
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
        const pullResult = await handleWorkspaceGet(
            pool,
            (res.locals.user as AuthUser).id,
            req.body,
        );
        res.status(200).json(pullResult);
    } catch (err) {
        console.error('[ERROR IN PULL]:', err);
        res.status(500).json('Internal server error');
    }
}
