import { z } from 'zod';

import {
    DBFileSchema,
    DBFolderSchema,
    DBWorkspaceSchema,
} from '@repo/database';

function zUpdate<T extends z.ZodRawShape>(
    object: z.ZodObject<T>,
): z.ZodObject<{
    [K in keyof T]: K extends 'id' ? T[K] : z.ZodOptional<T[K]>;
}> {
    const shape = Object.fromEntries(
        Object.entries(object.shape).map(([k, v]) =>
            k === 'id' ? [k, v] : [k, v.optional()],
        ),
    ) as { [K in keyof T]: K extends 'id' ? T[K] : z.ZodOptional<T[K]> };

    return object.extend(shape);
}

export const ReplicacheWorkspaceSchema = DBWorkspaceSchema.omit({
    createdAt: true,
});
export type ReplicacheWorkspace = z.infer<typeof ReplicacheWorkspaceSchema>;

export const CreateWorkspaceArgsSchema = z.object({
    workspace: ReplicacheWorkspaceSchema,
});
export type CreateWorkspaceArgs = z.infer<typeof CreateWorkspaceArgsSchema>;

export const ReplicacheFolderSchema = DBFolderSchema.omit({
    createdAt: true,
});
export type ReplicacheFolder = z.infer<typeof ReplicacheFolderSchema>;

export const CreateFolderArgsSchema = z.object({
    folder: ReplicacheFolderSchema,
});
export type CreateFolderArgs = z.infer<typeof CreateFolderArgsSchema>;

export const UpdateFolderArgsSchema = z.object({
    update: zUpdate(ReplicacheFolderSchema.omit({ type: true })),
});
export type UpdateFolderArgs = z.infer<typeof UpdateFolderArgsSchema>;

export const DeleteFolderArgsSchema = z.object({
    id: z.string(),
});
export type DeleteFolderArgs = z.infer<typeof DeleteFolderArgsSchema>;

export const ReplicacheFileSchema = DBFileSchema.omit({
    createdAt: true,
});
export type ReplicacheFile = z.infer<typeof ReplicacheFileSchema>;

export const CreateFileArgsSchema = z.object({
    file: ReplicacheFileSchema,
});
export type CreateFileArgs = z.infer<typeof CreateFileArgsSchema>;

export const UpdateFileArgsSchema = z.object({
    update: zUpdate(ReplicacheFileSchema),
});
export type UpdateFileArgs = z.infer<typeof UpdateFileArgsSchema>;

export const DeleteFileArgsSchema = z.object({
    id: z.string(),
});
export type DeleteFileArgs = z.infer<typeof DeleteFileArgsSchema>;
