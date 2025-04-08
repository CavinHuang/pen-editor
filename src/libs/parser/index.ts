import { heading, paragraph } from "./basic";
import parseInline from "./inline";
const parsers = [
  heading,
  paragraph,
];

export default function* parseBlock(value: string, typeOnly = false) {
  let index = 0;
  const lines = Array.isArray(value) ? value : value.split('\n');

  while (index < lines.length) {
    for (const parser of parsers) {
      const result = parser({
        parseInline: typeOnly ? (string: string) => [string] : parseInline,
        lines, index
      });
      if (result) {
        index += result.length;

        yield result;
        break;
      }
    }
  }
}