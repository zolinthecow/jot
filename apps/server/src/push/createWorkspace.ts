import { type DBWorkspace, DBWorkspaceSchema } from '@repo/database';
import type { CreateWorkspaceArgs } from '@repo/replicache-schema';
import { type DatabaseTransactionConnection, sql } from 'slonik';
import type { Affected } from '.';

export default async function createWorkspace(
    tx: DatabaseTransactionConnection,
    userID: string,
    args: CreateWorkspaceArgs,
): Promise<Affected> {
    if (userID !== args.workspace.userID) {
        throw new Error('Authorization error: userIDs dont match');
    }

    await tx.one(sql.type(DBWorkspaceSchema)`
        INSERT into workspaces (
            id,
            "userID",
            "path",
            "name",
            "createdAt"
        ) VALUES (
            ${args.workspace.id},
            ${args.workspace.userID},
            ${args.workspace.path},
            ${args.workspace.name},
            CURRENT_TIMESTAMP
        )
        RETURNING *
    `);

    return {
        workspaceIDs: [args.workspace.id],
    };
}
