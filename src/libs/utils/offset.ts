
export type PenEditorSelectionType = 'anchor' | 'focus';
export type PenEditorSelectionBlock = 'anchorBlock' | 'focusBlock';
export type PenEditorSelectionOffset = 'anchorOffset' | 'focusOffset';
export type PenEditorSelectionNode = 'anchorNode' | 'focusNode';

export const getTypeOffset = (type: PenEditorSelectionType, element: HTMLElement) => {
  const sel = (element.getRootNode() as Document).getSelection();
  if (!sel) return -1;
  const block = sel[type + 'Block' as PenEditorSelectionBlock];
  if (sel[type + 'Node' as PenEditorSelectionNode] === element) return 0;
  if (!element.contains(sel[type + 'Node' as PenEditorSelectionNode])) return -1;

  return getOffset(
    element.children[block],
    sel[type + 'Node' as PenEditorSelectionNode],
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
export function getOffset(parent, target, offset) {
  // Start of line
  if (target === parent && offset === 0) return 0;

  if (target.nodeType !== Node.TEXT_NODE) {
    if (target === parent) {
      target = parent.childNodes[offset - 1];
      if (target.tagName === 'BR') return 0;

      if (target.nodeType === Node.TEXT_NODE) {
        offset = target.data.length;
      } else if (target.dataset && 'text' in target.dataset) {
        offset = target.dataset.text.length;
      } else {
        const nodes = Array.from(iterateNodes(target));
        target = nodes[nodes.length - 1].node;
        offset = nodes[nodes.length - 1].text.length;
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
      offset = target.dataset ? target.dataset.text.length : target.data.length;
    }
  }

  let pos = 0;

  for (const { node, text } of iterateNodes(parent)) {
    if (target === node) {
      return pos + offset;
    }

    pos += text.length;
  }

  return -1;
}
