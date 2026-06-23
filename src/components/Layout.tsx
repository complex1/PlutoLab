import type { ReactNode } from "react";
import AnimatedBackground from "./AnimatedBackground";
import "./Layout.css";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <AnimatedBackground />
      <div className="layout-content">{children}</div>
    </div>
  );
}
