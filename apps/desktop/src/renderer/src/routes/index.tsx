import { Button } from '@/components/ui/button';
import { getReplicache } from '@/lib/replicache';
import { supabase } from '@/lib/supabase';
import type { Workspace } from '@repo/replicache-schema';
import {
  createFileRoute,
  redirect,
  useLoaderData,
} from '@tanstack/react-router';
import { type JSX, useEffect } from 'react';
import type { ReadTransaction, Replicache } from 'replicache';
import { useSubscribe } from 'replicache-react';

let r: Replicache;

async function getWorkspace(tx: ReadTransaction) {
  const workspace = await tx.get<Workspace>('workspace');
  return workspace;
}

export const Route = createFileRoute('/')({
  beforeLoad: async ({ location }) => {
    console.log('A');
    const session = await supabase.auth.getSession();
    console.log('B');
    if (!session.data.session) {
      throw redirect({
        to: '/auth/login',
        search: {
          redirect: location.href,
        },
      });
    }
    console.log('C');
    return { session: session.data.session };
  },
  loader: async ({ context }) => {
    console.log('D');
    const session = context.session;
    r = getReplicache(session.user.id, session.access_token, true);
    console.log('E');

    const workspace = (await r.query(getWorkspace)) ?? null;
    console.log('G');

    return {
      workspace,
    };
  },
  component: Index,
});

function Index(): JSX.Element {
  const loaderData = useLoaderData({ from: '/' });
  const workspace = useSubscribe(r, getWorkspace, {
    default: loaderData.workspace,
  });

  useEffect(() => {
    return () => {
      void r.close();
    };
  }, []);

  return (
    <div className="w-full h-full flex">
      {workspace == null ? (
        <div className="flex w-full h-full items-center justify-center">
          <Button variant="default" className="w-48 h-12">
            Create Your Workspace
          </Button>
        </div>
      ) : (
        <div>{workspace.path}</div>
      )}
    </div>
  );
}
