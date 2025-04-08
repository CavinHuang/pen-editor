import { mac } from './user-agent';

/**
 * 规范化键名数组
 * @param {String[]} acc
 * @returns {String}
 */
function normalizeKeys(acc: string[]): string {
  return acc
    .filter((e, i, a) => a.indexOf(e) === i)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .join('+')
    .toLowerCase();
}

/**
 * 规范化快捷键
 * @param {String} acc
 * @returns {String}
 */
function normalizeAcc(acc: string): string {
  return normalizeKeys(acc.replace('Mod', mac ? 'Meta' : 'Ctrl').split('+'));
}

/**
 * 解析事件键名
 * @param {Event} event
 * @returns {String}
 */
function parseEventKeys(event: KeyboardEvent): string {
  const { key } = event;
  const keys = [key];
  if (event.altKey) keys.push('Alt');
  if (event.ctrlKey) keys.push('Ctrl');
  if (event.metaKey) keys.push('Meta');
  if (event.shiftKey) keys.push('Shift');
  return normalizeKeys(keys);
}

/**
 * 检查键盘事件是否匹配快捷键，例如 `Ctrl+B`
 * `Mod` 可以在 Mac 上用作 `Meta`，在其他平台上则用作 `Ctrl`
 * @param {String} acc
 * @param {Event} event
 * @returns {Boolean}
 */
export default function shortcut(acc: string, event: KeyboardEvent): boolean {
  const shortcut = normalizeAcc(acc);
  const eventKeys = parseEventKeys(event);
  return shortcut === eventKeys;
}
