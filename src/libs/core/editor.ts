import { PenEditorOptions, PenEditorParser, PenEditorPlugin, PenEditorRenderer, PenEditorSelection } from '../typings';
import { getTypeOffset } from '../utils/offset';

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

    this.selection = {
      anchorBlock: 0,
      focusBlock: 0,
      get anchorOffset() {
        return getTypeOffset('anchor', this.element);
      },
      get focusOffset() {
        return getTypeOffset('focus', this.element);
      }
    };


  }
}
