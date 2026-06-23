import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./AnimatedBackground.css";

gsap.registerPlugin(useGSAP);

export default function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to(".bg-blob", {
        x: "random(-30, 30)",
        y: "random(-20, 20)",
        duration: "random(12, 20)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 2,
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="animated-bg" aria-hidden="true">
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
    </div>
  );
}
