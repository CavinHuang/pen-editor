import { getOffset, serializeState, setOffset } from './shared';
import morphdom from 'morphdom';
import defaultPlugin from './default-plugin';
import firefoxPlugin from './firefox';
import androidPlugin from './android';
import { safari, firefox } from './user-agent';
import type { StateNode, EditorPlugin, CaretPosition, Selection, Renderer, Parser, EditorConstructorOptions } from '../typings/editor';

function toDOM(renderer: Renderer, node: StateNode | string): string | HTMLElement {
  if (typeof node === 'string') return node;

  const content = node.content &&
    node.content.map(child => toDOM(renderer, child));
  return renderer[node.type]({ content });
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
] as const;

const DOCUMENT_EVENTS = [
  'selectionchange'
] as const;

function changeHandlers<T extends { element: HTMLElement } & EventListenerObject>(editor: T, cmd: 'add' | 'remove'): void {
  for (const name of EVENTS) {
    editor.element[`${cmd}EventListener`](name, editor);
  }
  for (const name of DOCUMENT_EVENTS) {
    document[`${cmd}EventListener`](name, editor);
  }
}

function getPath(obj: any, path: string[]): any {
  for (const key of path) {
    obj = obj[key];
    if (!obj) return;
  }
  return obj;
}

/**
 * Call plugins until one returns true
 */
function callPlugins(editor: Editor, path: string[], ...args: any[]): void {
  for (const plugin of editor.plugins) {
    const handler = getPath(plugin, path);
    if (handler && handler(editor, ...args)) break;
  }
}

export default class Editor implements EventListenerObject {
  element!: HTMLElement;
  renderer!: Renderer;
  parser!: Parser;
  plugins!: EditorPlugin[];
  selection!: Selection;
  composing: boolean = false;
  _state: StateNode[] = [];
  _elements: HTMLElement[] = [];

  constructor({
    element,
    value = '',
    renderer = {} as Renderer,
    plugins = [],
    parser
  }: EditorConstructorOptions = {} as EditorConstructorOptions) {
    if (!element || !parser) {
      throw new Error('Editor requires element and parser options');
    }

    this.element = element;
    this.renderer = renderer;
    this.parser = parser;
    this.plugins = [
      firefoxPlugin,
      androidPlugin,
      defaultPlugin,
      ...plugins
    ].filter((plugin): plugin is EditorPlugin => Boolean(plugin));

    const getTypeOffset = (type: 'anchor' | 'focus'): number => {
      const root = this.element.getRootNode() as Document;
      const sel = root.getSelection();
      if (!sel) return -1;
      const block = this.selection[`${type}Block`];
      if (sel[`${type}Node`] === this.element) return 0;
      if (!this.element.contains(sel[`${type}Node`])) return -1;

      return getOffset(
        this.element.children[block] as HTMLElement,
        sel[`${type}Node`] as Node,
        sel[`${type}Offset`]
      );
    };

    this.selection = {
      anchorBlock: 0,
      focusBlock: 0,
      get anchorOffset() {
        return getTypeOffset('anchor');
      },
      get focusOffset() {
        return getTypeOffset('focus');
      }
    };

    this.element.contentEditable = 'true';
    changeHandlers(this, 'add');
    this.value = value;
  }

  handleEvent(event: Event): void {
    callPlugins(this, ['handlers', event.type], event);
  }

  update(state: StateNode[], caret: [number, number] | CaretPosition = [0, 0]): void {
    if (!('anchor' in caret)) {
      caret = { focus: caret, anchor: caret.slice() } as CaretPosition;
    }

    for (const plugin of this.plugins) {
      const handler = plugin.beforeupdate;
      if (!handler) continue;
      const ret = handler(this, state, caret as CaretPosition);
      if (!ret) continue;
      state = ret.state;
      caret = ret.caret;
    }

    this.state = state;
    setOffset(this, caret);
  }

  set state(state: StateNode[]) {
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
        if (typeof el === 'string') return;

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

  get state(): StateNode[] {
    return this._state;
  }

  set value(value: string) {
    this.update(Array.from(this.parser(value)));
  }

  get value(): string {
    return serializeState(this.state, true);
  }

  destroy(): void {
    changeHandlers(this, 'remove');
  }
}
