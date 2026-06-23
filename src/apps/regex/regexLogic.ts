import type { HighlightSegment, RegexFlag, RegexMatch, ValidationResult } from "./types";

const ALL_FLAGS: RegexFlag[] = ["g", "i", "m", "s", "u", "y", "d"];

export function parsePatternInput(raw: string): { pattern: string; flags: string } {
  const trimmed = raw.trim();
  const slashMatch = trimmed.match(/^\/(.+)\/([gimsuyd]*)$/s);
  if (slashMatch) {
    return { pattern: slashMatch[1], flags: slashMatch[2] };
  }
  return { pattern: raw, flags: "" };
}

export function normalizeFlags(flags: string): string {
  const unique = new Set<string>();
  for (const ch of flags) {
    if (ALL_FLAGS.includes(ch as RegexFlag)) unique.add(ch);
  }
  return ALL_FLAGS.filter((f) => unique.has(f)).join("");
}

export function toggleFlag(flags: string, flag: RegexFlag): string {
  const set = new Set(flags.split(""));
  if (set.has(flag)) set.delete(flag);
  else set.add(flag);
  return normalizeFlags([...set].join(""));
}

export function validateRegex(pattern: string, flags: string): ValidationResult {
  if (!pattern.trim()) {
    return { isValid: true, error: null };
  }
  try {
    new RegExp(pattern, flags);
    return { isValid: true, error: null };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid regex",
    };
  }
}

export function getMatches(pattern: string, flags: string, text: string): RegexMatch[] {
  const validation = validateRegex(pattern, flags);
  if (!validation.isValid || !pattern.trim() || !text) return [];

  const execFlags = flags.includes("g") ? flags : `${flags}g`;
  const regex = new RegExp(pattern, execFlags);
  const matches: RegexMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      value: match[0],
      index: match.index,
      length: match[0].length,
      groups: match.slice(1),
      namedGroups: match.groups ? { ...match.groups } : {},
      indices: match.indices ? [...match.indices] : undefined,
    });

    if (match[0] === "") {
      regex.lastIndex++;
    }
  }

  return matches;
}

export function replaceText(
  pattern: string,
  flags: string,
  text: string,
  replacement: string
): string {
  const validation = validateRegex(pattern, flags);
  if (!validation.isValid || !pattern.trim()) return text;
  const regex = new RegExp(pattern, flags);
  return text.replace(regex, replacement);
}

export function buildHighlightSegments(
  text: string,
  matches: RegexMatch[],
  selectedMatchIndex: number | null
): HighlightSegment[] {
  if (!text || matches.length === 0) return [];

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  matches.forEach((match, matchIndex) => {
    if (match.index > cursor) {
      segments.push({
        start: cursor,
        end: match.index,
        value: text.slice(cursor, match.index),
        matchIndex: -1,
      });
    }

    segments.push({
      start: match.index,
      end: match.index + match.length,
      value: match.value,
      matchIndex,
      isGroup: selectedMatchIndex === matchIndex,
    });

    cursor = match.index + match.length;
  });

  if (cursor < text.length) {
    segments.push({
      start: cursor,
      end: text.length,
      value: text.slice(cursor),
      matchIndex: -1,
    });
  }

  return segments;
}

export function formatRegexForCopy(pattern: string, flags: string, useLiteral = true): string {
  const f = normalizeFlags(flags);
  if (useLiteral && !pattern.includes("/") && !pattern.includes("\n")) {
    return `const regex = /${pattern}/${f};`;
  }
  const escaped = pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `const regex = new RegExp("${escaped}", "${f}");`;
}

export function countLines(text: string): number {
  if (!text) return 0;
  return text.split("\n").length;
}

export function runTestCases(
  pattern: string,
  flags: string,
  cases: { input: string; shouldMatch: boolean }[]
): { passed: number; failed: number; results: { input: string; shouldMatch: boolean; actual: boolean; ok: boolean }[] } {
  const results = cases.map((tc) => {
    const matches = getMatches(pattern, flags, tc.input);
    const actual = matches.length > 0;
    return { ...tc, actual, ok: actual === tc.shouldMatch };
  });
  return {
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}
