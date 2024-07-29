import { Button } from '@/components/ui/button';
import CreateWorkspaceDialog from '@renderer/components/CreateWorkspacePopover';
import type { ReplicacheWorkspace } from '@repo/replicache-schema';
import {
    createFileRoute,
    redirect,
    useLoaderData,
    useRouteContext,
} from '@tanstack/react-router';
import type { JSX } from 'react';
import type { ReadTransaction, Replicache } from 'replicache';
import { useSubscribe } from 'replicache-react';

async function getWorkspace(tx: ReadTransaction) {
    const workspace = await tx
        .scan<ReplicacheWorkspace>({ prefix: 'workspace' })
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
    const context = useRouteContext({ from: '/' });
    const r = context.replicache;
    const session = context.session;

    const loaderData = useLoaderData({ from: '/' });
    const workspace = useSubscribe(r, getWorkspace, {
        default: loaderData.workspace,
    });

    if (r == null || session == null) {
        return <div />;
    }

    return (
        <div className="w-full h-full flex">
            {workspace == null ? (
                <CreateWorkspaceDialog r={r} session={session} />
            ) : (
                <div>{workspace.path}</div>
            )}
        </div>
    );
}
