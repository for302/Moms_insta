/**
 * Canvas-based text overlay renderer for Instagram carousel images
 */

export interface TextOverlayOptions {
  title: string;
  content: string;
  titleFont?: string;
  contentFont?: string;
  titleColor?: string;
  contentColor?: string;
  backgroundColor?: string;
  padding?: number;
}

export interface RenderResult {
  dataUrl: string;
  blob: Blob;
}

/**
 * Load an image from URL
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Wrap text to fit within a max width
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split("");
  const lines: string[] = [];
  let currentLine = "";

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Render text overlay on an image
 */
export async function renderTextOverlay(
  imageUrl: string,
  options: TextOverlayOptions
): Promise<RenderResult> {
  const {
    title,
    content,
    titleFont = "bold 48px 'Noto Sans KR', sans-serif",
    contentFont = "32px 'Noto Sans KR', sans-serif",
    titleColor = "#333333",
    contentColor = "#555555",
    backgroundColor = "rgba(255, 255, 255, 0.9)",
    padding = 40,
  } = options;

  // Load the base image
  const img = await loadImage(imageUrl);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;

  // Draw base image
  ctx.drawImage(img, 0, 0);

  // Calculate text area (bottom portion of image)
  const textAreaHeight = Math.floor(img.height * 0.35);
  const textAreaY = img.height - textAreaHeight;

  // Draw semi-transparent background for text
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, textAreaY, img.width, textAreaHeight);

  // Draw title
  ctx.font = titleFont;
  ctx.fillStyle = titleColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const maxTextWidth = img.width - padding * 2;
  const titleLines = wrapText(ctx, title, maxTextWidth);
  let currentY = textAreaY + padding;

  for (const line of titleLines) {
    ctx.fillText(line, padding, currentY);
    currentY += 56; // line height
  }

  // Draw content
  ctx.font = contentFont;
  ctx.fillStyle = contentColor;
  currentY += 20; // gap between title and content

  const contentLines = wrapText(ctx, content, maxTextWidth);
  for (const line of contentLines) {
    ctx.fillText(line, padding, currentY);
    currentY += 40; // line height
  }

  // Convert to blob and data URL
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });

  return { dataUrl, blob };
}

/**
 * Render multiple images with text overlay
 */
export async function renderBatchTextOverlay(
  items: Array<{ imageUrl: string; options: TextOverlayOptions }>
): Promise<RenderResult[]> {
  const results: RenderResult[] = [];

  for (const item of items) {
    try {
      const result = await renderTextOverlay(item.imageUrl, item.options);
      results.push(result);
    } catch (error) {
      console.error("Failed to render text overlay:", error);
    }
  }

  return results;
}

/**
 * Create a preview canvas element for real-time editing
 */
export function createPreviewCanvas(
  container: HTMLElement,
  imageUrl: string,
  options: TextOverlayOptions,
  scale: number = 0.5
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  // Update canvas when called
  const update = async () => {
    try {
      const img = await loadImage(imageUrl);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // Calculate text area
      const textAreaHeight = Math.floor(img.height * 0.35);
      const textAreaY = img.height - textAreaHeight;
      const padding = options.padding || 40;

      // Draw background
      ctx.fillStyle = options.backgroundColor || "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(0, textAreaY, img.width, textAreaHeight);

      // Draw title
      ctx.font = options.titleFont || "bold 48px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = options.titleColor || "#333333";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const maxTextWidth = img.width - padding * 2;
      const titleLines = wrapText(ctx, options.title, maxTextWidth);
      let currentY = textAreaY + padding;

      for (const line of titleLines) {
        ctx.fillText(line, padding, currentY);
        currentY += 56;
      }

      // Draw content
      ctx.font = options.contentFont || "32px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = options.contentColor || "#555555";
      currentY += 20;

      const contentLines = wrapText(ctx, options.content, maxTextWidth);
      for (const line of contentLines) {
        ctx.fillText(line, padding, currentY);
        currentY += 40;
      }
    } catch (error) {
      console.error("Preview update failed:", error);
    }
  };

  update();

  return canvas;
}

/**
 * Download rendered image with text overlay
 */
export async function downloadWithTextOverlay(
  imageUrl: string,
  options: TextOverlayOptions,
  filename: string = "carousel.png"
): Promise<void> {
  const { blob } = await renderTextOverlay(imageUrl, options);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
