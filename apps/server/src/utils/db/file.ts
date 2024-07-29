import { type DBFile, DBFileSchema } from '@repo/database';
import { type DatabaseTransactionConnection, sql } from 'slonik';
import { type SearchResult, SearchResultSchema } from '../replicache';

type SearchFilesParams = {
    userID: string;
};
export async function searchFiles(
    tx: DatabaseTransactionConnection,
    params: SearchFilesParams,
): Promise<Readonly<Array<SearchResult>>> {
    const searchResults = await tx.any(sql.type(SearchResultSchema)`
        SELECT id, xmin AS rowversion
        FROM files
        WHERE "userID" = ${params.userID}
    `);
    return searchResults;
}

type GetAllUserFilesParams = {
    userID: string;
};
export async function getAllUserFiles(
    tx: DatabaseTransactionConnection,
    params: GetAllUserFilesParams,
): Promise<Readonly<Array<DBFile>>> {
    return await tx.any(sql.type(DBFileSchema)`
        SELECT id, "workspaceID", "parentFolderIDs", name, "fileType", "linkedFileID", "content", "contentLink", "createdAt"
        FROM files
        WHERE "userID" = ${params.userID}
    `);
}

type GetAllFilesByIDParams = {
    IDs: Array<string>;
};
export async function getAllFilesByID(
    tx: DatabaseTransactionConnection,
    params: GetAllFilesByIDParams,
): Promise<Readonly<Array<DBFile>>> {
    return await tx.any(sql.type(DBFileSchema)`
        SELECT id, "workspaceID", "parentFolderIDs", name, "fileType", "linkedFileID", "content", "contentLink", "createdAt"
        FROM files
        WHERE id = ANY(${sql.array(params.IDs, 'text')})
    `);
}
