import { getCategory, getUnit, type Unit, unitCategories } from "./unitCategories";

export function convertTemperature(value: number, fromId: string, toId: string): number {
  if (fromId === toId) return value;

  let celsius: number;
  if (fromId === "celsius") celsius = value;
  else if (fromId === "fahrenheit") celsius = ((value - 32) * 5) / 9;
  else if (fromId === "kelvin") celsius = value - 273.15;
  else return value;

  if (toId === "celsius") return celsius;
  if (toId === "fahrenheit") return (celsius * 9) / 5 + 32;
  if (toId === "kelvin") return celsius + 273.15;
  return value;
}

export function convertValue(
  value: number,
  categoryId: string,
  fromUnitId: string,
  toUnitId: string
): number {
  if (categoryId === "temperature") {
    return convertTemperature(value, fromUnitId, toUnitId);
  }

  const fromUnit = getUnit(categoryId, fromUnitId);
  const toUnit = getUnit(categoryId, toUnitId);
  if (!fromUnit || !toUnit) return NaN;

  const baseValue = value * fromUnit.factor;
  return baseValue / toUnit.factor;
}

export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";

  const abs = Math.abs(value);
  if (abs >= 1e12 || (abs < 1e-6 && abs > 0)) {
    return value.toExponential(6).replace(/\.?0+e/, "e");
  }

  const rounded = parseFloat(value.toPrecision(8));
  return String(rounded);
}

export interface SearchMatch {
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitLabel: string;
  unitSymbol: string;
}

export function searchUnits(query: string): SearchMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches: SearchMatch[] = [];
  for (const category of unitCategories) {
    const categoryHit =
      category.name.toLowerCase().includes(q) || category.id.toLowerCase().includes(q);

    for (const unit of category.units) {
      if (
        categoryHit ||
        unit.label.toLowerCase().includes(q) ||
        unit.symbol.toLowerCase().includes(q) ||
        unit.id.toLowerCase().includes(q)
      ) {
        matches.push({
          categoryId: category.id,
          categoryName: category.name,
          unitId: unit.id,
          unitLabel: unit.label,
          unitSymbol: unit.symbol,
        });
      }
    }
  }

  return matches.slice(0, 12);
}

export function convertToAllUnits(value: number, categoryId: string, fromUnitId: string): { unit: Unit; result: number }[] {
  const category = getCategory(categoryId);
  const fromUnit = getUnit(categoryId, fromUnitId);
  if (!category || !fromUnit || !Number.isFinite(value)) return [];

  return category.units
    .filter((u) => u.id !== fromUnitId)
    .map((unit) => ({
      unit,
      result: convertValue(value, categoryId, fromUnitId, unit.id),
    }));
}
