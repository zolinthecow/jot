import type React from 'react';
import { useState } from 'react';

import { defaultKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { type EditorView, keymap } from '@codemirror/view';
import type {
    ReplicacheFile,
    ReplicacheFolder,
    ReplicacheWorkspace,
} from '@repo/replicache-schema';
import type { DeepReadonlyObject } from 'replicache';

import { MilkdownEditorWrapper } from './Milkdown';
// import initializeEditor from './CodeMirror';
import initializeProsemirrorEditor, { type MarkdownView } from './ProseMirror';

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
    const [editorView, setEditorView] = useState<
        EditorView | MarkdownView | null
    >(null);

    const _initializeEditor = (element: HTMLDivElement | null) => {
        if (!element || editorView) return;
        setEditorView(initializeProsemirrorEditor(element));
    };

    return (
        <div className="bg-background rounded-md h-full flex flex-col overflow-y-scroll">
            {/* <div className="flex-grow h-full w-full" ref={_initializeEditor} /> */}
            <MilkdownEditorWrapper />
        </div>
    );
};

export default WorkspacePane;
