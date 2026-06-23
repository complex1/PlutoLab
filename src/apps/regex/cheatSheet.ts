export interface CheatSection {
  title: string;
  items: { token: string; meaning: string }[];
}

export const cheatSheetSections: CheatSection[] = [
  {
    title: "Character classes",
    items: [
      { token: "\\d", meaning: "digit" },
      { token: "\\D", meaning: "non-digit" },
      { token: "\\w", meaning: "word character" },
      { token: "\\W", meaning: "non-word character" },
      { token: "\\s", meaning: "whitespace" },
      { token: "\\S", meaning: "non-whitespace" },
      { token: "[abc]", meaning: "a, b, or c" },
      { token: "[^abc]", meaning: "not a, b, or c" },
      { token: ".", meaning: "any character except newline" },
    ],
  },
  {
    title: "Quantifiers",
    items: [
      { token: "+", meaning: "one or more" },
      { token: "*", meaning: "zero or more" },
      { token: "?", meaning: "optional" },
      { token: "{n}", meaning: "exactly n times" },
      { token: "{n,}", meaning: "n or more times" },
      { token: "{n,m}", meaning: "between n and m times" },
    ],
  },
  {
    title: "Anchors",
    items: [
      { token: "^", meaning: "start of line/string" },
      { token: "$", meaning: "end of line/string" },
      { token: "\\b", meaning: "word boundary" },
      { token: "\\B", meaning: "non-word boundary" },
    ],
  },
  {
    title: "Groups",
    items: [
      { token: "(abc)", meaning: "capture group" },
      { token: "(?:abc)", meaning: "non-capturing group" },
      { token: "(?<name>...)", meaning: "named capture group" },
      { token: "$1", meaning: "first capture in replacement" },
    ],
  },
  {
    title: "Lookahead",
    items: [
      { token: "(?=...)", meaning: "positive lookahead" },
      { token: "(?!...)", meaning: "negative lookahead" },
    ],
  },
  {
    title: "Lookbehind",
    items: [
      { token: "(?<=...)", meaning: "positive lookbehind" },
      { token: "(?<!...)", meaning: "negative lookbehind" },
    ],
  },
  {
    title: "Flags",
    items: [
      { token: "g", meaning: "global match" },
      { token: "i", meaning: "case-insensitive" },
      { token: "m", meaning: "multiline" },
      { token: "s", meaning: "dotAll" },
      { token: "u", meaning: "unicode" },
      { token: "y", meaning: "sticky" },
      { token: "d", meaning: "match indices" },
    ],
  },
  {
    title: "Escaping",
    items: [
      { token: "\\\\", meaning: "backslash" },
      { token: "\\.", meaning: "literal dot" },
      { token: "\\(", meaning: "literal (" },
      { token: "\\[", meaning: "literal [" },
    ],
  },
];
