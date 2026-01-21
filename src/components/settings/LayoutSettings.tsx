import { useState, useMemo } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { useSettingsStore, TextStyle, BackgroundStyle, ShapeStyle } from "@/stores/settingsStore";
import { LayoutCanvas, ElementSettingsPanel, PresetSelector } from "@/components/layout-editor";
import { useLayoutEditor, generateLayoutPrompt } from "@/hooks/useLayoutEditor";
import { useSystemFonts } from "@/hooks/useSystemFonts";

export default function LayoutSettingsComponent() {
  const {
    imageSizePresets,
    layoutSettings,
    setLayoutSettings,
    updateLayoutElement,
    addLayoutPreset,
    updateLayoutPreset,
    deleteLayoutPreset,
    setSelectedLayoutPreset,
    updateImageSizePreset,
  } = useSettingsStore();

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Load system fonts
  const { fonts: systemFonts } = useSystemFonts();

  // Get presets with fallback for older persisted data
  const presets = layoutSettings?.presets || [];
  const selectedPresetId = layoutSettings?.selectedPresetId || "";

  // Current preset
  const currentPreset = presets.find((p) => p.id === selectedPresetId) || presets[0];

  const selectedSizePreset =
    imageSizePresets.find((p) => p.id === currentPreset?.imageSizePresetId) || imageSizePresets[0];

  // Canvas settings
  const canvasWidth = 300;

  // Use layout editor hook
  const { actualWidth, actualHeight } = useLayoutEditor({
    canvasWidth,
    sizePreset: selectedSizePreset,
    preset: currentPreset,
  });

  // Generate layout description prompt
  const layoutPrompt = useMemo(() => {
    if (!currentPreset) return "";
    return generateLayoutPrompt(currentPreset, selectedSizePreset);
  }, [currentPreset, selectedSizePreset]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setLayoutSettings(layoutSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPreset = (name: string, imageSizePresetId: string) => {
    addLayoutPreset({
      name,
      imageSizePresetId,
      elements: currentPreset?.elements.map((el) => ({ ...el })) || [],
      isDefault: false,
    });
  };

  const handleDuplicatePreset = () => {
    if (!currentPreset) return;
    addLayoutPreset({
      name: `${currentPreset.name} (복사본)`,
      imageSizePresetId: currentPreset.imageSizePresetId,
      elements: currentPreset.elements.map((el) => ({ ...el })),
      isDefault: false,
    });
  };

  const handleSizePresetChange = (sizePresetId: string) => {
    if (!currentPreset) return;
    updateLayoutPreset(currentPreset.id, { imageSizePresetId: sizePresetId });
  };

  const handleMarginChange = (sizePresetId: string, marginHorizontal: number, marginVertical: number) => {
    updateImageSizePreset(sizePresetId, { marginHorizontal, marginVertical });
  };

  const handleTextStyleChange = (elementId: string, updates: Partial<TextStyle>) => {
    const element = currentPreset?.elements.find((el) => el.id === elementId);
    if (!element) return;
    updateLayoutElement(elementId, {
      textStyle: { ...element.textStyle!, ...updates },
    });
  };

  const handleBackgroundStyleChange = (elementId: string, updates: Partial<BackgroundStyle>) => {
    const element = currentPreset?.elements.find((el) => el.id === elementId);
    if (!element) return;
    updateLayoutElement(elementId, {
      backgroundStyle: { ...element.backgroundStyle!, ...updates },
    });
  };

  const handleShapeStyleChange = (elementId: string, updates: Partial<ShapeStyle>) => {
    const element = currentPreset?.elements.find((el) => el.id === elementId);
    if (!element) return;
    updateLayoutElement(elementId, {
      shapeStyle: { ...element.shapeStyle!, ...updates },
    });
  };

  // Show loading/empty state when no presets available
  if (!layoutSettings || presets.length === 0 || !currentPreset) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        레이아웃 프리셋을 불러오는 중...
        <br />
        <span className="text-sm">설정을 초기화하려면 브라우저 localStorage를 지워주세요.</span>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-6">
      {/* ========== 좌측 영역: 프리셋, 이미지크기, 요소설정 ========== */}
      <div className="flex-1 flex flex-col overflow-y-auto pr-2 space-y-4">
        {/* 레이아웃 프리셋 + 이미지 크기 */}
        <PresetSelector
          presets={presets}
          selectedPresetId={selectedPresetId}
          currentPreset={currentPreset}
          imageSizePresets={imageSizePresets}
          onSelect={setSelectedLayoutPreset}
          onAdd={handleAddPreset}
          onDuplicate={handleDuplicatePreset}
          onDelete={deleteLayoutPreset}
          onSizeChange={handleSizePresetChange}
          onMarginChange={handleMarginChange}
        />

        {/* 요소 설정 (2열 그리드) */}
        <div className="flex-1 flex flex-col min-h-0">
          <h4 className="text-sm font-medium text-gray-700 mb-2">요소 설정</h4>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 pr-1">
            {currentPreset.elements.map((element) => (
              <ElementSettingsPanel
                key={element.id}
                element={element}
                actualWidth={actualWidth}
                actualHeight={actualHeight}
                onUpdate={updateLayoutElement}
                onTextStyleChange={handleTextStyleChange}
                onBackgroundStyleChange={handleBackgroundStyleChange}
                onShapeStyleChange={handleShapeStyleChange}
                isSelected={selectedElementId === element.id}
                fontOptions={systemFonts}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ========== 우측 영역: 미리보기, 프롬프트, 저장 ========== */}
      <div className="w-[360px] flex-shrink-0 flex flex-col">
        {/* 배치 미리보기 */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">배치 미리보기</h4>
          <p className="text-xs text-gray-500 mb-2">
            * 드래그로 위치, 모서리 드래그로 크기 조절 (5px 단위)
          </p>
          <LayoutCanvas
            preset={currentPreset}
            sizePreset={selectedSizePreset}
            canvasWidth={canvasWidth}
            selectedElementId={selectedElementId}
            onElementSelect={setSelectedElementId}
            onElementUpdate={updateLayoutElement}
            showGridLines={true}
          />
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            * 텍스트 요소 클릭 시 테두리가 표시됩니다
          </p>
        </div>

        {/* 배치 프롬프트 */}
        <div className="flex-1 flex flex-col min-h-0 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">배치 프롬프트</h4>
          <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto flex-1 whitespace-pre-wrap text-gray-600">
            {layoutPrompt}
          </pre>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              저장됨
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              저장
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export { generateLayoutPrompt };
