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
        WHERE "userID" = ${params.userID}::uuid
    `);
    return searchResults;
}

type GetAllUserFoldersParams = {
    userID: string;
};
export async function getAllUserFolders(
    tx: DatabaseTransactionConnection,
    params: GetAllUserFoldersParams,
): Promise<Readonly<Array<DBFolder>>> {
    return await tx.any(sql.type(DBFolderSchema)`
        SELECT id, "parentFolderID", "workspaceID", name, type, "createdAt"
        FROM folders
        WHERE "workspaceID" = ${params.userID}::uuid
    `);
}

type GetAllFoldersByIDParams = {
    IDs: Array<string>;
};
export async function getAllFoldersByID(
    tx: DatabaseTransactionConnection,
    params: GetAllFoldersByIDParams,
): Promise<Readonly<Array<DBFolder>>> {
    return await tx.any(sql.type(DBFolderSchema)`
        SELECT id, "parentFolderID", "workspaceID", name, type, "createdAt"
        FROM folders
        WHERE id = ANY(${sql.array(params.IDs, 'uuid')})
    `);
}
