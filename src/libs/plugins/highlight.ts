/* eslint-disable @typescript-eslint/ban-ts-comment */
import styles from './highlight.css';
import { setOffset } from '../core/shared.js';
import type { EditorPlugin, StateNode } from '../typings/editor';
import Editor from '../typings/editor';

// 解决CSS模块类型问题
interface CSSModule {
  [key: string]: string;
}

// 使styles支持索引访问
const cssStyles = styles as unknown as CSSModule;

// @ts-ignore - Prism 没有类型定义文件
import Prism from 'prismjs';

// Languages - 忽略类型检查，因为这些是副作用导入
// @ts-ignore
import 'prismjs/components/prism-apacheconf.js';
// @ts-ignore
import 'prismjs/components/prism-c.js';
// @ts-ignore
import 'prismjs/components/prism-cpp.js';
// @ts-ignore
import 'prismjs/components/prism-csharp.js';
// @ts-ignore
import 'prismjs/components/prism-coffeescript.js';
// @ts-ignore
import 'prismjs/components/prism-css.js';
// @ts-ignore
import 'prismjs/components/prism-go.js';
// @ts-ignore
import 'prismjs/components/prism-java.js';
// @ts-ignore
import 'prismjs/components/prism-javascript.js';
// @ts-ignore
import 'prismjs/components/prism-json.js';
// @ts-ignore
import 'prismjs/components/prism-lua.js';
// @ts-ignore
import 'prismjs/components/prism-matlab.js';
// @ts-ignore
import 'prismjs/components/prism-objectivec.js';
// @ts-ignore
import 'prismjs/components/prism-perl.js';
// @ts-ignore
import 'prismjs/components/prism-php.js';
// @ts-ignore
import 'prismjs/components/prism-python.js';
// @ts-ignore
import 'prismjs/components/prism-r.js';
// @ts-ignore
import 'prismjs/components/prism-ruby.js';
// @ts-ignore
import 'prismjs/components/prism-scala.js';
// @ts-ignore
import 'prismjs/components/prism-scss.js';
// @ts-ignore
import 'prismjs/components/prism-bash.js';
// @ts-ignore
import 'prismjs/components/prism-sql.js';
// @ts-ignore
import 'prismjs/components/prism-swift.js';
// @ts-ignore
import 'prismjs/components/prism-latex.js';

// Language aliases
Object.assign(Prism.languages, {
  apache: Prism.languages.apacheconf,
  'c++': Prism.languages.cpp,
  'c#': Prism.languages.csharp,
  golang: Prism.languages.go,
  mat: Prism.languages.matlab,
  objc: Prism.languages.objectivec,
  py: Prism.languages.python,
  sc: Prism.languages.scala,
  sh: Prism.languages.bash,
  shell: Prism.languages.bash,
  tex: Prism.languages.latex
});

/**
 * Prism 标记接口
 */
interface Token {
  type: string;
  content: string | Token | Array<Token | string>;
}

/**
 * 将 Prism 标记转换为 DOM 节点
 * @param token Prism 标记
 * @returns DOM 节点
 */
function tokenToNode(token: Token | string): Node {
  if (typeof token === 'string') return document.createTextNode(token);

  const tokenObj = token as Token;
  const content = Array.isArray(tokenObj.content) ?
    tokenObj.content.map(tokenToNode) :
    [tokenToNode(tokenObj.content)];

  const node = document.createElement('span');
  const className = cssStyles[tokenObj.type.trim()];
  if (className) node.className = className;
  node.append(...content);

  return node;
}

const TIMEOUT = 500;

/**
 * 代码高亮插件
 */
export default function highlightPlugin(): EditorPlugin {
  let cb: number | undefined;

  return {
    afterchange(editor: Editor): void {
      if (cb) clearTimeout(cb);

      // Wait until typing has stopped
      cb = setTimeout(() => {
        cb = undefined;

        for (const block of editor.state) {
          if (block.type !== 'code_block') continue;

          const index = editor.state.indexOf(block);
          const codeBlock = block as StateNode & {
            content: [string, string, string, string, ...unknown[]]
          };
          const { content: [, language, , code] } = codeBlock;

          const blockNode = editor.element.children[index] as HTMLElement;
          // Already highlighted
          if (blockNode.childNodes.length !== 6) continue;

          const grammar = Prism.languages[language.trim()];
          if (!grammar) continue;

          const {
            anchorBlock,
            anchorOffset,
            focusBlock,
            focusOffset
          } = editor.selection;

          const tokens = Prism.tokenize(code, grammar) as Array<Token | string>;
          const frag = document.createDocumentFragment();
          frag.append(...tokens.map(tokenToNode));

          blockNode.childNodes[3].replaceWith(frag);

          if (anchorOffset !== -1) {
            setOffset(editor, {
              anchor: [anchorBlock, anchorOffset],
              focus: [focusBlock, focusOffset]
            });
          }
        }
      }, TIMEOUT);
    }
  };
}
