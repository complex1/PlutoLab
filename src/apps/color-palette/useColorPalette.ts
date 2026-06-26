import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SAMPLE_IMAGES, SAMPLE_PALETTES } from "./constants";
import {
  drawImageToCanvas,
  extractPaletteFromImageData,
  formatExport,
  generateHarmony,
  getContrastRatio,
  getReadableTextColor,
  hexToHslString,
  hexToRgbString,
  isValidHex,
  loadImageElement,
  normalizeHex,
  pickColorFromImageData,
} from "./colorLogic";
import { deleteSavedPalette, loadSavedPalettes, upsertSavedPalette } from "./storage";
import {
  createColorId,
  createPaletteColor,
  HARMONY_SCHEMES,
  SEMANTIC_LABELS,
  type ExportFormat,
  type HarmonyScheme,
  type PaletteColor,
  type SavedPalette,
} from "./types";

const MAX_COLORS = 8;

export function useColorPalette() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [colors, setColors] = useState<PaletteColor[]>([
    createPaletteColor("#6b9fff", "primary"),
    createPaletteColor("#e07a8a", "secondary"),
    createPaletteColor("#9b8fd4", "accent"),
  ]);
  const [baseColorId, setBaseColorId] = useState<string | null>(null);
  const [harmonyScheme, setHarmonyScheme] = useState<HarmonyScheme>("complementary");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("css");
  const [exportPrefix, setExportPrefix] = useState("color");
  const [manualHex, setManualHex] = useState("#6b9fff");
  const [pickedHex, setPickedHex] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
  const [saveName, setSaveName] = useState("My palette");
  const [activePanel, setActivePanel] = useState<"generate" | "export" | "saved">("generate");

  const baseColor = useMemo(() => {
    const selected = colors.find((c) => c.id === baseColorId);
    return selected?.hex ?? colors[0]?.hex ?? "#6b9fff";
  }, [baseColorId, colors]);

  const harmonyColors = useMemo(
    () => generateHarmony(baseColor, harmonyScheme, 6).map((hex) => normalizeHex(hex)),
    [baseColor, harmonyScheme]
  );

  const exportText = useMemo(
    () => formatExport(colors, exportFormat, exportPrefix.trim() || "color"),
    [colors, exportFormat, exportPrefix]
  );

  const flashStatus = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 1800);
  }, []);

  useEffect(() => {
    void loadSavedPalettes().then(setSavedPalettes);
  }, []);

  useEffect(() => {
    if (!baseColorId && colors[0]) {
      setBaseColorId(colors[0].id);
    }
  }, [baseColorId, colors]);

  const storeImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    imageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  const renderImage = useCallback(
    async (src: string, name = "Image") => {
      try {
        const img = await loadImageElement(src);
        const canvas = canvasRef.current;
        if (!canvas) return;
        drawImageToCanvas(canvas, img);
        storeImageData();
        setImageUrl(src);
        setImageName(name);
        flashStatus(`Loaded ${name}`);
      } catch {
        flashStatus("Could not load image");
      }
    },
    [flashStatus, storeImageData]
  );

  const loadFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      void renderImage(url, file.name);
    },
    [renderImage]
  );

  const extractFromImage = useCallback(() => {
    const data = imageDataRef.current;
    if (!data) {
      flashStatus("Load an image first");
      return;
    }
    const extracted = extractPaletteFromImageData(data.data, data.width, data.height, MAX_COLORS);
    if (extracted.length === 0) {
      flashStatus("No colors found");
      return;
    }
    setColors(
      extracted.map((hex, i) => createPaletteColor(hex, SEMANTIC_LABELS[i] ?? undefined))
    );
    setBaseColorId(null);
    flashStatus(`Extracted ${extracted.length} colors`);
  }, [flashStatus]);

  const pickAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const data = imageDataRef.current;
      if (!canvas || !data) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      const hex = pickColorFromImageData(data.data, data.width, data.height, x, y);
      if (!hex) return;
      setPickedHex(hex);
      setManualHex(hex);
      flashStatus(`Picked ${hex}`);
    },
    [flashStatus]
  );

  const addPickedColor = useCallback(() => {
    if (!pickedHex) return;
    if (colors.length >= MAX_COLORS) {
      flashStatus(`Max ${MAX_COLORS} colors`);
      return;
    }
    setColors((prev) => [...prev, createPaletteColor(pickedHex)]);
    setPickedHex(null);
  }, [colors.length, pickedHex, flashStatus]);

  const addManualColor = useCallback(() => {
    if (!isValidHex(manualHex)) {
      flashStatus("Invalid hex color");
      return;
    }
    if (colors.length >= MAX_COLORS) {
      flashStatus(`Max ${MAX_COLORS} colors`);
      return;
    }
    setColors((prev) => [...prev, createPaletteColor(manualHex)]);
    flashStatus("Color added");
  }, [colors.length, flashStatus, manualHex]);

  const removeColor = useCallback(
    (id: string) => {
      setColors((prev) => prev.filter((c) => c.id !== id));
      if (baseColorId === id) setBaseColorId(null);
    },
    [baseColorId]
  );

  const updateColorHex = useCallback((id: string, hex: string) => {
    if (!isValidHex(hex)) return;
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, hex: normalizeHex(hex) } : c)));
  }, []);

  const updateColorLabel = useCallback((id: string, label: string) => {
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, label: label || undefined } : c)));
  }, []);

  const applyHarmony = useCallback(() => {
    setColors(
      harmonyColors.map((hex, i) => createPaletteColor(hex, SEMANTIC_LABELS[i] ?? undefined))
    );
    setBaseColorId(null);
    flashStatus("Applied harmony palette");
  }, [flashStatus, harmonyColors]);

  const applySamplePalette = useCallback(
    (sampleId: string) => {
      const sample = SAMPLE_PALETTES.find((p) => p.id === sampleId);
      if (!sample) return;
      setColors(
        sample.colors.map((hex, i) => createPaletteColor(hex, SEMANTIC_LABELS[i] ?? undefined))
      );
      setBaseColorId(null);
      flashStatus(`Loaded ${sample.name}`);
    },
    [flashStatus]
  );

  const loadSampleImage = useCallback(
    (id: string) => {
      const sample = SAMPLE_IMAGES.find((s) => s.id === id);
      if (!sample) return;
      void renderImage(sample.url, sample.name);
    },
    [renderImage]
  );

  const copyExport = useCallback(async () => {
    if (!exportText) return;
    try {
      await navigator.clipboard.writeText(exportText);
      flashStatus("Copied to clipboard");
    } catch {
      flashStatus("Copy failed");
    }
  }, [exportText, flashStatus]);

  const copyColor = useCallback(
    async (hex: string, format: "hex" | "rgb" | "hsl" = "hex") => {
      const text =
        format === "rgb" ? hexToRgbString(hex) : format === "hsl" ? hexToHslString(hex) : hex;
      try {
        await navigator.clipboard.writeText(text);
        flashStatus(`Copied ${format.toUpperCase()}`);
      } catch {
        flashStatus("Copy failed");
      }
    },
    [flashStatus]
  );

  const savePalette = useCallback(async () => {
    const name = saveName.trim() || "My palette";
    const now = new Date().toISOString();
    const palette: SavedPalette = {
      id: `palette_${Date.now()}`,
      name,
      colors,
      createdAt: now,
      updatedAt: now,
    };
    const next = await upsertSavedPalette(palette);
    setSavedPalettes(next);
    flashStatus("Palette saved");
  }, [colors, flashStatus, saveName]);

  const loadSaved = useCallback(
    (palette: SavedPalette) => {
      setColors(palette.colors.map((c) => ({ ...c, id: createColorId() })));
      setSaveName(palette.name);
      setBaseColorId(null);
      flashStatus(`Loaded ${palette.name}`);
    },
    [flashStatus]
  );

  const removeSaved = useCallback(
    async (id: string) => {
      const next = await deleteSavedPalette(id);
      setSavedPalettes(next);
      flashStatus("Palette deleted");
    },
    [flashStatus]
  );

  const clearPalette = useCallback(() => {
    setColors([]);
    setBaseColorId(null);
    flashStatus("Palette cleared");
  }, [flashStatus]);

  const contrastWithWhite = useCallback((hex: string) => getContrastRatio(hex, "#ffffff"), []);
  const contrastWithBlack = useCallback((hex: string) => getContrastRatio(hex, "#000000"), []);

  return {
    canvasRef,
    fileRef,
    imageUrl,
    imageName,
    colors,
    baseColorId,
    setBaseColorId,
    baseColor,
    harmonyScheme,
    setHarmonyScheme,
    harmonySchemes: HARMONY_SCHEMES,
    harmonyColors,
    exportFormat,
    setExportFormat,
    exportPrefix,
    setExportPrefix,
    exportText,
    manualHex,
    setManualHex,
    pickedHex,
    status,
    savedPalettes,
    saveName,
    setSaveName,
    activePanel,
    setActivePanel,
    samplePalettes: SAMPLE_PALETTES,
    sampleImages: SAMPLE_IMAGES,
    loadFile,
    extractFromImage,
    pickAt,
    addPickedColor,
    addManualColor,
    removeColor,
    updateColorHex,
    updateColorLabel,
    applyHarmony,
    applySamplePalette,
    loadSampleImage,
    copyExport,
    copyColor,
    savePalette,
    loadSaved,
    removeSaved,
    clearPalette,
    contrastWithWhite,
    contrastWithBlack,
    getReadableTextColor,
    openFilePicker: () => fileRef.current?.click(),
  };
}
