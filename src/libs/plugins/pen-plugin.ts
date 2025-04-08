import { getText } from "../utils";
import { findBlockIndex, getChangeIndexes } from "../utils/block-index";
import { orderedSelection, replaceSelection } from "../utils/selection";
import { getNewState, serializeState } from "../utils/state";

function onCompositionStart(editor: PenEditor.Editor) {
  editor.composing = true;
}

function onCompositionEnd(editor: PenEditor.Editor, event: Event) {
  editor.composing = false;
  return onInput(editor, event);
}

function onInput(editor: PenEditor.Editor, event: Event) {
  if (editor.composing) return;

  const { firstBlockIndex, lastBlockIndex } = getChangeIndexes(editor, event);
  const firstBlock = editor.element.children[firstBlockIndex];

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

function onDragstart(editor: PenEditor.Editor, event: Event) {
  event.preventDefault();
}

function onBeforeDelete(editor: PenEditor.Editor, event: Event, type: string) {
  const {
    firstBlock,
    lastBlock,
    firstOffset
  } = orderedSelection(editor.selection);
  const { isCollapsed } = (editor.element.getRootNode() as Document).getSelection()!;

  // Selection
  if (!isCollapsed) {
    event.preventDefault();

    replaceSelection(editor);
    return true;
  }

  const text = serializeState(editor.state[firstBlock].content as PenEditor.StateNode[]);
  const backwards = (event as InputEvent).inputType.endsWith('Backward');

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
    const newText = serializeState(editor.state[nextBlock].content as PenEditor.StateNode[]);

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

function onBeforeInput(editor: PenEditor.Editor, event: Event) {
  const types = {
    deleteContentBackward: 'character',
    deleteContentForward: 'character',
    deleteWordBackward: 'word',
    deleteWordForward: 'word',
    deleteSoftLineBackward: 'line',
    deleteSoftLineForward: 'line',
    deleteHardLineBackward: 'line',
    deleteHardLineForward: 'line'
  };

  // TODO fix type
  // @ts-ignore
  const type = types[event.inputType];
  if (!type) return;

  return onBeforeDelete(editor, event, type);
}

function onCopy(editor: PenEditor.Editor, event: Event) {
  const { isCollapsed } = (editor.element.getRootNode() as Document).getSelection()!;
  if (isCollapsed) return;

  const {
    firstBlock,
    lastBlock,
    firstOffset,
    lastOffset
  } = orderedSelection(editor.selection);

  const blocks = editor.state.slice(firstBlock, lastBlock + 1)
    .map(block => serializeState(block.content as PenEditor.StateNode[]));
  const lastBlockLength = blocks[blocks.length - 1].length;
  const selection = blocks.join('\n').slice(
    firstOffset,
    lastOffset - lastBlockLength || Infinity
  );

  event.preventDefault();
  // TODO fix type
  // @ts-ignore
  event.clipboardData.setData('text/plain', selection);

  return true;
}

function onPaste(editor: PenEditor.Editor, event: Event) {
  event.preventDefault();

  replaceSelection(editor, (event as ClipboardEvent).clipboardData?.getData('text'));

  return true;
}

function onSelectionChange(editor: PenEditor.Editor) {
  const sel = (editor.element.getRootNode() as Document).getSelection()!;

  // Focus outside editor
  if (!editor.element.contains(sel.anchorNode)) return;

  editor.selection.anchorBlock =
    findBlockIndex(editor.element, sel.anchorNode as HTMLElement, sel.anchorOffset);
  editor.selection.focusBlock =
    findBlockIndex(editor.element, sel.focusNode as HTMLElement, sel.focusOffset);
}

/**
 * Correct caret position if the line is now in a prior block
 */
function updateCaret(editor: PenEditor.Editor, state: PenEditor.StateNode[], [block, offset]: [number, number]) {
  let lineIndex = editor.state.slice(0, block + 1)
    .reduce((acc, val) => acc + serializeState(val.content as PenEditor.StateNode[]).length, 0);
  const newBlock = state.findIndex(block => {
    if (lineIndex <= serializeState(block.content as PenEditor.StateNode[]).length) return true;
    // TODO fix type
    // @ts-ignore
    lineIndex -= block.length;
    return false;
  });
  if (newBlock === -1) return;
  if (newBlock >= block) return;

  const newOffset = serializeState(state[newBlock].content as PenEditor.StateNode[] ).split('\n')
    .slice(0, block - newBlock).join('\n').length + 1 + offset;

  return [newBlock, newOffset];
}

function onBeforeUpdate(editor: PenEditor.Editor, state: PenEditor.StateNode[], caret: PenEditor.Caret) {
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

export default {
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
} as PenEditor.Plugin;