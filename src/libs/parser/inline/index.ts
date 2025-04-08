
function text(state: PenEditor.InlineParserState) {
  if (typeof state.tokens[state.tokens.length - 1] !== 'string') {
    state.tokens.push('');
  }

  state.tokens[state.tokens.length - 1] += state.string[state.index];
  state.index++;
  return true;
}

const parsers = [
  text
];

export default function parseInline(string: string) {
  const state: PenEditor.InlineParserState = {
    index: 0,
    string,
    tokens: [],
    parse(start: number, end: number) {
      return parseInline(string.slice(start, end));
    }
  };

  while (state.index < string.length) {
    for (const parser of parsers) {
      const result = parser(state);
      if (result) break;
    }
  }

  return state.tokens;
}