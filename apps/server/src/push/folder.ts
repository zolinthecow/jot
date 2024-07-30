import {
    DBFile,
    DBFolder,
    DBFolderSchema,
    DBWorkspaceSchema,
} from '@repo/database';
import {
    type CreateFolderArgs,
    CreateFolderArgsSchema,
    type DeleteFolderArgs,
    DeleteFolderArgsSchema,
    ReplicacheFolder,
    ReplicacheFolderSchema,
    type UpdateFolderArgs,
    UpdateFolderArgsSchema,
} from '@repo/replicache-schema';
import { type DatabaseTransactionConnection, sql } from 'slonik';
import { z } from 'zod';
import type { Affected } from '.';

export async function createFolder(
    tx: DatabaseTransactionConnection,
    userID: string,
    args: CreateFolderArgs,
): Promise<Affected> {
    if (args.folder.userID !== userID) {
        throw new Error('User IDs dont match');
    }

    const hasParentFolder = args.folder.parentFolderID !== undefined;
    console.log('CREATING FOLDER');
    await tx.one(sql.type(DBFolderSchema)`
        ${
            args.folder.parentFolderID != null
                ? sql.type(DBFolderSchema)`
        WITH parent_check AS (
            SELECT 1
            FROM folders
            WHERE id = ${args.folder.parentFolderID}
            AND "workspaceID" = ${args.folder.workspaceID}
        )
        `
                : sql.fragment``
        }
        ${
            args.folder.type === 'fleeting'
                ? sql.type(DBFolderSchema)`
        WITH fleeting_check AS (
            SELECT 1
            FROM folders
            WHERE "workspaceID" = ${args.folder.workspaceID}
            AND "type" = 'fleeting'
        )
        `
                : sql.fragment``
        }
        INSERT INTO folders (
            id,
            "userID",
            "workspaceID",
            "parentFolderID",
            name,
            type,
            "createdAt"
        )
        SELECT
            ${args.folder.id},
            ${args.folder.userID},
            ${args.folder.workspaceID},
            ${args.folder.parentFolderID ?? sql.fragment`NULL`},
            ${args.folder.name},
            ${args.folder.type},
            CURRENT_TIMESTAMP
        ${
            hasParentFolder
                ? sql.fragment`
        WHERE EXISTS (SELECT 1 FROM parent_check)
        `
                : sql.fragment``
        }
        ${
            hasParentFolder && args.folder.type === 'fleeting'
                ? sql.fragment`
        AND
        `
                : sql.fragment``
        }
        ${
            args.folder.type === 'fleeting'
                ? sql.fragment`
        WHERE NOT EXISTS (SELECT 1 FROM fleeting_check)     
        `
                : sql.fragment``
        }
        RETURNING *
    `);
    console.log('CREATED FOLDER');

    return {
        workspaceIDs: [args.folder.workspaceID],
        folderIDs: args.folder.parentFolderID
            ? [args.folder.parentFolderID]
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

    if (args.update.parentFolderID !== undefined) {
        updateFields.push(
            sql.typeAlias(
                'parentFolderID',
            )`"parentFolderID" = ${args.update.parentFolderID}`,
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
            SELECT "workspaceID"
            FROM folders
            WHERE id = ${folderID} AND "userID" = ${userID}
        ), parent_check AS (
            SELECT 1
            FROM folders
            WHERE id = ${args.update.parentFolderID ?? sql.fragment`NULL`}
            AND "workspaceID" = (SELECT "workspaceID" FROM folder_check)
        )
        UPDATE folders
        SET ${sql.join(updateFields, sql.fragment`, `)}
        WHERE id = ${folderID}
          AND "userID" = ${userID}
          AND (
              ${
                  args.update.parentFolderID === undefined
                      ? sql.fragment`TRUE`
                      : sql.fragment`
              EXISTS (SELECT 1 FROM parent_check)
              `
              }
          )
        RETURNING *
    `);

    const folderIDsUpdated = [updatedFolder.id];
    if (args.update.parentFolderID) {
        folderIDsUpdated.push(args.update.parentFolderID);
    }
    return {
        workspaceIDs: [updatedFolder.workspaceID],
        folderIDs: folderIDsUpdated,
        fileIDs: [],
    };
}

export async function deleteFolder(
    tx: DatabaseTransactionConnection,
    userID: string,
    args: DeleteFolderArgs,
): Promise<Affected> {
    const DeleteResultSchema = z.object({
        workspaceID: z.string().uuid(),
        deletedFolders: z.array(z.string().uuid()),
        deletedFiles: z.array(z.string().uuid()),
    });

    const result = await tx.one(sql.type(DeleteResultSchema)`
        WITH RECURSIVE
        root_folder AS (
            SELECT id, "workspaceID", type
            FROM folders
            WHERE id = ${args.id} AND "userID" = ${userID}
        ),
        check_fleeting AS (
            SELECT CASE WHEN type = 'fleeting' THEN true ELSE false END AS is_fleeting
            FROM root_folder
        )
        folder_tree AS (
            SELECT id, "parentFolderID", "workspaceID"
            FROM folders
            WHERE id = (SELECT id FROM root_folder)
                AND NOT EXISTS (SELECT 1 FROM check_fleeting WHERE is_fleeting)
            SELECT f.id, f."parentFolderID", f."workspaceID"
            FROM folders f
            JOIN folder_tree ft ON f."parentFolderID" = ft.id
        ),
        deleted_folders AS (
            DELETE FROM folders
            WHERE id IN (SELECT id FROM folder_tree)
            RETURNING id
        ),
        orphaned_files AS (
            SELECT f.id
            FROM files f
            WHERE f."parentFolderIDs" && (SELECT ARRAY_AGG(id) FROM deleted_folders)
            AND NOT EXISTS (
                SELECT 1
                FROM unnest(f."parentFolderIDs") AS folder_id
                WHERE folder_id NOT IN (SELECT id FROM deleted_folders)
            )
        ),
        deleted_files AS (
            DELETE FROM files
            WHERE id IN (SELECT id FROM orphaned_files)
            RETURNING id
        ),
        updated_files AS (
            UPDATE files
            SET "parentFolderIDs" = ARRAY(
                SELECT unnest("parentFolderIDs")
                EXCEPT
                SELECT id FROM deleted_folders
            )
            WHERE "parentFolderIDs" && (SELECT ARRAY_AGG(id) FROM deleted_folders)
            AND id NOT IN (SELECT id FROM deleted_files)
        )
        SELECT 
            (SELECT "workspaceID" FROM root_folder) AS "workspaceID",
            COALESCE(ARRAY_AGG(DISTINCT df.id), ARRAY[]::uuid[]) AS "deletedFolders",
            COALESCE(ARRAY_AGG(DISTINCT dfl.id), ARRAY[]::uuid[]) AS "deletedFiles"
        FROM (SELECT 1) AS dummy
        LEFT JOIN deleted_folders df ON true
        LEFT JOIN deleted_files dfl ON true
    `);

    return {
        workspaceIDs: [result.workspaceID],
        folderIDs: result.deletedFolders,
        fileIDs: result.deletedFiles,
    };
}
