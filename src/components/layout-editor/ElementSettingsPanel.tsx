import { LayoutElement, TextStyle, BackgroundStyle, ShapeStyle } from "@/stores/settingsStore";
import { fontOptions as defaultFontOptions } from "@/constants/layoutEditor";

interface ElementSettingsPanelProps {
  element: LayoutElement;
  actualWidth: number;
  actualHeight: number;
  onUpdate: (id: string, updates: Partial<LayoutElement>) => void;
  onTextStyleChange: (id: string, updates: Partial<TextStyle>) => void;
  onBackgroundStyleChange: (id: string, updates: Partial<BackgroundStyle>) => void;
  onShapeStyleChange: (id: string, updates: Partial<ShapeStyle>) => void;
  compact?: boolean;
  isSelected?: boolean;
  fontOptions?: string[]; // Custom font options (e.g., from system fonts)
}

// Convert percentage to actual pixels
const percentToPx = (percent: number, actualSize: number): number => {
  return Math.round((percent / 100) * actualSize);
};

export default function ElementSettingsPanel({
  element,
  actualWidth,
  actualHeight,
  onUpdate,
  onTextStyleChange,
  onBackgroundStyleChange,
  onShapeStyleChange,
  compact = false,
  isSelected = false,
  fontOptions = defaultFontOptions,
}: ElementSettingsPanelProps) {
  const isText = element.type === "text";
  const isBackground = element.type === "background";
  const isShape = element.type === "shape";

  if (compact) {
    // Compact mode for Panel4
    return (
      <div className={`bg-gray-50 rounded-lg p-3 ${isSelected ? "ring-2 ring-pink-500" : ""}`}>
        {/* Element Header */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={element.enabled}
            onChange={(e) => onUpdate(element.id, { enabled: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 flex-shrink-0"
          />
          <div
            className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: element.color }}
          />
          <span className="text-xs font-semibold text-gray-700">{element.name}</span>
          <span className="text-[10px] text-gray-400 ml-auto">
            {percentToPx(element.x, actualWidth)},{percentToPx(element.y, actualHeight)}px
          </span>
        </div>

        {/* Compact Settings */}
        {isText && element.textStyle && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={element.textStyle.fontFamily}
              onChange={(e) => onTextStyleChange(element.id, { fontFamily: e.target.value })}
              className="text-xs px-2 py-1 border border-gray-300 rounded bg-white flex-1 min-w-[80px]"
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={element.textStyle.fontSize}
              onChange={(e) =>
                onTextStyleChange(element.id, { fontSize: parseInt(e.target.value) || 16 })
              }
              className="w-12 text-xs px-1 py-1 border border-gray-300 rounded text-center"
              min={8}
              max={72}
            />
            <input
              type="color"
              value={element.textStyle.fontColor}
              onChange={(e) => onTextStyleChange(element.id, { fontColor: e.target.value })}
              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
            />
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={element.textStyle.highlightEnabled || false}
                onChange={(e) =>
                  onTextStyleChange(element.id, { highlightEnabled: e.target.checked })
                }
                className="w-3 h-3 rounded border-gray-300"
              />
              <span className="text-[10px] text-gray-600">배경</span>
            </label>
            {element.textStyle.highlightEnabled && (
              <input
                type="color"
                value={element.textStyle.highlightColor || "#FFFF00"}
                onChange={(e) => onTextStyleChange(element.id, { highlightColor: e.target.value })}
                className="w-5 h-5 rounded border border-gray-300 cursor-pointer"
              />
            )}
          </div>
        )}

        {isBackground && element.backgroundStyle && (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={element.backgroundStyle.backgroundColor}
              onChange={(e) =>
                onBackgroundStyleChange(element.id, { backgroundColor: e.target.value })
              }
              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="range"
              value={element.backgroundStyle.backgroundOpacity * 100}
              onChange={(e) =>
                onBackgroundStyleChange(element.id, {
                  backgroundOpacity: parseInt(e.target.value) / 100,
                })
              }
              min={0}
              max={100}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-gray-600 w-8">
              {Math.round(element.backgroundStyle.backgroundOpacity * 100)}%
            </span>
          </div>
        )}

        {isShape && element.shapeStyle && (
          <div className="space-y-1.5">
            {/* 배경색 + 투명도 */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.shapeStyle.backgroundColor}
                onChange={(e) =>
                  onShapeStyleChange(element.id, { backgroundColor: e.target.value })
                }
                className="w-5 h-5 rounded border border-gray-300 cursor-pointer"
              />
              <span className="text-[10px] text-gray-500">배경</span>
              <input
                type="range"
                value={element.shapeStyle.backgroundOpacity * 100}
                onChange={(e) =>
                  onShapeStyleChange(element.id, {
                    backgroundOpacity: parseInt(e.target.value) / 100,
                  })
                }
                min={0}
                max={100}
                className="flex-1 h-1"
              />
              <span className="text-[10px] text-gray-600 w-7">
                {Math.round(element.shapeStyle.backgroundOpacity * 100)}%
              </span>
            </div>
            {/* 테두리 + 둥글기 */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.shapeStyle.borderColor}
                onChange={(e) => onShapeStyleChange(element.id, { borderColor: e.target.value })}
                className="w-5 h-5 rounded border border-gray-300 cursor-pointer"
              />
              <span className="text-[10px] text-gray-500">테두리</span>
              <input
                type="range"
                value={element.shapeStyle.borderRadius}
                onChange={(e) =>
                  onShapeStyleChange(element.id, { borderRadius: parseInt(e.target.value) })
                }
                min={0}
                max={50}
                className="flex-1 h-1"
              />
              <span className="text-[10px] text-gray-600 w-5">{element.shapeStyle.borderRadius}r</span>
            </div>
            {/* 블러 효과 */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={element.shapeStyle.blurEnabled || false}
                  onChange={(e) =>
                    onShapeStyleChange(element.id, { blurEnabled: e.target.checked })
                  }
                  className="w-3 h-3 rounded border-gray-300"
                />
                <span className="text-[10px] text-gray-600">블러</span>
              </label>
              {element.shapeStyle.blurEnabled && (
                <>
                  <input
                    type="range"
                    value={element.shapeStyle.blurAmount || 8}
                    onChange={(e) =>
                      onShapeStyleChange(element.id, { blurAmount: parseInt(e.target.value) })
                    }
                    min={1}
                    max={20}
                    className="flex-1 h-1"
                  />
                  <span className="text-[10px] text-gray-600 w-6">
                    {element.shapeStyle.blurAmount || 8}px
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {element.type === "image" && (
          <div className="text-[10px] text-gray-400">
            크기: {element.width}% × {element.height}%
          </div>
        )}
      </div>
    );
  }

  // Full mode for Settings Modal
  return (
    <div
      className={`bg-gray-50 rounded-lg p-3 ${isSelected ? "ring-2 ring-blue-500" : ""}`}
    >
      {/* Element Header */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={element.enabled}
          onChange={(e) => onUpdate(element.id, { enabled: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 flex-shrink-0"
        />
        <div
          className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
          style={{ backgroundColor: element.color }}
        />
        <span className="text-xs font-semibold text-gray-700">{element.name}</span>
        <span className="text-[10px] text-gray-400 ml-auto">
          {percentToPx(element.x, actualWidth)},{percentToPx(element.y, actualHeight)}
          {(isShape || element.type === "image") && (
            <>
              {" "}
              / {percentToPx(element.width, actualWidth)}×
              {percentToPx(element.height, actualHeight)}
            </>
          )}
          px
        </span>
      </div>

      {/* Text Element Settings */}
      {isText && element.textStyle && (
        <div className="space-y-2">
          {/* Font settings row */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={element.textStyle.fontFamily}
              onChange={(e) => onTextStyleChange(element.id, { fontFamily: e.target.value })}
              className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-white min-w-[100px]"
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={element.textStyle.fontSize}
                onChange={(e) =>
                  onTextStyleChange(element.id, { fontSize: parseInt(e.target.value) || 16 })
                }
                className="w-14 text-xs px-2 py-1.5 border border-gray-300 rounded text-center"
                min={8}
                max={72}
              />
              <span className="text-[10px] text-gray-400">px</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={element.textStyle.fontColor}
                onChange={(e) => onTextStyleChange(element.id, { fontColor: e.target.value })}
                className="w-7 h-7 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>
          {/* Highlight settings row */}
          <div className="flex items-center gap-2 flex-wrap border-t border-gray-200 pt-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={element.textStyle.highlightEnabled || false}
                onChange={(e) =>
                  onTextStyleChange(element.id, { highlightEnabled: e.target.checked })
                }
                className="w-3.5 h-3.5 rounded border-gray-300"
              />
              <span className="text-[10px] text-gray-600">배경색</span>
            </label>
            {element.textStyle.highlightEnabled && (
              <>
                <input
                  type="color"
                  value={element.textStyle.highlightColor || "#FFFF00"}
                  onChange={(e) =>
                    onTextStyleChange(element.id, { highlightColor: e.target.value })
                  }
                  className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">투명도</span>
                  <input
                    type="range"
                    value={(element.textStyle.highlightOpacity || 0.5) * 100}
                    onChange={(e) =>
                      onTextStyleChange(element.id, {
                        highlightOpacity: parseInt(e.target.value) / 100,
                      })
                    }
                    min={0}
                    max={100}
                    className="w-16 h-1"
                  />
                  <span className="text-[10px] text-gray-600 w-7">
                    {Math.round((element.textStyle.highlightOpacity || 0.5) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">여백</span>
                  <input
                    type="number"
                    value={element.textStyle.highlightMargin || 4}
                    onChange={(e) =>
                      onTextStyleChange(element.id, {
                        highlightMargin: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-10 text-xs px-1 py-0.5 border border-gray-300 rounded text-center"
                    min={0}
                    max={20}
                  />
                  <span className="text-[10px] text-gray-400">px</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Background Element Settings */}
      {isBackground && element.backgroundStyle && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">배경색</span>
            <input
              type="color"
              value={element.backgroundStyle.backgroundColor}
              onChange={(e) =>
                onBackgroundStyleChange(element.id, { backgroundColor: e.target.value })
              }
              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-[10px] text-gray-500">투명도</span>
            <input
              type="range"
              value={element.backgroundStyle.backgroundOpacity * 100}
              onChange={(e) =>
                onBackgroundStyleChange(element.id, {
                  backgroundOpacity: parseInt(e.target.value) / 100,
                })
              }
              min={0}
              max={100}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-gray-600 w-8">
              {Math.round(element.backgroundStyle.backgroundOpacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Shape Element Settings */}
      {isShape && element.shapeStyle && (
        <div className="space-y-2">
          {/* Background color row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">배경색</span>
              <input
                type="color"
                value={element.shapeStyle.backgroundColor}
                onChange={(e) =>
                  onShapeStyleChange(element.id, { backgroundColor: e.target.value })
                }
                className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-[10px] text-gray-500">투명도</span>
              <input
                type="range"
                value={element.shapeStyle.backgroundOpacity * 100}
                onChange={(e) =>
                  onShapeStyleChange(element.id, {
                    backgroundOpacity: parseInt(e.target.value) / 100,
                  })
                }
                min={0}
                max={100}
                className="flex-1 h-1"
              />
              <span className="text-[10px] text-gray-600 w-8">
                {Math.round(element.shapeStyle.backgroundOpacity * 100)}%
              </span>
            </div>
          </div>
          {/* Border row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">테두리</span>
              <input
                type="color"
                value={element.shapeStyle.borderColor}
                onChange={(e) => onShapeStyleChange(element.id, { borderColor: e.target.value })}
                className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-[10px] text-gray-500">투명도</span>
              <input
                type="range"
                value={element.shapeStyle.borderOpacity * 100}
                onChange={(e) =>
                  onShapeStyleChange(element.id, {
                    borderOpacity: parseInt(e.target.value) / 100,
                  })
                }
                min={0}
                max={100}
                className="flex-1 h-1"
              />
              <span className="text-[10px] text-gray-600 w-8">
                {Math.round(element.shapeStyle.borderOpacity * 100)}%
              </span>
            </div>
          </div>
          {/* Border radius row */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">둥글기</span>
            <input
              type="range"
              value={element.shapeStyle.borderRadius}
              onChange={(e) =>
                onShapeStyleChange(element.id, { borderRadius: parseInt(e.target.value) })
              }
              min={0}
              max={50}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-gray-600 w-6">{element.shapeStyle.borderRadius}</span>
          </div>
          {/* Blur effect row */}
          <div className="flex items-center gap-2 border-t border-gray-200 pt-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={element.shapeStyle.blurEnabled || false}
                onChange={(e) =>
                  onShapeStyleChange(element.id, { blurEnabled: e.target.checked })
                }
                className="w-3.5 h-3.5 rounded border-gray-300"
              />
              <span className="text-[10px] text-gray-600">블러 효과</span>
            </label>
            {element.shapeStyle.blurEnabled && (
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[10px] text-gray-500">강도</span>
                <input
                  type="range"
                  value={element.shapeStyle.blurAmount || 8}
                  onChange={(e) =>
                    onShapeStyleChange(element.id, { blurAmount: parseInt(e.target.value) })
                  }
                  min={1}
                  max={20}
                  className="flex-1 h-1"
                />
                <span className="text-[10px] text-gray-600 w-7">
                  {element.shapeStyle.blurAmount || 8}px
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image elements */}
      {element.type === "image" && (
        <div className="text-[10px] text-gray-400">
          크기: {element.width}% × {element.height}%
        </div>
      )}
    </div>
  );
}
