import { useEffect, useMemo, useState } from "react";
import { formatDisplayValue } from "./jsonLogic";
import type { JsonValueType } from "./types";

interface JsonTreeProps {
  data: unknown;
  selectedPath: string | null;
  highlightPaths: Set<string>;
  expandAll: boolean | null;
  onSelectPath: (path: string) => void;
  onCopyPath: (path: string) => void;
  onCopyValue: (value: unknown) => void;
}

function typeBadge(type: JsonValueType) {
  return <span className={`jl-type jl-type--${type}`}>{type}</span>;
}

function TreeNode({
  label,
  path,
  value,
  depth,
  selectedPath,
  highlightPaths,
  expandedPaths,
  togglePath,
  onSelectPath,
  onCopyPath,
  onCopyValue,
}: {
  label: string;
  path: string;
  value: unknown;
  depth: number;
  selectedPath: string | null;
  highlightPaths: Set<string>;
  expandedPaths: Set<string>;
  togglePath: (path: string) => void;
  onSelectPath: (path: string) => void;
  onCopyPath: (path: string) => void;
  onCopyValue: (value: unknown) => void;
}) {
  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);
  const isExpandable = isObject;
  const isExpanded = expandedPaths.has(path);
  const isSelected = selectedPath === path;
  const isHighlighted = highlightPaths.has(path);

  const childCount = isArray
    ? value.length
    : isObject && !isArray
      ? Object.keys(value as object).length
      : 0;

  return (
    <div className={`jl-tree-node ${isSelected ? "selected" : ""} ${isHighlighted ? "highlight" : ""}`}>
      <div className="jl-tree-row" style={{ paddingLeft: `${depth * 14}px` }}>
        {isExpandable ? (
          <button type="button" className="jl-tree-toggle" onClick={() => togglePath(path)} aria-label={isExpanded ? "Collapse" : "Expand"}>
            <i className={`fa-solid fa-chevron-${isExpanded ? "down" : "right"}`} />
          </button>
        ) : (
          <span className="jl-tree-spacer" />
        )}
        <button type="button" className="jl-tree-label" onClick={() => onSelectPath(path)}>
          <span className="jl-tree-key">{label}</span>
          {!isExpandable && (
            <>
              <span className="jl-tree-sep">:</span>
              <span className="jl-tree-value">{formatDisplayValue(value)}</span>
              {typeBadge(
                value === null
                  ? "null"
                  : Array.isArray(value)
                    ? "array"
                    : (typeof value as JsonValueType)
              )}
            </>
          )}
          {isExpandable && <span className="jl-tree-meta">{childCount} {isArray ? "items" : "keys"}</span>}
        </button>
        <div className="jl-tree-actions">
          <button type="button" title="Copy path" onClick={() => onCopyPath(path)}>
            <i className="fa-solid fa-route" />
          </button>
          <button type="button" title="Copy value" onClick={() => onCopyValue(value)}>
            <i className="fa-solid fa-copy" />
          </button>
        </div>
      </div>

      {isExpandable && isExpanded && (
        <div className="jl-tree-children">
          {isArray
            ? (value as unknown[]).map((item, index) => (
                <TreeNode
                  key={`${path}[${index}]`}
                  label={`[${index}]`}
                  path={path ? `${path}[${index}]` : `[${index}]`}
                  value={item}
                  depth={depth + 1}
                  selectedPath={selectedPath}
                  highlightPaths={highlightPaths}
                  expandedPaths={expandedPaths}
                  togglePath={togglePath}
                  onSelectPath={onSelectPath}
                  onCopyPath={onCopyPath}
                  onCopyValue={onCopyValue}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(([key, child]) => (
                <TreeNode
                  key={`${path}.${key}`}
                  label={key}
                  path={path ? `${path}.${key}` : key}
                  value={child}
                  depth={depth + 1}
                  selectedPath={selectedPath}
                  highlightPaths={highlightPaths}
                  expandedPaths={expandedPaths}
                  togglePath={togglePath}
                  onSelectPath={onSelectPath}
                  onCopyPath={onCopyPath}
                  onCopyValue={onCopyValue}
                />
              ))}
        </div>
      )}
    </div>
  );
}

function collectPaths(value: unknown, path = "", paths: string[] = []): string[] {
  if (path) paths.push(path);
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectPaths(item, path ? `${path}[${i}]` : `[${i}]`, paths));
  } else if (value !== null && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => collectPaths(child, path ? `${path}.${key}` : key, paths));
  }
  return paths;
}

export default function JsonTree({
  data,
  selectedPath,
  highlightPaths,
  expandAll,
  onSelectPath,
  onCopyPath,
  onCopyValue,
}: JsonTreeProps) {
  const allPaths = useMemo(() => collectPaths(data), [data]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(allPaths.slice(0, 8)));

  useEffect(() => {
    if (expandAll === true) setExpandedPaths(new Set(allPaths));
    if (expandAll === false) setExpandedPaths(new Set());
  }, [expandAll, allPaths]);

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (data === null || data === undefined) {
    return <p className="jl-empty">Valid JSON required for tree view.</p>;
  }

  const rootLabel = Array.isArray(data) ? `array(${data.length})` : typeof data === "object" ? "root" : "value";

  return (
    <div className="jl-tree">
      <TreeNode
        label={rootLabel}
        path=""
        value={data}
        depth={0}
        selectedPath={selectedPath}
        highlightPaths={highlightPaths}
        expandedPaths={expandedPaths}
        togglePath={togglePath}
        onSelectPath={onSelectPath}
        onCopyPath={onCopyPath}
        onCopyValue={onCopyValue}
      />
    </div>
  );
}
