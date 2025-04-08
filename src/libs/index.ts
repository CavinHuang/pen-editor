import Editor from './core/editor';
import renderer from './renderer/index';
import styles from './renderer/styles.css';
import parser from './parser/block/index';
import enterPlugin from './plugins/enter';
import tabPlugin from './plugins/tab';
import historyPlugin from './plugins/history';
import highlightPlugin from './plugins/highlight';
import formatPlugin from './plugins/format';
import orderedListPlugin from './plugins/ordered-list';
import dropPlugin from './plugins/drop';

interface EditorConstructorOptions {
  element: HTMLElement;
  value?: string;
}

export default class DefaultEditor extends Editor {
  constructor({ element, value }: EditorConstructorOptions = {} as EditorConstructorOptions) {
    element.classList.add(styles.editor);

    const plugins = [
      enterPlugin(),
      tabPlugin(),
      historyPlugin(),
      highlightPlugin(),
      formatPlugin(),
      orderedListPlugin(),
      dropPlugin()
    ];

    super({ element, value, plugins, renderer, parser });
  }
}
