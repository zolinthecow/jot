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
import type { MosaicNode } from 'react-mosaic-component';
import type { DeepReadonlyObject, ReadTransaction } from 'replicache';
import { useSubscribe } from 'replicache-react';
import { v4 as uuid } from 'uuid';

async function getWorkspace(tx: ReadTransaction) {
    const workspaces = await tx
        .scan<ReplicacheWorkspace>({ prefix: 'workspace/' })
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
        const session = context.session;
        if (!r || !session)
            return {
                workspace: null,
                folders: [],
                files: [],
            };

        const [workspace, folders, files, _mosaicState] = await Promise.all([
            r.query(getWorkspace),
            r.query(getFolders),
            r.query(getFiles),
            window.api.getFromStorage('mosaicState'),
        ]);
        if (workspace && !folders.find((f) => f.type === 'fleeting')) {
            const fleetingFolder: DeepReadonlyObject<ReplicacheFolder> = {
                id: uuid(),
                type: 'fleeting',
                userID: session.user.id,
                workspaceID: (workspace as ReplicacheWorkspace).id,
                name: 'Fleeting Ideas',
            };
            console.log('CREATING FLEETING FOLDER');
            r.mutate.createFolder({
                folder: fleetingFolder,
            });
            console.log('CREATED FLEETING FOLDER');
            folders.push(fleetingFolder);
        }
        let mosaicState: MosaicNode<string>;
        if (
            _mosaicState == null ||
            Object.getOwnPropertyNames(_mosaicState).length === 0
        ) {
            mosaicState = '1';
        } else {
            mosaicState = _mosaicState as MosaicNode<string>;
        }

        return {
            workspace,
            folders,
            files,
            mosaicState,
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
        <div className="w-full h-full flex bg-muted p-2 draggable">
            {workspace == null ? (
                <CreateWorkspaceDialog r={r} session={session} />
            ) : (
                <WorkspaceHome
                    workspace={workspace}
                    folders={folders}
                    files={files}
                    mosaicState={loaderData.mosaicState ?? '1'}
                />
            )}
        </div>
    );
}
