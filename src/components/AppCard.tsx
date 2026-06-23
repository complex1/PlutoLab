import { useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { AppEntry } from "@/registry/apps";
import "./AppCard.css";

gsap.registerPlugin(useGSAP);

interface AppCardProps {
  app: AppEntry;
}

export default function AppCard({ app }: AppCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  useGSAP(
    () => {
      const card = cardRef.current;
      if (!card) return;

      const onEnter = () => {
        gsap.to(card, {
          y: -4,
          duration: 0.25,
          ease: "power2.out",
        });
      };

      const onLeave = () => {
        gsap.to(card, {
          y: 0,
          duration: 0.25,
          ease: "power2.out",
        });
      };

      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);

      return () => {
        card.removeEventListener("mouseenter", onEnter);
        card.removeEventListener("mouseleave", onLeave);
      };
    },
    { scope: cardRef }
  );

  return (
    <Link
      ref={cardRef}
      to={app.route}
      className={`app-card accent-${app.accent}`}
    >
      <div className="card-icon">{app.icon}</div>
      <div className="card-body">
        <span className="card-category">{app.category}</span>
        <h2 className="card-title">{app.title}</h2>
        <p className="card-desc">{app.description}</p>
        <div className="card-tags">
          {app.tags.map((tag) => (
            <span key={tag} className="card-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <span className="card-arrow">→</span>
    </Link>
  );
}
