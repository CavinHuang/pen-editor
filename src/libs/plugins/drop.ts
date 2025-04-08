import {
  getOffset,
  findBlockIndex,
  serializeState,
  getNewState
} from '../core/shared';
import { set as setFileURL } from '../renderer/files';
import type { EditorPlugin } from '../typings/editor';
import Editor from '../typings/editor';

interface CustomCaretPosition {
  offset: number;
  offsetNode: Node;
}

interface Position {
  block: number;
  offset: number;
}

/**
 * Document.caretPositionFromPoint() is only supported by Firefox.
 * Other browsers support non-standard Document.caretRangeFromPoint()
 * Chrome: http://crbug.com/388976
 * Safari: https://bugs.webkit.org/show_bug.cgi?id=172137
 * Edge: https://connect.microsoft.com/IE/feedback/details/693228/implement-document-caretpositionfrompoint
 */
function caretPositionFromPoint(node: Node, x: number, y: number): CustomCaretPosition | null {
  const root = node.getRootNode() as Document;
  if ('caretPositionFromPoint' in root) {
    // Firefox 实现
    const position = (root as any).caretPositionFromPoint(x, y);
    if (position) {
      return {
        offset: position.offset,
        offsetNode: position.offsetNode
      };
    }
    return null;
  }

  // 其他浏览器实现
  const range = document.caretRangeFromPoint(x, y);
  if (!range) return null;

  return {
    offset: range.startOffset,
    offsetNode: range.startContainer
  };
}

/**
 * 根据鼠标点击位置获取文本位置
 */
function getPositionFromPoint(editor: Editor, { clientX, clientY }: { clientX: number, clientY: number }): Position {
  const pos = caretPositionFromPoint(editor.element, clientX, clientY);
  if (!pos) {
    return { block: 0, offset: 0 };
  }

  const block = findBlockIndex(editor.element, pos.offsetNode);
  const offset = getOffset(
    editor.element.children[block] as HTMLElement,
    pos.offsetNode,
    pos.offset
  );

  return { block, offset };
}

/**
 * 生成随机ID
 */
function generateId(): string {
  return (Math.random()).toString(36).slice(2, 7);
}

/**
 * 获取拖放的数据值
 */
function getDropValue(dataTransfer: DataTransfer): string {
  if (dataTransfer.files.length) {
    return Array.from(dataTransfer.files).map(file => {
      const type = file.type.startsWith('image/') ? 'image': 'file';
      const id = generateId();
      const url = URL.createObjectURL(file);

      setFileURL(id, url);

      return `[${type}:${id}/${file.name}]`;
    }).join('');
  }

  return dataTransfer.getData('text/plain');
}

/**
 * 文件拖放插件
 */
export default function dropPlugin(): EditorPlugin {
  return {
    handlers: {
      drop(editor: Editor, event: Event): boolean | void {
        if (!(event instanceof DragEvent) || !event.dataTransfer) return false;

        event.preventDefault();

        const { block, offset } = getPositionFromPoint(editor, event);
        const text = getDropValue(event.dataTransfer);

        const line = serializeState(editor.state[block].content);
        editor.update(
          getNewState(
            editor, block, block,
            line.slice(0, offset) + text + line.slice(offset)
          ),
          [block, offset + text.length]
        );

        return true;
      }
    }
  };
}
