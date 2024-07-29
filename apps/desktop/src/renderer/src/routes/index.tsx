import { Button } from '@/components/ui/button';
import CreateWorkspaceDialog from '@renderer/components/CreateWorkspacePopover';
import type { Workspace } from '@repo/replicache-schema';
import {
    createFileRoute,
    redirect,
    useLoaderData,
} from '@tanstack/react-router';
import type { JSX } from 'react';
import type { ReadTransaction, Replicache } from 'replicache';
import { useSubscribe } from 'replicache-react';

let r: Replicache;

async function getWorkspace(tx: ReadTransaction) {
    const workspace = await tx
        .scan<Workspace>({ prefix: 'workspace' })
        .values()
        .toArray();
    return workspace[0];
}

export const Route = createFileRoute('/')({
    beforeLoad({ context }) {
        if (!context.session) {
            throw redirect({
                to: '/auth/login',
                search: {
                    redirect: location.href,
                },
            });
        }
    },
    loader: async ({ context }) => {
        const r = context.replicache;
        if (!r) return {};

        console.log('QUERYING WORKSPACE');
        const workspace = (await r.query(getWorkspace)) ?? null;
        console.log('GOT WORKSPACE');

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
                <CreateWorkspaceDialog />
            ) : (
                <div>{workspace.path}</div>
            )}
        </div>
    );
}
