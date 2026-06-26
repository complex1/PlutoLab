import { useState } from "react";
import type { ProjectMeta } from "./types";

interface DashboardProps {
  projects: ProjectMeta[];
  projectSearch: string;
  onProjectSearch: (q: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onImport: (file: File) => void;
}

export default function Dashboard({
  projects,
  projectSearch,
  onProjectSearch,
  onNew,
  onOpen,
  onDelete,
  onDuplicate,
  onImport,
}: DashboardProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <div className="fa-dashboard">
      <header className="fa-dash-header">
        <div className="fa-dash-brand">
          <i className="fa-solid fa-film" />
          <div>
            <h1>Frame Animator</h1>
            <p>Draw frames. Preview motion. Export animation.</p>
          </div>
        </div>
        <div className="fa-dash-actions">
          <button type="button" className="fa-btn fa-btn--primary" onClick={onNew}>
            <i className="fa-solid fa-plus" /> New Animation
          </button>
          <label className="fa-btn">
            <i className="fa-solid fa-file-import" /> Import Project
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </header>

      <div className="fa-dash-search-wrap">
        <i className="fa-solid fa-magnifying-glass" />
        <input
          type="search"
          placeholder="Search projects…"
          value={projectSearch}
          onChange={(e) => onProjectSearch(e.target.value)}
        />
      </div>

      <section className="fa-dash-section">
        <h2>Recent Projects</h2>
        {projects.length === 0 ? (
          <div className="fa-dash-empty">
            <i className="fa-solid fa-clapperboard" />
            <p>No animations yet. Create your first project.</p>
            <button type="button" className="fa-btn fa-btn--primary" onClick={onNew}>
              New Animation
            </button>
          </div>
        ) : (
          <div className="fa-project-grid">
            {projects.map((p) => (
              <article key={p.id} className="fa-project-card">
                <button type="button" className="fa-project-open" onClick={() => onOpen(p.id)}>
                  <div className="fa-project-thumb">
                    {p.thumbnailData ? (
                      <img src={p.thumbnailData} alt="" />
                    ) : (
                      <span className="fa-project-thumb-empty" />
                    )}
                  </div>
                  <div className="fa-project-meta">
                    <h3>{p.title}</h3>
                    <p>
                      {p.frameCount} frames · {p.durationSec.toFixed(1)}s · {p.fps} FPS
                    </p>
                    <small>{new Date(p.updatedAt).toLocaleDateString()}</small>
                  </div>
                </button>
                <div className="fa-project-menu-wrap">
                  <button
                    type="button"
                    className="fa-icon-btn"
                    onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                  >
                    <i className="fa-solid fa-ellipsis-vertical" />
                  </button>
                  {menuOpen === p.id && (
                    <div className="fa-project-menu">
                      <button type="button" onClick={() => { onOpen(p.id); setMenuOpen(null); }}>
                        Open
                      </button>
                      <button type="button" onClick={() => { onDuplicate(p.id); setMenuOpen(null); }}>
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => { onDelete(p.id); setMenuOpen(null); }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
