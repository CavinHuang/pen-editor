import {
  getChangeIndexes,
  getText,
  findBlockIndex,
  getNewState,
  serializeState,
  orderedSelection,
  replaceSelection
} from './shared';
import type { EditorPlugin, StateNode, CaretPosition } from '../typings/editor';
import Editor from '../typings/editor';

function onCompositionStart(editor: Editor): void {
  editor.composing = true;
}

function onCompositionEnd(editor: Editor, event: Event): boolean {
  editor.composing = false;
  return onInput(editor, event);
}

function onInput(editor: Editor, event: Event): boolean {
  if (editor.composing) return true;

  const { firstBlockIndex, lastBlockIndex } = getChangeIndexes(editor, event);
  const firstBlock = editor.element.children[firstBlockIndex] as HTMLElement;

  const caretStart = event.target === editor.element ?
    editor.selection.anchorOffset :
    -1;
  const text = getText(firstBlock);

  editor.update(
    getNewState(editor, firstBlockIndex, lastBlockIndex, text),
    [firstBlockIndex, caretStart]
  );

  return true;
}

function onDragstart(editor: Editor, event: Event): boolean | void {
  if (!(event instanceof DragEvent)) return false;
  event.preventDefault();
  return true;
}

function onBeforeDelete(editor: Editor, event: InputEvent, type: string): boolean {
  const {
    startBlock: firstBlock,
    endBlock: lastBlock,
    startOffset: firstOffset
  } = orderedSelection(editor.selection);
  const selection = (editor.element.getRootNode() as Document).getSelection();
  const isCollapsed = selection ? selection.isCollapsed : true;

  // Selection
  if (!isCollapsed) {
    event.preventDefault();

    replaceSelection(editor);
    return true;
  }

  const text = serializeState(editor.state[firstBlock].content);
  const backwards = event.inputType.endsWith('Backward');

  // Ignore removing past beginning/end
  if (
    backwards && firstOffset === 0 && firstBlock === 0 ||
    !backwards && firstOffset === text.length &&
      lastBlock === editor.state.length -1
  ) return false;

  const changePosition = backwards ? firstOffset - 1 : firstOffset;
  // Let browser handle everything but removing line breaks
  if (text[changePosition]) return false;

  event.preventDefault();

  if (type === 'character') {
    const nextBlock = backwards ?
      firstBlock - 1 :
      firstBlock + 1;
    const newText = serializeState(editor.state[nextBlock].content);

    editor.update(
      getNewState(
        editor,
        backwards ? firstBlock - 1 : firstBlock,
        backwards ? firstBlock : firstBlock + 1,
        backwards ? newText + text : text + newText
      ),
      backwards ? [firstBlock - 1, newText.length] : [firstBlock, text.length]
    );
  }

  return true;
}

function onBeforeInput(editor: Editor, event: Event): boolean | void {
  if (!(event instanceof InputEvent)) return false;

  const types: Record<string, string> = {
    deleteContentBackward: 'character',
    deleteContentForward: 'character',
    deleteWordBackward: 'word',
    deleteWordForward: 'word',
    deleteSoftLineBackward: 'line',
    deleteSoftLineForward: 'line',
    deleteHardLineBackward: 'line',
    deleteHardLineForward: 'line'
  };

  const type = types[event.inputType];
  if (!type) return false;

  return onBeforeDelete(editor, event, type);
}

function onCopy(editor: Editor, event: Event): boolean | void {
  if (!(event instanceof ClipboardEvent)) return false;

  const selection = (editor.element.getRootNode() as Document).getSelection();
  const isCollapsed = selection ? selection.isCollapsed : true;
  if (isCollapsed) return false;

  const {
    startBlock: firstBlock,
    endBlock: lastBlock,
    startOffset: firstOffset,
    endOffset: lastOffset
  } = orderedSelection(editor.selection);

  const blocks = editor.state.slice(firstBlock, lastBlock + 1)
    .map((block: StateNode) => serializeState(block.content));
  const lastBlockLength = blocks[blocks.length - 1].length;
  const selectedText = blocks.join('\n').slice(
    firstOffset,
    lastOffset - lastBlockLength || Infinity
  );

  event.preventDefault();
  event.clipboardData?.setData('text/plain', selectedText);

  return true;
}

function onPaste(editor: Editor, event: Event): boolean | void {
  if (!(event instanceof ClipboardEvent)) return false;

  event.preventDefault();

  replaceSelection(editor, event.clipboardData?.getData('text') || '');

  return true;
}

function onSelectionChange(editor: Editor): void {
  const selection = (editor.element.getRootNode() as Document).getSelection();

  // Focus outside editor
  if (!selection || !editor.element.contains(selection.anchorNode)) return;

  // 确保 anchorNode 和 focusNode 不为 null
  if (selection.anchorNode) {
    editor.selection.anchorBlock =
      findBlockIndex(editor.element, selection.anchorNode, selection.anchorOffset);
  }

  if (selection.focusNode) {
    editor.selection.focusBlock =
      findBlockIndex(editor.element, selection.focusNode, selection.focusOffset);
  }
}

/**
 * Correct caret position if the line is now in a prior block
 */
function updateCaret(editor: Editor, state: StateNode[], caret: [number, number]): [number, number] | undefined {
  const [block, offset] = caret;
  let lineIndex = editor.state.slice(0, block + 1)
    .reduce((acc: number, val: StateNode) => acc + (val.length || 0), 0);
  const newBlock = state.findIndex(block => {
    if (lineIndex <= (block.length || 0)) return true;
    lineIndex -= (block.length || 0);
    return false;
  });
  if (newBlock === -1) return;
  if (newBlock >= block) return;

  const newOffset = serializeState(state[newBlock].content).split('\n')
    .slice(0, block - newBlock).join('\n').length + 1 + offset;

  return [newBlock, newOffset];
}

function onBeforeUpdate(editor: Editor, state: StateNode[], caret: CaretPosition): { state: StateNode[]; caret: CaretPosition } | undefined {
  if (!editor.state.length) return;

  const anchor = updateCaret(editor, state, caret.anchor);
  const focus = updateCaret(editor, state, caret.focus);
  if (!anchor && !focus) return;

  return {
    state,
    caret: {
      anchor: anchor || caret.anchor,
      focus: focus || caret.focus
    }
  };
}

const defaultPlugin: EditorPlugin = {
  handlers: {
    input: onInput,
    compositionstart: onCompositionStart,
    compositionend: onCompositionEnd,
    dragstart: onDragstart,
    beforeinput: onBeforeInput,
    copy: onCopy,
    paste: onPaste,
    selectionchange: onSelectionChange
  },
  beforeupdate: onBeforeUpdate
};

export default defaultPlugin;
