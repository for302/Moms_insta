import { useState, useRef } from "react";
import { useImageStore } from "@/stores/imageStore";
import { useContentStore } from "@/stores/contentStore";
import { useSettingsStore, TextStyle, BackgroundStyle, ShapeStyle } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";
import * as tauriApi from "@/services/tauriApi";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  Image,
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  ImageIcon,
  Type,
  Edit3,
  X,
  FolderOpen,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { LayoutCanvas, ElementSettingsPanel, PresetSelector } from "@/components/layout-editor";
import { useSystemFonts } from "@/hooks/useSystemFonts";

// Helper function to get displayable image source
function getImageSrc(image: { url: string; localPath?: string }): string {
  // Prefer local path if available (for persistence)
  if (image.localPath) {
    try {
      return convertFileSrc(image.localPath);
    } catch {
      console.warn("Failed to convert local path, using URL");
    }
  }
  // Fall back to URL (data URL or remote URL)
  return image.url;
}

interface Panel4Props {
  className?: string;
}

export default function Panel4GeneratedImages({ className = "" }: Panel4Props) {
  const [downloadOption, setDownloadOption] = useState<"image" | "imageText">("imageText");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { images, currentIndex, setCurrentIndex, downloadCurrent, downloadAll, deleteImage, updateTextOverlay, regenerateImage, isGenerating } = useImageStore();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const { items: contentItems } = useContentStore();
  const {
    layoutSettings,
    imageSizePresets,
    setLayoutSettings,
    updateLayoutElement,
    setSelectedLayoutPreset,
    addLayoutPreset,
    favoriteFonts,
    showOnlyFavoriteFonts,
    setShowOnlyFavoriteFonts,
    savePath,
  } = useSettingsStore();
  const { currentProject } = useProjectStore();

  // Load system fonts
  const { fonts: systemFonts } = useSystemFonts();

  // Filter fonts based on favorites setting
  const filteredFonts = showOnlyFavoriteFonts && favoriteFonts.length > 0
    ? systemFonts.filter((font) => favoriteFonts.includes(font))
    : systemFonts;

  const currentImage = images[currentIndex];
  const currentContent = currentImage
    ? contentItems.find((item) => item.id === currentImage.contentId)
    : null;

  // Prioritize textOverlay (editable) over contentItems
  const displayContent = currentImage?.textOverlay ? {
    characterName: currentImage.textOverlay.characterName,
    journalNumber: currentImage.textOverlay.journalNumber,
    title: currentImage.textOverlay.title,
    content: currentImage.textOverlay.content,
  } : (currentContent || null);

  // Get current layout for preview
  const currentPreset = layoutSettings.presets.find(
    (p) => p.id === layoutSettings.selectedPresetId
  );
  const sizePreset = imageSizePresets.find(
    (p) => p.id === currentPreset?.imageSizePresetId
  );

  // Canvas width is 50% of original image size preset
  const canvasWidth = sizePreset ? Math.round(sizePreset.width * 0.5) : 540;

  const handleDownloadCurrent = () => {
    downloadCurrent(downloadOption === "imageText");
  };

  const handleDownloadAll = () => {
    downloadAll(downloadOption === "imageText");
  };

  const handleOpenFolder = async () => {
    try {
      // Try project images directory first, then fallback to savePath
      let targetPath = savePath;
      if (currentProject) {
        try {
          targetPath = await tauriApi.getProjectImagesDir(currentProject.id);
        } catch {
          // Use savePath as fallback
        }
      }
      if (targetPath) {
        await tauriApi.openFolderInExplorer(targetPath);
      } else {
        alert("저장 경로가 설정되지 않았습니다. 설정에서 경로를 지정해주세요.");
      }
    } catch (error) {
      console.error("Failed to open folder:", error);
      alert(`폴더를 열 수 없습니다: ${error}`);
    }
  };

  // 이미지 삭제 핸들러 (확인창 + 파일 삭제)
  const handleDeleteImage = async (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    const confirmed = window.confirm(
      "이 이미지를 삭제하시겠습니까?\n\n저장된 파일도 함께 삭제됩니다."
    );

    if (!confirmed) {
      setDeleteTargetId(null);
      setContextMenuPos(null);
      return;
    }

    // 로컬 파일 삭제
    if (image.localPath) {
      try {
        await tauriApi.deleteImageFile(image.localPath);
      } catch (error) {
        console.error("Failed to delete image file:", error);
        // 파일 삭제 실패해도 목록에서는 삭제 진행
      }
    }

    // 목록에서 삭제
    deleteImage(imageId);
    setDeleteTargetId(null);
    setContextMenuPos(null);
  };

  const aspectRatio = sizePreset
    ? `${sizePreset.width}/${sizePreset.height}`
    : "1080/1350";

  // Edit mode handlers
  const handleSave = async () => {
    await setLayoutSettings(layoutSettings);
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

  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-pink-600" />
          <span className="font-medium text-gray-700">생성된 이미지</span>
          {images.length > 0 && (
            <span className="text-sm text-gray-500">
              ({currentIndex + 1}/{images.length})
            </span>
          )}
        </div>
        {/* 편집 모드 토글 버튼 */}
        {currentImage && (
          <button
            onClick={() => {
              setIsEditMode(!isEditMode);
              if (!isEditMode) setSelectedElementId(null);
            }}
            className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
              isEditMode
                ? "bg-pink-100 text-pink-700 hover:bg-pink-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isEditMode ? (
              <>
                <X className="w-3.5 h-3.5" />
                편집 완료
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                배치 편집
              </>
            )}
          </button>
        )}
      </div>

      {/* 이미지 미리보기 영역 */}
      <div ref={containerRef} className="flex-1 p-4 flex flex-col overflow-hidden">
        {currentImage ? (
          isEditMode && currentPreset && sizePreset ? (
            /* ========== 편집 모드 ========== */
            <div className="flex gap-3 h-full overflow-hidden">
              {/* 좌측: 캔버스 (50% 크기) */}
              <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                <LayoutCanvas
                  preset={currentPreset}
                  sizePreset={sizePreset}
                  canvasWidth={canvasWidth}
                  selectedElementId={selectedElementId}
                  onElementSelect={setSelectedElementId}
                  onElementUpdate={updateLayoutElement}
                  showGridLines={true}
                  backgroundImage={getImageSrc(currentImage)}
                  contentData={displayContent ? {
                    characterName: displayContent.characterName,
                    journalNumber: displayContent.journalNumber,
                    title: displayContent.title,
                    content: displayContent.content,
                  } : undefined}
                />
                <p className="text-[10px] text-gray-400 mt-1 text-center">
                  드래그로 위치, 모서리로 크기 조절
                </p>
              </div>

              {/* 우측: 요소 설정 + 프리셋 선택 (300px 고정) */}
              <div className="w-[300px] flex-shrink-0 flex flex-col overflow-hidden">
                {/* 텍스트 내용 편집 */}
                {currentImage?.textOverlay && (
                  <div className="pb-2 mb-2 border-b border-gray-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                      <Type className="w-3.5 h-3.5" />
                      텍스트 내용 편집
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500">캐릭터명</label>
                        <input
                          type="text"
                          value={currentImage.textOverlay.characterName}
                          onChange={(e) => updateTextOverlay(currentImage.id, { characterName: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500">번호</label>
                        <input
                          type="number"
                          value={currentImage.textOverlay.journalNumber}
                          onChange={(e) => updateTextOverlay(currentImage.id, { journalNumber: parseInt(e.target.value) || 1 })}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-400"
                          min={1}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">부제 (제목)</label>
                      <input
                        type="text"
                        value={currentImage.textOverlay.title}
                        onChange={(e) => updateTextOverlay(currentImage.id, { title: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">짧은지식</label>
                      <textarea
                        value={currentImage.textOverlay.content}
                        onChange={(e) => updateTextOverlay(currentImage.id, { content: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-400 resize-none"
                        rows={2}
                      />
                    </div>
                    {/* 재생성 버튼 */}
                    <button
                      onClick={() => {
                        if (currentImage && !isGenerating) {
                          regenerateImage(currentImage.id);
                        }
                      }}
                      disabled={isGenerating}
                      className="w-full mt-1 px-2 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs rounded flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      {isGenerating ? '이미지 생성중...' : '이 이미지 재생성'}
                    </button>
                  </div>
                )}

                {/* 폰트 필터 옵션 */}
                <div className="pb-2 mb-2 border-b border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={showOnlyFavoriteFonts}
                      onChange={(e) => setShowOnlyFavoriteFonts(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300"
                    />
                    즐겨찾기한 폰트만 보이기
                    {showOnlyFavoriteFonts && favoriteFonts.length > 0 && (
                      <span className="text-gray-400">({favoriteFonts.length}개)</span>
                    )}
                  </label>
                </div>
                {/* 요소 설정 (스크롤 가능) */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {currentPreset.elements.map((element) => (
                    <div
                      key={element.id}
                      onClick={() => setSelectedElementId(element.id)}
                      className="cursor-pointer"
                    >
                      <ElementSettingsPanel
                        element={element}
                        actualWidth={sizePreset.width}
                        actualHeight={sizePreset.height}
                        onUpdate={updateLayoutElement}
                        onTextStyleChange={handleTextStyleChange}
                        onBackgroundStyleChange={handleBackgroundStyleChange}
                        onShapeStyleChange={handleShapeStyleChange}
                        compact={true}
                        isSelected={selectedElementId === element.id}
                        fontOptions={filteredFonts}
                      />
                    </div>
                  ))}
                </div>

                {/* 프리셋 선택 + 저장 */}
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <PresetSelector
                    presets={layoutSettings.presets}
                    selectedPresetId={layoutSettings.selectedPresetId}
                    currentPreset={currentPreset}
                    onSelect={setSelectedLayoutPreset}
                    onDuplicate={handleDuplicatePreset}
                    onSave={handleSave}
                    compact={true}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ========== 일반 모드 (읽기 전용 미리보기) ========== */
            <div className="relative flex justify-center">
              {/* 이미지 컨테이너 - 원래 크기의 50% */}
              <div
                className="relative bg-gray-100 rounded-lg overflow-hidden shadow-lg"
                style={{
                  width: canvasWidth,
                  aspectRatio,
                }}
              >
                {/* 배경 레이어 (가장 뒤, z-index: 0) */}
                {displayContent && currentPreset && downloadOption === "imageText" && (() => {
                  const backgroundEl = currentPreset.elements.find((e) => e.id === "background");
                  if (!backgroundEl?.enabled || !backgroundEl.backgroundStyle) return null;
                  return (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        zIndex: 0,
                        left: `${backgroundEl.x}%`,
                        top: `${backgroundEl.y}%`,
                        width: `${backgroundEl.width}%`,
                        height: `${backgroundEl.height}%`,
                        backgroundColor: `${backgroundEl.backgroundStyle.backgroundColor}${Math.round(backgroundEl.backgroundStyle.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
                      }}
                    />
                  );
                })()}

                {/* LLM 생성 이미지 - hero_image 영역에만 표시 (z-index: 1) */}
                {(() => {
                  const heroEl = currentPreset?.elements.find((e) => e.id === "hero_image");
                  if (heroEl?.enabled) {
                    return (
                      <img
                        src={getImageSrc(currentImage)}
                        alt="Generated"
                        className="absolute"
                        style={{
                          zIndex: 1,
                          left: `${heroEl.x}%`,
                          top: `${heroEl.y}%`,
                          width: `${heroEl.width}%`,
                          height: `${heroEl.height}%`,
                          objectFit: "cover",
                        }}
                      />
                    );
                  }
                  // Fallback: 전체 크기
                  return (
                    <img
                      src={getImageSrc(currentImage)}
                      alt="Generated"
                      className="absolute w-full h-full object-cover"
                      style={{ zIndex: 1 }}
                    />
                  );
                })()}

                {/* 오버레이 요소들 (도형, 텍스트) */}
                {displayContent && currentPreset && downloadOption === "imageText" && (() => {
                  const titleEl = currentPreset.elements.find((e) => e.id === "title");
                  const subtitleEl = currentPreset.elements.find((e) => e.id === "subtitle");
                  const shortKnowledgeEl = currentPreset.elements.find((e) => e.id === "short_knowledge");
                  const shape1El = currentPreset.elements.find((e) => e.id === "shape1");

                  // 50% 스케일 팩터 (원본 대비 미리보기 크기)
                  const scaleFactor = 0.5;

                  // Helper to render text with optional highlight
                  const renderTextWithHighlight = (
                    el: typeof titleEl,
                    content: string,
                    fontWeight: string = "normal"
                  ) => {
                    if (!el?.enabled) return null;
                    const style = el.textStyle;
                    const hasHighlight = style?.highlightEnabled;
                    const scaledFontSize = (style?.fontSize || 16) * scaleFactor;
                    const scaledMargin = (style?.highlightMargin || 4) * scaleFactor;

                    return (
                      <div
                        className="absolute drop-shadow-lg"
                        style={{
                          zIndex: 3,
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: `${el.width}%`,
                          fontFamily: style?.fontFamily || "Pretendard",
                          fontSize: `${scaledFontSize}px`,
                          color: style?.fontColor || "#FFFFFF",
                          fontWeight,
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: hasHighlight
                              ? `${style?.highlightColor || "#FFFF00"}${Math.round((style?.highlightOpacity || 0.5) * 255).toString(16).padStart(2, '0')}`
                              : "transparent",
                            padding: hasHighlight ? `${scaledMargin}px` : 0,
                            display: "inline",
                            boxDecorationBreak: "clone",
                            WebkitBoxDecorationBreak: "clone",
                          }}
                        >
                          {content}
                        </span>
                      </div>
                    );
                  };

                  return (
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
                      {/* 도형1 레이어 */}
                      {shape1El?.enabled && shape1El.shapeStyle && (
                        <div
                          className="absolute"
                          style={{
                            zIndex: 1,
                            left: `${shape1El.x}%`,
                            top: `${shape1El.y}%`,
                            width: `${shape1El.width}%`,
                            height: `${shape1El.height}%`,
                            backgroundColor: `${shape1El.shapeStyle.backgroundColor}${Math.round(shape1El.shapeStyle.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
                            border: `1px solid ${shape1El.shapeStyle.borderColor}${Math.round(shape1El.shapeStyle.borderOpacity * 255).toString(16).padStart(2, '0')}`,
                            borderRadius: `${shape1El.shapeStyle.borderRadius * scaleFactor}px`,
                            backdropFilter: shape1El.shapeStyle.blurEnabled ? `blur(${(shape1El.shapeStyle.blurAmount || 8) * scaleFactor}px)` : undefined,
                            WebkitBackdropFilter: shape1El.shapeStyle.blurEnabled ? `blur(${(shape1El.shapeStyle.blurAmount || 8) * scaleFactor}px)` : undefined,
                          }}
                        />
                      )}

                      {/* 제목 */}
                      {renderTextWithHighlight(
                        titleEl,
                        `${displayContent.characterName}의 연구일지 #${String(displayContent.journalNumber).padStart(2, '0')}`,
                        "bold"
                      )}

                      {/* 부제 (제목) */}
                      {renderTextWithHighlight(
                        subtitleEl,
                        displayContent.title,
                        "600"
                      )}

                      {/* 짧은지식 */}
                      {shortKnowledgeEl?.enabled && (() => {
                        const skStyle = shortKnowledgeEl.textStyle;
                        const skFontSize = (skStyle?.fontSize || 16) * scaleFactor;
                        const skMargin = (skStyle?.highlightMargin || 4) * scaleFactor;
                        return (
                          <div
                            className="absolute drop-shadow-lg overflow-hidden"
                            style={{
                              zIndex: 2,
                              left: `${shortKnowledgeEl.x}%`,
                              top: `${shortKnowledgeEl.y}%`,
                              width: `${shortKnowledgeEl.width}%`,
                              height: `${shortKnowledgeEl.height}%`,
                              fontFamily: skStyle?.fontFamily || "Pretendard",
                              fontSize: `${skFontSize}px`,
                              color: skStyle?.fontColor || "#FFFFFF",
                            }}
                          >
                            <span
                              style={{
                                backgroundColor: skStyle?.highlightEnabled
                                  ? `${skStyle?.highlightColor || "#FFFF00"}${Math.round((skStyle?.highlightOpacity || 0.5) * 255).toString(16).padStart(2, '0')}`
                                  : "transparent",
                                padding: skStyle?.highlightEnabled ? `${skMargin}px` : 0,
                                display: "inline",
                                boxDecorationBreak: "clone",
                                WebkitBoxDecorationBreak: "clone",
                              }}
                            >
                              {displayContent.content}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* 재생성 버튼 */}
                <button
                  onClick={() => {
                    if (currentImage && !isGenerating) {
                      regenerateImage(currentImage.id);
                    }
                  }}
                  disabled={isGenerating}
                  className="absolute top-2 right-2 px-2 py-1 bg-black/50 hover:bg-black/70 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ zIndex: 10 }}
                  title="이 이미지 재생성"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-white ${isGenerating ? 'animate-spin' : ''}`} />
                  <span className="text-xs text-white">{isGenerating ? '생성중...' : '재생성'}</span>
                </button>

                {/* 네비게이션 버튼 */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      style={{ zIndex: 10 }}
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => setCurrentIndex(Math.min(images.length - 1, currentIndex + 1))}
                      disabled={currentIndex === images.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      style={{ zIndex: 10 }}
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="text-center text-gray-400 flex-1 flex flex-col items-center justify-center">
            <Image className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-sm">이미지를 생성해주세요</p>
          </div>
        )}
      </div>

      {/* 썸네일 그리드 */}
      {images.length > 0 && (
        <div className="px-4 pb-3 relative">
          <div className={`grid grid-cols-8 gap-1.5 overflow-y-auto ${isEditMode ? "max-h-28" : "max-h-40"}`}>
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative group"
              >
                <button
                  onClick={() => {
                    setCurrentIndex(index);
                    // 선택된 이미지면 삭제 버튼 토글
                    if (index === currentIndex) {
                      setDeleteTargetId(deleteTargetId === image.id ? null : image.id);
                    } else {
                      setDeleteTargetId(null);
                    }
                    setContextMenuPos(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCurrentIndex(index);
                    setDeleteTargetId(image.id);
                    setContextMenuPos({ x: e.clientX, y: e.clientY });
                  }}
                  className={`w-full aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                    index === currentIndex
                      ? "border-pink-500 ring-2 ring-pink-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={getImageSrc(image)}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
                {/* 삭제 버튼 (선택된 이미지 위에 표시) */}
                {deleteTargetId === image.id && !contextMenuPos && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(image.id);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-10"
                    title="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 컨텍스트 메뉴 (우클릭) */}
          {contextMenuPos && deleteTargetId && (
            <>
              {/* 배경 클릭시 메뉴 닫기 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setContextMenuPos(null);
                  setDeleteTargetId(null);
                }}
              />
              <div
                className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
                style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
              >
                <button
                  onClick={() => handleDeleteImage(deleteTargetId)}
                  className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  이미지 삭제
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 다운로드 옵션 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2 items-center">
          {/* 다운로드 옵션 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
            >
              {downloadOption === "imageText" ? (
                <>
                  <Type className="w-4 h-4" />
                  이미지+텍스트
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  이미지만
                </>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>

            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                <button
                  onClick={() => {
                    setDownloadOption("imageText");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-50 ${
                    downloadOption === "imageText" ? "bg-gray-100" : ""
                  }`}
                >
                  <Type className="w-4 h-4" />
                  이미지+텍스트
                </button>
                <button
                  onClick={() => {
                    setDownloadOption("image");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-50 ${
                    downloadOption === "image" ? "bg-gray-100" : ""
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  이미지만
                </button>
              </div>
            )}
          </div>

          {/* 전체 다운로드 */}
          <button
            onClick={handleDownloadAll}
            disabled={images.length === 0}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Download className="w-4 h-4" />
            전체 ({images.length})
          </button>

          {/* 현재 다운로드 */}
          <button
            onClick={handleDownloadCurrent}
            disabled={!currentImage}
            className="flex-1 px-3 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Download className="w-4 h-4" />
            현재 이미지
          </button>

          {/* 폴더 열기 */}
          <button
            onClick={handleOpenFolder}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center"
            title="다운로드 폴더 열기"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
