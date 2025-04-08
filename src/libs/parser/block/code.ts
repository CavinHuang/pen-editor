import type { StateNode } from '../../typings/editor';
import type { ParserContext } from '../../typings/parser';

const OPEN = /^(`{3})(.*)$/;
const CLOSE = /^`{3,}.*$/;

/**
 * 创建一个简化版的ParserContext，只包含所需的字段
 * @param ctx 原始上下文
 * @returns 简化的上下文
 */
function createSimpleContext(ctx: ParserContext): Pick<ParserContext, 'lines' | 'index'> {
  return {
    lines: ctx.lines,
    index: ctx.index
  };
}

/**
 * 查找代码块结束行索引
 */
function findClosingLine({ lines, index }: Pick<ParserContext, 'lines' | 'index'>): number {
  for (let n = index + 1; n < lines.length; n++) {
    if (CLOSE.test(lines[n])) return n;
  }

  return -1;
}

/**
 * 代码块解析器
 */
export default function code(context: ParserContext): StateNode | undefined {
  const { lines, index } = context;
  const line = lines[index];
  let match;
  if (!(match = OPEN.exec(line))) return undefined;

  const closingLineIndex = findClosingLine(createSimpleContext(context));
  if (closingLineIndex === -1) return undefined;

  const content = index + 1 === closingLineIndex ?
    [''] :
    [lines.slice(index + 1, closingLineIndex).join('\n'), '\n'];

  return {
    type: 'code_block',
    content: [
      match[1],
      match[2],
      '\n',
      ...content,
      lines[closingLineIndex]
    ],
    length: closingLineIndex - index + 1
  };
}
