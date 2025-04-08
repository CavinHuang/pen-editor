import { serializeState, setOffset } from '../core/shared';
import shortcut from '../core/shortcut';
import type { StateNode, EditorPlugin } from '../typings/editor';
import Editor from '../typings/editor';

interface DiffResult {
  added: string;
  removed: string;
  position: number;
}

function diff(str1: string, str2: string): DiffResult {
  if (str1 === str2) {
    return { added: '', removed: '', position: -1 };
  }

  // Iterate over the strings to find differences.
  let position = 0;
  while (str1[position] === str2[position]) {
    position++;
  }

  let m = 0;
  while (
    str1[str1.length - m] === str2[str2.length - m] &&
    m <= str1.length - position
  ) m++;
  m--;

  const added = str2.slice(position, str2.length - m);
  const removed = str1.substr(
    position,
    str1.length - str2.length + added.length
  );

  return { added, removed, position };
}

export default function historyPlugin(): EditorPlugin {
  const hist: StateNode[][] = [];
  let historyPosition = 0;

  function addToHistory(state: StateNode[]): void {
    hist.splice(historyPosition);
    hist.push(state);
    historyPosition = hist.length;
  }

  function undo(editor: Editor): void {
    if (historyPosition <= 1) return;

    historyPosition--;
    const prevState = editor.state;
    supress = true;
    editor.state = hist[historyPosition - 1];
    supress = false;

    const blocks = editor.state.map(block => serializeState(block.content));
    let {
      added,
      position
    } = diff(serializeState(prevState, true), blocks.join('\n'));
    if (position === -1) return;

    const firstBlock = blocks.findIndex(block => {
      if (block.length >= position) return true;
      position -= block.length + 1;
      return false;
    });
    let n = position + added.length;
    const lastBlock = blocks.slice(firstBlock).findIndex(block => {
      if (block.length >= n) return true;
      n -= block.length + 1;
      return false;
    }) + firstBlock;

    setOffset(editor, {
      anchor: [firstBlock, position],
      focus: [lastBlock, n]
    });
  }

  function redo(editor: Editor): void {
    if (hist.length === historyPosition) return;

    const prevState = editor.state;
    supress = true;
    editor.state = hist[historyPosition];
    supress = false;
    historyPosition++;

    const blocks = editor.state.map(block => serializeState(block.content));
    let {
      added,
      position
    } = diff(serializeState(prevState, true), blocks.join('\n'));
    if (position === -1) return;

    const firstBlock = blocks.findIndex(block => {
      if (block.length >= position) return true;
      position -= block.length + 1;
      return false;
    });

    setOffset(editor, [firstBlock, position + added.length]);
  }

  let supress = false;
  let cb: number;
  return {
    afterchange(editor: Editor): void {
      clearTimeout(cb);
      if (!supress) {
        cb = setTimeout(() => {
          addToHistory(editor.state);
        }, 150) as unknown as number;
      }
    },
    handlers: {
      beforeinput(editor: Editor, event: Event): boolean | void {
        if (!(event instanceof InputEvent)) return false;

        if (event.inputType === 'historyUndo') undo(editor);
        else if (event.inputType === 'historyRedo') redo(editor);
        else return false;

        event.preventDefault();
        return true;
      },
      keydown(editor: Editor, event: Event): boolean | void {
        if (!(event instanceof KeyboardEvent)) return false;

        if (shortcut('Mod+Z', event)) {
          undo(editor);
        } else if (shortcut('Mod+Y', event) || shortcut('Mod+Shift+Z', event)) {
          redo(editor);
        } else {
          return false;
        }

        event.preventDefault();
        return true;
      }
    }
  };
}
