
/**
 * 获取选区偏移量
 * @param type 选区类型(anchor/focus)
 * @param element 目标元素
 * @param selection 选区信息
 * @returns 偏移量
 */
export const getTypeOffset = (type: PenEditor.SelectionType, element: HTMLElement, selection: PenEditor.Selection) => {
  const sel = (element.getRootNode() as Document).getSelection();
  if (!sel) return -1;
  const block = selection[type + 'Block' as keyof PenEditor.Selection];
  if (sel[type + 'Node' as PenEditor.SelectionNodeType] === element) return 0;
  if (!element.contains(sel[type + 'Node' as PenEditor.SelectionNodeType])) return -1;

  return getOffset(
    element.children[block] as HTMLElement,
    sel[type + 'Node' as PenEditor.SelectionNodeType] as HTMLElement,
    sel[type + 'Offset' as PenEditor.SelectionOffsetType]
  );
};

/**
 * 判断节点是否为文本节点
 * @param node 待判断的节点
 * @returns 是否为文本节点
 */
export const isTextNode = (node: Node): node is Text => {
  return node.nodeType === Node.TEXT_NODE;
};

/**
 * 判断节点是否为元素节点
 * @param node 待判断的节点
 * @returns 是否为元素节点
 */
export const isElementNode = (node: Node): node is HTMLElement => {
  return node.nodeType === Node.ELEMENT_NODE;
};

/**
 * 获取目标节点在父节点中的偏移量
 * @param parent 父节点
 * @param target 目标节点
 * @param offset 初始偏移量
 * @returns 最终偏移量
 */
export const getOffset = (parent: HTMLElement,target: HTMLElement,offset: number) => {
  // 如果是行首
  if (target === parent && offset === 0) return 0;

  if (!isTextNode(target)) {
    if (target === parent) {
      target = parent.childNodes[offset - 1] as HTMLElement;
      if (target.tagName === 'BR') return 0;

      if (isTextNode(target)) {
        offset = target.data.length;
      } else if (target.dataset && 'text' in target.dataset) {
        offset = target.dataset.text?.length ?? 0;
      } else {
        const nodes = Array.from(iterateNodes(target));
        target = nodes[nodes.length - 1].node as HTMLElement;
        offset = nodes[nodes.length - 1].text.length;
      }
    } else {
      // 查找最近的前置文本节点
      let current = parent;
      for (const { node } of iterateNodes(parent)) {
        if (
          node.compareDocumentPosition(target) ===
            Node.DOCUMENT_POSITION_PRECEDING
        ) break;
        current = node as HTMLElement;
      }
      target = current;
      if (target === parent && offset === 0) return 0;
      offset = target.dataset ? (target.dataset.text?.length ?? 0) : (target as unknown as Text).data.length;
    }
  }

  let pos = 0;

  // 遍历所有节点计算偏移量
  for (const { node, text } of iterateNodes(parent)) {
    if (target === node) {
      return pos + offset;
    }

    pos += text?.length ?? 0;
  }

  return -1;
}

/**
 * 创建一个生成器,用于遍历所有文本节点和带有data-text属性的元素
 * @param parent 父节点
 * @yields 节点和文本内容
 */
function* iterateNodes(parent: Element) {
  const treeWalker = document.createTreeWalker(
    parent,
    NodeFilter.SHOW_TEXT + NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node: HTMLElement) {
        const accept = isTextNode(node) || node.dataset.text;
        return accept ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }
  );

  let node = treeWalker.nextNode();
  while (node) {
    if (isElementNode(node)) {
      const text = node.dataset.text || '';
      yield { node, text };
      node = treeWalker.nextSibling();
    } else {
      const text = normalizeText((node as Text).data);
      yield { node, text };
      node = treeWalker.nextNode();
    }
  }
}

/**
 * 将不间断空格替换为普通空格
 */
const NON_BREAKING_SPACE = new RegExp(String.fromCharCode(160), 'g');
function normalizeText(text: string) {
  return text.replace(NON_BREAKING_SPACE, ' ');
}

/**
 * @param {Object} editor
 * @param {[Number, Number]|{ anchor: [Number, Number], focus: [Number, Number] }} caret
 */
export function setOffset(editor: PenEditor.Editor, caret: PenEditor.Caret) {
  const [anchorBlock, anchorOffset] = caret.anchor || caret;
  const [focusBlock, focusOffset] = caret.focus || caret;

  const startEl = editor.element.children[anchorBlock];
  const endEl = editor.element.children[focusBlock];

  const selection = (editor.element.getRootNode() as Document).getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  const range = document.createRange();

  const anchorPosition = getOffsetPosition(startEl, anchorOffset);
  range.setStart(anchorPosition.node, anchorPosition.offset);
  selection.addRange(range);

  if (anchorBlock !== focusBlock || anchorOffset !== focusOffset) {
    const focusPosition = getOffsetPosition(endEl, focusOffset);
    selection.extend(focusPosition.node, focusPosition.offset);
  }
}


/**
 * Find node and remaining offset for caret position
 */
export function getOffsetPosition(el: Element, offset: number) {
  if (offset < 0) return { node: el, offset: 0 };

  for (let { node, text } of iterateNodes(el)) {
    if (text.length >= offset) {

      if (isElementNode(node) && node.dataset && 'text' in node.dataset) {
        const prevOffset = offset;
        offset = Array.from(node.parentNode?.childNodes ?? []).indexOf(node);
        if (prevOffset >= text.length) offset++;
        node = node.parentNode as Node;
      }

      return { node, offset };
    }

    offset -= text.length;
  }

  if (offset > 0) {
    // Continue to next block
    return getOffsetPosition(el.nextSibling as Element, offset - 1);
  }

  return { node: el, offset: 0 };
}

/**
 * Get text of a block
 */
export function getText(node: Element) {
  let text = '';

  for (const val of iterateNodes(node)) {
    text += val.text;
  }

  return text;
}