
export type PenEditorSelectionType = 'anchor' | 'focus';
export type PenEditorSelectionBlock = 'anchorBlock' | 'focusBlock';
export type PenEditorSelectionOffset = 'anchorOffset' | 'focusOffset';
export type PenEditorSelectionNode = 'anchorNode' | 'focusNode';

export const getTypeOffset = (type: PenEditorSelectionType, element: HTMLElement) => {
  const sel = (element.getRootNode() as Document).getSelection();
  if (!sel) return -1;
  // TODO: Fix type
  const block = sel[type + 'Block'];
  if (sel[type + 'Node' as PenEditorSelectionNode] === element) return 0;
  if (!element.contains(sel[type + 'Node' as PenEditorSelectionNode])) return -1;

  return getOffset(
    element.children[block],
    sel[type + 'Node' as PenEditorSelectionNode]!,
    sel[type + 'Offset' as PenEditorSelectionOffset]
  );
};

/**
 * Get caret position in a block
 *
 * @param {Element} parent
 * @param {Node} target
 * @param {Number} offset
 * @returns {Number}
 */
export function getOffset(parent: Node, target: Node, offset: number) {
  // Start of line
  if (target === parent && offset === 0) return 0;

  if (target.nodeType !== Node.TEXT_NODE) {
    if (target === parent) {
      target = parent.childNodes[offset - 1];
      if ((target as HTMLElement).tagName === 'BR') return 0;

      if (target.nodeType === Node.TEXT_NODE) {
        offset = (target as Text).data.length;
      } else if ((target as HTMLElement).dataset && 'text' in (target as HTMLElement).dataset) {
        offset = (target as HTMLElement).dataset.text?.length ?? 0;
      } else {
        const nodes = Array.from(iterateNodes(target));
        target = nodes[nodes.length - 1]?.node;
        offset = nodes[nodes.length - 1]?.text?.length ?? 0;
      }
    } else {
      // Find nearest preceding node with text
      let current = parent;
      for (const { node } of iterateNodes(parent)) {
        if (
          node.compareDocumentPosition(target) ===
            Node.DOCUMENT_POSITION_PRECEDING
        ) break;
        current = node;
      }
      target = current;
      if (target === parent && offset === 0) return 0;
      offset = (target as HTMLElement).dataset?.text?.length ?? 0;
    }
  }

  let pos = 0;

  for (const { node, text } of iterateNodes(parent)) {
    if (target === node) {
      return pos + offset;
    }

    pos += text?.length ?? 0;
  }

  return -1;
}


/**
 * Replace non-breaking space with regular
 */
const NON_BREAKING_SPACE = new RegExp(String.fromCharCode(160), 'g');

function normalizeText(text: string) {
  return text.replace(NON_BREAKING_SPACE, ' ');
}

/**
 * Create an Generator for all text nodes and elements with `data-text` attribute
 */
function* iterateNodes(parent: Node) {
  const treeWalker = document.createTreeWalker(
    parent,
    NodeFilter.SHOW_TEXT + NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        const accept = node.nodeType === Node.TEXT_NODE || (node as HTMLElement).dataset.text;
        return accept ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }
  );

  let node = treeWalker.nextNode();
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const text = (node as HTMLElement).dataset.text;
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
 * Get text of a block
 */
export function getText(node: Node) {
  let text = '';

  for (const val of iterateNodes(node)) {
    text += val.text;
  }

  return text;
}


/**
 * @param {Object} editor
 * @param {[Number, Number]|{ anchor: [Number, Number], focus: [Number, Number] }} caret
 */
export function setOffset(editor, caret) {
  const [anchorBlock, anchorOffset] = caret.anchor || caret;
  const [focusBlock, focusOffset] = caret.focus || caret;

  const startEl = editor.element.children[anchorBlock];
  const endEl = editor.element.children[focusBlock];

  const selection = editor.element.getRootNode().getSelection();
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
export function getOffsetPosition(el: Node, offset: number) {
  if (offset < 0) return { node: el, offset: 0 };

  // eslint-disable-next-line prefer-const
  for (let { node, text } of iterateNodes(el)) {
    if (!text) continue;
    if (text.length >= offset) {

      if ((node as HTMLElement).dataset && 'text' in (node as HTMLElement).dataset) {
        const prevOffset = offset;
        offset = Array.from((node as HTMLElement).parentNode?.childNodes ?? []).indexOf(node as ChildNode);
        if (prevOffset >= text.length) offset++;
        node = node.parentNode!;
      }

      return { node, offset };
    }

    offset -= text.length;
  }

  if (offset > 0) {
    // Continue to next block
    return getOffsetPosition(el.nextSibling!, offset - 1);
  }

  return { node: el, offset: 0 };
}