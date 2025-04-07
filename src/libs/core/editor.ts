import { PenEditorOptions, PenEditorParser, PenEditorPlugin, PenEditorRenderer, PenEditorSelection } from '../typings';
import { getTypeOffset, setOffset } from '../utils/offset';
import { serializeState } from '../utils/selection';


export class PenEditor {
  element: HTMLElement;
  value: string;
  renderer: PenEditorRenderer;
  plugins: PenEditorPlugin[];
  parser: PenEditorParser;

  private _elements: Element[];

  private _state: any[];

  selection: PenEditorSelection;

  constructor(options: PenEditorOptions) {
    const { element, value = '', renderer, plugins = [], parser } = options;

    this._elements = [];

    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) {
      throw new Error('Element not found');
    }

    this.element = el as HTMLElement;
    if (!renderer) {
      throw new Error('Renderer is required');
    }
    this.renderer = renderer;

    if (!parser) {
      throw new Error('Parser is required');
    }
    this.parser = parser;

    this.plugins = plugins;

    const _element = this.element;
    this.selection = {
      anchorBlock: 0,
      focusBlock: 0,
      get anchorOffset() {
        return getTypeOffset('anchor', _element);
      },
      get focusOffset() {
        return getTypeOffset('focus', _element);
      }
    };

    this.element.contentEditable = 'true';
    changeHandlers(this, 'add');
    this.value = value;
  }


  /**
   * @private
   */
  handleEvent(event) {
    callPlugins(this, ['handlers', event.type], event);
  }

  /**
   * @param {StateNode[]} state
   * @param {[Number, Number]|{ anchor: [Number, Number], focus: [Number, Number] }} caret
   */
  update(state, caret = [0, 0]) {
    if (!caret.anchor) {
      caret = { focus: caret, anchor: caret.slice() };
    }

    for (const plugin of this.plugins) {
      const handler = plugin.beforeupdate;
      if (!handler) continue;
      const ret = handler(this, state, caret);
      if (!ret) continue;
      state = ret.state;
      caret = ret.caret;
    }

    this.state = state;
    setOffset(this, caret);
  }

   /**
   * @param {StateNode[]} state
   */
   set state(state) {
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
          el.lastChild.contentEditable === 'false'
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
      this.element.lastElementChild.remove();
    }

    this._elements = Array.from(this.element.children);

    callPlugins(this, ['afterchange']);
  }

  /**
   * @returns {StateNode[]}
   */
  get state() {
    return this._state;
  }

  /**
   * @param {String} value
   */
  set value(value) {
    this.update(Array.from(this.parser(value)));
  }

  /**
   * @returns {String}
   */
  get value() {
    return serializeState(this.state, true);
  }

  destroy() {
    changeHandlers(this, 'remove');
  }
}

// ================================ Change Handlers ================================
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


/**
 * @typedef {Object} StateNode
 * @property {String} type
 * @property {Array<StateNode|String>} content
 */
function changeHandlers(editor: PenEditor, cmd: 'add' | 'remove') {
  for (const name of EVENTS) {
    // TODO: Fix type
    editor.element[`${cmd}EventListener`](name, editor);
  }
  for (const name of DOCUMENT_EVENTS) {
    // TODO: Fix type
    document[`${cmd}EventListener`](name, editor);
  }
}
// TODO: Fix type
function getPath(obj: any, path: string[]) {
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
    const handler = getPath(plugin, path);
    if (handler && handler(editor, ...args)) break;
  }
}
