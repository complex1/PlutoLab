import { useCallback, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./ScientificCalculator.css";

gsap.registerPlugin(useGSAP);

type AngleMode = "deg" | "rad";
type ButtonVariant = "num" | "fn" | "sci" | "mode" | "op" | "eq";

interface SciButton {
  id: string;
  label: string;
  action: () => void;
  variant?: ButtonVariant;
  wide?: boolean;
}

export default function ScientificCalculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [angleMode, setAngleMode] = useState<AngleMode>("deg");
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".sci-btn", {
        y: 10,
        opacity: 0,
        duration: 0.3,
        stagger: 0.02,
        ease: "power2.out",
      });
    },
    { scope: containerRef }
  );

  const append = useCallback((val: string) => {
    setExpression((e) => e + val);
    setResult("");
  }, []);

  const clear = () => {
    setExpression("");
    setResult("");
  };

  const backspace = () => {
    setExpression((e) => e.slice(0, -1));
    setResult("");
  };

  const evaluate = () => {
    try {
      const value = evalExpression(expression, angleMode);
      setResult(String(value));
      gsap.fromTo(
        ".sci-result",
        { opacity: 0.6 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    } catch {
      setResult("Error");
    }
  };

  const rows: SciButton[][] = [
    [
      { id: "mode", label: angleMode.toUpperCase(), action: () => setAngleMode((m) => (m === "deg" ? "rad" : "deg")), variant: "mode" },
      { id: "clear", label: "C", action: clear, variant: "fn" },
      { id: "backspace", label: "⌫", action: backspace, variant: "fn" },
      { id: "lparen", label: "(", action: () => append("("), variant: "fn" },
      { id: "rparen", label: ")", action: () => append(")"), variant: "fn" },
    ],
    [
      { id: "sin", label: "sin", action: () => append("sin("), variant: "sci" },
      { id: "cos", label: "cos", action: () => append("cos("), variant: "sci" },
      { id: "tan", label: "tan", action: () => append("tan("), variant: "sci" },
      { id: "log", label: "log", action: () => append("log("), variant: "sci" },
      { id: "ln", label: "ln", action: () => append("ln("), variant: "sci" },
    ],
    [
      { id: "sqrt", label: "√", action: () => append("sqrt("), variant: "sci" },
      { id: "sq", label: "x²", action: () => append("^2"), variant: "sci" },
      { id: "pow", label: "xʸ", action: () => append("^"), variant: "sci" },
      { id: "pi", label: "π", action: () => append("π"), variant: "sci" },
      { id: "e", label: "e", action: () => append("e"), variant: "sci" },
    ],
    [
      { id: "7", label: "7", action: () => append("7") },
      { id: "8", label: "8", action: () => append("8") },
      { id: "9", label: "9", action: () => append("9") },
      { id: "div", label: "÷", action: () => append("/"), variant: "op" },
    ],
    [
      { id: "4", label: "4", action: () => append("4") },
      { id: "5", label: "5", action: () => append("5") },
      { id: "6", label: "6", action: () => append("6") },
      { id: "mul", label: "×", action: () => append("*"), variant: "op" },
    ],
    [
      { id: "1", label: "1", action: () => append("1") },
      { id: "2", label: "2", action: () => append("2") },
      { id: "3", label: "3", action: () => append("3") },
      { id: "sub", label: "−", action: () => append("-"), variant: "op" },
    ],
    [
      { id: "0", label: "0", action: () => append("0"), wide: true },
      { id: "dot", label: ".", action: () => append(".") },
      { id: "eq", label: "=", action: evaluate, variant: "eq" },
      { id: "add", label: "+", action: () => append("+"), variant: "op" },
    ],
  ];

  return (
    <div ref={containerRef} className="sci-calc">
      <div className="sci-display-wrap">
        <div className="sci-expression">{expression || "0"}</div>
        <div className={`sci-result ${result === "Error" ? "error" : ""}`}>{result}</div>
      </div>

      <div className="sci-grid" role="group" aria-label="Scientific calculator keypad">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="sci-row">
            {row.map((btn) => (
              <button
                key={btn.id}
                type="button"
                className={`sci-btn sci-btn--${btn.variant ?? "num"}${btn.wide ? " sci-btn--wide" : ""}`}
                onClick={btn.action}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function evalExpression(expr: string, mode: AngleMode): number {
  let processed = expr
    .replace(/π/g, String(Math.PI))
    .replace(/e(?![a-z])/g, String(Math.E))
    .replace(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/g, "Math.pow($1,$2)")
    .replace(/(\d+(?:\.\d+)?)\^2/g, "($1)**2")
    .replace(/sqrt\(/g, "Math.sqrt(")
    .replace(/log\(/g, "Math.log10(")
    .replace(/ln\(/g, "Math.log(");

  const toRad = mode === "deg" ? (x: number) => (x * Math.PI) / 180 : (x: number) => x;

  processed = processed.replace(/sin\(([^)]+)\)/g, (_, a) => `Math.sin(${toRad(parseFloat(a))})`);
  processed = processed.replace(/cos\(([^)]+)\)/g, (_, a) => `Math.cos(${toRad(parseFloat(a))})`);
  processed = processed.replace(/tan\(([^)]+)\)/g, (_, a) => `Math.tan(${toRad(parseFloat(a))})`);

  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict"; return (${processed})`);
  const value = fn();
  if (typeof value !== "number" || !isFinite(value)) throw new Error("Invalid");
  return Math.round(value * 1e10) / 1e10;
}
