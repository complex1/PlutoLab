import type { OnionSkinSettings } from "./types";

interface OnionSkinPanelProps {
  settings: OnionSkinSettings;
  onChange: (patch: Partial<OnionSkinSettings>) => void;
}

export default function OnionSkinPanel({ settings, onChange }: OnionSkinPanelProps) {
  return (
    <section className="fa-panel fa-panel--onion">
      <h3>Onion Skin</h3>
      <label className="fa-check-field">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        Enable onion skin
      </label>

      <div className="fa-onion-preview">
        <div className="fa-onion-preview-row">
          <span className="fa-onion-label fa-onion-label--prev">Previous</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`fa-onion-dot ${n <= settings.previousCount ? "active" : ""}`}
              style={{ background: settings.previousTint, opacity: n <= settings.previousCount ? 0.35 + (6 - n) * 0.1 : 0.15 }}
              title={`Frame -${n}`}
            />
          ))}
        </div>
        <div className="fa-onion-preview-current">Current</div>
        <div className="fa-onion-preview-row">
          <span className="fa-onion-label fa-onion-label--next">Next</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`fa-onion-dot ${n <= settings.nextCount ? "active" : ""}`}
              style={{ background: settings.nextTint, opacity: n <= settings.nextCount ? 0.35 + (6 - n) * 0.1 : 0.15 }}
              title={`Frame +${n}`}
            />
          ))}
        </div>
      </div>

      <label className="fa-slider-field">
        <span>Previous frames ({settings.previousCount})</span>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={settings.previousCount}
          onChange={(e) => onChange({ previousCount: +e.target.value })}
          disabled={!settings.enabled}
        />
      </label>
      <label className="fa-slider-field">
        <span>Next frames ({settings.nextCount})</span>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={settings.nextCount}
          onChange={(e) => onChange({ nextCount: +e.target.value })}
          disabled={!settings.enabled}
        />
      </label>
      <label className="fa-slider-field">
        <span>Opacity {Math.round(settings.opacity * 100)}%</span>
        <input
          type="range"
          min={0.1}
          max={0.8}
          step={0.05}
          value={settings.opacity}
          onChange={(e) => onChange({ opacity: +e.target.value })}
          disabled={!settings.enabled}
        />
      </label>

      <div className="fa-tint-row">
        <label className="fa-tint-field">
          <span>Previous tint</span>
          <input
            type="color"
            value={settings.previousTint}
            onChange={(e) => onChange({ previousTint: e.target.value })}
            disabled={!settings.enabled}
          />
        </label>
        <label className="fa-tint-field">
          <span>Next tint</span>
          <input
            type="color"
            value={settings.nextTint}
            onChange={(e) => onChange({ nextTint: e.target.value })}
            disabled={!settings.enabled}
          />
        </label>
      </div>
    </section>
  );
}
