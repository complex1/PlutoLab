import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { getHistoryLine } from "./calculatorLogic";
import { useCalculator } from "./useCalculator";
import "./Calculator.css";

gsap.registerPlugin(useGSAP);

type ButtonVariant = "num" | "fn" | "op" | "eq";

interface CalcButton {
  label: string;
  variant: ButtonVariant;
  action: () => void;
  wide?: boolean;
  operator?: "+" | "-" | "×" | "÷";
}

export default function Calculator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const {
    state,
    pressDigit,
    pressDecimal,
    pressOperator,
    pressEquals,
    pressClear,
    pressToggleSign,
    pressPercent,
    handleKeyDown,
  } = useCalculator();

  const history = getHistoryLine(state);

  useGSAP(
    () => {
      gsap.from(".calc-key", {
        y: 16,
        opacity: 0,
        duration: 0.35,
        stagger: 0.025,
        ease: "back.out(1.6)",
      });
    },
    { scope: containerRef }
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!displayRef.current) return;
    gsap.fromTo(
      displayRef.current,
      { opacity: 0.7 },
      { opacity: 1, duration: 0.2, ease: "power2.out" }
    );
  }, [state.display]);

  const buttons: CalcButton[] = [
    { label: "AC", variant: "fn", action: pressClear },
    { label: "±", variant: "fn", action: pressToggleSign },
    { label: "%", variant: "fn", action: pressPercent },
    { label: "÷", variant: "op", action: () => pressOperator("÷"), operator: "÷" },
    { label: "7", variant: "num", action: () => pressDigit("7") },
    { label: "8", variant: "num", action: () => pressDigit("8") },
    { label: "9", variant: "num", action: () => pressDigit("9") },
    { label: "×", variant: "op", action: () => pressOperator("×"), operator: "×" },
    { label: "4", variant: "num", action: () => pressDigit("4") },
    { label: "5", variant: "num", action: () => pressDigit("5") },
    { label: "6", variant: "num", action: () => pressDigit("6") },
    { label: "−", variant: "op", action: () => pressOperator("-"), operator: "-" },
    { label: "1", variant: "num", action: () => pressDigit("1") },
    { label: "2", variant: "num", action: () => pressDigit("2") },
    { label: "3", variant: "num", action: () => pressDigit("3") },
    { label: "+", variant: "op", action: () => pressOperator("+"), operator: "+" },
    { label: "0", variant: "num", action: () => pressDigit("0"), wide: true },
    { label: ".", variant: "num", action: pressDecimal },
    { label: "=", variant: "eq", action: pressEquals },
  ];

  return (
    <div ref={containerRef} className="calculator">
      <div className="calculator-screen">
        <div className="calculator-history">{history || "\u00A0"}</div>
        <div
          ref={displayRef}
          className={`calculator-display ${state.error ? "error" : ""}`}
          aria-live="polite"
          aria-label={`Display: ${state.display}`}
        >
          {state.display}
        </div>
      </div>

      <div className="calculator-keys" role="group" aria-label="Calculator keypad">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            className={`calc-key calc-key--${btn.variant}${btn.wide ? " calc-key--wide" : ""}${
              btn.operator && state.pendingOp === btn.operator ? " calc-key--active" : ""
            }`}
            onClick={btn.action}
          >
            <span className="calc-key-label">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
