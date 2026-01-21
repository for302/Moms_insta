import { LayoutPreset } from "@/stores/settingsStore";

interface ContentData {
  characterName: string;
  journalNumber: number;
  title: string;
  content: string;
}

interface RenderOptions {
  imageUrl: string;
  preset: LayoutPreset;
  content: ContentData;
  width: number;
  height: number;
}

/**
 * Load an image from URL and return as HTMLImageElement
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Convert hex color with opacity to rgba string
 */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Render layered image with all elements to canvas and return as data URL
 */
export async function renderLayeredImage(options: RenderOptions): Promise<string> {
  const { imageUrl, preset, content, width, height } = options;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Find elements
  const backgroundEl = preset.elements.find((e) => e.id === "background");
  const shape1El = preset.elements.find((e) => e.id === "shape1");
  const titleEl = preset.elements.find((e) => e.id === "title");
  const subtitleEl = preset.elements.find((e) => e.id === "subtitle");
  const shortKnowledgeEl = preset.elements.find((e) => e.id === "short_knowledge");

  // 1. Draw background layer (z-index: 0)
  if (backgroundEl?.enabled && backgroundEl.backgroundStyle) {
    const x = (backgroundEl.x / 100) * width;
    const y = (backgroundEl.y / 100) * height;
    const w = (backgroundEl.width / 100) * width;
    const h = (backgroundEl.height / 100) * height;

    ctx.fillStyle = hexToRgba(
      backgroundEl.backgroundStyle.backgroundColor,
      backgroundEl.backgroundStyle.backgroundOpacity
    );
    ctx.fillRect(x, y, w, h);
  }

  // 2. Draw LLM image within hero_image bounds (z-index: 1)
  const heroImageEl = preset.elements.find((e) => e.id === "hero_image");
  try {
    const img = await loadImage(imageUrl);

    if (heroImageEl?.enabled) {
      // Draw image scaled to fit hero_image element bounds
      const heroX = (heroImageEl.x / 100) * width;
      const heroY = (heroImageEl.y / 100) * height;
      const heroW = (heroImageEl.width / 100) * width;
      const heroH = (heroImageEl.height / 100) * height;

      // Simply draw the image at hero bounds (stretched to fit)
      ctx.drawImage(img, heroX, heroY, heroW, heroH);
    } else {
      // Fallback: draw full canvas if no hero_image element
      ctx.drawImage(img, 0, 0, width, height);
    }
  } catch (error) {
    console.error("Failed to load image:", error);
  }

  // 3. Draw shape1 (z-index: 2)
  if (shape1El?.enabled && shape1El.shapeStyle) {
    const x = (shape1El.x / 100) * width;
    const y = (shape1El.y / 100) * height;
    const w = (shape1El.width / 100) * width;
    const h = (shape1El.height / 100) * height;
    const radius = shape1El.shapeStyle.borderRadius;

    // Draw rounded rectangle with fill
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = hexToRgba(
      shape1El.shapeStyle.backgroundColor,
      shape1El.shapeStyle.backgroundOpacity
    );
    ctx.fill();

    // Draw border
    ctx.strokeStyle = hexToRgba(
      shape1El.shapeStyle.borderColor,
      shape1El.shapeStyle.borderOpacity
    );
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 4. Draw text elements (z-index: 3)
  const drawTextElement = (
    el: typeof titleEl,
    text: string,
    fontWeight: string = "normal"
  ) => {
    if (!el?.enabled || !el.textStyle) return;

    const x = (el.x / 100) * width;
    const y = (el.y / 100) * height;
    const w = (el.width / 100) * width;
    const fontSize = el.textStyle.fontSize;
    const fontFamily = el.textStyle.fontFamily;
    const fontColor = el.textStyle.fontColor;

    // Set font
    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = fontColor;
    ctx.textBaseline = "top";

    // Draw highlight background if enabled
    if (el.textStyle.highlightEnabled) {
      const metrics = ctx.measureText(text);
      const textHeight = fontSize * 1.2;
      const margin = el.textStyle.highlightMargin || 4;

      ctx.fillStyle = hexToRgba(
        el.textStyle.highlightColor || "#FFFF00",
        el.textStyle.highlightOpacity || 0.5
      );
      ctx.fillRect(
        x - margin,
        y - margin,
        metrics.width + margin * 2,
        textHeight + margin * 2
      );

      // Reset fill style for text
      ctx.fillStyle = fontColor;
    }

    // Word wrap and draw text
    const words = text.split(" ");
    let line = "";
    let lineY = y;
    const lineHeight = fontSize * 1.3;

    for (const word of words) {
      const testLine = line + word + " ";
      const metrics = ctx.measureText(testLine);

      if (metrics.width > w && line !== "") {
        ctx.fillText(line.trim(), x, lineY);
        line = word + " ";
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, lineY);
  };

  // Draw title
  drawTextElement(
    titleEl,
    `${content.characterName}의 연구일지 #${content.journalNumber}`,
    "bold"
  );

  // Draw subtitle
  drawTextElement(subtitleEl, content.title, "600");

  // Draw short knowledge (with height limit)
  if (shortKnowledgeEl?.enabled && shortKnowledgeEl.textStyle) {
    const x = (shortKnowledgeEl.x / 100) * width;
    const y = (shortKnowledgeEl.y / 100) * height;
    const w = (shortKnowledgeEl.width / 100) * width;
    const maxH = (shortKnowledgeEl.height / 100) * height;
    const fontSize = shortKnowledgeEl.textStyle.fontSize;
    const fontFamily = shortKnowledgeEl.textStyle.fontFamily;
    const fontColor = shortKnowledgeEl.textStyle.fontColor;

    ctx.font = `normal ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = fontColor;
    ctx.textBaseline = "top";

    // Draw highlight if enabled
    if (shortKnowledgeEl.textStyle.highlightEnabled) {
      const margin = shortKnowledgeEl.textStyle.highlightMargin || 4;
      ctx.fillStyle = hexToRgba(
        shortKnowledgeEl.textStyle.highlightColor || "#FFFF00",
        shortKnowledgeEl.textStyle.highlightOpacity || 0.5
      );
      ctx.fillRect(x - margin, y - margin, w + margin * 2, maxH + margin * 2);
      ctx.fillStyle = fontColor;
    }

    // Word wrap text
    const text = content.content;
    const words = text.split("");
    let line = "";
    let lineY = y;
    const lineHeight = fontSize * 1.4;

    for (const char of words) {
      const testLine = line + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > w && line !== "") {
        if (lineY + lineHeight > y + maxH) break; // Stop if exceeds height
        ctx.fillText(line, x, lineY);
        line = char;
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (lineY + lineHeight <= y + maxH) {
      ctx.fillText(line, x, lineY);
    }
  }

  // Return as data URL
  return canvas.toDataURL("image/png");
}

/**
 * Convert data URL to Blob
 */
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Convert data URL to base64 string (without prefix)
 */
export function dataURLtoBase64(dataURL: string): string {
  return dataURL.split(",")[1];
}
