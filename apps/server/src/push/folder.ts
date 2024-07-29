import {
    DBFile,
    DBFolder,
    DBFolderSchema,
    DBWorkspaceSchema,
} from '@repo/database';
import {
    type CreateFolderArgs,
    CreateFolderArgsSchema,
    DeleteFolderArgs,
    DeleteFolderArgsSchema,
    ReplicacheFolder,
    ReplicacheFolderSchema,
    type UpdateFolderArgs,
    UpdateFolderArgsSchema,
} from '@repo/replicache-schema';
import { type DatabaseTransactionConnection, sql } from 'slonik';
import type { Affected } from '.';

export async function createFolder(
    tx: DatabaseTransactionConnection,
    userID: string,
    args: CreateFolderArgs,
): Promise<Affected> {
    if (args.folder.userID !== userID) {
        throw new Error('User IDs dont match');
    }

    const hasParentFolder = args.folder.parentFolderId !== undefined;
    await tx.one(sql.type(DBFolderSchema)`
        ${
            args.folder.parentFolderId != null
                ? sql.type(DBFolderSchema)`
        WITH parent_check AS (
            SELECT 1
            FROM folders
            WHERE id = ${args.folder.parentFolderId}
            AND "workspaceId" = ${args.folder.workspaceId}
        )
        `
                : sql.fragment``
        }
        INSERT INTO folders (
            id,
            "userID",
            "workspaceId",
            "parentFolderId",
            name,
            "createdAt"
        )
        SELECT
            ${args.folder.id},
            ${args.folder.userID},
            ${args.folder.workspaceId},
            ${args.folder.parentFolderId ?? sql.fragment`NULL`},
            ${args.folder.name},
            CURRENT_TIMESTAMP
        ${
            hasParentFolder
                ? sql.fragment`
        WHERE EXISTS (SELECT 1 FROM parent_check)
        `
                : sql.fragment``
        }
        RETURNING *
    `);

    return {
        workspaceIDs: [args.folder.workspaceId],
        folderIDs: args.folder.parentFolderId
            ? [args.folder.parentFolderId]
            : [],
        fileIDs: [],
    };
}

export async function updateFolder(
    tx: DatabaseTransactionConnection,
    userID: string,
    args: UpdateFolderArgs,
): Promise<Affected> {
    const folderID = args.update.id;
    const updateFields = [];

    if (args.update.name !== undefined) {
        updateFields.push(sql.typeAlias('name')`"name" = ${args.update.name}`);
    }

    if (args.update.parentFolderId !== undefined) {
        updateFields.push(
            sql.typeAlias(
                'parentFolderID',
            )`"parentFolderId" = ${args.update.parentFolderId}`,
        );
    }

    if (updateFields.length === 0) {
        return {
            workspaceIDs: [],
            folderIDs: [],
            fileIDs: [],
        };
    }

    const updatedFolder = await tx.one(sql.type(DBFolderSchema)`
        WITH folder_check AS (
            SELECT "workspaceId"
            FROM folders
            WHERE id = ${folderID} AND "userID" = ${userID}
        ), parent_check AS (
            SELECT 1
            FROM folders
            WHERE id = ${args.update.parentFolderId}
            AND "workspaceId" = (SELECT "workspaceId" FROM folder_check)
        )
        UPDATE folders
        SET ${sql.join(updateFields, sql.fragment`, `)}
        WHERE id = ${folderID}
          AND "userID" = ${userID}
          AND (
              ${
                  args.update.parentFolderId === undefined
                      ? sql.fragment`TRUE`
                      : sql.fragment`
              EXISTS (SELECT 1 FROM parent_check)
              `
              }
          )
        RETURNING *
    `);

    const folderIDsUpdated = [updatedFolder.id];
    if (args.update.parentFolderId) {
        folderIDsUpdated.push(args.update.parentFolderId);
    }
    return {
        workspaceIDs: [updatedFolder.workspaceId],
        folderIDs: folderIDsUpdated,
        fileIDs: [],
    };
}
