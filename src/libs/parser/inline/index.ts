import {
  em,
  strong,
  strikethrough,
  underline,
  mark,
  reference,
  code,
  file,
  image,
  tag
} from './basic';
import type { StateNode } from '../../typings/editor';

import link from './link';
import selfcloseTag from './tag';

interface InlineParserState {
  index: number;
  string: string;
  tokens: Array<string | StateNode>;
  parse: (start: number, end: number) => Array<string | StateNode>;
}

type InlineParser = (state: InlineParserState) => boolean;

/**
 * 处理纯文本
 */
function text(state: InlineParserState): boolean {
  if (typeof state.tokens[state.tokens.length - 1] !== 'string') {
    state.tokens.push('');
  }

  state.tokens[state.tokens.length - 1] += state.string[state.index];
  state.index++;

  return true;
}

const parsers: InlineParser[] = [
  selfcloseTag,
  strong,
  em,
  strikethrough,
  underline,
  mark,
  reference,
  code,
  file,
  image,
  tag,
  link,
  text
];

/**
 * 解析内联元素
 * @param string 要解析的文本
 * @returns 解析后的标记数组
 */
export default function parseInline(string: string): Array<string | StateNode> {
  const state: InlineParserState = {
    index: 0,
    string,
    tokens: [],
    parse(start, end) {
      return parseInline(string.slice(start, end));
    }
  };

  while (state.index < string.length) {
    for (const parser of parsers) {
      const result = parser(state);
      if (result) break;
    }
  }

  return state.tokens;
}
