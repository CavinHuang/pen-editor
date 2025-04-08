import shortcut from '../core/shortcut';
import { firefox } from './user-agent';
import defaultPlugin from './default-plugin';
import type Editor from '../typings/editor';

/**
 * 快捷键与对应输入类型的映射
 */
const ACCELERATORS: Record<string, string> = {
  'Backspace': 'deleteContentBackward',
  'Delete': 'deleteContentForward',
  'Alt+Backspace': 'deleteWordBackward',
  'Alt+Delete': 'deleteWordForward',
  'Mod+Backspace': 'deleteSoftLineBackward',
  'Ctrl+K': 'deleteSoftLineForward'
};

/**
 * Firefox does not support beforeinput
 * https://bugzilla.mozilla.org/show_bug.cgi?id=970802
 */
function onKeydown(editor: Editor, event: KeyboardEvent): boolean | void {
  const match = Object.keys(ACCELERATORS).find(acc => shortcut(acc, event));
  if (!match) return false;

  const inputType = ACCELERATORS[match as keyof typeof ACCELERATORS];
  const beforeEvent = new InputEvent('beforeinput', { inputType });
  beforeEvent.preventDefault = () => event.preventDefault();
  return defaultPlugin.handlers?.beforeinput?.(editor, beforeEvent) || false;
}

export default firefox && {
  handlers: {
    keydown: onKeydown
  }
};
