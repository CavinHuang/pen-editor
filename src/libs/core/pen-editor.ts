import { isString } from 'es-toolkit'
import { getTypeOffset, setOffset } from '../utils'
import morphdom from 'morphdom';
import { firefox, safari } from '../utils/user-agent';
import { serializeState } from '../utils/state';
import penPlugin from '../plugins/pen-plugin';

export class PenEditor implements PenEditor.Editor {
  /**
   * @description 编辑器容器
   */
  element: HTMLElement

  /**
   * @description 渲染器
   */
  renderer: PenEditor.Renderer

  /**
   * @description 解析器
   */
  parser: PenEditor.Parser

  /**
   * @description 插件
   */
  plugins: PenEditor.Plugin[] = []

  /**
   * @description 正在编辑
   */
  composing: boolean

  /**
   * @description 选区
   */
  selection: PenEditor.Selection

  /**
   * @description 编辑器状态
   */
  _state: PenEditor.StateNode[] = []

  /**
   * @description 编辑器元素
   */
  _elements: HTMLElement[] = []

  constructor(options: PenEditor.Option) {
    const { element, renderer, parser, plugins = [], value = '' } = options

    const el = isString(element) ? document.querySelector(element) : element
    if (!el) {
      throw new Error('element is required')
    }

    if (!renderer || !parser) {
      throw new Error('renderer and parser are required')
    }

    this.element = el as HTMLDivElement

    this.renderer = renderer
    this.parser = parser

    this.composing = false;

    const _element = this.element

    this.plugins = [
      penPlugin,
      ...(plugins || [])
    ]

    this.selection = {
      anchorBlock: 0,
      focusBlock: 0,
      get anchorOffset() {
        return getTypeOffset('anchor', _element, this);
      },
      get focusOffset() {
        return getTypeOffset('focus', _element, this);
      }
    };

    this.element.contentEditable = 'true';
    changeHandlers(this, 'add');
    this.value = value;
  }

  get value(): string {
    return serializeState(this.state, true);
  }

  set value(value: string) {
    this.update(Array.from(this.parser(value)));
  }

  get state(): PenEditor.StateNode[] {
    return this._state
  }

  set state(state: PenEditor.StateNode[]) {
    if (state === this.state) return;

    const prevState = this.state;
    this._state = state;

    state.forEach((node, index) => {
      const current = this.element.children[index];

      if (prevState.includes(node)) {
        // Avoid having to recreate nodes that haven't changed
        const prevIndex = prevState.indexOf(node);
        const el = this._elements[prevIndex];

        if (el === current) return;
        this.element.insertBefore(el, current);
      } else {
        const el = toDOM(this.renderer, node);

        // Improves caret behavior when contenteditable="false"
        // is the last child or when empty
        if (
          !el.childNodes.length ||
          (safari || firefox) &&
          el.lastChild &&
          (el.lastChild as HTMLElement).contentEditable === 'false'
        ) {
          el.append(document.createElement('br'));
        }

        const morph = !state.includes(prevState[index]);
        if (morph && this._elements[index]) {
          morphdom(this._elements[index], el);
        } else {
          this.element.insertBefore(el, current);
        }
      }
    });

    // Remove leftover elements
    while (this.element.childElementCount > state.length) {
      this.element.lastElementChild?.remove();
    }

    this._elements = Array.from(this.element.children) as HTMLElement[];

    callPlugins(this, ['afterchange']);
  }

  /**
   * @description 处理事件
   */
  private handleEvent(event: any) {
    callPlugins(this, ['handlers', event.type], event);
  }

  /**
   * @param {StateNode[]} state
   * @param {[Number, Number]|{ anchor: [Number, Number], focus: [Number, Number] }} caret
   */
  update(state: PenEditor.StateNode[], caret: PenEditor.Caret | [number, number] = [0, 0]) {
    if (isCaretArray(caret)) {
      // TODO 需要测试
      caret = { focus: caret, anchor: caret.slice() as [number, number] };
    }

    for (const plugin of this.plugins) {
      const handler = plugin.beforeupdate;
      if (!handler) continue;
      const ret = handler(this, state, caret as PenEditor.Caret);
      if (!ret) continue;
      state = ret.state;
      caret = ret.caret;
    }

    this.state = state;
    setOffset(this, caret as PenEditor.Caret);
  }
}


const EVENTS = [
  'beforeinput',
  'compositionstart',
  'compositionend',
  'copy',
  'dragstart',
  'drop',
  'paste',
  'input',
  'keydown',
  'keypress'
];

const DOCUMENT_EVENTS = [
  'selectionchange'
];
function changeHandlers(editor: PenEditor, cmd: 'add' | 'remove') {
  for (const name of EVENTS) {
    // TODO fix type
    // @ts-ignore
    editor.element[`${cmd}EventListener`](name, editor);
  }
  for (const name of DOCUMENT_EVENTS) {
    // TODO fix type
    // @ts-ignore
    document[`${cmd}EventListener`](name, editor);
  }
}

function getPath(obj: Record<string, any>, path: string[]) {
  for (const key of path) {
    obj = obj[key];
    if (!obj) return;
  }
  return obj;
}

/**
 * Call plugins until one returns true
 */
function callPlugins(editor: PenEditor, path: string[], ...args: any[]) {
  for (const plugin of editor.plugins) {
    const handler = getPath(plugin,path);
    // TODO fix type
    // @ts-ignore
    if (handler && handler(editor, ...args)) break;
  }
}

/**
 * 判断caret是否为数组
 * @param caret
 * @returns
 */
function isCaretArray(caret: PenEditor.Caret | [number,number]): caret is [number,number] {
  return Array.isArray(caret)
}

/**
 * 将状态节点转换为DOM节点
 * @param renderer 渲染器
 * @param node 状态节点
 * @returns DOM节点
 */
function toDOM(renderer: PenEditor.Renderer, node: PenEditor.StateNode): HTMLElement {
  if (typeof node === 'string') return node;

  // TODO fix type
  // @ts-ignore
  const content = node.content && node.content.map(child => toDOM(renderer,child));
  // TODO fix type
  // @ts-ignore
  return renderer[node.type]({ content });
}