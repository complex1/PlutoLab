export type Operator = "+" | "-" | "×" | "÷";

export interface CalculatorState {
  display: string;
  accumulator: number | null;
  pendingOp: Operator | null;
  overwrite: boolean;
  error: boolean;
}

export type CalculatorAction =
  | { type: "DIGIT"; digit: string }
  | { type: "DECIMAL" }
  | { type: "OPERATOR"; operator: Operator }
  | { type: "EQUALS" }
  | { type: "CLEAR" }
  | { type: "BACKSPACE" }
  | { type: "TOGGLE_SIGN" }
  | { type: "PERCENT" };

export const INITIAL_STATE: CalculatorState = {
  display: "0",
  accumulator: null,
  pendingOp: null,
  overwrite: false,
  error: false,
};

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  if (state.error && action.type !== "CLEAR") {
    return state;
  }

  switch (action.type) {
    case "DIGIT":
      return handleDigit(state, action.digit);
    case "DECIMAL":
      return handleDecimal(state);
    case "OPERATOR":
      return handleOperator(state, action.operator);
    case "EQUALS":
      return handleEquals(state);
    case "CLEAR":
      return { ...INITIAL_STATE };
    case "BACKSPACE":
      return handleBackspace(state);
    case "TOGGLE_SIGN":
      return handleToggleSign(state);
    case "PERCENT":
      return handlePercent(state);
    default:
      return state;
  }
}

function handleDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.overwrite || state.display === "0") {
    return {
      ...state,
      display: digit,
      overwrite: false,
      error: false,
    };
  }

  if (state.display.replace("-", "").length >= 12) {
    return state;
  }

  return { ...state, display: state.display + digit };
}

function handleDecimal(state: CalculatorState): CalculatorState {
  if (state.overwrite) {
    return { ...state, display: "0.", overwrite: false };
  }
  if (state.display.includes(".")) {
    return state;
  }
  return { ...state, display: `${state.display}.` };
}

function handleOperator(
  state: CalculatorState,
  operator: Operator
): CalculatorState {
  const current = parseDisplay(state.display);

  if (state.accumulator !== null && state.pendingOp && !state.overwrite) {
    const result = applyOperation(state.accumulator, current, state.pendingOp);
    if (result === null) {
      return { ...INITIAL_STATE, display: "Error", error: true };
    }
    return {
      display: formatResult(result),
      accumulator: result,
      pendingOp: operator,
      overwrite: true,
      error: false,
    };
  }

  return {
    ...state,
    accumulator: current,
    pendingOp: operator,
    overwrite: true,
    error: false,
  };
}

function handleEquals(state: CalculatorState): CalculatorState {
  if (state.accumulator === null || !state.pendingOp) {
    return state;
  }

  const current = parseDisplay(state.display);
  const result = applyOperation(state.accumulator, current, state.pendingOp);

  if (result === null) {
    return { ...INITIAL_STATE, display: "Error", error: true };
  }

  return {
    display: formatResult(result),
    accumulator: null,
    pendingOp: null,
    overwrite: true,
    error: false,
  };
}

function handleBackspace(state: CalculatorState): CalculatorState {
  if (state.overwrite) {
    return state;
  }

  if (state.display.length <= 1 || (state.display.length === 2 && state.display.startsWith("-"))) {
    return { ...state, display: "0" };
  }

  const next = state.display.slice(0, -1);
  return { ...state, display: next || "0" };
}

function handleToggleSign(state: CalculatorState): CalculatorState {
  if (state.display === "0") {
    return state;
  }
  if (state.display.startsWith("-")) {
    return { ...state, display: state.display.slice(1), overwrite: false };
  }
  return { ...state, display: `-${state.display}`, overwrite: false };
}

function handlePercent(state: CalculatorState): CalculatorState {
  const value = parseDisplay(state.display) / 100;
  return {
    ...state,
    display: formatResult(value),
    overwrite: true,
  };
}

function parseDisplay(display: string): number {
  const value = parseFloat(display);
  return Number.isFinite(value) ? value : 0;
}

export function applyOperation(
  a: number,
  b: number,
  op: Operator
): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? null : a / b;
  }
}

export function formatResult(value: number): string {
  if (!Number.isFinite(value)) {
    return "Error";
  }

  const rounded = Math.round(value * 1e10) / 1e10;
  const str = String(rounded);

  if (str.length > 12) {
    return rounded.toExponential(6);
  }

  return str;
}

export function getHistoryLine(state: CalculatorState): string {
  if (state.accumulator === null || !state.pendingOp) {
    return "";
  }
  return `${formatResult(state.accumulator)} ${state.pendingOp}`;
}
