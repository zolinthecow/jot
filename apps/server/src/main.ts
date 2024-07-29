import 'dotenv/config';

import express, {
    type Request,
    type Response,
    type NextFunction,
} from 'express';
import { type DatabasePool, createPool } from 'slonik';

import { handlePull } from './pull';

const POSTGRES_URL = process.env.POSTGRES_URL as string;

type DbHandler = (
    pool: DatabasePool,
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<void>;

const createHandlerWithPool =
    (pool: DatabasePool, handler: DbHandler) =>
    async (req: Request, res: Response, next: NextFunction) => {
        handler(pool, req, res, next);
    };

const main = async () => {
    const pool = await createPool(POSTGRES_URL);

    const app = express();
    const port = 8000;

    app.use(express.urlencoded({ extended: true }), express.json());

    app.post('/api/replicache/pull', createHandlerWithPool(pool, handlePull));

    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
};

void main();
