export type WorkerInput = { code: string };

type LogType = "log" | "info" | "warn" | "error" | "table";

function serialize(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;

  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === "bigint") return `${val}n`;
        if (typeof val === "function") return `[Function: ${val.name || "anonymous"}]`;
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        return val;
      },
      2
    );
  } catch {
    return String(value);
  }
}

function formatArgs(args: unknown[]): string {
  return args.map(serialize).join(" ");
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const stack = err.stack?.split("\n").slice(0, 4).join("\n");
    return stack ?? err.message;
  }
  return String(err);
}

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const lines: { type: LogType | "result"; text: string }[] = [];
  const started = performance.now();

  const capture =
    (type: LogType) =>
    (...args: unknown[]) => {
      lines.push({ type, text: formatArgs(args) });
    };

  const sandboxConsole = {
    log: capture("log"),
    info: capture("info"),
    warn: capture("warn"),
    error: capture("error"),
    table: (data: unknown) => {
      lines.push({ type: "table", text: serialize(data) });
    },
  };

  try {
    const runner = new Function(
      "console",
      `"use strict";\n${event.data.code}`
    ) as (console: typeof sandboxConsole) => unknown;

    const result = runner(sandboxConsole);
    const elapsed = performance.now() - started;

    if (result !== undefined) {
      lines.push({ type: "result", text: serialize(result) });
    }

    self.postMessage({ ok: true, lines, elapsed });
  } catch (err) {
    const elapsed = performance.now() - started;
    lines.push({ type: "error", text: formatError(err) });
    self.postMessage({
      ok: false,
      lines,
      error: formatError(err),
      elapsed,
    });
  }
};
