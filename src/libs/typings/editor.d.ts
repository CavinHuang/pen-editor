export interface StateNode {
  type: string;
  content?: (StateNode | string)[];
  length?: number;
  attributes?: Record<string, string | number | boolean>;
  children?: StateNode[];
  text?: string;
  value?: string | number;
  id?: string;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  data?: Record<string, unknown>;
}

export interface EditorPlugin {
  beforeupdate?: (editor: Editor) => void;
  afterchange?: (editor: Editor) => void;
  handlers?: Record<string, (event: Event, editor: Editor) => void | boolean | Promise<void>>;
}

export interface CaretPosition {
  anchor: [number, number];
  focus: [number, number];
}

export interface Selection {
  anchorBlock: number;
  focusBlock: number;
  readonly anchorOffset: number;
  readonly focusOffset: number;
}

export interface RendererProps {
  content?: StateNode | StateNode[] | string;
  attributes?: Record<string, string | number | boolean>;
  children?: HTMLElement[];
}

export interface Renderer {
  [key: string]: (props: RendererProps) => HTMLElement;
}

export interface Parser {
  (input: string | string[], preparse?: boolean): Generator<StateNode>;
}

export interface EditorConstructorOptions {
  element: HTMLElement;
  value?: string;
  renderer?: Renderer;
  plugins?: EditorPlugin[];
  parser: Parser;
}

export default class Editor implements EventListenerObject {
  element: HTMLElement;
  renderer: Renderer;
  parser: Parser;
  plugins: EditorPlugin[];
  selection: Selection;
  composing: boolean;
  _state: StateNode[];
  _elements: HTMLElement[];

  constructor(options?: EditorConstructorOptions);

  handleEvent(event: Event): void;
  update(state: StateNode[], caret?: [number, number] | CaretPosition): void;
  get state(): StateNode[];
  set state(state: StateNode[]);
  get value(): string;
  set value(value: string);
  destroy(): void;
}