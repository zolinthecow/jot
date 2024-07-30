import type { ReplicacheFile, ReplicacheFolder } from '@repo/replicache-schema';

const dummyFolders: ReplicacheFolder[] = [
    {
        id: 'root-folder-1',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        name: 'Root Folder 1',
    },
    {
        id: 'root-folder-2',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        name: 'Root Folder 2',
    },
    {
        id: 'subfolder-1-1',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        parentFolderID: 'root-folder-1',
        name: 'Subfolder 1.1',
    },
    {
        id: 'subfolder-1-2',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        parentFolderID: 'root-folder-1',
        name: 'Subfolder 1.2',
    },
    {
        id: 'subfolder-1-1-1',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        parentFolderID: 'subfolder-1-1',
        name: 'Subfolder 1.1.1',
    },
];

const dummyFiles: ReplicacheFile[] = [
    {
        id: 'file-1',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        parentFolderIDs: ['root-folder-1'],
        name: 'File 1.txt',
        fileType: 'text',
        content: 'This is file 1',
    },
    {
        id: 'file-2',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        parentFolderIDs: ['subfolder-1-1'],
        name: 'File 2.md',
        fileType: 'markdown',
        content: '# This is file 2',
    },
    {
        id: 'file-3',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        parentFolderIDs: ['subfolder-1-1-1'],
        name: 'File 3.js',
        fileType: 'javascript',
        content: "console.log('This is file 3');",
    },
    {
        id: 'file-4',
        userID: 'user-1',
        workspaceID: 'workspace-1',
        parentFolderIDs: ['root-folder-2'],
        name: 'File 4.css',
        fileType: 'css',
        content: 'body { background-color: #f0f0f0; }',
    },
];

export { dummyFolders, dummyFiles };
