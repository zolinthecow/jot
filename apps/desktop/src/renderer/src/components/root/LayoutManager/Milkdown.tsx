import { Editor, defaultValueCtx, rootCtx } from '@milkdown/core';
import { history } from '@milkdown/plugin-history';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import type { Node as ProsemirrorNode } from '@milkdown/prose/model';
import {
    type EditorState,
    Plugin,
    PluginKey,
    Selection,
    type Transaction,
} from '@milkdown/prose/state';
import { ReplaceStep } from '@milkdown/prose/transform';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { nord } from '@milkdown/theme-nord';
import { $ctx, $node, $nodeSchema, $prose } from '@milkdown/utils';
import type React from 'react';

const SAMPLE_MARKDOWN = `# Hello
This is a **markdown** editor.

1.  List item one.

    List item one continued with a second paragraph followed by an
    Indented block.

        $ ls *.sh
        $ mv *.sh ~/tmp

    List item continued with a third paragraph.

2.  List item two continued with an open block.

    This paragraph is part of the preceding list item.

    1. This list is nested and does not require explicit item continuation.

       This paragraph is part of the preceding list item.

    2. List item b.

    This paragraph belongs to item two of the outer list.
    
This is a [link](https://google.com)

- [ ] checkbox
- [x] done
  
> quote
 
\`code\`


| First Header  | Second Header |
| ------------- | ------------- |
| Content Cell  | Content Cell  |
| Content Cell  | Content Cell  |`;

const headerSyntaxPluginKey = new PluginKey('header-syntax');

const headerSyntaxPlugin = $prose(() => {
    let lastFocusedHeadingPos: number | null = null;

    return new Plugin({
        key: headerSyntaxPluginKey,
        appendTransaction: (transactions, oldState, newState) => {
            if (transactions.some((tr) => tr.docChanged || tr.selectionSet)) {
                return adjustHeaders(
                    newState,
                    oldState,
                    lastFocusedHeadingPos,
                    (pos) => {
                        lastFocusedHeadingPos = pos;
                    },
                );
            }
            return null;
        },
    });
});

function adjustHeaders(
    newState: EditorState,
    oldState: EditorState,
    lastFocusedPos: number | null,
    setLastFocusedPos: (pos: number | null) => void,
): Transaction | null {
    const tr = newState.tr;
    let changed = false;

    const { $from } = newState.selection;
    const node = $from.parent;
    const pos = $from.before();
    const oldNode = oldState.doc.nodeAt(pos);

    if (
        lastFocusedPos !== null &&
        (lastFocusedPos !== pos || node.type.name !== 'heading')
    ) {
        const lastFocusedNode = newState.doc.nodeAt(lastFocusedPos);
        if (lastFocusedNode && lastFocusedNode.type.name === 'heading') {
            const newText = removeHashesFromHeading(
                lastFocusedNode.textContent,
            );
            if (newText !== lastFocusedNode.textContent) {
                tr.insertText(
                    newText,
                    lastFocusedPos + 1,
                    lastFocusedPos + lastFocusedNode.nodeSize - 1,
                );
                changed = true;
            }
        }
        setLastFocusedPos(null);
    }

    if (node.type.name === 'heading' || node.type.name === 'paragraph') {
        console.log(
            'Cursor is in heading or paragraph node',
            node.textContent.replaceAll(' ', '_'),
        );

        const { newLevel, newText } = parseHeaderContent(
            node.textContent,
            node,
            oldNode,
        );
        console.log(newLevel, newText);

        if (
            newLevel !== (node.attrs.level || 0) ||
            newText !== node.textContent
        ) {
            const oldCursorPos = newState.selection.from;
            const oldNodeText = node.textContent;

            if (newLevel === 0) {
                // Convert to paragraph
                tr.setNodeMarkup(pos, newState.schema.nodes.paragraph);
            } else {
                // Convert to or update heading
                tr.setNodeMarkup(pos, newState.schema.nodes.heading, {
                    level: newLevel,
                });
                setLastFocusedPos(pos);
            }

            tr.insertText(newText, pos + 1, pos + node.nodeSize - 1);
            changed = true;

            if (changed) {
                const newCursorPos = determineNewCursorPosition(
                    oldCursorPos,
                    oldNodeText,
                    newText,
                    pos,
                );

                const $newPos = tr.doc.resolve(newCursorPos);
                tr.setSelection(Selection.near($newPos));
            }
        }
    }

    return changed ? tr : null;
}

function determineNewCursorPosition(
    oldCursorPos: number,
    oldText: string,
    newText: string,
    nodeStartPos: number,
): number {
    const relativeOldCursorPos = oldCursorPos - nodeStartPos - 1;

    const newTextHashMatch = newText.match(/^(#+)([\s\u00A0]*)/);
    if (newTextHashMatch) {
        const [, hashes, space] = newTextHashMatch;
        const hashAndSpaceLength = hashes.length + space.length;

        if (!oldText.startsWith('#')) {
            // New heading created, place cursor after the space
            return nodeStartPos + 1 + hashAndSpaceLength;
        }
        if (relativeOldCursorPos <= hashAndSpaceLength) {
            // Cursor was in the hash or space area, keep it there
            return (
                nodeStartPos +
                1 +
                Math.min(relativeOldCursorPos, hashAndSpaceLength)
            );
        }
    }

    // For other cases, try to maintain the cursor position relative to the content
    return nodeStartPos + 1 + Math.min(relativeOldCursorPos, newText.length);
}

function parseHeaderContent(
    text: string,
    currentNode: ProsemirrorNode,
    oldNode: ProsemirrorNode | null,
): { newLevel: number; newText: string } {
    const headerRegex = /^(#+)([\s\u00A0]*)(.*)$/;
    const match = text.match(headerRegex);
    console.log('MATCH', match);

    // This could be a few things:
    // 1. Newly focused heading. In this case, we need to add the #s
    // 2. Heading level change. This has the same behavior as 1.
    // 3. Newly created heading. This has the same behavior as 1.
    // 4. Heading that turned into a paragraph. In this case we return level 0.
    //    There is a caveat here: If the user deletes the space between the # and the
    //    text then it should become a paragraph.
    // 5. Paragraph that turned into a heading. In thise case we return level 1.

    // 1, 2, 3, the caveat for 4, manual impl for 5
    if (
        currentNode.type.name === 'heading' &&
        (!oldNode || oldNode?.type.name === 'heading')
    ) {
        if (match) {
            // If there is a match then that means the heading changed level since the #s
            // were already there
            const [, hashes, space, content] = match;
            if (space === '') {
                // Caveat for 4. Change to para.
                console.log('DEAD');
                return { newLevel: 0, newText: text };
            }
            const newLevel = Math.min(Math.max(hashes.length, 1), 6);
            console.log('LVL', newLevel);
            return { newLevel, newText: text };
        }
        // Manual 5. If you delete the hashes then it should just become a para
        if (!text.startsWith('#') && oldNode?.textContent.startsWith('#')) {
            return { newLevel: 0, newText: text };
        }
        console.log('YEP', currentNode.textContent, oldNode?.textContent);
        // Otherwise, we need to put in the hash's
        const currentLevel = currentNode.attrs.level as number;
        return {
            newLevel: currentLevel,
            newText: `${'#'.repeat(currentLevel)}\u00A0${text}`,
        };
    }
    // 4.
    if (
        currentNode.type.name === 'paragraph' &&
        oldNode?.type.name === 'heading'
    ) {
        // We should just leave it as is
        return { newLevel: 0, newText: text };
    }
    // 5.
    if (
        currentNode.type.name === 'heading' &&
        oldNode?.type.name === 'paragraph'
    ) {
        return { newLevel: 1, newText: `#\u00A0${text}` };
    }
    // Otherwise we just assume its a paragraph and don't do anything
    return { newLevel: 0, newText: text };
}

function removeHashesFromHeading(text: string): string {
    return text.replace(/^#+[\s\u00A0]*/, '');
}

const MilkdownEditor: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config(nord)
            .config((ctx) => {
                ctx.set(rootCtx, root);
                ctx.set(defaultValueCtx, SAMPLE_MARKDOWN);
            })
            .use(commonmark)
            .use(gfm)
            .use(history)
            .use([headerSyntaxPlugin]),
    );

    return <Milkdown />;
};

export const MilkdownEditorWrapper: React.FC = () => {
    return (
        <MilkdownProvider>
            <MilkdownEditor />
        </MilkdownProvider>
    );
};
