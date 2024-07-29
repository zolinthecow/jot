import CreateWorkspaceDialog from '@renderer/components/root/CreateWorkspacePopover';
import WorkspaceHome from '@renderer/components/root/WorkspaceHome';
import type {
    ReplicacheFile,
    ReplicacheFolder,
    ReplicacheWorkspace,
} from '@repo/replicache-schema';
import {
    createFileRoute,
    redirect,
    useLoaderData,
    useRouteContext,
} from '@tanstack/react-router';
import type { JSX } from 'react';
import type { ReadTransaction } from 'replicache';
import { useSubscribe } from 'replicache-react';

async function getWorkspace(tx: ReadTransaction) {
    const workspaces = await tx
        .scan<ReplicacheWorkspace>({ prefix: 'workspace' })
        .values()
        .toArray();
    if (workspaces.length === 0) return null;
    return workspaces[0];
}
async function getFolders(tx: ReadTransaction) {
    const folders = await tx
        .scan<ReplicacheFolder>({ prefix: 'folder/' })
        .values()
        .toArray();
    return folders;
}
async function getFiles(tx: ReadTransaction) {
    const files = await tx
        .scan<ReplicacheFile>({ prefix: 'file/' })
        .values()
        .toArray();
    return files;
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
        if (!r)
            return {
                workspace: null,
                folders: [],
                files: [],
            };

        const [workspace, folders, files] = await Promise.all([
            r.query(getWorkspace),
            r.query(getFolders),
            r.query(getFiles),
        ]);

        return {
            workspace,
            folders,
            files,
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
    const folders = useSubscribe(r, getFolders, {
        default: loaderData.folders,
    });
    const files = useSubscribe(r, getFiles, {
        default: loaderData.files,
    });

    if (r == null || session == null) {
        return <div />;
    }

    return (
        <div className="w-full h-full flex bg-muted p-2">
            {workspace == null ? (
                <CreateWorkspaceDialog r={r} session={session} />
            ) : (
                <WorkspaceHome
                    workspace={workspace}
                    folders={folders}
                    files={files}
                />
            )}
        </div>
    );
}
