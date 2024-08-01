import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
    bracketMatching,
    defaultHighlightStyle,
    foldKeymap,
    indentOnInput,
    syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import {
    type EditorSelection,
    EditorState,
    RangeSetBuilder,
    StateField,
} from '@codemirror/state';
import {
    Decoration,
    type DecorationSet,
    EditorView,
    type PluginValue,
    ViewPlugin,
    type ViewUpdate,
    crosshairCursor,
    drawSelection,
    dropCursor,
    highlightSpecialChars,
    keymap,
    rectangularSelection,
} from '@codemirror/view';

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

    This paragraph belongs to item two of the outer list.`;

// Function to parse Markdown and create decorations
function parseMarkdown(
    doc: EditorState['doc'],
    selection: EditorSelection | null = null,
): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    // Checks for headings (#, ##, etc)
    const headerRegex = /^(#{1,6})(\s+)(.+)$/;
    let lineStart = 0;
    for (const line of doc.iterLines()) {
        const lineEnd = lineStart + line.length;
        const match = line.match(headerRegex);
        if (match) {
            const [, hashes, space, title] = match;
            const level = hashes.length;
            const hashesEnd = lineStart + level;
            const titleStart = hashesEnd + space.length;

            const isSelected = selection
                ? selection.ranges.some(
                      (range) => range.from <= lineEnd && range.to >= lineStart,
                  )
                : false;

            if (!isSelected) {
                // Hide the # chars
                builder.add(lineStart, hashesEnd, Decoration.replace({}));
                // Hide the spaces after #
                builder.add(hashesEnd, titleStart, Decoration.replace({}));
                // Style the header text
                builder.add(
                    titleStart,
                    lineEnd,
                    Decoration.mark({
                        class: `cm-header cm-header-${level}`,
                    }),
                );
            }
        }
        lineStart = lineEnd + 1;
    }

    return builder.finish();
}

const dynamicMarkdownField = StateField.define<DecorationSet>({
    create(state) {
        return parseMarkdown(state.doc, state.selection);
    },
    update(decorations, tr) {
        if (tr.docChanged || tr.selection) {
            return parseMarkdown(tr.state.doc, tr.state.selection);
        }
        return decorations;
    },
    provide: (f) => EditorView.decorations.from(f),
});

const initializeEditor = (element: HTMLDivElement) => {
    const theme = EditorView.theme({
        '&.cm-editor': {
            'min-height': '100%',
            padding: '0.25em',
        },
        '&.cm-editor.cm-focused': {
            outline: 'none',
        },
    });

    return new EditorView({
        state: EditorState.create({
            doc: SAMPLE_MARKDOWN,
            extensions: [
                highlightSpecialChars(),
                history(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                indentOnInput(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                rectangularSelection(),
                crosshairCursor(),
                highlightSelectionMatches(),
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...searchKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    ...lintKeymap,
                ]),
                markdown(),
                dynamicMarkdownField,
                theme,
            ],
        }),
        parent: element,
    });
};

export default initializeEditor;
