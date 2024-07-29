import { type DBFolder, DBFolderSchema } from '@repo/database';
import { type DatabaseTransactionConnection, sql } from 'slonik';
import { type SearchResult, SearchResultSchema } from '../replicache';

type SearchFoldersParams = {
    userID: string;
};
export async function searchFolders(
    tx: DatabaseTransactionConnection,
    params: SearchFoldersParams,
): Promise<Readonly<Array<SearchResult>>> {
    const searchResults = await tx.any(sql.type(SearchResultSchema)`
        SELECT id, xmin AS rowversion
        FROM folders
        WHERE "userID" = ${params.userID}
    `);
    return searchResults;
}

type GetAllWorkspaceFoldersParams = {
    userID: string;
};
export async function maybeGetWorkspace(
    tx: DatabaseTransactionConnection,
    params: GetAllWorkspaceFoldersParams,
): Promise<Readonly<Array<DBFolder>>> {
    return await tx.any(sql.type(DBFolderSchema)`
        SELECT id, "parentFolderID", "workspaceID", name, "createdAt"
        FROM folders
        WHERE "workspaceID" = ${params.userID}
    `);
}

type GetAllFilesByIDParams = {
    IDs: Array<string>;
};
export async function getAllFoldersByID(
    tx: DatabaseTransactionConnection,
    params: GetAllFilesByIDParams,
): Promise<Readonly<Array<DBFolder>>> {
    return await tx.any(sql.type(DBFolderSchema)`
        SELECT id, "parentFolderID", "workspaceID", name, "createdAt"
        FROM folders
        WHERE id = ANY(${sql.array(params.IDs, 'text')})
    `);
}
