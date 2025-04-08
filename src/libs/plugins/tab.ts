import {
  orderedSelection,
  replaceSelection,
  getNewState,
  serializeState
} from '../core/shared';
import type { EditorPlugin, StateNode } from '../typings/editor';
import Editor from '../typings/editor';

const INDENTABLE_BLOCKS = [
  'todo_item',
  'ordered_list_item',
  'unordered_list_item'
];

const INDENTATION = /^\t| {0,4}/;

/**
 * 判断块是否可缩进
 * @param blocks 需要判断的块列表
 * @returns 是否包含可缩进块
 */
function shouldIndent(blocks: StateNode[]): boolean {
  return blocks.some(block => INDENTABLE_BLOCKS.includes(block.type));
}

/**
 * Tab 缩进插件
 */
export default function tabPlugin(): EditorPlugin {
  return {
    handlers: {
      keydown(editor: Editor, event: Event): boolean | void {
        if (!(event instanceof KeyboardEvent)) return false;

        // Tab
        if (event.which !== 9) return false;

        if (
          event.metaKey ||
          event.ctrlKey
        ) return false;

        event.preventDefault();

        const {
          startBlock: firstBlock,
          endBlock: lastBlock
        } = orderedSelection(editor.selection);

        const selectedBlocks = editor.state.slice(firstBlock, lastBlock + 1);

        if (event.altKey || !shouldIndent(selectedBlocks)) {
          replaceSelection(editor, '\t');
        } else {
          const {
            anchorBlock,
            focusBlock,
            anchorOffset,
            focusOffset
          } = editor.selection;

          const offsetChange = event.shiftKey ? -1 : 1;
          const text = selectedBlocks.map(block => {
            const text = serializeState(block.content);

            if (event.shiftKey) return text.replace(INDENTATION, '');
            return '\t' + text;
          }).join('\n');
          editor.update(
            getNewState(editor, firstBlock, lastBlock, text),
            {
              anchor: [anchorBlock, anchorOffset + offsetChange],
              focus: [focusBlock, focusOffset + offsetChange]
            }
          );
        }

        return true;
      }
    }
  };
}
