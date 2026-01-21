import { useSettingsStore, googleImageModelOptions } from "@/stores/settingsStore";
import { useContentStore } from "@/stores/contentStore";
import { useImageStore } from "@/stores/imageStore";
import { Image, Sparkles, Layout, Check, Cpu, Maximize2 } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface Panel3Props {
  className?: string;
}

export default function Panel3ImageSettings({ className = "" }: Panel3Props) {
  const {
    imagePrompts,
    selectedImagePromptId,
    setSelectedImagePrompt,
    layoutSettings,
    imageSizePresets,
    apiSelection,
    googleImageModel,
    setGoogleImageModel,
    updateLayoutPreset,
    updateImageSizePreset,
  } = useSettingsStore();
  const { selectedIds } = useContentStore();
  const {
    generateImages,
    isGenerating,
    selectedLayoutPresetId,
    setSelectedLayoutPreset,
  } = useImageStore();

  // Get current layout preset info
  const currentPreset = layoutSettings.presets.find(
    (p) => p.id === selectedLayoutPresetId
  );
  const currentSizePreset = imageSizePresets.find(
    (p) => p.id === currentPreset?.imageSizePresetId
  );

  // Show all image prompts (sorted by order in settings)
  const displayPrompts = imagePrompts;

  const handleGenerateImages = async () => {
    if (selectedIds.size === 0) {
      alert("먼저 콘텐츠를 선택해주세요.");
      return;
    }
    if (!selectedImagePromptId) {
      alert("이미지 프롬프트를 선택해주세요.");
      return;
    }

    await generateImages(Array.from(selectedIds));
  };

  return (
    <aside className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-orange-600" />
          <span className="font-medium text-gray-700">이미지 설정</span>
        </div>
      </div>

      {/* 이미지 프롬프트 선택 */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">이미지 프롬프트</label>
            <span className="text-xs text-gray-400">
              {displayPrompts.length}/{imagePrompts.length}개
            </span>
          </div>

          {/* 프롬프트 썸네일 그리드 (2열, 스크롤 가능) */}
          <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
            {displayPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedImagePrompt(prompt.id)}
                className={`relative aspect-[4/3] rounded-lg border-2 overflow-hidden transition-all ${
                  selectedImagePromptId === prompt.id
                    ? "border-orange-500 ring-2 ring-orange-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* 프리뷰 이미지 또는 플레이스홀더 */}
                {prompt.previewImagePath ? (
                  <img
                    src={convertFileSrc(prompt.previewImagePath)}
                    alt={prompt.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                {/* 선택 표시 */}
                {selectedImagePromptId === prompt.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* 이름 오버레이 */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                  <span className="text-xs text-white truncate block">
                    {prompt.name}
                  </span>
                </div>
              </button>
            ))}

          </div>

          {/* 선택된 프롬프트 정보 */}
          {selectedImagePromptId && (
            <div className="bg-orange-50 rounded-lg p-2 text-xs text-gray-600">
              <div className="font-medium text-orange-700 mb-1">
                {imagePrompts.find((p) => p.id === selectedImagePromptId)?.name}
              </div>
              <p className="line-clamp-2">
                {imagePrompts.find((p) => p.id === selectedImagePromptId)?.prompt}
              </p>
            </div>
          )}
        </div>

        {/* 이미지 배치 설정 */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-gray-500" />
            <label className="text-xs font-medium text-gray-600">이미지 배치</label>
          </div>
          <select
            value={selectedLayoutPresetId}
            onChange={(e) => setSelectedLayoutPreset(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {layoutSettings.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* 이미지 크기 선택 */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-gray-500" />
            <label className="text-xs font-medium text-gray-600">이미지 크기</label>
          </div>
          <select
            value={currentPreset?.imageSizePresetId || "instagram"}
            onChange={(e) => {
              if (currentPreset) {
                updateLayoutPreset(currentPreset.id, { imageSizePresetId: e.target.value });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {imageSizePresets.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name} ({size.width}x{size.height})
              </option>
            ))}
          </select>

          {/* 여백 설정 */}
          {currentSizePreset && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">좌우 여백</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={currentSizePreset.marginHorizontal ?? 120}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      updateImageSizePreset(currentSizePreset.id, { marginHorizontal: value });
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    min={0}
                    max={300}
                    step={10}
                  />
                  <span className="text-xs text-gray-400">px</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">상하 여백</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={currentSizePreset.marginVertical ?? 80}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      updateImageSizePreset(currentSizePreset.id, { marginVertical: value });
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    min={0}
                    max={300}
                    step={10}
                  />
                  <span className="text-xs text-gray-400">px</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Google 이미지 모델 선택 (Google 선택시에만 표시) */}
        {apiSelection.imageApi === "google" && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-gray-500" />
              <label className="text-xs font-medium text-gray-600">Google 이미지 모델</label>
            </div>
            <select
              value={googleImageModel}
              onChange={(e) => setGoogleImageModel(e.target.value as typeof googleImageModel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {googleImageModelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            {/* 선택된 모델 설명 */}
            <div className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
              {googleImageModelOptions.find((m) => m.id === googleImageModel)?.description}
            </div>
          </div>
        )}
      </div>

      {/* 이미지 생성 버튼 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleGenerateImages}
          disabled={isGenerating || selectedIds.size === 0 || !selectedImagePromptId}
          className="w-full px-3 py-3 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating
            ? "생성 중..."
            : `이미지 생성하기 (${selectedIds.size}개)`}
        </button>
      </div>
    </aside>
  );
}
