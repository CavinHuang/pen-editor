
export function serializeState(list, block = false) {
  return list.map(token => {
    if (!token.content) return token;
    return serializeState(token.content);
  }).join(block ? '\n' : '');
}

export function orderedSelection({
  anchorBlock,
  focusBlock,
  anchorOffset,
  focusOffset
}) {
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

export function replaceSelection(editor, text = '') {
  const {
    firstBlock,
    lastBlock,
    firstOffset,
    lastOffset
  } = orderedSelection(editor.selection);

  const firstLine = serializeState(editor.state[firstBlock].content);
  const lastLine = firstBlock === lastBlock ?
    firstLine :
    serializeState(editor.state[lastBlock].content);

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
    '' :
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

/**
 * Generate a new state array. Replace blocks between `from` and `to`(inclusive)
 * with parsed value of text. Keep unchanged blocks
 */
export function getNewState(editor, from, to, text) {
  const textBefore = editor.state.slice(0, from)
    .map(block => serializeState(block.content).split('\n')).flat();
  const textAfter = editor.state.slice(to + 1)
    .map(block => serializeState(block.content).split('\n')).flat();

  const newState = [];
  const lines = text.split('\n');
  const newLines = [...textBefore, ...lines, ...textAfter];

  let lineIndex = 0;
  let oldLineIndex = 0;
  let preparser = editor.parser(newLines, true);
  let block = preparser.next().value;

  while (block) {
    if (
      lineIndex + block.length - 1 >= textBefore.length &&
      lineIndex < (textBefore.length + lines.length)
    ) {
      // Parse the new text and move `oldLineIndex` to after the change
      let m = 0;
      for (const block of editor.parser(newLines.slice(lineIndex))) {
        m += block.length;
        newState.push(block);
        if (m >= lines.length) break;
      }
      lineIndex += m;
      oldLineIndex += editor.state.slice(from, to + 1)
        .reduce((acc, val) => acc + val.length, m - lines.length);
      preparser = editor.parser(newLines.slice(lineIndex), true);
      block = preparser.next().value;
      continue;
    }

    let n = 0;
    const oldBlock = editor.state.find(block => {
      const match = n === oldLineIndex;
      n += block.length;
      return match;
    });

    if (oldBlock && oldBlock.type === block.type) {
      // Reuse old block
      newState.push(oldBlock);
      lineIndex += block.length;
      oldLineIndex += block.length;
      block = preparser.next().value;
    } else {
      // Type changed
      const newBlock = editor.parser(newLines.slice(lineIndex)).next().value;
      newState.push(newBlock);
      lineIndex += newBlock.length;
      oldLineIndex += newBlock.length;
      preparser = editor.parser(newLines.slice(lineIndex), true);
      block = preparser.next().value;
    }
  }

  return newState;
}