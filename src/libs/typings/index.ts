import { PenEditor } from '../core/editor';


export interface PenEditorPlugin {
  handlers: {
    [key: string]: (editor: PenEditor, event: Event) => void;
  };
}

export interface PenEditorRenderer {
  [key: string]: (data: { content: string | string[] }) => void;
}

export type PenEditorParser = (value: string, typeOnly?: boolean) => void;

export interface PenEditorOptions {
  element: HTMLElement | string;
  value?: string;
  renderer?: PenEditorRenderer;
  plugins?: PenEditorPlugin[];
  parser?: PenEditorParser;
}

export interface PenEditorSelection {
  anchorBlock: number;
  focusBlock: number;
  anchorOffset: number;
  focusOffset: number;
}
