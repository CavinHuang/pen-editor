import {
  heading,
  horizontal_rule,
  todo_item,
  ordered_list,
  unordered_list,
  blockquote,
  paragraph
} from './basic';
import parseInline from '../inline/index';
import code from './code';
import type { StateNode } from '../../typings/editor';
import type { BlockParser } from '../../typings/parser';

// 注意：不在这个文件中直接定义ParserContext，导入或使用已有的定义

const parsers: BlockParser[] = [
  heading,
  horizontal_rule,
  todo_item,
  ordered_list,
  unordered_list,
  blockquote,
  code,
  paragraph
];

/**
 * 解析块级元素
 * @param value 要解析的文本或行数组
 * @param typeOnly 是否只解析类型（不处理内联元素）
 */
export default function* parseBlock(value: string | string[], typeOnly = false): Generator<StateNode> {
  let index = 0;
  const lines = Array.isArray(value) ? value : value.split('\n');

  while (index < lines.length) {
    for (const parser of parsers) {
      // 创建一个符合共享类型定义的parseInline函数
      const inlineParser = typeOnly ?
        ((text: string) => [text] as Array<string | StateNode>) :
        parseInline;

      const result = parser({
        parseInline: inlineParser,
        lines,
        index
      });

      if (result) {
        index += result.length || 0;
        yield result;
        break;
      }
    }
  }
}
