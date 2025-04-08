import { getNewState, serializeState } from "./state";

export function orderedSelection({
  anchorBlock,
  focusBlock,
  anchorOffset,
  focusOffset
}: PenEditor.Selection) {
  if (
    anchorBlock > focusBlock ||
    (anchorBlock === focusBlock && anchorOffset > focusOffset)
  ) {
    return {
      firstBlock: focusBlock,
      lastBlock: anchorBlock,
      firstOffset: focusOffset,
      lastOffset: anchorOffset
    };
  }

  return {
    firstBlock: anchorBlock,
    lastBlock: focusBlock,
    firstOffset: anchorOffset,
    lastOffset: focusOffset
  };
}

export function replaceSelection(editor: PenEditor.Editor, text = '') {
  const {
    firstBlock,
    lastBlock,
    firstOffset,
    lastOffset
  } = orderedSelection(editor.selection);

  const firstLine = serializeState(editor.state[firstBlock].content as PenEditor.StateNode[]);
  const lastLine = firstBlock === lastBlock ?
    firstLine :
    serializeState(editor.state[lastBlock].content as PenEditor.StateNode[]);

  const start = firstLine.slice(0, firstOffset) + text;
  const newState = getNewState(
    editor, firstBlock, lastBlock,
    start + lastLine.slice(lastOffset)
  );

  let startLines = start.split('\n').length;
  const addedBlocks = newState.slice(firstBlock).findIndex(block => {
    if (startLines <= block.length) return true;
    startLines -= block.length;
    return false;
  });

  const addedText = firstBlock + addedBlocks < 0 ?
    0 :
    serializeState(newState[firstBlock + addedBlocks].content)
      .split('\n').slice(0, startLines).join('\n').length;

  editor.update(
    newState,
    [
      firstBlock + addedBlocks,
      addedText - lastLine.slice(lastOffset).length
    ]
  );
}