import { getChangeIndexes, getText } from './shared';
import { android } from './user-agent';
import type Editor from '../typings/editor';

/**
 * 处理输入事件
 * @param editor 编辑器实例
 * @param event 输入事件
 * @returns 是否阻止默认处理
 */
function onInput(editor: Editor, event: Event): boolean | void {
  const { firstBlockIndex } = getChangeIndexes(editor, event);
  const firstBlock = editor.element.children[firstBlockIndex] as HTMLElement;

  const caretStart = event.target === editor.element ?
    editor.selection.anchorOffset :
    -1;

  // While composing, only update if block type changes
  const block = editor.parser(getText(firstBlock), true).next().value;
  // 假设firstBlock是通过自定义属性存储的类型，而不是标准DOM属性
  // 我们使用元素的dataset或其他方式获取类型
  const firstBlockType = firstBlock.getAttribute('data-type') || '';
  if (editor.composing && block.type === firstBlockType) return;

  // Update entire document
  const text = Array.from(editor.element.children)
    .map(child => getText(child as HTMLElement)).join('\n');
  editor.update(
    Array.from(editor.parser(text)),
    [firstBlockIndex, caretStart]
  );

  return false;
}

/**
 * Can't be cancelled on android. Prevent default handler from being called
 * @returns 总是返回true以阻止默认处理
 */
function onBeforeInput(): boolean {
  return true;
}

/**
 * 处理输入法结束事件
 * @param editor 编辑器实例
 * @param event 输入法结束事件
 * @returns 是否阻止默认处理
 */
function onCompositionEnd(editor: Editor, event: Event): boolean | void {
  editor.composing = false;

  // Don't update while selecting text
  const { isCollapsed } = (editor.element.getRootNode() as Document).getSelection() || { isCollapsed: true };
  if (isCollapsed) onInput(editor, event);

  return true;
}

export default android && {
  handlers: {
    input: onInput,
    beforeinput: onBeforeInput,
    compositionend: onCompositionEnd
  }
};
