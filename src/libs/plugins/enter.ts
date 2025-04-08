import {
  serializeState,
  orderedSelection,
  replaceSelection
} from '../core/shared';
import type { StateNode, EditorPlugin } from '../typings/editor';
import Editor from '../typings/editor';

interface PrefixFunctions {
  blockquote: string;
  unordered_list_item: string;
  ordered_list_item: (str: string) => string;
  todo_item: string;
}

const PREFIXES: PrefixFunctions = {
  blockquote: '> ',
  unordered_list_item: '* ',
  ordered_list_item: str => `${parseInt(str) + 1}. `,
  todo_item: '- [ ] '
};

const EMPTY_LENGTHS: Record<string, number> = {
  blockquote: 2,
  unordered_list_item: 3,
  ordered_list_item: 4,
  todo_item: 3
};

function getPrefix(block: StateNode): string {
  if (!Object.keys(PREFIXES).includes(block.type)) return '';

  // No indentation
  if (block.type === 'blockquote') return PREFIXES.blockquote;

  const text = typeof PREFIXES[block.type as keyof PrefixFunctions] === 'function' ?
    (PREFIXES[block.type as 'ordered_list_item'])(block.content?.[1] as string) :
    PREFIXES[block.type as keyof PrefixFunctions];

  return (block.content?.[0] as string) + text;
}

function shouldRemoveBlock(block: StateNode): boolean {
  const len = EMPTY_LENGTHS[block.type];
  return block.content?.length === len && block.content[len - 1] === ' ';
}

export default function enterPlugin(): EditorPlugin {
  return {
    handlers: {
      keypress(editor: Editor, event: Event): boolean | void {
        // Enter
        if (!(event instanceof KeyboardEvent) || event.which !== 13) return false;

        event.preventDefault();

        const selection = orderedSelection(editor.selection);
        const { startBlock, startOffset } = selection;
        const firstLine = serializeState(editor.state[startBlock].content);
        const docSelection = (editor.element.getRootNode() as Document).getSelection();
        const isCollapsed = docSelection ? docSelection.isCollapsed : true;

        // Remove empty block
        if (
          isCollapsed &&
          startOffset === firstLine.length &&
          Object.keys(PREFIXES).includes(editor.state[startBlock].type) &&
          shouldRemoveBlock(editor.state[startBlock])
        ) {
          editor.update([
            ...editor.state.slice(0, startBlock),
            // Generate block from empty line
            editor.parser('').next().value,
            ...editor.state.slice(startBlock + 1)
          ], [startBlock, 0]);

          return true;
        }

        const prefix = event.shiftKey || event.altKey || event.ctrlKey ?
          '' : getPrefix(editor.state[startBlock]);
        replaceSelection(editor, '\n' + prefix);

        return true;
      }
    }
  };
}
