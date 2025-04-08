import type { StateNode, CaretPosition, Selection } from '../typings/editor';

interface Editor {
  element: HTMLElement;
  state: StateNode[];
  selection: Selection;
  parser: (input: string | string[], preparse?: boolean) => Generator<StateNode>;
  update(state: StateNode[], caret: [number, number] | CaretPosition): void;
}

interface ChangeIndexes {
  firstBlockIndex: number;
  lastBlockIndex: number;
}

interface OffsetPosition {
  node: Node;
  offset: number;
}

interface TextNode {
  node: Node;
  text: string;
}

/**
 * Get the index of the top-level element that contains the node
 */
export function findBlockIndex(container: HTMLElement, node: Node, fallback: number = -1): number {
  if (node === container) return fallback;

  let currentNode: Node | null = node;
  while (currentNode && currentNode.parentNode !== container) {
    if (!currentNode.parentNode) break;
    currentNode = currentNode.parentNode;
  }
  if (!currentNode || !(currentNode instanceof Element)) return fallback;
  return Array.from(container.children).indexOf(currentNode);
}

export function getChangeIndexes(editor: Editor, event: Event): ChangeIndexes {
  // Element fired input event
  if (event.target !== editor.element && event.target instanceof Node) {
    const blockIndex = findBlockIndex(editor.element, event.target);

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

/**
 * Generate a new state array. Replace blocks between `from` and `to`(inclusive)
 * with parsed value of text. Keep unchanged blocks
 */
export function getNewState(editor: Editor, from: number, to: number, text: string): StateNode[] {
  const textBefore = editor.state.slice(0, from)
    .map(block => serializeState(block.content).split('\n')).flat();
  const textAfter = editor.state.slice(to + 1)
    .map(block => serializeState(block.content).split('\n')).flat();

  const newState: StateNode[] = [];
  const lines = text.split('\n');
  const newLines = [...textBefore, ...lines, ...textAfter];

  let lineIndex = 0;
  let oldLineIndex = 0;
  let preparser = editor.parser(newLines, true);
  let block = preparser.next().value;

  while (block) {
    if (
      lineIndex + (block.length || 0) - 1 >= textBefore.length &&
      lineIndex < (textBefore.length + lines.length)
    ) {
      // Parse the new text and move `oldLineIndex` to after the change
      let m = 0;
      for (const block of editor.parser(newLines.slice(lineIndex))) {
        m += block.length || 0;
        newState.push(block);
        if (m >= lines.length) break;
      }
      lineIndex += m;
      oldLineIndex += editor.state.slice(from, to + 1)
        .reduce((acc, val) => acc + (val.length || 0), m - lines.length);
      preparser = editor.parser(newLines.slice(lineIndex), true);
      block = preparser.next().value;
      continue;
    }

    let n = 0;
    const oldBlock = editor.state.find(block => {
      const match = n === oldLineIndex;
      n += block.length || 0;
      return match;
    });

    if (oldBlock && oldBlock.type === block.type) {
      // Reuse old block
      newState.push(oldBlock);
      lineIndex += block.length || 0;
      oldLineIndex += block.length || 0;
      block = preparser.next().value;
    } else {
      // Type changed
      const newBlock = editor.parser(newLines.slice(lineIndex)).next().value;
      newState.push(newBlock);
      lineIndex += newBlock.length || 0;
      oldLineIndex += newBlock.length || 0;
      preparser = editor.parser(newLines.slice(lineIndex), true);
      block = preparser.next().value;
    }
  }

  return newState;
}

/**
 * Replace non-breaking space with regular
 */
const NON_BREAKING_SPACE = new RegExp(String.fromCharCode(160), 'g');

function normalizeText(text: string): string {
  return text.replace(NON_BREAKING_SPACE, ' ');
}

/**
 * Create an Generator for all text nodes and elements with `data-text` attribute
 */
function* iterateNodes(parent: Node): Generator<TextNode> {
  const treeWalker = document.createTreeWalker(
    parent,
    NodeFilter.SHOW_TEXT + NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node: Node): number {
        const accept = node.nodeType === Node.TEXT_NODE ||
          (node as HTMLElement).dataset?.text !== undefined;
        return accept ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }
  );

  let node = treeWalker.nextNode();
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const text = (node as HTMLElement).dataset.text || '';
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
export function getText(node: Node): string {
  let text = '';

  for (const val of iterateNodes(node)) {
    text += val.text;
  }

  return text;
}

/**
 * Get caret position in a block
 */
export function getOffset(parent: HTMLElement, target: Node, offset: number): number {
  // Start of line
  if (target === parent && offset === 0) return 0;

  if (target.nodeType !== Node.TEXT_NODE) {
    if (target === parent) {
      const targetNode = parent.childNodes[offset - 1];
      if (!targetNode) return 0;

      if ((targetNode as HTMLElement).tagName === 'BR') return 0;

      if (targetNode.nodeType === Node.TEXT_NODE) {
        offset = (targetNode as Text).data.length;
        target = targetNode;
      } else if ((targetNode as HTMLElement).dataset && 'text' in (targetNode as HTMLElement).dataset) {
        offset = ((targetNode as HTMLElement).dataset.text || '').length;
        target = targetNode;
      } else {
        const nodes = Array.from(iterateNodes(targetNode));
        if (nodes.length === 0) return 0;
        target = nodes[nodes.length - 1].node;
        offset = nodes[nodes.length - 1].text.length;
      }
    } else {
      // Find nearest preceding node with text
      let current: Node = parent;
      for (const { node } of iterateNodes(parent)) {
        if (
          node.compareDocumentPosition(target) ===
            Node.DOCUMENT_POSITION_PRECEDING
        ) break;
        current = node;
      }
      target = current;
      if (target === parent && offset === 0) return 0;
      offset = (target as HTMLElement).dataset ?
        ((target as HTMLElement).dataset.text || '').length :
        (target as Text).data.length;
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

/**
 * Set caret position in editor
 */
export function setOffset(editor: Editor, caret: CaretPosition | [number, number]): void {
  const [anchorBlock, anchorOffset] = 'anchor' in caret ? caret.anchor : caret;
  const [focusBlock, focusOffset] = 'focus' in caret ? caret.focus : caret;

  const startEl = editor.element.children[anchorBlock] as HTMLElement;
  const endEl = editor.element.children[focusBlock] as HTMLElement;
  if (!startEl || !endEl) return;

  const root = editor.element.getRootNode() as Document;
  const selection = root.getSelection();
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
export function getOffsetPosition(el: HTMLElement, offset: number): OffsetPosition {
  if (offset < 0) return { node: el, offset: 0 };

  for (const { node, text } of iterateNodes(el)) {
    if (text.length >= offset) {
      let targetNode = node;
      let targetOffset = offset;

      if ((targetNode as HTMLElement).dataset && 'text' in (targetNode as HTMLElement).dataset) {
        const prevOffset = offset;
        const parentNode = targetNode.parentNode;
        if (!parentNode || !(parentNode instanceof Element)) return { node: el, offset: 0 };

        targetOffset = Array.from(parentNode.childNodes).indexOf(targetNode as ChildNode);
        if (prevOffset >= text.length) targetOffset++;
        targetNode = parentNode;
      }

      return { node: targetNode, offset: targetOffset };
    }

    offset -= text.length;
  }

  return { node: el, offset: el.childNodes.length };
}

/**
 * Serialize state to string
 */
export function serializeState(list: (StateNode | string)[] | undefined, block: boolean = false): string {
  if (!list) return '';
  return list.map(node => {
    if (typeof node === 'string') return node;
    return serializeState(node.content, true);
  }).join(block ? '\n' : '');
}

/**
 * Get ordered selection
 */
export function orderedSelection({
  anchorBlock,
  focusBlock,
  anchorOffset,
  focusOffset
}: Selection): {
  startBlock: number;
  endBlock: number;
  startOffset: number;
  endOffset: number;
} {
  if (
    anchorBlock < focusBlock ||
    (anchorBlock === focusBlock && anchorOffset <= focusOffset)
  ) {
    return {
      startBlock: anchorBlock,
      endBlock: focusBlock,
      startOffset: anchorOffset,
      endOffset: focusOffset
    };
  }

  return {
    startBlock: focusBlock,
    endBlock: anchorBlock,
    startOffset: focusOffset,
    endOffset: anchorOffset
  };
}

/**
 * Replace selection with text
 */
export function replaceSelection(editor: Editor, text: string = ''): void {
  const { startBlock, endBlock, startOffset, endOffset } = orderedSelection(editor.selection);

  const blocks = editor.state.slice(startBlock, endBlock + 1);
  const firstBlock = blocks[0];
  const lastBlock = blocks[blocks.length - 1];

  if (!firstBlock || !lastBlock) return;

  const firstText = serializeState(firstBlock.content);
  const lastText = serializeState(lastBlock.content);

  const newText = firstText.slice(0, startOffset) +
    text +
    lastText.slice(endOffset);

  editor.update(
    getNewState(editor, startBlock, endBlock, newText),
    [startBlock, startOffset + text.length]
  );
}
