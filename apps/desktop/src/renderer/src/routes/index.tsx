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
    loader: async ({ context }) => {
        const r = context.replicache;
        if (!r) return;

        const workspace = (await r.query(getWorkspace)) ?? null;

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
