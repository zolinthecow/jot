import { Replicache, TEST_LICENSE_KEY } from 'replicache';
import { type M, mutators } from './mutators';

const licenseKey =
    import.meta.env.VITE_REPLICACHE_LICENSE_KEY || TEST_LICENSE_KEY;
if (!licenseKey) {
    throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
}

type Params = {
    name: string;
    auth?: string;
    DEBUG_MODE?: boolean;
};
export const getReplicache = (params: Params): Replicache<M> => {
    const rep = new Replicache<M>({
        name: params.name,
        licenseKey,
        mutators,
        pushURL: '/api/replicache/push',
        pullURL: '/api/replicache/pull',
        logLevel: params.DEBUG_MODE ? 'debug' : 'error',
        schemaVersion: 'v1',
        auth: params.auth,
    });
    return rep;
};
