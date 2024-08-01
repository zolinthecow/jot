import {
    defaultMarkdownParser,
    defaultMarkdownSerializer,
    schema as markdownSchema,
} from 'prosemirror-markdown';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

// Create a schema that includes markdown nodes and marks
const md_schema = new Schema({
    nodes: addListNodes(markdownSchema.spec.nodes, 'paragraph block*', 'block'),
    marks: markdownSchema.spec.marks,
});

export class MarkdownView {
    private view: EditorView;

    constructor(target: HTMLElement, content: string) {
        // Parse the initial Markdown content
        const doc = defaultMarkdownParser.parse(content);

        // Create the editor state
        const state = EditorState.create({
            doc,
            //   plugins: exampleSetup({ schema: mySchema })
            schema: md_schema,
        });

        // Create the editor view
        this.view = new EditorView(target, {
            state,
            dispatchTransaction: (transaction) => {
                const newState = this.view.state.apply(transaction);
                this.view.updateState(newState);
                this.onChange();
            },
        });
    }

    onChange() {
        // This method is called whenever the document changes
        // You can add any logic here, like saving to localStorage
        console.log(this.getMarkdown());
    }

    getMarkdown(): string {
        return defaultMarkdownSerializer.serialize(this.view.state.doc);
    }

    destroy() {
        this.view.destroy();
    }
}

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

const initializeEditor = (element: HTMLDivElement) => {
    return new MarkdownView(element, SAMPLE_MARKDOWN);
};

export default initializeEditor;
