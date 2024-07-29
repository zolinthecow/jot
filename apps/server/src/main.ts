import 'dotenv/config';

import express, {
    type Request,
    type Response,
    type NextFunction,
} from 'express';
import { type DatabasePool, createPool } from 'slonik';

import { handlePull } from './pull';
import { supabase } from './utils/supabase';

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

const authMiddleware = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader;
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Add user to request object
        res.locals.user = user;
        next();
    } catch (error) {
        console.error('Error validating token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const main = async () => {
    const pool = await createPool(POSTGRES_URL);

    const app = express();
    const port = 8000;

    app.use(express.urlencoded({ extended: true }), express.json());
    app.use(authMiddleware);

    app.post('/api/replicache/pull', createHandlerWithPool(pool, handlePull));

    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
};

void main();
