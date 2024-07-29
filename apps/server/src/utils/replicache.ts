import {
  DBReplicacheClient,
  type DBReplicacheClientGroup,
  DBReplicacheClientGroupSchema,
  DBReplicacheClientSchema,
} from '@repo/database';
import { type DatabaseTransactionConnection, sql } from 'slonik';
import { z } from 'zod';

// Used for replicache diffing
export const SearchResultSchema = z.object({
  id: z.string(),
  rowversion: z.number().int().nonnegative(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

// Map of item type to CVR entry
export type CVR = Record<string, CVREntries>;
// Map of item id to stored version number
export type CVREntries = Record<string, number>;

const cvrCache = new Map<string, CVR>();

export function getCVRFromCache(cvrId: string | undefined): CVR | undefined {
  if (cvrId === undefined) {
    return undefined;
  }
  const cvr = cvrCache.get(cvrId);
  return cvr;
}
export function upsertCVRInCache(id: string, cvr: CVR): void {
  cvrCache.set(id, cvr);
}

export function cvrEntriesFromSearch(
  result: SearchResult[] | Readonly<SearchResult[]>,
) {
  const r: CVREntries = {};
  for (const row of result) {
    r[row.id] = row.rowversion;
  }
  return r;
}

export type CVRDiff = Record<string, CVREntryDiff>;
export type CVREntryDiff = {
  puts: string[];
  dels: string[];
};

export function diffCVR(prev: CVR, next: CVR) {
  const r: CVRDiff = {};
  const names = [...new Set([...Object.keys(prev), ...Object.keys(next)])];
  for (const name of names) {
    const prevEntries = prev[name] ?? {};
    const nextEntries = next[name] ?? {};
    r[name] = {
      // If the next entry doesn't exist or the version was updated
      puts: Object.keys(nextEntries).filter(
        (id) =>
          prevEntries[id] === undefined || prevEntries[id] < nextEntries[id],
      ),
      // If the previous entry no longer exists
      dels: Object.keys(prevEntries).filter(
        (id) => nextEntries[id] === undefined,
      ),
    };
  }
  return r;
}

export function isCVRDiffEmpty(diff: CVRDiff) {
  return Object.values(diff).every(
    (e) => e.puts.length === 0 && e.dels.length === 0,
  );
}

type ClientGroup = Omit<DBReplicacheClientGroup, 'createdAt'>;
export async function getClientGroup(
  tx: DatabaseTransactionConnection,
  clientGroupID: string,
  userID: string,
): Promise<ClientGroup> {
  const clientGroup = await tx.maybeOne(sql.type(DBReplicacheClientGroupSchema)`
        SELECT id, "userID", "cvrVersion", "createdAt"
        FROM replicache_clientgroups
        WHERE "id" = ${clientGroupID}
    `);
  if (!clientGroup) {
    return {
      id: clientGroupID,
      userID,
      cvrVersion: 0,
    };
  }
  if (clientGroup.userID !== userID) {
    throw new Error('Authorization error');
  }
  return {
    id: clientGroupID,
    userID: clientGroup.userID,
    cvrVersion: clientGroup.cvrVersion,
  };
}
export async function putClientGroup(
  tx: DatabaseTransactionConnection,
  clientGroup: ClientGroup,
): Promise<void> {
  await tx.one(sql.type(DBReplicacheClientGroupSchema)`
        INSERT INTO replicache_clientgroups (
            id,
            "userID",
            "cvrVersion",
            "createdAt"
        ) VALUES (
            ${clientGroup.id},
            ${clientGroup.userID},
            ${clientGroup.cvrVersion},
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
            "userID" = EXCLUDED."userID",
            "cvrVersion" = EXCLUDED."cvrVersion"
        RETURNING *
    `);
}

export async function searchClients(
  tx: DatabaseTransactionConnection,
  clientGroupID: string,
): Promise<Readonly<Array<SearchResult>>> {
  const clients = await tx.any(sql.type(SearchResultSchema)`
        SELECT id, "lastMutationID" as rowversion
        FROM replicache_clients
        WHERE "clientGroupID" = ${clientGroupID}
    `);
  return clients;
}
