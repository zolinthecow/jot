import type React from 'react';
import { useState } from 'react';

import { defaultKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
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
    title: string;
    path: Array<string>;
    splitPane: (path: Array<string>, direction: 'row' | 'column') => void;
};

const WorkspacePane: React.FC<Props> = ({
    workspace,
    folders,
    files,
    title,
    path,
    splitPane,
}) => {
    const [editorView, setEditorView] = useState<EditorView | null>(null);

    const initializeEditor = (element: HTMLDivElement | null) => {
        if (element && !editorView) {
            const state = EditorState.create({
                doc: `Content for ${title}`,
                extensions: [keymap.of(defaultKeymap)],
            });
            const view = new EditorView({
                state,
                parent: element,
            });
            setEditorView(view);
        }
    };

    return (
        <div className="bg-background rounded-md h-full flex flex-col">
            <div className="flex-grow h-full w-full" ref={initializeEditor} />
        </div>
    );
};

export default WorkspacePane;
