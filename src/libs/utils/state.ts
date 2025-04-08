/**
 * Generate a new state array. Replace blocks between `from` and `to`(inclusive)
 * with parsed value of text. Keep unchanged blocks
 */
export function getNewState(editor: PenEditor.Editor, from: number, to: number, text: string) {
  const textBefore = editor.state.slice(0, from)
    .map(block => serializeState(block.content as PenEditor.StateNode[]).split('\n')).flat();
  const textAfter = editor.state.slice(to + 1)
    .map(block => serializeState(block.content as PenEditor.StateNode[]).split('\n')).flat();

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
      oldLineIndex += editor.state.slice(from,to + 1)
        // TODO fix type
        // @ts-ignore
        .reduce((acc, val) => acc + serializeState(val.content).length, m - lines.length);
      preparser = editor.parser(newLines.slice(lineIndex), true);
      block = preparser.next().value;
      continue;
    }

    let n = 0;
    const oldBlock = editor.state.find(block => {
      const match = n === oldLineIndex;
      // TODO fix type
      // @ts-ignore
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

export function serializeState(list: PenEditor.StateNode[], block = false): string {
  return list.map(token => {
    if (!token.content) return token;
    // TODO fix type
    // @ts-ignore
    return serializeState(token.content);
  }).join(block ? '\n' : '');
}