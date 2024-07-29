import type React from 'react';

import { File } from '@/components/icons/file';
import { FolderOpen } from '@/components/icons/folderOpen';
import { Button } from '@/components/ui/button';
import type {
    ReplicacheFile,
    ReplicacheFolder,
    ReplicacheWorkspace,
} from '@repo/replicache-schema';

type SidebarProps = {
    workspace: ReplicacheWorkspace;
    folders: Array<ReplicacheFolder>;
    files: Array<ReplicacheFile>;
};
const Sidebar: React.FC<SidebarProps> = ({ workspace, folders, files }) => {
    return (
        <div className="h-full w-1/5 min-w-44 pl-2 pr-4 rounded-md">
            <h1 className="text-base text-muted-foreground font-semibold mt-2">
                {workspace.name}
            </h1>
            <div className="flex w-full gap-2 flex-row mt-2">
                <Button variant="blurry" className="flex-1">
                    <FolderOpen width={16} height={16} className="w-4" />
                </Button>
                <Button variant="blurry" className="flex-1">
                    <File width={16} height={16} />
                </Button>
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
    return (
        <div className="w-full h-full flex">
            <Sidebar workspace={workspace} folders={folders} files={files} />
            <div className="flex-1 flex bg-background rounded-md p-2"></div>
        </div>
    );
};

export default WorkspaceHome;
