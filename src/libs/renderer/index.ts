/** @jsx h */
/** @jsxFrag Fragment */
import {
  h, Fragment,
  cls, last, formatURL,
  ElementNode, Children
} from './helpers.js';
import styles from './styles.css';
import { get as getFileURL } from './files.js';
import type { Renderer, StateNode, RendererProps } from '../typings/editor';
import Editor from '../core/editor';

interface EventWithTarget extends Event {
  target: HTMLElement;
}

function onTodoClick({ target }: { target: HTMLElement }): void {
  const checked = target.getAttribute('aria-checked') === 'true';
  target.dataset.text = `- [${!checked ? 'x' : ' '}]`;
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

function preventDefault(event: Event): void {
  event.preventDefault();
}

function onTagClick(event: Event): void {
  console.log('Tag click', event);
}

function onHeadingClick(event: Event): void {
  console.log('Heading click', event);
}

function onLinkClick(this: HTMLAnchorElement): void {
  const href = formatURL(this.getAttribute('href') || '');
  window.open(href, '_blank');
}

function onLinkButtonClick(event: Event): void {
  console.log('Link button click', event);
}

function selectElement(this: HTMLElement): void {
  const root = this.getRootNode() as Document;
  const selection = root.getSelection();
  if (!selection) return;

  selection.removeAllRanges();
  const range = document.createRange();

  range.selectNode(this);
  selection.addRange(range);
}

// 重新导出类型
export type ChildNode = string | ElementNode;
export type Children = Array<ChildNode | ChildNode[]>;

export interface ExtendedRendererProps extends Omit<RendererProps, 'content'> {
  content?: StateNode | StateNode[] | string;
  node?: StateNode;
  level?: number;
  checked?: boolean;
  index?: number;
  language?: string;
}

interface ElementNode {
  type?: string;
  className?: string;
  style?: Record<string, any>;
  children?: Array<ElementNode | string>;
  content?: string | ElementNode | Array<ElementNode>;
  data?: Record<string, any>;
  value?: any;
  id?: string;
  text?: string;
}

type RenderChild = ElementNode | Array<ElementNode> | string | null;

export interface RenderContext {
  h: (tag: string | typeof Fragment, props: Record<string, any>, ...children: any[]) => HTMLElement;
  Fragment: typeof Fragment;
  render: (node: ElementNode) => HTMLElement;
}

export function createRenderer(context: RenderContext) {
  const { h, Fragment, render } = context;

  return function renderer(node: ElementNode | string | null): HTMLElement {
    if (!node || typeof node === 'string') {
      const div = document.createElement('div');
      div.textContent = node || '';
      return div;
    }

    const props: Record<string, any> = {
      class: node.className || '',
      style: node.style || {},
      'data-type': node.type || 'div'
    };

    if (node.children && Array.isArray(node.children)) {
      props.children = node.children
        .filter((child): child is ElementNode | string => child != null)
        .map(child => typeof child === 'string' ? child : render(child));
    }

    if (node.content) {
      props.content = node.content;
    }

    if (node.data) {
      Object.assign(props, node.data);
    }

    if (node.value !== undefined) {
      props.value = node.value;
    }

    if (node.id) {
      props.id = node.id;
    }

    const element = h(node.type || 'div', props);
    return element instanceof HTMLElement ? element : document.createElement('div');
  };
}

function createTextNode(content: string): Text {
  return document.createTextNode(content);
}

function createElementFromNode(node: ElementNode): HTMLElement {
  const element = document.createElement('div');
  if (node.text) {
    element.textContent = node.text;
  }
  if (node.className) {
    element.className = node.className;
  }
  return element;
}

function appendContent(element: HTMLElement, content: RenderChild): void {
  if (!content) return;

  if (Array.isArray(content)) {
    content.forEach(item => {
      if (typeof item === 'string') {
        element.appendChild(createTextNode(item));
      } else if (item) {
        element.appendChild(createElementFromNode(item));
      }
    });
  } else if (typeof content === 'string') {
    element.appendChild(createTextNode(content));
  } else if (content) {
    element.appendChild(createElementFromNode(content));
  }
}

export function p({ node, content, children }: ExtendedRendererProps): ElementNode {
  return h('p', {
    class: cls('pen-paragraph', node.type),
    'data-type': node.type
  }, content || children);
}

export function heading({ node, content, level }: ExtendedRendererProps): ElementNode {
  const headingLevel = level || node.level || 1;
  return h(`h${headingLevel}`, {
    class: cls('pen-heading'),
    'data-type': node.type,
    'data-level': headingLevel
  }, content);
}

export const defaultRenderer: Renderer = {
  p(props: RendererProps): HTMLElement {
    const { content } = props;
    const p = document.createElement('p');
    p.className = styles.p;
    if (content) {
      appendContent(p, content as RenderChild);
    }
    return p;
  },

  heading(props: RendererProps): HTMLElement {
    const { content, attributes = {} } = props;
    const level = attributes.level ?? 1;
    const heading = document.createElement('div');
    heading.className = styles.heading;
    heading.setAttribute('data-level', String(level));
    if (content) {
      appendContent(heading, content as RenderChild);
    }
    return heading;
  },

  ordered_list_item(props: RendererProps): HTMLElement {
    const { content, attributes = {} } = props;
    const index = attributes.index ?? 1;
    const item = document.createElement('div');
    item.className = styles.ordered_list_item;
    const numberSpan = document.createElement('span');
    numberSpan.className = styles.ordered_list_item_number;
    numberSpan.textContent = String(index);
    item.appendChild(numberSpan);
    if (content) {
      appendContent(item, content as RenderChild);
    }
    return item;
  },

  unordered_list_item(props: RendererProps): HTMLElement {
    const { content } = props;
    const item = document.createElement('div');
    item.className = styles.unordered_list_item;
    const dotSpan = document.createElement('span');
    dotSpan.className = styles.unordered_list_item_dot;
    dotSpan.textContent = '•';
    item.appendChild(dotSpan);
    if (content) {
      appendContent(item, content as RenderChild);
    }
    return item;
  },

  todo_item(props: RendererProps): HTMLElement {
    const { content, attributes = {} } = props;
    const checked = attributes.checked ?? false;
    const item = document.createElement('div');
    item.className = cls(styles.todo_item, checked ? styles.todo_item_done : '');

    const button = document.createElement('button');
    button.className = styles.checkbox;
    button.setAttribute('aria-checked', String(checked));
    button.onclick = () => {
      const newChecked = !checked;
      button.setAttribute('aria-checked', String(newChecked));
      item.classList.toggle(styles.todo_item_done);
    };

    item.appendChild(button);
    if (content) {
      appendContent(item, content as RenderChild);
    }
    return item;
  },

  blockquote(props: RendererProps): HTMLElement {
    const { content } = props;
    const blockquote = document.createElement('div');
    blockquote.className = styles.blockquote;
    const markupSpan = document.createElement('span');
    markupSpan.className = styles.blockquote_markup;
    markupSpan.textContent = '"';
    blockquote.appendChild(markupSpan);
    if (content) {
      appendContent(blockquote, content as RenderChild);
    }
    return blockquote;
  },

  hr: () => {
    const hr = document.createElement('div');
    hr.className = styles.hr;
    return hr;
  },

  code_block(props: RendererProps): HTMLElement {
    const { content, attributes = {} } = props;
    const language = attributes.language ?? 'text';
    const block = document.createElement('div');
    block.className = styles.code_block;
    const markup = document.createElement('div');
    markup.className = styles.inline_markup;
    const langSpan = document.createElement('span');
    langSpan.className = styles.code_language;
    langSpan.textContent = language;
    const closeButton = document.createElement('button');
    closeButton.className = styles.code_close;
    closeButton.textContent = 'x';
    markup.append(langSpan, closeButton);
    block.appendChild(markup);
    if (content) {
      appendContent(block, content as RenderChild);
    }
    return block;
  },

  paragraph({ content }) {
    const p = h('p', { class: styles.p }, content) as HTMLElement;
    return p;
  },
  heading({ content: [hashes, ...content] }) {
    const level = hashes.length;
    const Heading = `h${level}`;

    const button = h('button', {
      contenteditable: "false",
      type: "button",
      class: styles.heading_button,
      'data-text': hashes,
      onclick: onHeadingClick,
      onmousedown: preventDefault
    },
      h('div', {},
        "h",
        h('span', { class: styles.heading_button_level }, level)
      )
    );

    const heading = h(Heading, { class: cls(styles.heading, styles[Heading]) }, button, ...content) as HTMLElement;
    return heading;
  },
  ordered_list_item({ content: [indentation, level, markup, ...content] }) {
    const item = h('li', { class: styles.ordered_list_item },
      indentation,
      h('span', { class: styles.ordered_list_item_number }, level),
      h('span', { class: styles.ordered_list_item_dot }, markup),
      ...content
    ) as HTMLElement;
    return item;
  },
  unordered_list_item({ content: [indentation, markup, ...content] }) {
    const item = h('li', { class: styles.unordered_list_item },
      indentation,
      h('span', { class: styles.unordered_list_item_dot }, markup),
      ...content
    ) as HTMLElement;
    return item;
  },
  todo_item({ content: [indentation, text, space, ...content] }) {
    const checked = text === '- [x]';

    const checkboxButton = h('button', {
      contenteditable: "false",
      type: "button",
      role: "checkbox",
      'aria-checked': checked,
      class: styles.checkbox,
      'data-text': text,
      onclick: onTodoClick,
      onmousedown: preventDefault
    },
      h('div', { class: styles.checkbox_svg },
        String.fromCharCode(8203),
        h('svg', { width: "17", height: "17", viewBox: "0 0 16 16" },
          h('path', {
            d: "M.5 12.853A2.647 2.647 0 003.147 15.5h9.706a2.647 2.647 0 002.647-2.647V3.147A2.647 2.647 0 0012.853.5H3.147A2.647 2.647 0 00.5 3.147v9.706z",
            class: styles.checkbox_background
          }),
          checked ?
            h('path', {
              d: "M12.526 4.615L6.636 9.58l-2.482-.836a.48.48 0 00-.518.15.377.377 0 00.026.495l2.722 2.91c.086.09.21.144.34.144h.046a.474.474 0 00.307-.156l6.1-7.125a.38.38 0 00-.046-.548.49.49 0 00-.604 0z",
              class: styles.icon
            }) : ''
        )
      )
    );

    const item = h('li', { class: styles.todo_item },
      indentation,
      checkboxButton,
      space,
      h('span', { class: checked ? styles.todo_item_done : '' }, ...content)
    ) as HTMLElement;
    if (checked) {
      item.classList.add(styles.todo_item_done);
    }
    return item;
  },
  blockquote({ content: [markup, ...content] }) {
    const blockquote = h('blockquote', { class: styles.blockquote },
      h('span', { class: styles.blockquote_markup }, markup),
      ...content
    ) as HTMLElement;
    return blockquote;
  },
  horizontal_rule({ content }) {
    return h('p', { class: styles.p },
      h('img', {
        role: "presentation",
        class: styles.hr,
        'data-text': content
      })
    ) as HTMLElement;
  },
  code_block({ content: [openMarkup, language, ...content] }) {
    const block = h('code', {
      class: styles.code_block,
      autocomplete: "off",
      autocorrect: "off",
      autocapitalize: "off",
      spellcheck: "false"
    },
      h('span', { class: styles.inline_markup }, openMarkup),
      h('span', { class: styles.code_language }, language),
      ...content.slice(0, -1),
      h('span', { class: cls(styles.inline_markup, styles.code_close) }, last(content))
    ) as HTMLElement;
    return block;
  },
  em({ content }) {
    return h(Fragment, {},
      h('span', { class: styles.inline_markup }, content[0]),
      h('em', {}, ...content.slice(1, -1)),
      h('span', { class: styles.inline_markup }, last(content))
    ) as HTMLElement;
  },
  strong({ content }) {
    return h(Fragment, {},
      h('span', { class: styles.inline_markup }, content[0]),
      h('strong', {}, ...content.slice(1, -1)),
      h('span', { class: styles.inline_markup }, last(content))
    ) as HTMLElement;
  },
  link({ content: [openBrckt, text, closeBrckt, openPar, link, closePar] }) {
    const linkButton = h('button', {
      contenteditable: "false",
      type: "button",
      'data-text': link,
      class: styles.link_button,
      onclick: onLinkButtonClick,
      onmousedown: preventDefault
    },
      h('svg', { width: "12", height: "12", viewBox: "0 0 14 14" },
        h('path', {
          d: "M10.593 1.17a2.305 2.305 0 00-1.667.691l-.003.002-.964.975c-.525.53-.864 1.096-1.006 1.557-.152.493-.038.684.014.73l-.806.89c-.575-.522-.555-1.324-.355-1.974.21-.682.67-1.41 1.3-2.047l.964-.974a3.505 3.505 0 014.923-.08l.002-.001.002.001.068.07.054.057-.003.003a3.62 3.62 0 01-.2 4.97l-.875.85c-.707.689-1.6 1.002-2.293 1.138a5.128 5.128 0 01-.91.098c-.12.001-.23-.003-.322-.014a1.176 1.176 0 01-.153-.026.635.635 0 01-.327-.186l.875-.822a.565.565 0 00-.261-.158c.03.003.09.007.175.006.171-.002.415-.021.692-.076.564-.11 1.207-.352 1.686-.819l.875-.85a2.42 2.42 0 00.097-3.363 2.306 2.306 0 00-1.582-.649z M10.848 4L4 10.848 3.151 10 10 3.151l.848.849z M3.968 5.84c.62-.217 1.42-.298 1.955.235l-.846.85c-.02-.02-.2-.132-.714.048-.467.163-1.04.519-1.58 1.05l-.872.854a2.28 2.28 0 00.793 3.772 2.37 2.37 0 002.58-.592l.732-.782c.459-.49.701-1.151.817-1.732.056-.285.08-.536.086-.713.003-.09.001-.154 0-.19l-.002-.016v.007a.436.436 0 00.043.13.586.586 0 00.116.163l.848-.848c.113.112.15.242.154.258v.001c.013.04.02.075.023.097.008.046.012.093.015.133.005.085.006.19.002.307a5.766 5.766 0 01-.109.905c-.138.697-.446 1.601-1.117 2.318l-.733.782a3.57 3.57 0 01-5.04.169 3.48 3.48 0 01-.046-5.028l.869-.852C2.58 6.539 3.3 6.072 3.968 5.84z",
          class: styles.icon
        })
      )
    );

    const link = h(Fragment, {},
      h('span', { class: cls(styles.inline_markup, styles.link_open) }, openBrckt),
      h('a', {
        href: link,
        target: "_blank",
        class: styles.link,
        onclick: onLinkClick
      }, text),
      h('span', { class: cls(styles.inline_markup, styles.link_close) }, closeBrckt),
      h('span', { class: styles.link_nowrap },
        h('span', { class: styles.inline_markup }, openPar),
        linkButton,
        h('span', { class: styles.inline_markup }, closePar)
      )
    ) as HTMLElement;
    return link;
  },
  code({ content }) {
    return h('code', {
      class: styles.code_span,
      autocomplete: "off",
      autocorrect: "off",
      autocapitalize: "off",
      spellcheck: "false"
    },
      h('span', { class: styles.code_span_inner },
        h('span', { class: styles.code_span_open }, content[0]),
        ...content.slice(1, -1),
        h('span', { class: styles.code_span_close }, last(content))
      )
    ) as HTMLElement;
  },
  reference({ content }) {
    return h(Fragment, {},
      h('span', { class: styles.inline_markup }, content[0]),
      h('span', { class: styles.reference }, ...content.slice(1, -1)),
      h('span', { class: styles.inline_markup }, last(content))
    ) as HTMLElement;
  },
  mark({ content }) {
    return h('mark', { class: styles.mark },
      h('span', { class: styles.mark_markup }, content[0]),
      ...content.slice(1, -1),
      h('span', { class: styles.mark_markup }, last(content))
    ) as HTMLElement;
  },
  strikethrough({ content }) {
    return h('span', { class: styles.strikethrough },
      content[0],
      h('s', {}, ...content.slice(1, -1)),
      last(content)
    ) as HTMLElement;
  },
  underline({ content }) {
    return h(Fragment, {},
      h('span', { class: styles.inline_markup }, content[0]),
      h('u', { class: styles.underline }, ...content.slice(1, -1)),
      h('span', { class: styles.inline_markup }, last(content))
    ) as HTMLElement;
  },
  tag({ content }) {
    return h('span', {
      role: "button",
      tabindex: "0",
      class: styles.tag,
      onclick: onTagClick
    },
      h('span', { class: styles.tag_markup }, content[0]),
      ...content.slice(1, -1),
      h('span', { class: styles.tag_markup }, last(content))
    ) as HTMLElement;
  },
  image({ content }) {
    const [id, name] = content[1].split('/');

    return h('img', {
      src: getFileURL(id),
      alt: name,
      class: styles.image,
      'data-text': content.join(''),
      onclick: selectElement
    }) as HTMLElement;
  },
  file({ content }) {
    const [id, name] = content[1].split('/');

    return h('button', {
      contenteditable: "false",
      type: "button",
      class: styles.file,
      'data-text': content.join(''),
      'data-name': name,
      'data-id': id,
      'data-date': "",
      onmousedown: preventDefault,
      onclick: selectElement
    },
      h('div', { class: styles.file_svg },
        h('svg', { width: "32", height: "38" },
          h('path', {
            d: "M0 0h20.693L32 10.279V38H0V0zm1 1v36h30V11H19V1H1zm19 0v9h10.207l-9.9-9H20z"
          })
        )
      )
    ) as HTMLElement;
  }
};

export default defaultRenderer;
