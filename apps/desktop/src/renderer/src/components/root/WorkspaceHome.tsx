import type React from 'react';
import { useEffect, useState } from 'react';

import Sidebar from './Sidebar';
import WorkspacePane from './WorkspacePane/WorkspacePane';

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

    return (
        <div className="w-full h-full flex">
            <Sidebar
                workspace={workspace}
                folders={folders}
                files={files}
                isVisible={isSidebarVisible}
            />
            <div className="transition-all duration-150 ease-in-out flex flex-1 gap-2">
                <WorkspacePane
                    workspace={workspace}
                    folders={folders}
                    files={files}
                />
            </div>
        </div>
    );
};

export default WorkspaceHome;
