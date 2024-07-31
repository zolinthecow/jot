import type React from 'react';
import { useEffect, useState } from 'react';

import Layout from './LayoutManager/Layout';
import Sidebar from './Sidebar';

import * as KeyboardListener from '@/lib/keyboardListener';
import type {
    ReplicacheFile,
    ReplicacheFolder,
    ReplicacheWorkspace,
} from '@repo/replicache-schema';
import type { DeepReadonlyObject } from 'replicache';

type Props = {
    workspace: ReplicacheWorkspace;
    folders: Array<ReplicacheFolder>;
    files: Array<DeepReadonlyObject<ReplicacheFile>>;
};

const WorkspaceHome: React.FC<Props> = ({ workspace, folders, files }) => {
    const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);

    useEffect(() => {
        const cmdId = KeyboardListener.registerCommand(
            { key: 's', metaKey: true },
            () => setIsSidebarVisible((prev) => !prev),
        );
        KeyboardListener.init();

        return () => {
            KeyboardListener.unregisterCommand(cmdId);
            KeyboardListener.cleanup();
        };
    }, []);

    useEffect(() => {
        window.electron.ipcRenderer.send(
            'set-traffic-lights-visibility',
            isSidebarVisible,
        );
    }, [isSidebarVisible]);

    return (
        <div className="w-full h-full flex rounded-md no-drag">
            <Sidebar
                workspace={workspace}
                folders={folders}
                files={files}
                isVisible={isSidebarVisible}
            />
            <Layout workspace={workspace} folders={folders} files={files} />
        </div>
    );
};

export default WorkspaceHome;
