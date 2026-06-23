import { Link } from "react-router-dom";
import type { AppEntry } from "@/registry/apps";
import BackButton from "./BackButton";
import "./AppShell.css";

interface AppShellProps {
  app: AppEntry;
}

export default function AppShell({ app }: AppShellProps) {
  const AppComponent = app.component;

  return (
    <div className={`app-shell accent-${app.accent}`}>
      <header className="app-shell-header">
        <BackButton />
        <div className="app-shell-title">
          <span className="app-shell-icon">{app.icon}</span>
          <h1>{app.title}</h1>
        </div>
        <Link to="/" className="app-shell-home" title="Catalog">
          ⊕
        </Link>
      </header>
      <main className="app-shell-main">
        <AppComponent />
      </main>
    </div>
  );
}
