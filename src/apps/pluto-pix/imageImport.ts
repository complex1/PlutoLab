export async function loadImageSource(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  const type = file.type.toLowerCase();

  if (type === "image/gif") {
    return rasterizeImage(await readFileAsDataUrl(file));
  }

  if (type === "image/svg+xml") {
    const text = await file.text();
    const blob = new Blob([text], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      return await rasterizeImage(url, 1200);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return readFileAsDataUrl(file);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function rasterizeImage(
  src: string,
  maxDim = 2000
): Promise<string> {
  const img = await loadImageSource(src);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

export async function getImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  const img = await loadImageSource(src);
  return { width: img.width, height: img.height };
}

export async function readClipboardImage(): Promise<string | null> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith("image/")) {
          const blob = await item.getType(type);
          return fileToDataUrl(new File([blob], "clipboard", { type }));
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}
