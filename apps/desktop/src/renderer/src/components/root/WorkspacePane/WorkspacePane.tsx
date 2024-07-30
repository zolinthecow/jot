import type React from 'react';

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

const WorkspacePane: React.FC<Props> = ({ workspace, folders, files }) => {
    return (
        <div className="flex bg-background rounded-md p-2 flex-1">content</div>
    );
};

export default WorkspacePane;
