/**
 * 编辑器
 */
declare namespace PenEditor {
  /**
   * 编辑器配置
   */
  interface Option {
    /**
     * @description 编辑器容器
     */
    element: HTMLElement | string
    /**
     * @description 编辑器内容
     */
    value?: string
    /**
     * @description 渲染器
     */
    renderer?: Renderer
    /**
     * @description 解析器
     */
    parser?: Parser
    /**
     * @description 插件
     */
    plugins?: Plugin[]
  }

  /**
   * 状态节点
   */
  interface StateNode {
    /**
     * @description 节点类型
     */
    type: string
    /**
     * @description 节点内容
     */
    content: (StateNode | string)[]
  }

  interface Caret {
    anchor: [number, number]
    focus: [number, number]
  }

  /**
   * 插件
   */
  interface EventBeforeupdateRes {
    state: StateNode[]
    caret: Caret
  }
  interface Plugin {
    beforeupdate?: (editor: Editor, state: StateNode[], caret: Caret) => EventBeforeupdateRes | undefined;
    afterchange?: (editor: Editor, state: StateNode[], caret: Caret) => void;
    handlers?: Record<string, (editor: Editor, event: Event) => void | boolean | Promise<void>>;
  }

  /**
   * 解析器
   */
  interface ParserOption {
    lines: string[]
    index: number
    parseInline: (string: string) => string[]
  }
  /**
   * 内联解析器状态
   */
  interface InlineParserState {
    index: number;
    string: string;
    tokens: string[];
    parse(start: number, end: number): string[];
  }
  interface Parser {
    (input: string | string[], preparse?: boolean): Generator<StateNode>;
  }

  interface RendererProps {
    content?: StateNode | StateNode[] | string;
    attributes?: Record<string, string | number | boolean>;
    children?: HTMLElement[];
  }

  /**
   * 渲染器
   */
  interface Renderer {
    [key: string]: (props: RendererProps) => HTMLElement;
  }

  /**
   * 编辑器选区
   */
  interface Selection {
    /**
     * @description 锚点块
     */
    anchorBlock: number
    /**
     * @description 焦点块
     */
    focusBlock: number
    /**
     * @description 锚点偏移
     */
    anchorOffset: number
    /**
     * @description 焦点偏移
     */
    focusOffset: number
  }

  /**
   * @description 选区类型
   */
  type SelectionType = 'anchor' | 'focus'

  type SelectionNodeType = `${SelectionType}Node`
  type SelectionBlockType = `${SelectionType}Block`
  type SelectionOffsetType = `${SelectionType}Offset`
  /**
   * 编辑器
   */
  interface Editor {
    /**
     * @description 编辑器容器
     */
    element: HTMLElement

    /**
     * @description 渲染器
     */
    renderer: PenEditorRenderer

    /**
     * @description 解析器
     */
    parser: PenEditorParser

    /**
     * @description 插件
     */
    plugins: PenEditorPlugin[]

    /**
     * @description 正在编辑
     */
    composing: boolean

    /**
     * @description 选区
     */
    selection: PenEditorSelection

    /**
     * @description 更新编辑器
     * @param state 状态
     * @param caret 选区
     */
    update(state: PenEditor.StateNode[], caret: PenEditor.Caret | [number, number] = [0, 0]): void

    /**
     * @description 编辑器内容
     */
    get value(): string

    /**
     * @description 设置编辑器内容
     * @param value 内容
     */
    set value(value: string)

    /**
     * @description 设置编辑器状态
     * @param state 状态
     */
    set state(state: StateNode[])

    /**
     * @description 获取编辑器状态
     * @returns 状态
     */
    get state(): StateNode[]
  }
}
