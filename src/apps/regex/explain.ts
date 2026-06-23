import type { TokenExplanation } from "./types";

const TOKEN_MAP: Record<string, string> = {
  "\\d": "matches any digit",
  "\\D": "matches any non-digit",
  "\\w": "matches word character (letter, digit, underscore)",
  "\\W": "matches non-word character",
  "\\s": "matches whitespace",
  "\\S": "matches non-whitespace",
  "\\b": "word boundary",
  "\\B": "non-word boundary",
  ".": "matches any character except newline",
  "^": "start of line/string",
  "$": "end of line/string",
  "+": "one or more of the preceding",
  "*": "zero or more of the preceding",
  "?": "optional (zero or one)",
  "|": "alternation (or)",
};

export function explainPattern(pattern: string): TokenExplanation[] {
  if (!pattern.trim()) return [];

  const explanations: TokenExplanation[] = [];
  const seen = new Set<string>();
  let i = 0;

  while (i < pattern.length) {
    let token = pattern[i];

    if (pattern[i] === "\\" && i + 1 < pattern.length) {
      token = pattern.slice(i, i + 2);
      i += 2;
    } else if (pattern[i] === "[") {
      const end = pattern.indexOf("]", i);
      token = end > i ? pattern.slice(i, end + 1) : "[";
      i = end > i ? end + 1 : i + 1;
    } else if (pattern[i] === "(") {
      const named = pattern.slice(i).match(/^\(\?<[^>]+>/);
      if (named) {
        token = named[0];
        i += token.length;
      } else {
        const nonCap = pattern.slice(i).startsWith("(?:");
        const look = pattern.slice(i).match(/^\(\?[=!<:]/);
        if (nonCap) {
          token = "(?:";
          i += 3;
        } else if (look) {
          token = look[0];
          i += token.length;
        } else {
          token = "(";
          i += 1;
        }
      }
    } else if ("+*?|^$.".includes(pattern[i])) {
      i += 1;
    } else {
      i += 1;
      continue;
    }

    const meaning = TOKEN_MAP[token];
    if (meaning && !seen.has(token)) {
      seen.add(token);
      explanations.push({ token, meaning });
    }
  }

  return explanations;
}
