import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Star, Loader2, Check, ImageIcon, Wand2, Cpu, Maximize, MinusCircle } from "lucide-react";
import { useSettingsStore, googleImageModelOptions, aspectRatioOptions, type GoogleImageModel } from "@/stores/settingsStore";
import { useApiPreviewStore } from "@/stores/apiPreviewStore";
import * as tauriApi from "@/services/tauriApi";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export default function ImagePromptSettings() {
  const {
    imagePrompts,
    selectedImagePromptId,
    addImagePrompt,
    updateImagePrompt,
    deleteImagePrompt,
    setSelectedImagePrompt,
    apiKeys,
    apiSelection,
    googleImageModel,
    setGoogleImageModel,
  } = useSettingsStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    selectedImagePromptId || imagePrompts[0]?.id || null
  );
  const [editForm, setEditForm] = useState({
    name: "",
    prompt: "",
    negativePrompt: "",
  });
  const [previewImagePath, setPreviewImagePath] = useState<string | null>(null);
  const [previewImageKey, setPreviewImageKey] = useState<number>(Date.now()); // Cache busting key
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isGeneratingFromImage, setIsGeneratingFromImage] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);

  // Local state for generation settings
  const [selectedModelId, setSelectedModelId] = useState<GoogleImageModel>(googleImageModel);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("3:4"); // Default Instagram style

  const selectedPrompt = imagePrompts.find((p) => p.id === selectedId);
  const selectedAspectOption = aspectRatioOptions.find((p) => p.id === selectedAspectRatio) || aspectRatioOptions[2]; // Default 3:4

  // Load selected prompt data
  useEffect(() => {
    if (selectedPrompt) {
      setEditForm({
        name: selectedPrompt.name,
        prompt: selectedPrompt.prompt,
        negativePrompt: selectedPrompt.negativePrompt || "",
      });
      setPreviewImagePath(selectedPrompt.previewImagePath || null);
      // Load saved model and aspectRatio settings from prompt
      setSelectedModelId(selectedPrompt.imageModel || googleImageModel);
      setSelectedAspectRatio(selectedPrompt.aspectRatio || "3:4");
      setValidationError(null);
    }
  }, [selectedId, selectedPrompt, googleImageModel]);

  const handleAdd = () => {
    const newId = `image-prompt-${Date.now()}`;
    addImagePrompt({
      name: "새 프롬프트",
      prompt: "",
      isDefault: false,
    });
    // Find the newly added prompt
    const newPrompt = imagePrompts.find((p) => p.id === newId);
    if (newPrompt) {
      setSelectedId(newId);
    } else {
      // Since addImagePrompt is async state update, we need to find by name
      setTimeout(() => {
        const prompts = useSettingsStore.getState().imagePrompts;
        const newest = prompts[prompts.length - 1];
        if (newest) {
          setSelectedId(newest.id);
        }
      }, 100);
    }
  };

  const handleSelectPrompt = (id: string) => {
    setSelectedId(id);
    setSelectedImagePrompt(id);
  };

  const handleGenerateImage = async () => {
    if (!editForm.prompt.trim()) {
      setValidationError("프롬프트를 입력해주세요.");
      return;
    }

    const provider = apiSelection?.imageApi || "google";
    const apiKey = provider === "openai" ? apiKeys.openai : apiKeys.google;

    if (!apiKey) {
      setValidationError("이미지 생성 API 키가 설정되지 않았습니다.");
      return;
    }

    // Get model name for display
    const modelOption = googleImageModelOptions.find(m => m.id === selectedModelId);
    const modelName = modelOption?.name || selectedModelId;

    // Show API preview modal
    const { showPreview } = useApiPreviewStore.getState();
    const { confirmed, prompt: editedPrompt } = await showPreview({
      type: "image",
      title: "이미지 프롬프트 미리보기 생성",
      provider: provider,
      endpoint: `Imagen API - ${modelName}`,
      prompt: editForm.prompt,
      additionalParams: {
        model: selectedModelId,
        aspectRatio: selectedAspectRatio,
        negativePrompt: editForm.negativePrompt || null,
        promptId: selectedId || "temp",
      },
    });

    if (!confirmed) {
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setGenerationStatus("이미지 생성 요청 중...");

    // Update global model setting
    setGoogleImageModel(selectedModelId);

    try {
      setGenerationStatus("AI 모델에서 이미지 생성 중... (30초~1분 소요)");

      const path = await tauriApi.generatePreviewImage(
        selectedId || "temp",
        editedPrompt, // Use edited prompt from modal
        apiKey,
        provider,
        selectedModelId,
        selectedAspectRatio,
        editForm.negativePrompt || undefined
      );

      setGenerationStatus("이미지 저장 중...");

      // Update preview with new key to bust cache
      setPreviewImagePath(path);
      setPreviewImageKey(Date.now());

      // Update the prompt with the preview image path and edited prompt
      if (selectedId) {
        updateImagePrompt(selectedId, {
          previewImagePath: path,
          prompt: editedPrompt, // Save edited prompt
        });
        // Also update local form
        setEditForm(prev => ({ ...prev, prompt: editedPrompt }));
      }

      setGenerationStatus("완료!");
      setTimeout(() => setGenerationStatus(null), 2000);
    } catch (error) {
      setValidationError(
        typeof error === "string" ? error : "이미지 생성에 실패했습니다."
      );
      setGenerationStatus(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSavePromptAndImage = async () => {
    if (!selectedId) return;

    setIsSaving(true);
    try {
      updateImagePrompt(selectedId, {
        name: editForm.name,
        prompt: editForm.prompt,
        negativePrompt: editForm.negativePrompt || undefined,
        aspectRatio: selectedAspectRatio,
        previewImagePath: previewImagePath || undefined,
        imageModel: selectedModelId,
      });
      // Also update global model setting
      setGoogleImageModel(selectedModelId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedId || selectedPrompt?.isDefault) return;

    deleteImagePrompt(selectedId);

    // Select another prompt
    const remaining = imagePrompts.filter((p) => p.id !== selectedId);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    } else {
      setSelectedId(null);
    }
  };

  const getImageSrc = (path: string, bustCache: boolean = false) => {
    try {
      const src = convertFileSrc(path);
      // Add cache busting query param if needed
      return bustCache ? `${src}?t=${previewImageKey}` : src;
    } catch {
      return path;
    }
  };

  const handleGenerateFromImage = async () => {
    // Get API key based on content API selection (for vision capability)
    const provider = apiSelection.contentApi;
    const apiKey = apiKeys[provider as keyof typeof apiKeys];

    if (!apiKey) {
      setValidationError(`${provider} API 키가 설정되지 않았습니다.`);
      return;
    }

    try {
      // Open file picker
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
        title: "스타일 참조 이미지 선택",
      });

      if (!selected || typeof selected !== "string") {
        return;
      }

      setIsGeneratingFromImage(true);
      setValidationError(null);

      // Generate prompt from image
      const generatedPrompt = await tauriApi.generatePromptFromImage(
        selected,
        apiKey,
        provider
      );

      // Update the form with generated prompt
      setEditForm((prev) => ({
        ...prev,
        prompt: generatedPrompt,
      }));
    } catch (error) {
      setValidationError(
        typeof error === "string" ? error : "이미지에서 프롬프트 생성에 실패했습니다."
      );
    } finally {
      setIsGeneratingFromImage(false);
    }
  };

  // Calculate preview area aspect ratio
  const previewAspectRatio = selectedAspectOption
    ? `${selectedAspectOption.width}/${selectedAspectOption.height}`
    : "768/1024";

  return (
    <div className="flex gap-4 h-full min-h-[500px]">
      {/* Left: Prompt List */}
      <div className="w-48 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">프롬프트 목록</h4>
          <button
            onClick={handleAdd}
            className="p-1 text-primary-600 hover:bg-primary-50 rounded"
            title="새 프롬프트 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {imagePrompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`flex items-center gap-1 p-2 rounded-lg transition-colors group ${
                selectedId === prompt.id
                  ? "bg-primary-100 border-primary-300 border"
                  : "hover:bg-gray-100 border border-transparent"
              }`}
            >
              <button
                onClick={() => handleSelectPrompt(prompt.id)}
                className="flex-1 text-left flex items-center gap-2 min-w-0"
              >
                {prompt.isDefault && (
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
                <span className="text-sm truncate">{prompt.name}</span>
              </button>
              {!prompt.isDefault && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`"${prompt.name}" 프롬프트를 삭제하시겠습니까?`)) {
                      deleteImagePrompt(prompt.id);
                      if (selectedId === prompt.id) {
                        const remaining = imagePrompts.filter((p) => p.id !== prompt.id);
                        if (remaining.length > 0) {
                          setSelectedId(remaining[0].id);
                        } else {
                          setSelectedId(null);
                        }
                      }
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Detail Editor - 2 Column Layout */}
      <div className="flex-1 flex flex-col border-l border-gray-200 pl-4 overflow-y-auto">
        {selectedPrompt ? (
          <div className="flex gap-6 h-full">
            {/* Left Column: Form Controls */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Name Input */}
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  프롬프트 이름
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="프롬프트 이름"
                  className="input"
                  disabled={selectedPrompt.isDefault}
                />
              </div>

              {/* Prompt Textarea */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    프롬프트 내용
                  </label>
                  <button
                    onClick={handleGenerateFromImage}
                    disabled={isGeneratingFromImage}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    title="이미지에서 스타일 프롬프트 추출"
                  >
                    {isGeneratingFromImage ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" />
                        이미지로 생성
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={editForm.prompt}
                  onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                  placeholder="이미지 생성에 사용될 스타일 프롬프트를 입력하세요"
                  rows={16}
                  className="input resize-none"
                />
              </div>

              {/* Image Model Selector */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">이미지 모델</label>
                </div>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value as GoogleImageModel)}
                  className="input"
                >
                  {googleImageModelOptions.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Maximize className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">비율 (Aspect Ratio)</label>
                </div>
                <select
                  value={selectedAspectRatio}
                  onChange={(e) => setSelectedAspectRatio(e.target.value)}
                  className="input"
                >
                  {aspectRatioOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Negative Prompt */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <MinusCircle className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">네거티브 프롬프트</label>
                </div>
                <input
                  type="text"
                  value={editForm.negativePrompt}
                  onChange={(e) => setEditForm({ ...editForm, negativePrompt: e.target.value })}
                  placeholder="제외할 요소 (예: blurry, low quality, text)"
                  className="input"
                />
              </div>

              {/* Generate Image Button */}
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateImage}
                  disabled={isValidating || !editForm.prompt.trim()}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      이미지생성
                    </>
                  )}
                </button>

                {!selectedPrompt.isDefault && (
                  <button
                    onClick={handleDelete}
                    className="btn btn-secondary text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Validation Error */}
              {validationError && (
                <p className="text-sm text-red-500 mt-2">{validationError}</p>
              )}
            </div>

            {/* Right Column: Preview Image and Save */}
            <div className="w-[420px] flex-shrink-0 flex flex-col">
              {/* Preview Image - 설정된 비율에 맞춤 */}
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  미리보기 이미지 ({selectedAspectOption?.name || "3:4"})
                </label>
                <div
                  className="relative bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden"
                  style={{
                    aspectRatio: previewAspectRatio,
                    maxWidth: "400px",
                    width: "100%",
                  }}
                >
                  {/* Generation Progress Overlay */}
                  {isValidating && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                      <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                      <p className="text-white text-sm font-medium text-center px-4">
                        {generationStatus || "이미지 생성 중..."}
                      </p>
                    </div>
                  )}

                  {previewImagePath ? (
                    <img
                      key={previewImageKey}
                      src={getImageSrc(previewImagePath, true)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm text-center p-4">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      이미지생성 버튼을 클릭하여
                      <br />
                      미리보기 이미지를 생성하세요
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button - 이미지 아래에 배치 */}
              <div className="mt-4">
                <button
                  onClick={handleSavePromptAndImage}
                  disabled={isSaving || !editForm.name.trim()}
                  className="w-full btn btn-primary flex items-center justify-center gap-2"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4" />
                      저장됨
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      저장 (프롬프트 + 이미지)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            프롬프트를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
