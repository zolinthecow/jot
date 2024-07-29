import { type DBWorkspace, DBWorkspaceSchema } from '@repo/database';
import { type DatabaseTransactionConnection, sql } from 'slonik';

type GetUserWorkspaceParams = {
  userId: string;
};
export async function getUserWorkspace(
  tx: DatabaseTransactionConnection,
  params: GetUserWorkspaceParams,
): Promise<DBWorkspace | null> {
  const workspace = await tx.maybeOne(sql.type(DBWorkspaceSchema)`
        SELECT "userID", "path", "createdAt", "version"
        FROM workspaces
        WHERE "userID" = ${params.userId}
    `);
  return workspace;
}
