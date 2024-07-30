import {
    type CreateFolderArgs,
    CreateFolderArgsSchema,
    type DeleteFolderArgs,
    DeleteFolderArgsSchema,
    type ReplicacheFile,
    type ReplicacheFolder,
    type UpdateFolderArgs,
    UpdateFolderArgsSchema,
} from '@repo/replicache-schema';
import type { WriteTransaction } from 'replicache';

export async function createFolder(
    tx: WriteTransaction,
    _args: CreateFolderArgs,
) {
    console.log('CREATE FOLDER', _args);
    const args = CreateFolderArgsSchema.parse(_args);
    if (args.folder.type === 'fleeting') {
        const existingFolders = (await tx
            .scan({ prefix: 'folder/' })
            .values()
            .toArray()) as Array<ReplicacheFolder>;
        if (existingFolders.find((f) => f.type === 'fleeting')) {
            throw new Error('Cannot create second fleeting folder');
        }
    }
    await tx.set(`folder/${args.folder.id}`, args.folder);
}

export async function updateFolder(
    tx: WriteTransaction,
    _args: UpdateFolderArgs,
) {
    const args = UpdateFolderArgsSchema.parse(_args);

    const folderKey = `folder${args.update.id}`;

    const existingFolder = (await tx.get(folderKey)) as ReplicacheFolder;
    if (!existingFolder) {
        throw new Error(`Folder with id ${args.update.id} not found`);
    }

    const updatedFolder = {
        ...existingFolder,
        ...args.update,
    };

    await tx.set(folderKey, updatedFolder);
}

export async function deleteFolder(
    tx: WriteTransaction,
    _args: DeleteFolderArgs,
) {
    const args = DeleteFolderArgsSchema.parse(_args);

    const deletedFolders: string[] = [];
    const deletedFiles: string[] = [];
    let workspaceID: string | undefined;

    // Helper function to recursively delete folders and files
    async function recursiveDelete(folderId: string) {
        const folderKey = `folder/${folderId}`;
        const folder = await tx.get<ReplicacheFolder>(folderKey);

        if (!folder || folder.type === 'fleeting') {
            return;
        }

        workspaceID = folder.workspaceID;

        // Delete subfolders
        const subfolders = await tx
            .scan<ReplicacheFolder>({ prefix: 'folder/' })
            .toArray();
        for (const subfolder of subfolders) {
            if (subfolder.parentFolderID === folderId) {
                await recursiveDelete(subfolder.id);
            }
        }

        // Delete files in this folder
        const files = await tx
            .scan<ReplicacheFile>({ prefix: 'file/' })
            .toArray();
        for (const file of files) {
            if (file.parentFolderIDs?.includes(folderId)) {
                if (file.parentFolderIDs.length === 1) {
                    // This is an orphaned file, delete it
                    await tx.del(`file/${file.id}`);
                    deletedFiles.push(file.id);
                } else {
                    // Remove this folder from parentFolderIDs
                    const updatedFile = {
                        ...file,
                        parentFolderIDs: file.parentFolderIDs.filter(
                            (id) => id !== folderId,
                        ),
                    };
                    await tx.set(`file/${file.id}`, updatedFile);
                }
            }
        }

        // Delete this folder
        await tx.del(folderKey);
        deletedFolders.push(folderId);
    }

    // Start the recursive deletion
    await recursiveDelete(args.id);

    // Return the result
    return {
        workspaceIDs: workspaceID ? [workspaceID] : [],
        folderIDs: deletedFolders,
        fileIDs: deletedFiles,
    };
}
