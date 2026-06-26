import type { FrameLayer } from "./types";

interface LayersPanelProps {
  layers: FrameLayer[];
  activeLayerId: string;
  hasClipboard: boolean;
  clipboardName?: string | null;
  onSelect: (layerId: string) => void;
  onAdd: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: (layerId: string) => void;
  onDelete: (layerId: string) => void;
  onToggleVisible: (layerId: string) => void;
  onToggleLocked: (layerId: string) => void;
  onRename: (layerId: string, name: string) => void;
  onOpacity: (layerId: string, opacity: number) => void;
  onMove: (layerId: string, direction: -1 | 1) => void;
}

export default function LayersPanel({
  layers,
  activeLayerId,
  hasClipboard,
  clipboardName,
  onSelect,
  onAdd,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onToggleVisible,
  onToggleLocked,
  onRename,
  onOpacity,
  onMove,
}: LayersPanelProps) {
  const sorted = [...layers].sort((a, b) => b.order - a.order);

  return (
    <div className="fa-layers-panel">
      <div className="fa-layers-toolbar">
        <button type="button" className="fa-inspector-icon-btn" onClick={onCopy} title="Copy layer (Ctrl+C)">
          <i className="fa-solid fa-copy" />
        </button>
        <button
          type="button"
          className="fa-inspector-icon-btn"
          onClick={onPaste}
          disabled={!hasClipboard}
          title="Paste layer (Ctrl+V)"
        >
          <i className="fa-solid fa-paste" />
        </button>
        <button type="button" className="fa-inspector-icon-btn" onClick={onAdd} title="Add layer">
          <i className="fa-solid fa-plus" />
        </button>
      </div>

      {hasClipboard && clipboardName && (
        <div className="fa-layer-clipboard-badge" title="Switch frame and paste">
          <i className="fa-solid fa-clipboard" />
          <span>{clipboardName}</span>
        </div>
      )}

      <ul className="fa-layer-list">
        {sorted.map((layer) => {
          const active = layer.id === activeLayerId;
          return (
            <li key={layer.id} className={`fa-layer-item ${active ? "active" : ""}`}>
              <div className="fa-layer-row">
                <button type="button" className="fa-layer-main" onClick={() => onSelect(layer.id)}>
                  <span
                    className="fa-layer-thumb"
                    style={{ opacity: layer.visible ? 1 : 0.35 }}
                  />
                  {active ? (
                    <input
                      className="fa-layer-name"
                      value={layer.name}
                      onChange={(e) => onRename(layer.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="fa-layer-name-text">{layer.name}</span>
                  )}
                </button>
                <div className="fa-layer-quick">
                  <button
                    type="button"
                    className="fa-inspector-icon-btn fa-inspector-icon-btn--sm"
                    onClick={() => onToggleVisible(layer.id)}
                    title={layer.visible ? "Hide" : "Show"}
                  >
                    <i className={`fa-solid ${layer.visible ? "fa-eye" : "fa-eye-slash"}`} />
                  </button>
                  <button
                    type="button"
                    className={`fa-inspector-icon-btn fa-inspector-icon-btn--sm ${layer.locked ? "active" : ""}`}
                    onClick={() => onToggleLocked(layer.id)}
                    title={layer.locked ? "Unlock" : "Lock"}
                  >
                    <i className={`fa-solid ${layer.locked ? "fa-lock" : "fa-lock-open"}`} />
                  </button>
                </div>
              </div>

              {active && (
                <>
                  <div className="fa-layer-tools">
                    <button type="button" className="fa-inspector-icon-btn fa-inspector-icon-btn--sm" onClick={() => onMove(layer.id, 1)} title="Move up">
                      <i className="fa-solid fa-arrow-up" />
                    </button>
                    <button type="button" className="fa-inspector-icon-btn fa-inspector-icon-btn--sm" onClick={() => onMove(layer.id, -1)} title="Move down">
                      <i className="fa-solid fa-arrow-down" />
                    </button>
                    <button type="button" className="fa-inspector-icon-btn fa-inspector-icon-btn--sm" onClick={() => onDuplicate(layer.id)} title="Duplicate">
                      <i className="fa-solid fa-clone" />
                    </button>
                    <button
                      type="button"
                      className="fa-inspector-icon-btn fa-inspector-icon-btn--sm"
                      onClick={() => onDelete(layer.id)}
                      disabled={layers.length <= 1}
                      title="Delete"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                  <label className="fa-layer-opacity">
                    <span>Opacity {Math.round(layer.opacity * 100)}%</span>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={layer.opacity}
                      onChange={(e) => onOpacity(layer.id, +e.target.value)}
                    />
                  </label>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
