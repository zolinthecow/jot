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
        SELECT id, xmin AS rowversion
        FROM workspaces
        WHERE "userID" = ANY(${sql.array(params, 'uuid')})
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
            SELECT id "userID", "path", "name", "createdAt"
            FROM workspaces
            WHERE "userID" = ${params.userID}::uuid
        `);
    } else {
        workspace = await tx.maybeOne(sql.type(DBWorkspaceSchema)`
            SELECT id "userID", "path", "name", "createdAt"
            FROM workspaces
            WHERE id = ${params.id}::uuid
        `);
    }
    return workspace;
}
