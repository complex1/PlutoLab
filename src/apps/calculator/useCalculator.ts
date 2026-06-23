import { useCallback, useReducer } from "react";
import {
  calculatorReducer,
  INITIAL_STATE,
  type CalculatorAction,
  type Operator,
} from "./calculatorLogic";

const KEY_MAP: Record<string, CalculatorAction> = {
  "0": { type: "DIGIT", digit: "0" },
  "1": { type: "DIGIT", digit: "1" },
  "2": { type: "DIGIT", digit: "2" },
  "3": { type: "DIGIT", digit: "3" },
  "4": { type: "DIGIT", digit: "4" },
  "5": { type: "DIGIT", digit: "5" },
  "6": { type: "DIGIT", digit: "6" },
  "7": { type: "DIGIT", digit: "7" },
  "8": { type: "DIGIT", digit: "8" },
  "9": { type: "DIGIT", digit: "9" },
  ".": { type: "DECIMAL" },
  "+": { type: "OPERATOR", operator: "+" },
  "-": { type: "OPERATOR", operator: "-" },
  "*": { type: "OPERATOR", operator: "×" },
  "/": { type: "OPERATOR", operator: "÷" },
  Enter: { type: "EQUALS" },
  "=": { type: "EQUALS" },
  Escape: { type: "CLEAR" },
  Backspace: { type: "BACKSPACE" },
  "%": { type: "PERCENT" },
};

export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, INITIAL_STATE);

  const pressDigit = useCallback((digit: string) => {
    dispatch({ type: "DIGIT", digit });
  }, []);

  const pressDecimal = useCallback(() => {
    dispatch({ type: "DECIMAL" });
  }, []);

  const pressOperator = useCallback((operator: Operator) => {
    dispatch({ type: "OPERATOR", operator });
  }, []);

  const pressEquals = useCallback(() => {
    dispatch({ type: "EQUALS" });
  }, []);

  const pressClear = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const pressBackspace = useCallback(() => {
    dispatch({ type: "BACKSPACE" });
  }, []);

  const pressToggleSign = useCallback(() => {
    dispatch({ type: "TOGGLE_SIGN" });
  }, []);

  const pressPercent = useCallback(() => {
    dispatch({ type: "PERCENT" });
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const action = KEY_MAP[event.key];
    if (!action) return;

    event.preventDefault();
    dispatch(action);
  }, []);

  return {
    state,
    pressDigit,
    pressDecimal,
    pressOperator,
    pressEquals,
    pressClear,
    pressBackspace,
    pressToggleSign,
    pressPercent,
    handleKeyDown,
  };
}
