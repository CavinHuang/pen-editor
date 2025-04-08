import type { StateNode } from '../editor';

/**
 * 解析上下文接口，提供给解析器使用
 */
export interface ParserContext {
  parseInline: (text: string) => Array<string | StateNode>;
  lines: string[];
  index: number;
}

/**
 * 块级解析器类型
 */
export type BlockParser = (context: ParserContext) => StateNode | undefined;

/**
 * 内联解析器状态接口
 */
export interface InlineParserState {
  index: number;
  string: string;
  tokens: Array<string | StateNode>;
  parse: (start: number, end: number) => Array<string | StateNode>;
}

/**
 * 内联解析器类型
 */
export type InlineParser = (state: InlineParserState) => boolean;