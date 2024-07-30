import type React from 'react';

import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { File, FolderOpen } from 'lucide-react';

import type {
    ReplicacheFile,
    ReplicacheFolder,
    ReplicacheWorkspace,
} from '@repo/replicache-schema';

import type { DeepReadonlyObject } from 'replicache';
import FolderTree from './FolderTree';

type SidebarProps = {
    workspace: ReplicacheWorkspace;
    folders: Array<ReplicacheFolder>;
    files: Array<DeepReadonlyObject<ReplicacheFile>>;
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
            <h1 className="text-base text-muted-foreground font-semibold mt-6">
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
            <hr className="mt-4 mb-4 bg-stone-300 border-stone-300" />
            <div className="text-muted-foreground overflow-ellipsis">
                <FolderTree folders={folders} files={files} />
            </div>
        </div>
    );
};

export default Sidebar;
