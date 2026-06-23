import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { apps } from "@/registry/apps";
import AppCard from "./AppCard";
import "./Catalog.css";

gsap.registerPlugin(useGSAP);

const categories = ["all", "tool", "developer", "game"] as const;
type Filter = (typeof categories)[number];

export default function Catalog() {
  const [filter, setFilter] = useState<Filter>("all");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    filter === "all" ? apps : apps.filter((a) => a.category === filter);

  useGSAP(
    () => {
      gsap.from(".catalog-hero > *", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
      });

      gsap.from(".app-card", {
        y: 16,
        opacity: 0,
        duration: 0.45,
        stagger: 0.06,
        ease: "power2.out",
        delay: 0.2,
      });
    },
    { scope: containerRef, dependencies: [filter], revertOnUpdate: true }
  );

  return (
    <div ref={containerRef} className="catalog">
      <header className="catalog-hero">
        <div className="catalog-mark">P</div>
        <h1 className="catalog-title">Pluto Labs</h1>
        <p className="catalog-tagline">
          Tools, developer apps, games, and experiments — all in one place.
        </p>
      </header>

      <nav className="catalog-filters">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${filter === cat ? "active" : ""}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="catalog-grid">
        {filtered.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>

      <footer className="catalog-footer">
        <span className="footer-dot" />
        <span>More apps coming soon</span>
      </footer>
    </div>
  );
}
