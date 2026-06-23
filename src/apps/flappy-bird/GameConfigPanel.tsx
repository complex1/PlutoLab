import { useState } from "react";
import {
  CONFIG_FIELDS,
  DEFAULT_CONFIG,
  type FlappyConfig,
} from "./flappyConfig";
import "./GameConfigPanel.css";

interface GameConfigPanelProps {
  config: FlappyConfig;
  onSave: (config: FlappyConfig) => void;
  onClose: () => void;
}

export default function GameConfigPanel({
  config,
  onSave,
  onClose,
}: GameConfigPanelProps) {
  const [draft, setDraft] = useState<FlappyConfig>({ ...config });

  const update = (key: keyof FlappyConfig, value: number) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flappy-config-backdrop" onClick={onClose}>
      <div
        className="flappy-config"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="flappy-config-title"
      >
        <header className="flappy-config-header">
          <h2 id="flappy-config-title">Game settings</h2>
          <button type="button" className="flappy-config-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="flappy-config-fields">
          {CONFIG_FIELDS.map((field) => (
            <label key={field.key} className="flappy-config-field">
              <div className="flappy-config-field-top">
                <span>{field.label}</span>
                <span className="flappy-config-value">
                  {draft[field.key].toFixed(field.step < 1 ? 2 : 0)}
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

        <footer className="flappy-config-actions">
          <button
            type="button"
            className="flappy-config-btn flappy-config-btn--ghost"
            onClick={() => setDraft({ ...DEFAULT_CONFIG })}
          >
            Reset defaults
          </button>
          <button
            type="button"
            className="flappy-config-btn flappy-config-btn--primary"
            onClick={() => onSave(draft)}
          >
            Save &amp; apply
          </button>
        </footer>
      </div>
    </div>
  );
}
