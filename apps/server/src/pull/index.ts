import { DBWorkspaceSchema } from '@repo/database';
import type { NextFunction, Request, Response } from 'express';
import type { PullResponseOKV1 } from 'replicache';
import { type DatabasePool, sql } from 'slonik';

export async function handlePull(
  pool: DatabasePool,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    console.log(req.body);
    const clientId = req.query.clientID as string;
    const cookie = Number.parseInt(req.query.cookie as string) || 0;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const workspace = await pool.one(sql.type(DBWorkspaceSchema)`
            SELECT "userId", path, "createdAt", version
            FROM workspaces
            WHERE "userId" = ${userId}
            LIMIT 1
        `);

    const resp: PullResponseOKV1 = {
      lastMutationIDChanges: { [clientId]: workspace.version },
      cookie: workspace.version,
      patch: [
        {
          op: 'put',
          key: 'workspace',
          value: {
            path: workspace.path,
            version: workspace.version,
          },
        },
      ],
    };

    res.json(resp);
  } catch (e) {
    // If no workspace is found, return an empty response
    const resp: PullResponseOKV1 = {
      lastMutationIDChanges: {},
      cookie: 0,
      patch: [],
    };
    res.json(resp);
  }
}
