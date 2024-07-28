import { Replicache, TEST_LICENSE_KEY } from 'replicache';

const licenseKey =
  import.meta.env.VITE_REPLICACHE_LICENSE_KEY || TEST_LICENSE_KEY;
if (!licenseKey) {
  throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
}

// biome-ignore lint/suspicious/noExplicitAny: It's fine for this
export const getReplicache = (
  userId: string,
  auth: string,
  DEBUG_MODE: boolean,
): Replicache<any> => {
  const rep = new Replicache({
    name: userId,
    licenseKey,
    pushURL: '/api/replicache/push',
    pullURL: `/api/replicache/pull?userId=${userId}`,
    logLevel: DEBUG_MODE ? 'debug' : 'error',
    schemaVersion: 'v1',
    auth,
  });
  return rep;
};
