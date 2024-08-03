import { Editor, defaultValueCtx, rootCtx } from '@milkdown/core';
import { history } from '@milkdown/plugin-history';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { nord } from '@milkdown/theme-nord';
import type React from 'react';
import codeBlockSyntaxPlugin from './milkdownPlugins/codeBlockSyntaxPlugin';
import headerSyntaxPlugin from './milkdownPlugins/headerSyntaxPlugin';

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
            .use([headerSyntaxPlugin, codeBlockSyntaxPlugin]),
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
