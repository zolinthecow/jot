import { type DBWorkspace, DBWorkspaceSchema } from '@repo/database';
import { type DatabaseTransactionConnection, sql } from 'slonik';
import { type SearchResult, SearchResultSchema } from '../replicache';

type SearchWorkspaceParams = Array<string>;
export async function searchWorkspaces(
    tx: DatabaseTransactionConnection,
    params: SearchWorkspaceParams,
): Promise<Readonly<Array<SearchResult>>> {
    if (params.length === 0) return [];

    const searchResults = await tx.any(sql.type(SearchResultSchema)`
        SELECT id, version as rowversion
        FROM workspaces
        WHERE "userID" in ${params}
    `);
    return searchResults;
}

type GetWorkspaceParams =
    | {
          userID: string;
      }
    | {
          id: string;
      };
export async function maybeGetWorkspace(
    tx: DatabaseTransactionConnection,
    params: GetWorkspaceParams,
): Promise<DBWorkspace | null> {
    let workspace: DBWorkspace | null;
    if ('userID' in params) {
        workspace = await tx.maybeOne(sql.type(DBWorkspaceSchema)`
            SELECT id "userID", "path", "createdAt", "version"
            FROM workspaces
            WHERE "userID" = ${params.userID}
        `);
    } else {
        workspace = await tx.maybeOne(sql.type(DBWorkspaceSchema)`
            SELECT id "userID", "path", "createdAt", "version"
            FROM workspaces
            WHERE id = ${params.id}
        `);
    }
    return workspace;
}
