import type React from 'react';
import { useEffect, useState } from 'react';

import { File } from '@/components/icons/file';
import { FolderOpen } from '@/components/icons/folderOpen';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import * as KeyboardListener from '@/lib/keyboardListener';
import type {
    ReplicacheFile,
    ReplicacheFolder,
    ReplicacheWorkspace,
} from '@repo/replicache-schema';

type SidebarProps = {
    workspace: ReplicacheWorkspace;
    folders: Array<ReplicacheFolder>;
    files: Array<ReplicacheFile>;
    isVisible: boolean;
};
const Sidebar: React.FC<SidebarProps> = ({
    workspace,
    folders,
    files,
    isVisible,
}) => {
    return (
        <div
            className={`transition-all duration-150 ease-in-out h-full ${isVisible ? 'w-1/5 min-w-44 opacity-100 pl-2 pr-4' : 'w-0 min-w-0 opacity-0 pl-0 pr-0'} overflow-hidden rounded-md`}
        >
            <h1 className="text-base text-muted-foreground font-semibold mt-2">
                {workspace.name}
            </h1>
            <div className="flex w-full gap-2 flex-row mt-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger className="flex-1">
                            <Button variant="blurry" className="w-full">
                                <FolderOpen
                                    width={16}
                                    height={16}
                                    className="w-4"
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Create Folder</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger className="flex-1">
                            <Button variant="blurry" className="w-full">
                                <File width={16} height={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Create File</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};

type Props = {
    workspace: ReplicacheWorkspace;
    folders: Array<ReplicacheFolder>;
    files: Array<ReplicacheFile>;
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
            <div className="transition-all duration-150 ease-in-out flex bg-background rounded-md p-2 flex-1">
                content
            </div>
        </div>
    );
};

export default WorkspaceHome;
