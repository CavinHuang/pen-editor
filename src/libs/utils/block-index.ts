/**
 * Get the index of the top-level element that contains the node
 */
export function findBlockIndex(container: HTMLElement, node: HTMLElement, fallback = -1) {
  if (node === container) return fallback;

  while (node.parentNode !== container) {
    node = node.parentNode as HTMLElement;
  }
  return Array.from(container.children).indexOf(node);
}

export function getChangeIndexes(editor: PenEditor.Editor, event: Event) {
  // Element fired input event
  if (event.target !== editor.element) {
    const blockIndex = findBlockIndex(editor.element, event.target as HTMLElement);

    return {
      firstBlockIndex: blockIndex,
      lastBlockIndex: blockIndex
    };
  }

  const { anchorBlock, focusBlock } = editor.selection;
  const firstBlockIndex = Math.min(anchorBlock, focusBlock);
  const lastBlockIndex = Math.max(anchorBlock, focusBlock);

  return { firstBlockIndex, lastBlockIndex };
}
