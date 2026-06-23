import { useState } from "react";
import { TEMPLATE_PRESETS } from "./constants";
import type { AspectRatio, DashboardSection, ProjectMeta } from "./types";

interface DashboardProps {
  projects: ProjectMeta[];
  projectSearch: string;
  onProjectSearch: (q: string) => void;
  section: DashboardSection;
  onSection: (s: DashboardSection) => void;
  onNew: (title: string, description: string, aspectRatio: AspectRatio) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onImport: (file: File) => void;
}

const NAV: { id: DashboardSection; label: string; icon: string }[] = [
  { id: "projects", label: "Projects", icon: "fa-folder" },
  { id: "templates", label: "Templates", icon: "fa-table-cells-large" },
  { id: "recent", label: "Recent", icon: "fa-clock" },
];

export default function Dashboard({
  projects,
  projectSearch,
  onProjectSearch,
  section,
  onSection,
  onNew,
  onOpen,
  onDelete,
  onDuplicate,
  onImport,
}: DashboardProps) {
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onNew(title.trim(), description.trim(), aspectRatio);
    setShowNew(false);
    setTitle("");
    setDescription("");
  };

  const startFromTemplate = (ar: AspectRatio) => {
    onNew("Untitled Storyboard", "", ar);
  };

  const storageUsed = Math.min(projects.length * 2.4, 999);
  const displayProjects = section === "recent" ? projects.slice(0, 8) : projects;

  return (
    <div className="sb-wf-dashboard">
      <aside className="sb-wf-dash-sidebar">
        <div className="sb-wf-dash-brand">
          <i className="fa-solid fa-clapperboard" />
          <span>Storyboard Tool</span>
        </div>
        <nav className="sb-wf-dash-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? "active" : ""}
              onClick={() => onSection(item.id)}
            >
              <i className={`fa-solid ${item.icon}`} />
              {item.label}
            </button>
          ))}
          <button type="button" className="sb-wf-nav-muted"><i className="fa-solid fa-trash" /> Trash</button>
          <button type="button" className="sb-wf-nav-muted"><i className="fa-solid fa-gear" /> Settings</button>
          <button type="button" className="sb-wf-nav-muted"><i className="fa-solid fa-circle-question" /> Help</button>
          <button type="button" className="sb-wf-nav-muted"><i className="fa-solid fa-circle-info" /> About</button>
        </nav>
        <div className="sb-wf-storage">
          <span>Storage (Local)</span>
          <div className="sb-wf-storage-bar">
            <div className="sb-wf-storage-fill" style={{ width: `${Math.min(storageUsed, 100)}%` }} />
          </div>
          <small>{storageUsed.toFixed(0)} MB of 1 GB used</small>
        </div>
      </aside>

      <main className="sb-wf-dash-main">
        <header className="sb-wf-dash-header">
          <div className="sb-wf-dash-header-left">
            <h1 className="sb-title">Storyboard Tool</h1>
            <button type="button" className="sb-btn sb-btn--primary" onClick={() => setShowNew(true)}>
              <i className="fa-solid fa-plus" /> New Project
            </button>
            <label className="sb-btn">
              <i className="fa-solid fa-file-import" /> Import Project
              <input
                type="file"
                accept=".json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImport(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="sb-wf-dash-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="search"
              placeholder="Search projects…"
              value={projectSearch}
              onChange={(e) => onProjectSearch(e.target.value)}
            />
          </div>
        </header>

        {showNew && (
          <form className="sb-new-form" onSubmit={handleCreate}>
            <h2>New Storyboard Project</h2>
            <label>
              Project title
              <input className="sb-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label>
              Description
              <textarea className="sb-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </label>
            <label>
              Aspect ratio
              <select className="sb-select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}>
                {TEMPLATE_PRESETS.map((t) => (
                  <option key={t.aspectRatio} value={t.aspectRatio}>{t.label} — {t.sub}</option>
                ))}
              </select>
            </label>
            <div className="sb-form-actions">
              <button type="submit" className="sb-btn sb-btn--primary">Create</button>
              <button type="button" className="sb-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </form>
        )}

        {(section === "projects" || section === "recent") && (
          <section className="sb-wf-section">
            <h2>{section === "recent" ? "Recent Projects" : "All Projects"}</h2>
            {displayProjects.length === 0 ? (
              <p className="sb-empty">No projects yet. Create your first storyboard.</p>
            ) : (
              <div className="sb-wf-project-grid">
                {displayProjects.map((p) => (
                  <article key={p.id} className="sb-wf-project-tile">
                    <button type="button" className="sb-wf-project-thumb" onClick={() => onOpen(p.id)}>
                      <span className="sb-wf-thumb-placeholder">
                        <i className="fa-solid fa-film" />
                      </span>
                    </button>
                    <div className="sb-wf-project-info">
                      <button type="button" className="sb-wf-project-name" onClick={() => onOpen(p.id)}>
                        {p.title}
                      </button>
                      <span className="sb-wf-project-updated">{formatRelative(p.updatedAt)}</span>
                      <span className="sb-wf-project-panels">{p.panelCount} Panels</span>
                    </div>
                    <div className="sb-wf-project-menu-wrap">
                      <button
                        type="button"
                        className="sb-icon-btn"
                        onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                        aria-label="Menu"
                      >
                        <i className="fa-solid fa-ellipsis-vertical" />
                      </button>
                      {menuOpen === p.id && (
                        <div className="sb-wf-project-menu">
                          <button type="button" onClick={() => { onDuplicate(p.id); setMenuOpen(null); }}>Duplicate</button>
                          <button type="button" onClick={() => { onDelete(p.id); setMenuOpen(null); }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {(section === "templates" || section === "projects") && (
          <section className="sb-wf-section">
            <h2>Templates</h2>
            <div className="sb-wf-template-row">
              {TEMPLATE_PRESETS.map((t) => (
                <button
                  key={t.aspectRatio}
                  type="button"
                  className="sb-wf-template-card"
                  onClick={() => startFromTemplate(t.aspectRatio)}
                >
                  <i className={`fa-solid ${t.icon}`} />
                  <strong>{t.label}</strong>
                  <span>{t.sub}</span>
                </button>
              ))}
              <button type="button" className="sb-wf-template-card sb-wf-template-custom" onClick={() => setShowNew(true)}>
                <i className="fa-solid fa-plus" />
                <strong>Custom</strong>
                <span>Your size</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Updated just now";
    if (mins < 60) return `Updated ${mins} mins ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Updated ${hrs} hrs ago`;
    return `Updated ${new Date(iso).toLocaleDateString()}`;
  } catch {
    return "";
  }
}
