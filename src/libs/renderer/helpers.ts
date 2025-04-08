export const Fragment = Symbol('Fragment');

const SVG_ELEMENTS = ['svg', 'path'];

interface ElementProps {
  [key: string]: string | number | boolean | EventListenerOrEventListenerObject | Record<string, unknown> | undefined;
  class?: string;
  style?: Partial<CSSStyleDeclaration>;
  role?: string;
  'aria-checked'?: boolean | string;
  'data-text'?: string;
  'data-type'?: string;
  'data-level'?: number;
  contenteditable?: boolean | string;
  spellcheck?: boolean | string;
  autocomplete?: string;
  autocorrect?: string;
  autocapitalize?: string;
}

export type ElementNode = HTMLElement | SVGElement | DocumentFragment;
export type ChildNode = string | ElementNode;
export type Children = Array<ChildNode | ChildNode[]>;

export function h(tag: string | typeof Fragment, props: ElementProps | null, ...children: Array<ChildNode | ChildNode[]>): ElementNode | Children {
  if (tag === Fragment) {
    return children;
  }

  const isSvg = SVG_ELEMENTS.includes(tag as string);
  const el = isSvg ?
    document.createElementNS('http://www.w3.org/2000/svg', tag as string) :
    document.createElement(tag as string);

  if (props) {
    for (const key in props) {
      const value = props[key];
      const type = typeof value;
      if (type === 'function' || type === 'object') {
        // 需要使用索引签名访问元素属性
        Object.defineProperty(el, key, {
          value: value,
          configurable: true
        });
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  // 扁平化子元素
  const flattenChildren = (items: Array<ChildNode | ChildNode[]>): ChildNode[] => {
    return items.reduce((acc: ChildNode[], item) => {
      if (Array.isArray(item)) {
        acc.push(...flattenChildren(item));
      } else if (item != null) {
        acc.push(item);
      }
      return acc;
    }, []);
  };

  const flatChildren = flattenChildren(children);
  el.append(...flatChildren);
  return el;
}

export function cls(...str: (string | undefined | null | false)[]): string {
  return str.filter(s => s).join(' ');
}

export function last<T>(list: T[]): T {
  return list[list.length - 1];
}

/**
 * 确保URL是绝对路径
 * @param {String} str URL字符串
 * @returns {String} 格式化后的URL
 */
export function formatURL(str: string): string {
  try {
    return new URL(str).href;
  } catch {
    return 'http://' + str.replace(/^\/{0,2}/, '');
  }
}
