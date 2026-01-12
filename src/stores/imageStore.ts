import { create } from "zustand";
import { devtools } from "zustand/middleware";
import * as tauriApi from "@/services/tauriApi";
import { useSettingsStore, googleImageModelOptions, aspectRatioOptions } from "./settingsStore";
import { useContentStore } from "./contentStore";
import { useProjectStore } from "./projectStore";
import { useApiPreviewStore } from "./apiPreviewStore";
import { renderLayeredImage } from "@/utils/canvasRenderer";
import { convertFileSrc } from "@tauri-apps/api/core";

export interface GeneratedImage {
  id: string;
  contentId: string;
  url: string;
  localPath?: string;
  textOverlay?: {
    characterName: string;
    journalNumber: number;
    title: string;       // 부제 (콘텐츠 제목)
    content: string;     // 짧은지식 내용
  };
}

export interface ActualApiCallInfo {
  provider: string;
  endpoint: string;
  model: string;
  stylePrompt: string;
  negativePrompt: string;
  aspectRatio: string;
  requests: { contentId: string; imageConcept: string }[];
}

export interface ImageGenerationStatus {
  isOpen: boolean;
  currentIndex: number;
  total: number;
  currentContentTitle: string;
  completedImages: GeneratedImage[];
  error?: string;
  actualApiCallInfo?: ActualApiCallInfo;
}

interface ImageState {
  // State
  images: GeneratedImage[];
  currentIndex: number;
  isGenerating: boolean;
  generationProgress: number;

  // New: Generation Modal Status
  generationStatus: ImageGenerationStatus;
  selectedLayoutPresetId: string;

  // Actions
  setImages: (images: GeneratedImage[]) => void;
  addImage: (image: GeneratedImage) => void;
  deleteImage: (imageId: string) => void;
  setCurrentIndex: (index: number) => void;
  nextImage: () => void;
  previousImage: () => void;
  generateImages: (contentIds: string[]) => Promise<void>;
  downloadCurrent: (withText: boolean) => Promise<void>;
  downloadAll: (withText: boolean) => Promise<void>;
  clearImages: () => void;

  // New: Generation Modal Actions
  openGenerationModal: () => void;
  closeGenerationModal: () => void;
  setSelectedLayoutPreset: (id: string) => void;
}

export const useImageStore = create<ImageState>()(
  devtools(
    (set, get) => ({
      // Initial State
      images: [],
      currentIndex: 0,
      isGenerating: false,
      generationProgress: 0,

      // New: Generation Status
      generationStatus: {
        isOpen: false,
        currentIndex: 0,
        total: 0,
        currentContentTitle: "",
        completedImages: [],
      },
      selectedLayoutPresetId: "default-instagram",

      // Actions
      setImages: (images) => set({ images, currentIndex: 0 }),

      addImage: (image) =>
        set((state) => ({
          images: [...state.images, image],
        })),

      deleteImage: (imageId) =>
        set((state) => {
          const newImages = state.images.filter((img) => img.id !== imageId);
          // Adjust currentIndex if needed
          let newIndex = state.currentIndex;
          if (newImages.length === 0) {
            newIndex = 0;
          } else if (state.currentIndex >= newImages.length) {
            newIndex = newImages.length - 1;
          }
          return { images: newImages, currentIndex: newIndex };
        }),

      setCurrentIndex: (index) => set({ currentIndex: index }),

      nextImage: () => {
        const { currentIndex, images } = get();
        if (currentIndex < images.length - 1) {
          set({ currentIndex: currentIndex + 1 });
        }
      },

      previousImage: () => {
        const { currentIndex } = get();
        if (currentIndex > 0) {
          set({ currentIndex: currentIndex - 1 });
        }
      },

      generateImages: async (contentIds) => {
        // Keep existing images and add new ones (not reset)
        const { images: existingImages } = get();

        set({
          isGenerating: true,
          generationProgress: 0,
          generationStatus: {
            isOpen: true,
            currentIndex: 0,
            total: contentIds.length,
            currentContentTitle: "",
            completedImages: [],
          },
        });

        // Get content items and API settings
        const contentItems = useContentStore.getState().items;
        const settings = useSettingsStore.getState();
        const provider = settings.apiSelection.imageApi;
        const apiKey = settings.apiKeys[provider as keyof typeof settings.apiKeys];
        const googleImageModel = settings.googleImageModel;

        // Get style prompt from selected image prompt
        const selectedPromptId = settings.selectedImagePromptId;
        const selectedPrompt = settings.imagePrompts.find((p) => p.id === selectedPromptId) || settings.imagePrompts[0];
        const stylePrompt = selectedPrompt?.prompt || "";
        const negativePrompt = selectedPrompt?.negativePrompt || "";
        const aspectRatio = selectedPrompt?.aspectRatio || "3:4";

        // Create image generation requests (use snake_case for Rust)
        const requests = contentIds
          .map((contentId) => {
            const content = contentItems.find((item) => item.id === contentId);
            if (!content) return null;

            const request: tauriApi.ImageGenerationRequest = {
              content_id: contentId,
              image_concept: content.imageConcept,
              style_prompt: stylePrompt,
            };
            if (selectedPrompt?.styleImagePath) {
              request.style_image_path = selectedPrompt.styleImagePath;
            }
            return request;
          })
          .filter((r): r is tauriApi.ImageGenerationRequest => r !== null);

        const total = requests.length;
        const newImages: GeneratedImage[] = [];

        // Get aspect ratio display name
        const aspectRatioOption = aspectRatioOptions.find((a) => a.id === aspectRatio);
        const aspectRatioName = aspectRatioOption?.name || aspectRatio;

        // Build combined prompt for preview
        const imagePromptText = `이미지 생성 요청 (${total}개)

스타일 프롬프트:
${stylePrompt}

네거티브 프롬프트:
${negativePrompt || "없음"}

생성할 이미지 콘셉트:
${requests.map((r, i) => {
  const content = contentItems.find((c) => c.id === r.content_id);
  return `${i + 1}. ${content?.title || r.content_id}: ${r.image_concept}`;
}).join("\n")}`;

        // Show API preview modal
        const { showPreview } = useApiPreviewStore.getState();

        // Get model name for display
        const modelOption = googleImageModelOptions.find((m) => m.id === googleImageModel);
        const modelDisplayName = modelOption?.name || googleImageModel;

        const { confirmed, prompt: editedPrompt } = await showPreview({
          type: "image",
          title: "이미지 생성 API 호출",
          provider,
          endpoint: `Imagen API - ${modelDisplayName}`,
          prompt: imagePromptText,
          additionalParams: {
            model: googleImageModel,
            modelName: modelDisplayName,
            sampleCount: total,
            aspectRatio: aspectRatioName,
            negativePrompt: negativePrompt || null,
            styleImagePath: selectedPrompt?.styleImagePath || null,
          },
        });

        if (!confirmed) {
          set({
            isGenerating: false,
            generationStatus: {
              isOpen: false,
              currentIndex: 0,
              total: 0,
              currentContentTitle: "",
              completedImages: [],
              error: "사용자 취소",
            },
          });
          return;
        }

        // Parse edited prompt to extract style prompt and negative prompt
        let finalStylePrompt = stylePrompt;
        let finalNegativePrompt = negativePrompt;

        if (editedPrompt && editedPrompt !== imagePromptText) {
          // Check if the edited prompt follows the original format
          const hasOriginalFormat = editedPrompt.includes("스타일 프롬프트:") && editedPrompt.includes("네거티브 프롬프트:");

          if (hasOriginalFormat) {
            // Extract style prompt (between "스타일 프롬프트:" and "네거티브 프롬프트:")
            const styleMatch = editedPrompt.match(/스타일 프롬프트:\s*([\s\S]*?)(?=\n\n네거티브 프롬프트:)/);
            if (styleMatch) {
              finalStylePrompt = styleMatch[1].trim();
            }

            // Extract negative prompt (between "네거티브 프롬프트:" and "생성할 이미지 콘셉트:")
            const negativeMatch = editedPrompt.match(/네거티브 프롬프트:\s*([\s\S]*?)(?=\n\n생성할 이미지 콘셉트:)/);
            if (negativeMatch) {
              const extracted = negativeMatch[1].trim();
              finalNegativePrompt = extracted === "없음" ? "" : extracted;
            }
          } else {
            // User replaced the entire prompt with new content
            // Use the entire edited prompt as the style prompt
            finalStylePrompt = editedPrompt.trim();
            finalNegativePrompt = ""; // Clear negative prompt since user wrote custom prompt
          }

          // Update requests with edited style prompt
          requests.forEach((req) => {
            req.style_prompt = finalStylePrompt;
          });
        }

        // Store actual API call info for later display
        const actualApiCallInfo: ActualApiCallInfo = {
          provider,
          endpoint: `Imagen API - ${modelDisplayName}`,
          model: googleImageModel,
          stylePrompt: finalStylePrompt,
          negativePrompt: finalNegativePrompt,
          aspectRatio: aspectRatioName,
          requests: requests.map((r) => ({
            contentId: r.content_id,
            imageConcept: r.image_concept,
          })),
        };

        // Store actual API call info in generation status
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            actualApiCallInfo,
          },
        }));

        // Generate images one by one for progress tracking
        for (let i = 0; i < total; i++) {
          const request = requests[i];
          const content = contentItems.find((item) => item.id === request.content_id);

          // Update generation status modal
          set((state) => ({
            generationStatus: {
              ...state.generationStatus,
              currentIndex: i + 1,
              currentContentTitle: content?.title || `콘텐츠 ${i + 1}`,
            },
          }));

          try {
            // Update content item status
            useContentStore.getState().updateItemStatus(request.content_id, "generating");

            // Call Tauri backend (pass model, aspectRatio, negativePrompt for Google provider)
            const modelToUse = provider === "google" ? googleImageModel : undefined;
            const result = await tauriApi.generateImage(
              request,
              apiKey,
              provider,
              modelToUse,
              aspectRatio,
              finalNegativePrompt || undefined
            );

            // Auto-save image to project folder or default save path
            let localPath = result.local_path ?? undefined;
            const { currentProject } = useProjectStore.getState();
            let savePath = settings.savePath;

            // If project exists, try to get project images directory
            if (currentProject && result.url) {
              try {
                const projectImagesDir = await tauriApi.getProjectImagesDir(currentProject.id);
                savePath = projectImagesDir;
              } catch (e) {
                console.warn("Failed to get project images dir, using default:", e);
              }
            }

            if (savePath && result.url) {
              try {
                const filename = `image_${result.content_id}_${Date.now()}.png`;
                const fullPath = `${savePath}/${filename}`;
                const savedPath = await tauriApi.downloadImage(result.url, fullPath, false);
                localPath = savedPath;
                console.log(`Image auto-saved to: ${savedPath}`);
              } catch (saveError) {
                console.warn("Failed to auto-save image:", saveError);
                // Continue with URL-based image if save fails
              }
            }

            const image: GeneratedImage = {
              id: result.id,
              contentId: result.content_id,
              url: result.url,
              localPath,
              textOverlay: content
                ? {
                    characterName: content.characterName,
                    journalNumber: content.journalNumber,
                    title: content.title,
                    content: content.content,
                  }
                : undefined,
            };

            newImages.push(image);

            // Update content item status
            useContentStore.getState().updateItemStatus(request.content_id, "completed");

            // Add to existing images (accumulate, not replace)
            set((state) => ({
              images: [...existingImages, ...newImages],
              generationProgress: ((i + 1) / total) * 100,
              generationStatus: {
                ...state.generationStatus,
                completedImages: [...newImages],
              },
            }));
          } catch (error) {
            console.error(`Failed to generate image ${i + 1}:`, error);
            useContentStore.getState().updateItemStatus(request.content_id, "error");

            // Create fallback mock image
            const mockImage: GeneratedImage = {
              id: `image-${Date.now()}-${i}`,
              contentId: request.content_id,
              url: `https://picsum.photos/1024/1024?random=${Date.now()}-${i}`,
              textOverlay: content
                ? {
                    characterName: content.characterName,
                    journalNumber: content.journalNumber,
                    title: content.title,
                    content: content.content,
                  }
                : undefined,
            };
            newImages.push(mockImage);

            // Add to existing images (accumulate, not replace)
            set((state) => ({
              images: [...existingImages, ...newImages],
              generationProgress: ((i + 1) / total) * 100,
              generationStatus: {
                ...state.generationStatus,
                completedImages: [...newImages],
                error: `이미지 ${i + 1} 생성 실패`,
              },
            }));
          }
        }

        set({ isGenerating: false });

        // Auto-save project if one exists
        const { currentProject, saveProject } = useProjectStore.getState();
        if (currentProject) {
          saveProject();
        }
      },

      downloadCurrent: async (withText) => {
        const { images, currentIndex } = get();
        const currentImage = images[currentIndex];

        if (!currentImage) return;

        try {
          const settings = useSettingsStore.getState();
          const { currentProject } = useProjectStore.getState();
          let basePath = settings.savePath;

          // Use project images directory if available
          if (currentProject) {
            try {
              basePath = await tauriApi.getProjectImagesDir(currentProject.id);
            } catch (e) {
              console.warn("Failed to get project images dir, using default:", e);
            }
          }

          const savePath = `${basePath}/carousel_${String(currentIndex + 1).padStart(2, "0")}.png`;

          if (withText) {
            // Render layered image with canvas
            const contentItems = useContentStore.getState().items;
            const content = contentItems.find((item) => item.id === currentImage.contentId);

            if (!content) {
              throw new Error("콘텐츠를 찾을 수 없습니다");
            }

            // Get layout preset
            const layoutSettings = settings.layoutSettings;
            const currentPreset = layoutSettings.presets.find(
              (p) => p.id === layoutSettings.selectedPresetId
            );

            if (!currentPreset) {
              throw new Error("레이아웃 프리셋을 찾을 수 없습니다");
            }

            // Get image size
            const sizePreset = settings.imageSizePresets.find(
              (p) => p.id === currentPreset.imageSizePresetId
            );
            const width = sizePreset?.width || 1080;
            const height = sizePreset?.height || 1350;

            // Get displayable image URL
            let imageUrl = currentImage.url;
            if (currentImage.localPath) {
              try {
                imageUrl = convertFileSrc(currentImage.localPath);
              } catch {
                console.warn("Failed to convert local path, using URL");
              }
            }

            // Render layered image
            const dataUrl = await renderLayeredImage({
              imageUrl,
              preset: currentPreset,
              content: {
                characterName: content.characterName,
                journalNumber: content.journalNumber,
                title: content.title,
                content: content.content,
              },
              width,
              height,
            });

            // Save data URL directly (download_image handles data URLs)
            await tauriApi.downloadImage(dataUrl, savePath, false);
          } else {
            // Download original image without text
            await tauriApi.downloadImage(currentImage.url, savePath, false);
          }

          alert(`이미지가 저장되었습니다: ${savePath}`);
        } catch (error) {
          console.error("Failed to download image:", error);
          alert(`이미지 다운로드 실패: ${error}`);
        }
      },

      downloadAll: async (withText) => {
        const { images } = get();

        if (images.length === 0) return;

        try {
          const settings = useSettingsStore.getState();
          const { currentProject } = useProjectStore.getState();
          let basePath = settings.savePath;

          // Use project images directory if available
          if (currentProject) {
            try {
              basePath = await tauriApi.getProjectImagesDir(currentProject.id);
            } catch (e) {
              console.warn("Failed to get project images dir, using default:", e);
            }
          }

          if (withText) {
            // Render each image with layers using canvas
            const contentItems = useContentStore.getState().items;
            const layoutSettings = settings.layoutSettings;
            const currentPreset = layoutSettings.presets.find(
              (p) => p.id === layoutSettings.selectedPresetId
            );

            if (!currentPreset) {
              throw new Error("레이아웃 프리셋을 찾을 수 없습니다");
            }

            // Get image size
            const sizePreset = settings.imageSizePresets.find(
              (p) => p.id === currentPreset.imageSizePresetId
            );
            const width = sizePreset?.width || 1080;
            const height = sizePreset?.height || 1350;

            let savedCount = 0;
            for (let i = 0; i < images.length; i++) {
              const image = images[i];
              const content = contentItems.find((item) => item.id === image.contentId);

              if (!content) {
                console.warn(`Content not found for image ${image.id}`);
                continue;
              }

              // Get displayable image URL
              let imageUrl = image.url;
              if (image.localPath) {
                try {
                  imageUrl = convertFileSrc(image.localPath);
                } catch {
                  console.warn("Failed to convert local path, using URL");
                }
              }

              try {
                // Render layered image
                const dataUrl = await renderLayeredImage({
                  imageUrl,
                  preset: currentPreset,
                  content: {
                    characterName: content.characterName,
                    journalNumber: content.journalNumber,
                    title: content.title,
                    content: content.content,
                  },
                  width,
                  height,
                });

                // Save data URL directly (download_image handles data URLs)
                const savePath = `${basePath}/carousel_${String(i + 1).padStart(2, "0")}.png`;
                await tauriApi.downloadImage(dataUrl, savePath, false);
                savedCount++;
              } catch (error) {
                console.error(`Failed to render/save image ${i + 1}:`, error);
              }
            }

            alert(`${savedCount}개의 이미지가 저장되었습니다.`);
          } else {
            // Download original images without text
            const apiImages: tauriApi.GeneratedImage[] = images.map((img) => ({
              id: img.id,
              content_id: img.contentId,
              url: img.url,
              local_path: img.localPath ?? null,
              width: 1024,
              height: 1024,
            }));

            const savedPaths = await tauriApi.downloadAllImages(
              apiImages,
              basePath,
              false
            );

            alert(`${savedPaths.length}개의 이미지가 저장되었습니다.`);
          }
        } catch (error) {
          console.error("Failed to download images:", error);
          alert("이미지 다운로드에 실패했습니다. 설정에서 저장 경로를 확인해주세요.");
        }
      },

      clearImages: () =>
        set({
          images: [],
          currentIndex: 0,
          generationProgress: 0,
          generationStatus: {
            isOpen: false,
            currentIndex: 0,
            total: 0,
            currentContentTitle: "",
            completedImages: [],
          },
        }),

      // New: Generation Modal Actions
      openGenerationModal: () =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            isOpen: true,
          },
        })),

      closeGenerationModal: () =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            isOpen: false,
          },
        })),

      setSelectedLayoutPreset: (id: string) =>
        set({ selectedLayoutPresetId: id }),
    }),
    { name: "image-store" }
  )
);
