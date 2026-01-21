import { useMemo, useCallback } from "react";
import { GRID_PX, ELEMENT_TYPE_ORDER } from "@/constants/layoutEditor";
import { LayoutPreset, ImageSizePreset, LayoutElement } from "@/stores/settingsStore";

interface UseLayoutEditorProps {
  canvasWidth: number;
  sizePreset: ImageSizePreset;
  preset?: LayoutPreset;
}

interface UseLayoutEditorReturn {
  // Dimensions
  canvasHeight: number;
  actualWidth: number;
  actualHeight: number;
  scaleX: number;
  scaleY: number;
  aspectRatio: number;

  // Helpers
  snapToPixelGrid: (canvasValue: number, scale: number, actualSize: number) => number;
  percentToPx: (percent: number, actualSize: number) => number;

  // Handlers
  handleDragStop: (
    elementId: string,
    x: number,
    y: number,
    onUpdate: (id: string, updates: Partial<LayoutElement>) => void
  ) => void;
  handleResizeStop: (
    elementId: string,
    width: number,
    height: number,
    x: number,
    y: number,
    onUpdate: (id: string, updates: Partial<LayoutElement>) => void
  ) => void;

  // Sorted elements
  sortedElements: LayoutElement[];

  // Grid lines for SVG
  gridLines: JSX.Element[];
}

export function useLayoutEditor({
  canvasWidth,
  sizePreset,
  preset,
}: UseLayoutEditorProps): UseLayoutEditorReturn {
  // Calculate dimensions
  const aspectRatio = sizePreset.height / sizePreset.width;
  const canvasHeight = canvasWidth * aspectRatio;
  const actualWidth = sizePreset.width;
  const actualHeight = sizePreset.height;
  const scaleX = actualWidth / canvasWidth;
  const scaleY = actualHeight / canvasHeight;

  // Snap to 5px grid on actual image (returns percentage)
  const snapToPixelGrid = useCallback(
    (canvasValue: number, scale: number, actualSize: number): number => {
      const actualPx = canvasValue * scale;
      const snappedPx = Math.round(actualPx / GRID_PX) * GRID_PX;
      return (snappedPx / actualSize) * 100;
    },
    []
  );

  // Convert percentage to actual pixels
  const percentToPx = useCallback((percent: number, actualSize: number): number => {
    return Math.round((percent / 100) * actualSize);
  }, []);

  // Handle drag stop
  const handleDragStop = useCallback(
    (
      elementId: string,
      x: number,
      y: number,
      onUpdate: (id: string, updates: Partial<LayoutElement>) => void
    ) => {
      const xPercent = snapToPixelGrid(x, scaleX, actualWidth);
      const yPercent = snapToPixelGrid(y, scaleY, actualHeight);
      onUpdate(elementId, { x: xPercent, y: yPercent });
    },
    [scaleX, scaleY, actualWidth, actualHeight, snapToPixelGrid]
  );

  // Handle resize stop
  const handleResizeStop = useCallback(
    (
      elementId: string,
      width: number,
      height: number,
      x: number,
      y: number,
      onUpdate: (id: string, updates: Partial<LayoutElement>) => void
    ) => {
      const xPercent = snapToPixelGrid(x, scaleX, actualWidth);
      const yPercent = snapToPixelGrid(y, scaleY, actualHeight);
      const widthPercent = snapToPixelGrid(width, scaleX, actualWidth);
      const heightPercent = snapToPixelGrid(height, scaleY, actualHeight);
      const minPercent = (GRID_PX / actualWidth) * 100;
      onUpdate(elementId, {
        x: xPercent,
        y: yPercent,
        width: Math.max(widthPercent, minPercent),
        height: Math.max(heightPercent, minPercent),
      });
    },
    [scaleX, scaleY, actualWidth, actualHeight, snapToPixelGrid]
  );

  // Sort elements for rendering (background first, then shapes, then images, then text)
  const sortedElements = useMemo(() => {
    if (!preset) return [];
    return [...preset.elements].sort((a, b) => {
      return (ELEMENT_TYPE_ORDER[a.type] || 0) - (ELEMENT_TYPE_ORDER[b.type] || 0);
    });
  }, [preset]);

  // Generate grid lines (100px intervals on actual image)
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const gridInterval = 100; // 100px on actual image

    // Vertical lines
    for (let px = gridInterval; px < actualWidth; px += gridInterval) {
      const x = (px / actualWidth) * canvasWidth;
      lines.push(
        <line
          key={`v-${px}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasHeight}
          stroke="#ddd"
          strokeWidth={px % 500 === 0 ? 1 : 0.5}
          strokeDasharray={px % 500 === 0 ? "none" : "2,2"}
        />
      );
    }

    // Horizontal lines
    for (let px = gridInterval; px < actualHeight; px += gridInterval) {
      const y = (px / actualHeight) * canvasHeight;
      lines.push(
        <line
          key={`h-${px}`}
          x1={0}
          y1={y}
          x2={canvasWidth}
          y2={y}
          stroke="#ddd"
          strokeWidth={px % 500 === 0 ? 1 : 0.5}
          strokeDasharray={px % 500 === 0 ? "none" : "2,2"}
        />
      );
    }

    return lines;
  }, [canvasWidth, canvasHeight, actualWidth, actualHeight]);

  return {
    canvasHeight,
    actualWidth,
    actualHeight,
    scaleX,
    scaleY,
    aspectRatio,
    snapToPixelGrid,
    percentToPx,
    handleDragStop,
    handleResizeStop,
    sortedElements,
    gridLines,
  };
}

// Generate layout description prompt
export function generateLayoutPrompt(
  preset: LayoutPreset,
  sizePreset: ImageSizePreset
): string {
  const heroImage = preset.elements.find((el) => el.id === "hero_image" && el.enabled);
  const title = preset.elements.find((el) => el.id === "title" && el.enabled);
  const subtitle = preset.elements.find((el) => el.id === "subtitle" && el.enabled);
  const shortKnowledge = preset.elements.find((el) => el.id === "short_knowledge" && el.enabled);

  const lines: string[] = [];

  lines.push(`이미지 크기: ${sizePreset.width}x${sizePreset.height}px`);

  // 여백 정보 추가
  const marginH = sizePreset.marginHorizontal ?? 120;
  const marginV = sizePreset.marginVertical ?? 80;
  lines.push(`최소 여백: 좌우 ${marginH}px, 상하 ${marginV}px`);

  if (heroImage) {
    lines.push(
      `주요 캐릭터/일러스트 배치 영역: 좌측 ${heroImage.x}%~${heroImage.x + heroImage.width}%, 상단 ${heroImage.y}%~${heroImage.y + heroImage.height}%`
    );
  }

  const textAreas: string[] = [];
  if (title)
    textAreas.push(`제목(${title.x}-${title.x + title.width}%, ${title.y}-${title.y + title.height}%)`);
  if (subtitle)
    textAreas.push(
      `부제(${subtitle.x}-${subtitle.x + subtitle.width}%, ${subtitle.y}-${subtitle.y + subtitle.height}%)`
    );
  if (shortKnowledge)
    textAreas.push(
      `본문(${shortKnowledge.x}-${shortKnowledge.x + shortKnowledge.width}%, ${shortKnowledge.y}-${shortKnowledge.y + shortKnowledge.height}%)`
    );

  if (textAreas.length > 0) {
    lines.push(`텍스트가 오버레이될 영역(비워둘 것): ${textAreas.join(", ")}`);
  }

  return lines.join("\n");
}
