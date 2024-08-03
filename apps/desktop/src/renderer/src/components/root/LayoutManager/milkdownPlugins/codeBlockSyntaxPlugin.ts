import type { Node as ProsemirrorNode } from '@milkdown/prose/model';
import {
    type EditorState,
    NodeSelection,
    Plugin,
    PluginKey,
    Selection,
    type Transaction,
} from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

const codeBlockSyntaxPluginKey = new PluginKey('code-block-syntax');

const codeBlockSyntaxPlugin = $prose(() => {
    let lastFocusedCodeBlock: NodeSelection | null = null;

    return new Plugin({
        key: codeBlockSyntaxPluginKey,
        appendTransaction: (transactions, oldState, newState) => {
            if (transactions.some((tr) => tr.docChanged || tr.selectionSet)) {
                return adjustCodeBlocks(
                    newState,
                    oldState,
                    lastFocusedCodeBlock,
                    (pos) => {
                        lastFocusedCodeBlock = pos;
                    },
                );
            }
            return null;
        },
    });
});

function adjustCodeBlocks(
    newState: EditorState,
    oldState: EditorState,
    lastFocusedBlock: NodeSelection | null,
    setLastFocusedCodeBlock: (pos: NodeSelection | null) => void,
): Transaction | null {
    const tr = newState.tr;
    let changed = false;

    const { $from } = newState.selection;
    const node = $from.parent;
    const pos = $from.before();
    const oldNode = oldState.doc.nodeAt(pos);

    if (node.type.name === 'code_block') {
        // If it is a code block then you should check for these things:
        // 1. If you should add backticks to it when newly focused on
        // 2. If it should be converted to a paragraph since the user deleted the backticks
        changed =
            handleCodeBlockFocus(
                tr,
                newState,
                node,
                pos,
                setLastFocusedCodeBlock,
            ) || changed;
    } else if (node.type.name === 'paragraph') {
        // If it is a paragraph then you should check for these things:
        // 1. If you should turn it into a code block. If you type triple backticks then it
        //    should scan up and down the file to see if there are any backticks to match it
        changed =
            handleParagraphFocus(
                tr,
                newState,
                node,
                pos,
                setLastFocusedCodeBlock,
            ) || changed;

        if (lastFocusedBlock !== null) {
            // When you unfocus on a codeblock then delete the backticks
            changed =
                handleCodeBlockBlur(
                    tr,
                    newState,
                    pos,
                    lastFocusedBlock,
                    setLastFocusedCodeBlock,
                ) || changed;
        }
    } else {
        if (lastFocusedBlock !== null) {
            // When you unfocus on a codeblock then delete the backticks
            changed =
                handleCodeBlockBlur(
                    tr,
                    newState,
                    pos,
                    lastFocusedBlock,
                    setLastFocusedCodeBlock,
                ) || changed;
        }
    }

    return changed ? tr : null;
}

function handleCodeBlockFocus(
    tr: Transaction,
    state: EditorState,
    node: ProsemirrorNode,
    pos: number,
    setLastFocusedCodeBlock: (pos: NodeSelection | null) => void,
): boolean {
    const newText = node.textContent;

    // If theres no backticks but its a valid code block then add backticks
    if (!hasBackticks(newText)) {
        const formattedText = addBackticksToCodeBlock(newText);
        const currentSelection = tr.selection;

        tr.insertText(formattedText, pos + 1, pos + node.nodeSize - 1);

        // Calculate the new cursor position
        const offset = currentSelection.from - (pos + 1);
        const newCursorPos = pos + 1 + 4 + offset; // 4 accounts for "```\n" at the start

        // Set the selection to maintain cursor position
        tr.setSelection(Selection.near(tr.doc.resolve(newCursorPos)));

        setLastFocusedCodeBlock(NodeSelection.create(tr.doc, pos));
        return true;
    }
    // If there are backticks but its not a valid codeblock then change it to a paragraph
    if (hasBackticks(newText) && !isValidCodeBlock(newText)) {
        convertCodeBlockToParagraph(tr, state, node, pos);
        setLastFocusedCodeBlock(null);
        return true;
    }

    // Otherwise do nothing
    setLastFocusedCodeBlock(NodeSelection.create(tr.doc, pos));
    return false;
}

function handleParagraphFocus(
    tr: Transaction,
    state: EditorState,
    node: ProsemirrorNode,
    pos: number,
    setLastFocusedCodeBlock: (selection: NodeSelection | null) => void,
): boolean {
    const newText = node.textContent;

    if (newText === '```') {
        const result = scanForCodeBlock(state, pos);
        if (result) {
            const { start, end } = result;
            const newEnd = convertToCodeBlock(tr, state, start, end);

            // Set the cursor to the start of the content in the new code block
            const newPos = start + 1; // +1 to move past the node start
            const newSelection = NodeSelection.create(tr.doc, newPos);
            tr.setSelection(newSelection);
            setLastFocusedCodeBlock(newSelection);
            return true;
        }
    }

    return false;
}

function scanForCodeBlock(
    state: EditorState,
    pos: number,
): { start: number; end: number } | null {
    const doc = state.doc;
    let startPos = pos - 1;
    let endPos = pos + 1;
    const currentNode = doc.nodeAt(pos);
    if (!currentNode) {
        console.error('NO NODE??');
        return null;
    }

    // Scan upwards
    while (startPos > 0) {
        const node = doc.nodeAt(startPos);
        if (
            node &&
            node.type.name === 'paragraph' &&
            node.textContent.includes('```')
        ) {
            const currentEndPos = pos + currentNode.nodeSize;
            const content = doc.textBetween(startPos, currentEndPos);
            if (isValidCodeBlock(content)) {
                return {
                    start: startPos,
                    end: currentEndPos,
                };
            }
        }
        startPos--;
    }

    // Scan downwards
    while (endPos < doc.nodeSize - 2) {
        const node = doc.nodeAt(endPos);
        if (
            node &&
            node.type.name === 'paragraph' &&
            node.textContent.includes('```')
        ) {
            endPos += node.nodeSize;
            const content = doc.textBetween(pos, endPos);
            if (isValidCodeBlock(content)) {
                return {
                    start: pos,
                    end: endPos,
                };
            }
            endPos -= node.nodeSize;
        }
        endPos++;
    }

    return null;
}

function convertToCodeBlock(
    tr: Transaction,
    state: EditorState,
    start: number,
    end: number,
): number {
    const content = state.doc.textBetween(start, end, '\n');
    const lines = content.split('\n');

    // Join the lines back together, preserving empty lines
    const cleanContent = lines.join('\n');

    // Create the code block with preserved formatting
    const codeBlock = state.schema.nodes.code_block.create(
        null,
        state.schema.text(cleanContent),
    );
    const newEnd = start + codeBlock.nodeSize;
    tr.replaceWith(start, end, codeBlock);

    return newEnd;
}

function handleCodeBlockBlur(
    tr: Transaction,
    newState: EditorState,
    pos: number,
    lastFocusedCodeBlock: NodeSelection,
    setLastFocusedCodeBlock: (selection: NodeSelection | null) => void,
): boolean {
    const curNode = newState.doc.nodeAt(pos);

    const lastFocusedPos = lastFocusedCodeBlock.from;
    const node = newState.doc.nodeAt(lastFocusedPos);

    if (
        node &&
        node.type.name === 'code_block' &&
        curNode &&
        !node.eq(curNode)
    ) {
        const newText = removeBackticksFromCodeBlock(node.textContent);
        if (newText !== node.textContent) {
            tr.insertText(
                newText,
                lastFocusedPos + 1,
                lastFocusedPos + node.nodeSize - 1,
            );
            setLastFocusedCodeBlock(null);
            return true;
        }
    }

    setLastFocusedCodeBlock(null);
    return false;
}

function convertCodeBlockToParagraph(
    tr: Transaction,
    state: EditorState,
    node: ProsemirrorNode,
    pos: number,
) {
    const content = node.textContent;
    const lines = content.split('\n');

    const paragraphs = lines.map((line) =>
        state.schema.nodes.paragraph.create(null, state.schema.text(line)),
    );

    tr.replaceWith(pos, pos + node.nodeSize, paragraphs);
}

function isValidCodeBlock(text: string): boolean {
    const trimmed = text.trim();
    return (
        trimmed.startsWith('```') &&
        trimmed.endsWith('```') &&
        trimmed.length > 6
    );
}

function hasBackticks(text: string): boolean {
    return text.includes('```');
}

function addBackticksToCodeBlock(text: string): string {
    // biome-ignore lint/style/useTemplate: This is way more readable
    return '```\n' + text + (text.endsWith('\n') ? '```' : '\n```');
}

function removeBackticksFromCodeBlock(text: string): string {
    return text.replace(/^```\s*\n?/, '').replace(/\n?```$/, '');
}

export default codeBlockSyntaxPlugin;
