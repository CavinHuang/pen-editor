import type { StateNode } from '../../typings/editor';

interface InlineParserState {
  index: number;
  string: string;
  tokens: Array<string | StateNode>;
  parse: (start: number, end: number) => Array<string | StateNode>;
}

type InlineParser = (state: InlineParserState) => boolean;

interface Chars {
  open: string;
  close: string;
}

const WHITESPACE = /\s/;

/**
 * 查找匹配的闭合标记
 */
function findCloseIndex(state: InlineParserState, match: string): number {
  for (let n = state.index + match.length; n < state.string.length; n++) {
    const char = state.string.substring(n, n + match.length);
    if (char === match && !WHITESPACE.test(state.string[n - 1])) {
      return n;
    }
  }

  return -1;
}

/**
 * 获取字符对象
 */
function getChars(chars: string | Chars): Chars {
  if (typeof chars === 'string') {
    return { open: chars, close: chars };
  }
  return chars;
}

/**
 * 匹配字符
 */
function matchChars(CHARS: Array<string | Chars>, state: InlineParserState, index: number): Chars | undefined {
  for (const chars of CHARS) {
    const chars2 = getChars(chars);
    const slice = state.string.substring(index, index + chars2.open.length);
    if (slice === chars2.open) return chars2;
  }
  return undefined;
}

/**
 * 创建内联解析器
 */
function create(
  CHARS: Array<string | Chars>,
  type: string,
  richContent: boolean = true,
  contentRequired: boolean = false
): InlineParser {
  return function(state: InlineParserState): boolean {
    const char = matchChars(CHARS, state, state.index);
    if (!char) return false;

    const nextChar = state.string[state.index + char.open.length];
    if (!nextChar || WHITESPACE.test(nextChar)) return false;

    const closeIndex = findCloseIndex(state, char.close);
    if (closeIndex === -1) return false;

    if (contentRequired && closeIndex === state.index + 1) return false;

    const content = richContent ?
      state.parse(state.index + char.open.length, closeIndex) :
      [state.string.slice(state.index + char.open.length, closeIndex)];
    state.tokens.push({
      type,
      content: [
        char.open,
        ...content,
        char.close
      ]
    });
    state.index = closeIndex + char.close.length;

    return true;
  };
}

export const em = create(['*', '_'], 'em');
export const strong = create(['**', '__'], 'strong');
export const underline = create(['~'], 'underline');
export const strikethrough = create(['~~'], 'strikethrough');
export const mark = create(['::'], 'mark');
export const reference = create([{ open: '[[', close: ']]'}], 'reference');
export const code = create(['`'], 'code', false);
export const file = create([{ open: '[file:', close: ']'}], 'file', false);
export const image = create([{ open: '[image:', close: ']'}], 'image', false);
export const tag = create(['#'], 'tag', false, true);
