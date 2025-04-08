import type { EditorPlugin } from '../typings/editor';
import type Editor from '../typings/editor';

/**
 * 格式化选项的映射
 */
const FORMATS: Record<string, string> = {
  formatBold: '**',
  formatItalic: '*',
  formatUnderline: '~'
};

/**
 * 创建处理文本格式化的插件
 * @returns 格式化插件
 */
export default function formatPlugin(): EditorPlugin {
  return {
    handlers: {
      beforeinput(editor: Editor, event: Event): boolean | void {
        if (!(event instanceof InputEvent) || !(event.inputType in FORMATS)) return false;

        event.preventDefault();
        console.log('format', event.inputType);
        return true;
      }
    }
  };
}
