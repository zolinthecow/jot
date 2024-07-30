import type React from 'react';
import { useState } from 'react';

import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ReplicacheFile, ReplicacheFolder } from '@repo/replicache-schema';
import type { DeepReadonlyObject } from 'replicache';

type TreeItem = ReplicacheFolder | DeepReadonlyObject<ReplicacheFile>;

interface TreeNodeProps {
    item: TreeItem;
    children?: React.ReactNode;
    level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, children, level }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isFile = 'content' in item;

    return (
        <div className={`w-full ${level !== 0 ? 'pl-4' : ''}`}>
            <Button
                variant="ghost"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full justify-start pl-1 overflow-hidden"
            >
                <div className="flex items-center w-full">
                    {!isFile ? (
                        isOpen ? (
                            <ChevronDown size={12} className="shrink-0 mr-2" />
                        ) : (
                            <ChevronRight size={12} className="shrink-0 mr-2" />
                        )
                    ) : (
                        <File size={12} className="shrink-0 mr-2" />
                    )}
                    <span className="truncate">{item.name}</span>
                </div>
            </Button>
            {isOpen && children}
        </div>
    );
};

type Props = {
    folders: Array<ReplicacheFolder>;
    files: Array<DeepReadonlyObject<ReplicacheFile>>;
};
const FolderTree: React.FC<Props> = ({ folders, files }) => {
    const buildTree = (
        parentId: string | null,
        level: number,
    ): React.ReactNode => {
        const childFolders = folders.filter((folder) =>
            parentId === null
                ? folder.parentFolderID == null
                : folder.parentFolderID === parentId,
        );
        const childFiles = files.filter((file) =>
            file.parentFolderIDs?.includes(parentId || ''),
        );

        const children = [
            ...childFolders.sort((a, b) => a.name.localeCompare(b.name)),
            ...childFiles.sort((a, b) => a.name.localeCompare(b.name)),
        ];

        return children.map((item) => (
            <TreeNode key={item.id} item={item} level={level}>
                {('parentFolderID' in item || parentId == null) &&
                    buildTree(item.id, level + 1)}
            </TreeNode>
        ));
    };

    return buildTree(null, 0);
};

export default FolderTree;
