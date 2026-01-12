import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import * as tauriApi from "@/services/tauriApi";

export interface ApiKeys {
  google: string;
  openai: string;
  anthropic: string;
}

export interface ApiSelection {
  contentApi: "openai" | "anthropic" | "google";
  imageApi: "openai" | "google";
}

export type GoogleImageModel =
  | "imagen-4.0-generate-001"
  | "imagen-4.0-ultra-generate-001"
  | "imagen-4.0-fast-generate-001"
  | "imagen-3.0-generate-002"
  | "gemini-2.0-flash-exp";

export interface GoogleImageModelOption {
  id: GoogleImageModel;
  name: string;
  description: string;
}

export const googleImageModelOptions: GoogleImageModelOption[] = [
  // Imagen 4 시리즈 (공식 API)
  {
    id: "imagen-4.0-generate-001",
    name: "Imagen 4 Standard",
    description: "고품질 이미지 생성, 1K/2K 지원",
  },
  {
    id: "imagen-4.0-ultra-generate-001",
    name: "Imagen 4 Ultra",
    description: "최고 품질, 4K급 디테일",
  },
  {
    id: "imagen-4.0-fast-generate-001",
    name: "Imagen 4 Fast",
    description: "빠른 생성, 프로토타이핑용",
  },
  // Imagen 3
  {
    id: "imagen-3.0-generate-002",
    name: "Imagen 3",
    description: "안정적인 기본 모델",
  },
  // 레거시 Gemini 모델 (호환성 유지)
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash (레거시)",
    description: "기존 Gemini 이미지 생성 모델",
  },
];

// Aspect Ratio 옵션
export interface AspectRatioOption {
  id: string;
  name: string;
  width: number;
  height: number;
}

export const aspectRatioOptions: AspectRatioOption[] = [
  { id: "1:1", name: "1:1 (정사각형)", width: 1024, height: 1024 },
  { id: "4:3", name: "4:3 (가로형)", width: 1024, height: 768 },
  { id: "3:4", name: "3:4 (세로형)", width: 768, height: 1024 },
  { id: "16:9", name: "16:9 (와이드)", width: 1024, height: 576 },
  { id: "9:16", name: "9:16 (스토리)", width: 576, height: 1024 },
];

// width/height를 aspectRatio로 변환하는 헬퍼 함수
export function convertSizeToAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 4 / 3) < 0.1) return "4:3";
  if (Math.abs(ratio - 3 / 4) < 0.1) return "3:4";
  if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
  return ratio > 1 ? "4:3" : "3:4"; // 기본 폴백
}

export interface ImagePrompt {
  id: string;
  name: string;
  prompt: string;
  negativePrompt?: string;       // 네거티브 프롬프트
  aspectRatio?: string;          // "1:1", "4:3", "3:4", "16:9", "9:16"
  styleImagePath?: string;
  previewImagePath?: string;
  imageModel?: GoogleImageModel;
  imageSizePresetId?: string;    // 레거시 호환성 (마이그레이션용)
  isDefault: boolean;
}

export interface ContentPrompt {
  id: string;
  name: string;
  prompt: string;
  isDefault: boolean;
}

export interface ImageSizePreset {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  // Text highlight (background) options
  highlightEnabled?: boolean;
  highlightColor?: string;
  highlightOpacity?: number;
  highlightMargin?: number; // margin between text and highlight border
}

export interface BackgroundStyle {
  backgroundColor: string;
  backgroundOpacity: number;
}

export interface ShapeStyle {
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderOpacity: number;
  borderRadius: number;
  blurEnabled?: boolean;
  blurAmount?: number; // 0-20 px
}

export interface LayoutElement {
  id: string;
  name: string;
  enabled: boolean;
  type: "text" | "image" | "background" | "shape";
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // Text style properties (for text elements)
  textStyle?: TextStyle;
  // Background style properties (for background element)
  backgroundStyle?: BackgroundStyle;
  // Shape style properties (for shape elements)
  shapeStyle?: ShapeStyle;
  // Default sample text
  sampleText?: string;
}

export interface LayoutPreset {
  id: string;
  name: string;
  imageSizePresetId: string;
  elements: LayoutElement[];
  isDefault: boolean;
}

export interface LayoutSettings {
  selectedPresetId: string;
  presets: LayoutPreset[];
}

interface SettingsState {
  // State
  apiKeys: ApiKeys;
  apiSelection: ApiSelection;
  googleImageModel: GoogleImageModel;
  imagePrompts: ImagePrompt[];
  contentPrompts: ContentPrompt[];
  savePath: string;
  selectedImagePromptId: string | null;
  selectedContentPromptId: string | null;
  isLoaded: boolean;
  imageSizePresets: ImageSizePreset[];
  layoutSettings: LayoutSettings;
  // Font settings
  favoriteFonts: string[];
  showOnlyFavoriteFonts: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  saveApiKeys: (keys: ApiKeys) => Promise<void>;
  setApiSelection: (selection: ApiSelection) => void;
  setGoogleImageModel: (model: GoogleImageModel) => void;
  addImagePrompt: (prompt: Omit<ImagePrompt, "id">) => void;
  updateImagePrompt: (id: string, prompt: Partial<ImagePrompt>) => void;
  deleteImagePrompt: (id: string) => void;
  addContentPrompt: (prompt: Omit<ContentPrompt, "id">) => void;
  updateContentPrompt: (id: string, prompt: Partial<ContentPrompt>) => void;
  deleteContentPrompt: (id: string) => void;
  setSavePath: (path: string) => Promise<void>;
  setSelectedImagePrompt: (id: string | null) => void;
  setSelectedContentPrompt: (id: string | null) => void;
  setLayoutSettings: (layout: LayoutSettings) => Promise<void>;
  updateLayoutElement: (elementId: string, updates: Partial<LayoutElement>) => void;
  addLayoutPreset: (preset: Omit<LayoutPreset, "id">) => void;
  updateLayoutPreset: (id: string, preset: Partial<LayoutPreset>) => void;
  deleteLayoutPreset: (id: string) => void;
  setSelectedLayoutPreset: (id: string) => void;
  // Font actions
  toggleFavoriteFont: (fontName: string) => void;
  setShowOnlyFavoriteFonts: (show: boolean) => void;
}

const defaultImagePrompts: ImagePrompt[] = [
  {
    id: "default-1",
    name: "귀여운 캐릭터",
    prompt:
      "귀여운 한국 스타일 캐릭터가 화장품 성분을 연구하는 모습, 밝고 따뜻한 색감, 인스타그램 카드 스타일, 미니멀한 배경",
    isDefault: true,
  },
  {
    id: "default-2",
    name: "과학 일러스트",
    prompt:
      "과학적이고 신뢰감 있는 일러스트 스타일, 분자 구조와 함께 성분을 설명하는 이미지, 파스텔 톤 배경",
    isDefault: true,
  },
];

const defaultContentPrompts: ContentPrompt[] = [
  {
    id: "default-content-1",
    name: "전문가 톤",
    prompt: `당신은 미용예술학 박사이자 17년 경력의 뷰티 전문가입니다.
주어진 화장품 성분에 대해 육아맘과 예비맘이 이해하기 쉽게 설명해주세요.
논문을 기반으로 한 정확한 정보를 친근하고 신뢰감 있는 톤으로 전달합니다.`,
    isDefault: true,
  },
];

const defaultImageSizePresets: ImageSizePreset[] = [
  { id: "instagram", name: "인스타그램 게시물", width: 1080, height: 1350 },
  { id: "youtube", name: "유튜브 썸네일", width: 1280, height: 720 },
  { id: "facebook", name: "페이스북 게시물", width: 940, height: 788 },
  { id: "story", name: "스토리", width: 1080, height: 1920 },
  { id: "square", name: "정사각형", width: 1080, height: 1080 },
];

const defaultLayoutElements: LayoutElement[] = [
  {
    id: "title",
    name: "제목",
    enabled: true,
    type: "text",
    color: "#EF4444",
    x: 10,
    y: 70,
    width: 80,
    height: 8,
    textStyle: {
      fontFamily: "Pretendard",
      fontSize: 51,
      fontColor: "#374151",
      highlightEnabled: false,
      highlightColor: "#FFFF00",
      highlightOpacity: 0.5,
      highlightMargin: 4,
    },
    sampleText: "판테의 연구일지 #01",
  },
  {
    id: "subtitle",
    name: "부제",
    enabled: true,
    type: "text",
    color: "#EC4899",
    x: 10,
    y: 75,
    width: 80,
    height: 5,
    textStyle: {
      fontFamily: "Pretendard",
      fontSize: 33,
      fontColor: "#374151",
      highlightEnabled: false,
      highlightColor: "#FFFF00",
      highlightOpacity: 0.5,
      highlightMargin: 4,
    },
    sampleText: "우리 아이 피부 지킴이, 판테놀 탐구",
  },
  {
    id: "short_knowledge",
    name: "짧은지식",
    enabled: true,
    type: "text",
    color: "#3B82F6",
    x: 10,
    y: 80,
    width: 80,
    height: 15,
    textStyle: {
      fontFamily: "Pretendard",
      fontSize: 30,
      fontColor: "#374151",
      highlightEnabled: false,
      highlightColor: "#FFFF00",
      highlightOpacity: 0.5,
      highlightMargin: 4,
    },
    sampleText: "EWG 1등급! 판테놀, 왜 엄마들이 푹 빠졌을까요? 피부 속 수분 충전 & 장벽 강화 비밀!",
  },
  {
    id: "hero_image",
    name: "히어로 이미지",
    enabled: true,
    type: "image",
    color: "#F59E0B",
    x: 5,
    y: 5,
    width: 90,
    height: 55,
  },
  {
    id: "background",
    name: "배경",
    enabled: true,
    type: "background",
    color: "#9CA3AF",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    backgroundStyle: {
      backgroundColor: "#FEF3C7",
      backgroundOpacity: 0.89,
    },
  },
  {
    id: "shape1",
    name: "도형1",
    enabled: true,
    type: "shape",
    color: "#8B5CF6",
    x: 5,
    y: 65,
    width: 90,
    height: 30,
    shapeStyle: {
      backgroundColor: "#FFFFFF",
      backgroundOpacity: 0.92,
      borderColor: "#E5E7EB",
      borderOpacity: 1,
      borderRadius: 25,
      blurEnabled: false,
      blurAmount: 8,
    },
  },
];

const defaultLayoutPresets: LayoutPreset[] = [
  {
    id: "default-instagram",
    name: "인스타그램 기본",
    imageSizePresetId: "instagram",
    elements: defaultLayoutElements,
    isDefault: true,
  },
  {
    id: "default-story",
    name: "스토리 기본",
    imageSizePresetId: "story",
    elements: [
      { id: "title", name: "제목", enabled: true, type: "text", color: "#EF4444", x: 10, y: 75, width: 80, height: 5, textStyle: { fontFamily: "Pretendard", fontSize: 42, fontColor: "#374151", highlightEnabled: false, highlightColor: "#FFFF00", highlightOpacity: 0.5, highlightMargin: 4 }, sampleText: "판테의 연구일지 #01" },
      { id: "subtitle", name: "부제", enabled: true, type: "text", color: "#EC4899", x: 10, y: 80, width: 80, height: 4, textStyle: { fontFamily: "Pretendard", fontSize: 28, fontColor: "#374151", highlightEnabled: false, highlightColor: "#FFFF00", highlightOpacity: 0.5, highlightMargin: 4 }, sampleText: "우리 아이 피부 지킴이, 판테놀 탐구" },
      { id: "short_knowledge", name: "짧은지식", enabled: true, type: "text", color: "#3B82F6", x: 10, y: 85, width: 80, height: 10, textStyle: { fontFamily: "Pretendard", fontSize: 24, fontColor: "#374151", highlightEnabled: false, highlightColor: "#FFFF00", highlightOpacity: 0.5, highlightMargin: 4 }, sampleText: "EWG 1등급! 판테놀, 왜 엄마들이 푹 빠졌을까요? 피부 속 수분 충전 & 장벽 강화 비밀!" },
      { id: "hero_image", name: "히어로 이미지", enabled: true, type: "image", color: "#F59E0B", x: 5, y: 5, width: 90, height: 65 },
      { id: "background", name: "배경", enabled: true, type: "background", color: "#9CA3AF", x: 0, y: 0, width: 100, height: 100, backgroundStyle: { backgroundColor: "#FEF3C7", backgroundOpacity: 0.89 } },
      { id: "shape1", name: "도형1", enabled: true, type: "shape", color: "#8B5CF6", x: 5, y: 72, width: 90, height: 25, shapeStyle: { backgroundColor: "#FFFFFF", backgroundOpacity: 0.92, borderColor: "#E5E7EB", borderOpacity: 1, borderRadius: 25, blurEnabled: false, blurAmount: 8 } },
    ],
    isDefault: true,
  },
];

const defaultLayoutSettings: LayoutSettings = {
  selectedPresetId: "default-instagram",
  presets: defaultLayoutPresets,
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        apiKeys: {
          google: "",
          openai: "",
          anthropic: "",
        },
        apiSelection: {
          contentApi: "anthropic",
          imageApi: "google",
        },
        googleImageModel: "imagen-4.0-generate-001" as GoogleImageModel,
        imagePrompts: defaultImagePrompts,
        contentPrompts: defaultContentPrompts,
        savePath: "",
        selectedImagePromptId: "default-1",
        selectedContentPromptId: "default-content-1",
        isLoaded: false,
        imageSizePresets: defaultImageSizePresets,
        layoutSettings: defaultLayoutSettings,
        // Font settings
        favoriteFonts: [],
        showOnlyFavoriteFonts: false,

        // Actions
        loadSettings: async () => {
          try {
            const settings = await tauriApi.getSettings();
            set({
              apiKeys: {
                google: settings.apiKeys.google || "",
                openai: settings.apiKeys.openai || "",
                anthropic: settings.apiKeys.anthropic || "",
              },
              apiSelection: {
                contentApi: settings.apiSelection.contentGeneration as "openai" | "anthropic" | "google",
                imageApi: settings.apiSelection.imageGeneration as "openai" | "google",
              },
              savePath: settings.savePath || "",
              isLoaded: true,
            });
          } catch (error) {
            console.error("Failed to load settings:", error);
            set({ isLoaded: true });
          }
        },

        saveApiKeys: async (keys) => {
          try {
            await tauriApi.saveApiKeys({
              google: keys.google || undefined,
              openai: keys.openai || undefined,
              anthropic: keys.anthropic || undefined,
            });
            set({ apiKeys: keys });
          } catch (error) {
            console.error("Failed to save API keys:", error);
            // Still update local state
            set({ apiKeys: keys });
          }
        },

        setApiSelection: (selection) => set({ apiSelection: selection }),

        setGoogleImageModel: (model) => set({ googleImageModel: model }),

        addImagePrompt: (prompt) => {
          const newPrompt: ImagePrompt = {
            ...prompt,
            id: `image-prompt-${Date.now()}`,
          };
          set((state) => ({
            imagePrompts: [...state.imagePrompts, newPrompt],
          }));
        },

        updateImagePrompt: (id, prompt) => {
          set((state) => ({
            imagePrompts: state.imagePrompts.map((p) =>
              p.id === id ? { ...p, ...prompt } : p
            ),
          }));
        },

        deleteImagePrompt: (id) => {
          const { imagePrompts, selectedImagePromptId } = get();
          const prompt = imagePrompts.find((p) => p.id === id);

          // Cannot delete default prompts
          if (prompt?.isDefault) return;

          set((state) => ({
            imagePrompts: state.imagePrompts.filter((p) => p.id !== id),
            selectedImagePromptId:
              selectedImagePromptId === id ? null : selectedImagePromptId,
          }));
        },

        addContentPrompt: (prompt) => {
          const newPrompt: ContentPrompt = {
            ...prompt,
            id: `content-prompt-${Date.now()}`,
          };
          set((state) => ({
            contentPrompts: [...state.contentPrompts, newPrompt],
          }));
        },

        updateContentPrompt: (id, prompt) => {
          set((state) => ({
            contentPrompts: state.contentPrompts.map((p) =>
              p.id === id ? { ...p, ...prompt } : p
            ),
          }));
        },

        deleteContentPrompt: (id) => {
          const { contentPrompts, selectedContentPromptId } = get();
          const prompt = contentPrompts.find((p) => p.id === id);

          // Cannot delete default prompts
          if (prompt?.isDefault) return;

          set((state) => ({
            contentPrompts: state.contentPrompts.filter((p) => p.id !== id),
            selectedContentPromptId:
              selectedContentPromptId === id ? null : selectedContentPromptId,
          }));
        },

        setSavePath: async (path) => {
          try {
            await tauriApi.setSavePath(path);
            set({ savePath: path });
          } catch (error) {
            console.error("Failed to save path:", error);
            set({ savePath: path });
          }
        },

        setSelectedImagePrompt: (id) => set({ selectedImagePromptId: id }),

        setSelectedContentPrompt: (id) => set({ selectedContentPromptId: id }),

        setLayoutSettings: async (layout) => {
          try {
            // Get current preset elements for API (use snake_case for Rust)
            const currentPreset = layout.presets?.find(p => p.id === layout.selectedPresetId);
            if (currentPreset) {
              const layoutForApi: tauriApi.LayoutSettings = {
                selected_preset_id: currentPreset.imageSizePresetId,
                elements: currentPreset.elements.map((el) => ({
                  id: el.id,
                  name: el.name,
                  enabled: el.enabled,
                  element_type: el.type,
                  color: el.color,
                  x: el.x,
                  y: el.y,
                  width: el.width,
                  height: el.height,
                })),
              };
              await tauriApi.saveLayoutSettings(layoutForApi);
            }
            set({ layoutSettings: layout });
          } catch (error) {
            console.error("Failed to save layout settings:", error);
            set({ layoutSettings: layout });
          }
        },

        updateLayoutElement: (elementId, updates) => {
          set((state) => {
            const { layoutSettings } = state;
            const currentPresetIndex = layoutSettings.presets.findIndex(
              (p) => p.id === layoutSettings.selectedPresetId
            );
            if (currentPresetIndex === -1) return state;

            const updatedPresets = [...layoutSettings.presets];
            updatedPresets[currentPresetIndex] = {
              ...updatedPresets[currentPresetIndex],
              elements: updatedPresets[currentPresetIndex].elements.map((el) =>
                el.id === elementId ? { ...el, ...updates } : el
              ),
            };

            return {
              layoutSettings: {
                ...layoutSettings,
                presets: updatedPresets,
              },
            };
          });
        },

        addLayoutPreset: (preset) => {
          const newPreset: LayoutPreset = {
            ...preset,
            id: `layout-preset-${Date.now()}`,
          };
          set((state) => ({
            layoutSettings: {
              ...state.layoutSettings,
              presets: [...state.layoutSettings.presets, newPreset],
              selectedPresetId: newPreset.id,
            },
          }));
        },

        updateLayoutPreset: (id, preset) => {
          set((state) => ({
            layoutSettings: {
              ...state.layoutSettings,
              presets: state.layoutSettings.presets.map((p) =>
                p.id === id ? { ...p, ...preset } : p
              ),
            },
          }));
        },

        deleteLayoutPreset: (id) => {
          const { layoutSettings } = get();
          const preset = layoutSettings.presets.find((p) => p.id === id);

          // Cannot delete default presets
          if (preset?.isDefault) return;

          set((state) => ({
            layoutSettings: {
              ...state.layoutSettings,
              presets: state.layoutSettings.presets.filter((p) => p.id !== id),
              selectedPresetId:
                state.layoutSettings.selectedPresetId === id
                  ? state.layoutSettings.presets[0]?.id || ""
                  : state.layoutSettings.selectedPresetId,
            },
          }));
        },

        setSelectedLayoutPreset: (id) => {
          set((state) => ({
            layoutSettings: {
              ...state.layoutSettings,
              selectedPresetId: id,
            },
          }));
        },

        // Font actions
        toggleFavoriteFont: (fontName) => {
          set((state) => {
            const isAlreadyFavorite = state.favoriteFonts.includes(fontName);
            return {
              favoriteFonts: isAlreadyFavorite
                ? state.favoriteFonts.filter((f) => f !== fontName)
                : [...state.favoriteFonts, fontName],
            };
          });
        },

        setShowOnlyFavoriteFonts: (show) => {
          set({ showOnlyFavoriteFonts: show });
        },
      }),
      {
        name: "cosmetic-carousel-settings-v4",
        version: 1, // Fresh start - v4: updated default layout positions
        partialize: (state) => ({
          apiKeys: state.apiKeys,
          apiSelection: state.apiSelection,
          googleImageModel: state.googleImageModel,
          imagePrompts: state.imagePrompts,
          contentPrompts: state.contentPrompts,
          savePath: state.savePath,
          selectedImagePromptId: state.selectedImagePromptId,
          selectedContentPromptId: state.selectedContentPromptId,
          imageSizePresets: state.imageSizePresets,
          layoutSettings: state.layoutSettings,
          favoriteFonts: state.favoriteFonts,
          showOnlyFavoriteFonts: state.showOnlyFavoriteFonts,
        }),
        // Migrate function to handle old data structure
        migrate: (persistedState, version) => {
          const state = persistedState as Partial<SettingsState>;

          // Migrate from version 1 (or no version) to version 2
          if (version < 2) {
            // Reset layoutSettings to new preset-based structure
            state.layoutSettings = defaultLayoutSettings;
          }

          // Migrate from version 2 to version 3 (Imagen API update)
          if (version < 3) {
            // Migrate old model names to new Imagen models
            const modelMigrationMap: Record<string, GoogleImageModel> = {
              "gemini-3-pro-image-preview": "imagen-4.0-generate-001",
              "gemini-2.5-flash-preview-05-20": "imagen-4.0-fast-generate-001",
              "imagen-3.0-fast-generate-001": "imagen-3.0-generate-002",
            };

            // Migrate global model setting
            if (state.googleImageModel && modelMigrationMap[state.googleImageModel]) {
              state.googleImageModel = modelMigrationMap[state.googleImageModel];
            } else if (state.googleImageModel && !["imagen-4.0-generate-001", "imagen-4.0-ultra-generate-001", "imagen-4.0-fast-generate-001", "imagen-3.0-generate-002", "gemini-2.0-flash-exp"].includes(state.googleImageModel)) {
              state.googleImageModel = "imagen-4.0-generate-001";
            }

            // Migrate imagePrompts: imageSizePresetId -> aspectRatio
            if (state.imagePrompts) {
              const sizePresetToAspectRatio: Record<string, string> = {
                "instagram": "3:4",
                "youtube": "16:9",
                "facebook": "4:3",
                "story": "9:16",
                "square": "1:1",
              };

              state.imagePrompts = state.imagePrompts.map((prompt) => {
                const newPrompt = { ...prompt };

                // Migrate model
                if (newPrompt.imageModel && modelMigrationMap[newPrompt.imageModel]) {
                  newPrompt.imageModel = modelMigrationMap[newPrompt.imageModel];
                } else if (newPrompt.imageModel && !["imagen-4.0-generate-001", "imagen-4.0-ultra-generate-001", "imagen-4.0-fast-generate-001", "imagen-3.0-generate-002", "gemini-2.0-flash-exp"].includes(newPrompt.imageModel)) {
                  newPrompt.imageModel = "imagen-4.0-generate-001";
                }

                // Migrate size preset to aspect ratio
                if (newPrompt.imageSizePresetId && !newPrompt.aspectRatio) {
                  newPrompt.aspectRatio = sizePresetToAspectRatio[newPrompt.imageSizePresetId] || "3:4";
                }

                return newPrompt;
              });
            }
          }

          // Since we're using a new storage name (cosmetic-carousel-settings-v3),
          // any old data will be reset to defaults automatically.
          // Just ensure layoutSettings exists
          if (!state.layoutSettings || !state.layoutSettings.presets) {
            state.layoutSettings = defaultLayoutSettings;
          }

          return state as SettingsState;
        },
      }
    ),
    { name: "settings-store" }
  )
);
