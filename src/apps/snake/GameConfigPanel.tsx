import { useState } from "react";
import {
  CONFIG_FIELDS,
  DEFAULT_CONFIG,
  type SnakeConfig,
} from "./snakeConfig";
import "./GameConfigPanel.css";

interface GameConfigPanelProps {
  config: SnakeConfig;
  onSave: (config: SnakeConfig) => void;
  onClose: () => void;
}

export default function GameConfigPanel({
  config,
  onSave,
  onClose,
}: GameConfigPanelProps) {
  const [draft, setDraft] = useState<SnakeConfig>({ ...config });

  const update = (key: keyof SnakeConfig, value: number) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="snake-config-backdrop" onClick={onClose}>
      <div
        className="snake-config"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="snake-config-title"
      >
        <header className="snake-config-header">
          <h2 id="snake-config-title">Game settings</h2>
          <button type="button" className="snake-config-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="snake-config-fields">
          {CONFIG_FIELDS.map((field) => (
            <label key={field.key} className="snake-config-field">
              <div className="snake-config-field-top">
                <span>{field.label}</span>
                <span className="snake-config-value">
                  {draft[field.key]}
                  {field.unit ? ` ${field.unit}` : ""}
                </span>
              </div>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={draft[field.key]}
                onChange={(e) => update(field.key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>

        <footer className="snake-config-actions">
          <button
            type="button"
            className="snake-config-btn snake-config-btn--ghost"
            onClick={() => setDraft({ ...DEFAULT_CONFIG })}
          >
            Reset defaults
          </button>
          <button
            type="button"
            className="snake-config-btn snake-config-btn--primary"
            onClick={() => onSave(draft)}
          >
            Save &amp; apply
          </button>
        </footer>
      </div>
    </div>
  );
}
