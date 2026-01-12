import { Rnd } from "react-rnd";
import { LayoutPreset, ImageSizePreset, LayoutElement } from "@/stores/settingsStore";
import { useLayoutEditor } from "@/hooks/useLayoutEditor";
import { GRID_PX } from "@/constants/layoutEditor";

interface ContentData {
  characterName: string;
  journalNumber: number;
  title: string;
  content: string;
}

interface LayoutCanvasProps {
  preset: LayoutPreset;
  sizePreset: ImageSizePreset;
  canvasWidth: number;
  selectedElementId: string | null;
  onElementSelect: (id: string | null) => void;
  onElementUpdate: (id: string, updates: Partial<LayoutElement>) => void;
  showGridLines?: boolean;
  backgroundImage?: string; // For Panel4 - actual generated image
  readOnly?: boolean;
  contentData?: ContentData; // For displaying actual content instead of sample text
}

export default function LayoutCanvas({
  preset,
  sizePreset,
  canvasWidth,
  selectedElementId,
  onElementSelect,
  onElementUpdate,
  showGridLines = true,
  backgroundImage,
  readOnly = false,
  contentData,
}: LayoutCanvasProps) {
  const {
    canvasHeight,
    scaleX,
    scaleY,
    handleDragStop,
    handleResizeStop,
    sortedElements,
    gridLines,
  } = useLayoutEditor({ canvasWidth, sizePreset, preset });

  const scaleFactor = canvasWidth / 300;

  return (
    <div
      className="relative bg-white rounded-lg overflow-hidden border-2 border-gray-300 mx-auto"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {/* Background Image (for Panel4 edit mode) */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
      )}

      {/* Grid Lines */}
      {showGridLines && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={canvasWidth}
          height={canvasHeight}
          style={{ zIndex: 10 }}
        >
          {gridLines}
        </svg>
      )}

      {/* Elements */}
      {sortedElements
        .filter((el) => el.enabled)
        .map((element) => {
          const x = (element.x / 100) * canvasWidth;
          const y = (element.y / 100) * canvasHeight;
          const width = (element.width / 100) * canvasWidth;
          const height = (element.height / 100) * canvasHeight;
          const isSelected = selectedElementId === element.id;
          const isText = element.type === "text";
          const isBackground = element.type === "background";
          const isShape = element.type === "shape";

          const scaledFontSize =
            isText && element.textStyle
              ? Math.max(6, Math.round(element.textStyle.fontSize * scaleFactor * 0.3))
              : 10;

          // Calculate styles based on element type
          let border = `2px solid ${element.color}`;
          let backgroundColor = `${element.color}20`;
          let borderRadius = 0;
          let zIndex = 2;

          if (isText) {
            border = isSelected ? `2px dashed ${element.color}` : "none";
            backgroundColor = "transparent";
            zIndex = 3;
          } else if (isBackground && element.backgroundStyle) {
            border = "none";
            backgroundColor = `${element.backgroundStyle.backgroundColor}${Math.round(element.backgroundStyle.backgroundOpacity * 255)
              .toString(16)
              .padStart(2, "0")}`;
            zIndex = 0;
          } else if (isShape && element.shapeStyle) {
            const borderOpacityHex = Math.round(element.shapeStyle.borderOpacity * 255)
              .toString(16)
              .padStart(2, "0");
            border = `2px solid ${element.shapeStyle.borderColor}${borderOpacityHex}`;
            backgroundColor = `${element.shapeStyle.backgroundColor}${Math.round(element.shapeStyle.backgroundOpacity * 255)
              .toString(16)
              .padStart(2, "0")}`;
            borderRadius = element.shapeStyle.borderRadius * 0.3;
            zIndex = 1;
          }

          else if (element.type === "image") {
            zIndex = 2;
          }

          // Calculate blur effect for shapes
          const backdropFilter = isShape && element.shapeStyle?.blurEnabled
            ? `blur(${element.shapeStyle.blurAmount || 8}px)`
            : undefined;

          // If there's a background image, adjust z-index for visibility
          if (backgroundImage) {
            zIndex = zIndex + 1;
          }

          if (readOnly) {
            // Read-only mode: just render without drag/resize
            return (
              <div
                key={element.id}
                className="absolute"
                style={{
                  left: x,
                  top: y,
                  width,
                  height,
                  border,
                  backgroundColor,
                  borderRadius,
                  zIndex,
                  display: "flex",
                  alignItems: isText ? "flex-start" : "center",
                  justifyContent: "flex-start",
                  overflow: "hidden",
                  padding: isText ? "2px" : 0,
                  backdropFilter,
                  WebkitBackdropFilter: backdropFilter, // Safari support
                }}
              >
                {renderElementContent(element, isText, isBackground, isShape, scaledFontSize, contentData)}
              </div>
            );
          }

          return (
            <Rnd
              key={element.id}
              size={{ width, height }}
              position={{ x, y }}
              onDragStart={() => onElementSelect(element.id)}
              onDragStop={(_e, d) =>
                handleDragStop(element.id, d.x, d.y, onElementUpdate)
              }
              onResizeStart={() => onElementSelect(element.id)}
              onResizeStop={(_e, _direction, ref, _delta, position) =>
                handleResizeStop(
                  element.id,
                  ref.offsetWidth,
                  ref.offsetHeight,
                  position.x,
                  position.y,
                  onElementUpdate
                )
              }
              onClick={() => onElementSelect(element.id)}
              bounds="parent"
              minWidth={20}
              minHeight={20}
              dragGrid={[GRID_PX / scaleX, GRID_PX / scaleY]}
              resizeGrid={[GRID_PX / scaleX, GRID_PX / scaleY]}
              style={{
                border,
                backgroundColor,
                borderRadius,
                display: "flex",
                alignItems: isText ? "flex-start" : "center",
                justifyContent: "flex-start",
                zIndex,
                overflow: "hidden",
                padding: isText ? "2px" : 0,
                cursor: "move",
                backdropFilter,
                WebkitBackdropFilter: backdropFilter, // Safari support
              }}
            >
              {renderElementContent(element, isText, isBackground, isShape, scaledFontSize, contentData)}
            </Rnd>
          );
        })}
    </div>
  );
}

function renderElementContent(
  element: LayoutElement,
  isText: boolean,
  isBackground: boolean,
  isShape: boolean,
  scaledFontSize: number,
  contentData?: ContentData
) {
  if (isText && element.textStyle) {
    // Determine text content based on element id and contentData
    let displayText = element.sampleText || element.name;
    if (contentData) {
      if (element.id === "title") {
        displayText = `${contentData.characterName}의 연구일지 #${String(contentData.journalNumber).padStart(2, '0')}`;
      } else if (element.id === "subtitle") {
        displayText = contentData.title;
      } else if (element.id === "short_knowledge") {
        displayText = contentData.content;
      }
    }

    return (
      <span
        className="leading-tight"
        style={{
          fontFamily: element.textStyle.fontFamily,
          fontSize: `${scaledFontSize}px`,
          color: element.textStyle.fontColor,
          fontWeight: element.id === "title" ? 600 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: element.id === "short_knowledge" ? 3 : 2,
          WebkitBoxOrient: "vertical",
          backgroundColor: element.textStyle.highlightEnabled
            ? `${element.textStyle.highlightColor || "#FFFF00"}${Math.round(
                (element.textStyle.highlightOpacity || 0.5) * 255
              )
                .toString(16)
                .padStart(2, "0")}`
            : "transparent",
          padding: element.textStyle.highlightEnabled
            ? `${(element.textStyle.highlightMargin || 4) * 0.2}px`
            : 0,
        }}
      >
        {displayText}
      </span>
    );
  }

  if (isBackground || isShape) {
    return (
      <span className="text-[8px] text-gray-400 opacity-50 text-center w-full">
        {element.name}
      </span>
    );
  }

  return (
    <span
      className="text-xs font-medium px-1 truncate text-center w-full"
      style={{ color: element.color }}
    >
      {element.name}
    </span>
  );
}
