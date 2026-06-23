export interface Unit {
  id: string;
  label: string;
  symbol: string;
  factor: number;
}

export interface UnitCategory {
  id: string;
  name: string;
  icon: string;
  baseUnit: string;
  units: Unit[];
  tips: string[];
}

export const unitCategories: UnitCategory[] = [
  {
    id: "length",
    name: "Length",
    icon: "fa-ruler",
    baseUnit: "meter",
    tips: [
      "1 meter = 100 centimeters",
      "1 kilometer = 1000 meters",
      "1 inch = 2.54 centimeters",
      "1 mile = 1.60934 kilometers",
      "1 foot = 12 inches",
    ],
    units: [
      { id: "millimeter", label: "Millimeter", symbol: "mm", factor: 0.001 },
      { id: "centimeter", label: "Centimeter", symbol: "cm", factor: 0.01 },
      { id: "meter", label: "Meter", symbol: "m", factor: 1 },
      { id: "kilometer", label: "Kilometer", symbol: "km", factor: 1000 },
      { id: "inch", label: "Inch", symbol: "in", factor: 0.0254 },
      { id: "foot", label: "Foot", symbol: "ft", factor: 0.3048 },
      { id: "yard", label: "Yard", symbol: "yd", factor: 0.9144 },
      { id: "mile", label: "Mile", symbol: "mi", factor: 1609.344 },
    ],
  },
  {
    id: "weight",
    name: "Weight",
    icon: "fa-weight-hanging",
    baseUnit: "kilogram",
    tips: [
      "1 kilogram = 1000 grams",
      "1 pound = 16 ounces",
      "1 metric ton = 1000 kilograms",
      "1 kilogram ≈ 2.20462 pounds",
    ],
    units: [
      { id: "milligram", label: "Milligram", symbol: "mg", factor: 0.000001 },
      { id: "gram", label: "Gram", symbol: "g", factor: 0.001 },
      { id: "kilogram", label: "Kilogram", symbol: "kg", factor: 1 },
      { id: "metric-ton", label: "Metric ton", symbol: "t", factor: 1000 },
      { id: "ounce", label: "Ounce", symbol: "oz", factor: 0.0283495 },
      { id: "pound", label: "Pound", symbol: "lb", factor: 0.453592 },
    ],
  },
  {
    id: "temperature",
    name: "Temperature",
    icon: "fa-temperature-half",
    baseUnit: "celsius",
    tips: [
      "0 °C = 32 °F (water freezes)",
      "100 °C = 212 °F (water boils)",
      "0 K = −273.15 °C (absolute zero)",
      "°C to °F: multiply by 9/5 and add 32",
    ],
    units: [
      { id: "celsius", label: "Celsius", symbol: "°C", factor: 1 },
      { id: "fahrenheit", label: "Fahrenheit", symbol: "°F", factor: 1 },
      { id: "kelvin", label: "Kelvin", symbol: "K", factor: 1 },
    ],
  },
  {
    id: "area",
    name: "Area",
    icon: "fa-vector-square",
    baseUnit: "square-meter",
    tips: [
      "1 square meter = 10,000 square centimeters",
      "1 hectare = 10,000 square meters",
      "1 acre = 4,046.86 square meters",
      "1 square foot = 144 square inches",
    ],
    units: [
      { id: "square-millimeter", label: "Square millimeter", symbol: "mm²", factor: 1e-6 },
      { id: "square-centimeter", label: "Square centimeter", symbol: "cm²", factor: 1e-4 },
      { id: "square-meter", label: "Square meter", symbol: "m²", factor: 1 },
      { id: "square-kilometer", label: "Square kilometer", symbol: "km²", factor: 1e6 },
      { id: "square-inch", label: "Square inch", symbol: "in²", factor: 0.00064516 },
      { id: "square-foot", label: "Square foot", symbol: "ft²", factor: 0.092903 },
      { id: "acre", label: "Acre", symbol: "ac", factor: 4046.86 },
      { id: "hectare", label: "Hectare", symbol: "ha", factor: 10000 },
    ],
  },
  {
    id: "volume",
    name: "Volume",
    icon: "fa-flask",
    baseUnit: "liter",
    tips: [
      "1 liter = 1000 milliliters",
      "1 cubic meter = 1000 liters",
      "1 US gallon ≈ 3.785 liters",
      "1 cup = 16 tablespoons",
    ],
    units: [
      { id: "milliliter", label: "Milliliter", symbol: "mL", factor: 0.001 },
      { id: "liter", label: "Liter", symbol: "L", factor: 1 },
      { id: "cubic-meter", label: "Cubic meter", symbol: "m³", factor: 1000 },
      { id: "teaspoon", label: "Teaspoon", symbol: "tsp", factor: 0.00492892 },
      { id: "tablespoon", label: "Tablespoon", symbol: "tbsp", factor: 0.0147868 },
      { id: "cup", label: "Cup", symbol: "cup", factor: 0.236588 },
      { id: "pint", label: "Pint", symbol: "pt", factor: 0.473176 },
      { id: "quart", label: "Quart", symbol: "qt", factor: 0.946353 },
      { id: "gallon", label: "Gallon", symbol: "gal", factor: 3.78541 },
    ],
  },
  {
    id: "speed",
    name: "Speed",
    icon: "fa-gauge-high",
    baseUnit: "meter-per-second",
    tips: [
      "1 m/s = 3.6 km/h",
      "1 mph ≈ 1.609 km/h",
      "1 knot ≈ 1.852 km/h",
      "Speed of sound ≈ 343 m/s",
    ],
    units: [
      { id: "meter-per-second", label: "Meter per second", symbol: "m/s", factor: 1 },
      { id: "kilometer-per-hour", label: "Kilometer per hour", symbol: "km/h", factor: 1 / 3.6 },
      { id: "mile-per-hour", label: "Mile per hour", symbol: "mph", factor: 0.44704 },
      { id: "knot", label: "Knot", symbol: "kn", factor: 0.514444 },
    ],
  },
  {
    id: "time",
    name: "Time",
    icon: "fa-clock",
    baseUnit: "second",
    tips: [
      "1 minute = 60 seconds",
      "1 hour = 60 minutes",
      "1 day = 24 hours",
      "1 week = 7 days",
    ],
    units: [
      { id: "millisecond", label: "Millisecond", symbol: "ms", factor: 0.001 },
      { id: "second", label: "Second", symbol: "s", factor: 1 },
      { id: "minute", label: "Minute", symbol: "min", factor: 60 },
      { id: "hour", label: "Hour", symbol: "h", factor: 3600 },
      { id: "day", label: "Day", symbol: "d", factor: 86400 },
      { id: "week", label: "Week", symbol: "wk", factor: 604800 },
      { id: "month", label: "Month", symbol: "mo", factor: 2629800 },
      { id: "year", label: "Year", symbol: "yr", factor: 31557600 },
    ],
  },
  {
    id: "data",
    name: "Data Size",
    icon: "fa-hard-drive",
    baseUnit: "byte",
    tips: [
      "1 byte = 8 bits",
      "1 kilobyte (KB) = 1000 bytes",
      "1 kibibyte (KiB) = 1024 bytes",
      "1 megabyte (MB) = 1000 kilobytes",
    ],
    units: [
      { id: "bit", label: "Bit", symbol: "b", factor: 1 / 8 },
      { id: "byte", label: "Byte", symbol: "B", factor: 1 },
      { id: "kilobyte", label: "Kilobyte", symbol: "KB", factor: 1000 },
      { id: "megabyte", label: "Megabyte", symbol: "MB", factor: 1e6 },
      { id: "gigabyte", label: "Gigabyte", symbol: "GB", factor: 1e9 },
      { id: "terabyte", label: "Terabyte", symbol: "TB", factor: 1e12 },
      { id: "kibibyte", label: "Kibibyte", symbol: "KiB", factor: 1024 },
      { id: "mebibyte", label: "Mebibyte", symbol: "MiB", factor: 1024 ** 2 },
      { id: "gibibyte", label: "Gibibyte", symbol: "GiB", factor: 1024 ** 3 },
    ],
  },
  {
    id: "angle",
    name: "Angle",
    icon: "fa-compass",
    baseUnit: "radian",
    tips: [
      "1 full circle = 360 degrees",
      "1 radian ≈ 57.2958 degrees",
      "π radians = 180 degrees",
      "1 gradian = 0.9 degrees",
    ],
    units: [
      { id: "degree", label: "Degree", symbol: "°", factor: Math.PI / 180 },
      { id: "radian", label: "Radian", symbol: "rad", factor: 1 },
      { id: "gradian", label: "Gradian", symbol: "gon", factor: Math.PI / 200 },
    ],
  },
  {
    id: "pressure",
    name: "Pressure",
    icon: "fa-gauge",
    baseUnit: "pascal",
    tips: [
      "1 bar = 100 kilopascals",
      "1 atmosphere ≈ 101.325 kPa",
      "1 PSI ≈ 6.895 kPa",
      "Standard atmospheric pressure ≈ 1 atm",
    ],
    units: [
      { id: "pascal", label: "Pascal", symbol: "Pa", factor: 1 },
      { id: "kilopascal", label: "Kilopascal", symbol: "kPa", factor: 1000 },
      { id: "bar", label: "Bar", symbol: "bar", factor: 100000 },
      { id: "psi", label: "PSI", symbol: "psi", factor: 6894.76 },
      { id: "atmosphere", label: "Atmosphere", symbol: "atm", factor: 101325 },
    ],
  },
  {
    id: "energy",
    name: "Energy",
    icon: "fa-bolt",
    baseUnit: "joule",
    tips: [
      "1 kilojoule = 1000 joules",
      "1 calorie ≈ 4.184 joules",
      "1 kilowatt-hour = 3.6 megajoules",
      "1 food Calorie = 1 kilocalorie",
    ],
    units: [
      { id: "joule", label: "Joule", symbol: "J", factor: 1 },
      { id: "kilojoule", label: "Kilojoule", symbol: "kJ", factor: 1000 },
      { id: "calorie", label: "Calorie", symbol: "cal", factor: 4.184 },
      { id: "kilocalorie", label: "Kilocalorie", symbol: "kcal", factor: 4184 },
      { id: "watt-hour", label: "Watt-hour", symbol: "Wh", factor: 3600 },
      { id: "kilowatt-hour", label: "Kilowatt-hour", symbol: "kWh", factor: 3.6e6 },
    ],
  },
];

export function getCategory(id: string): UnitCategory | undefined {
  return unitCategories.find((c) => c.id === id);
}

export function getUnit(categoryId: string, unitId: string): Unit | undefined {
  return getCategory(categoryId)?.units.find((u) => u.id === unitId);
}
