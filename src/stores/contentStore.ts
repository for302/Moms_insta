import { create } from "zustand";
import { devtools } from "zustand/middleware";
import * as tauriApi from "@/services/tauriApi";
import { useSettingsStore } from "./settingsStore";
import { useProjectStore } from "./projectStore";
import { useApiPreviewStore } from "./apiPreviewStore";
import { useKeywordStore } from "./keywordStore";
import type { ContentGroup, ContentItem as ProjectContentItem } from "./projectStore";

export type ContentStatus = "pending" | "generating" | "completed" | "error";

export interface ContentItem {
  id: string;
  title: string;
  characterName: string;
  journalNumber: number;
  content: string;
  imageConcept: string;
  status: ContentStatus;
  generatedImageUrl?: string;
}

export interface ContentGenerationProgress {
  isOpen: boolean;
  currentStep: string;
  steps: { name: string; status: "pending" | "loading" | "done" | "error"; message?: string }[];
  error?: string;
}

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface ContentState {
  // State
  items: ContentItem[];
  selectedIds: Set<string>;
  isGenerating: boolean;
  characterName: string;
  researchData: string;
  generationProgress: ContentGenerationProgress;

  // New: Content Groups
  contentGroups: ContentGroup[];
  selectedGroupId: string | null;

  // Actions
  setItems: (items: ContentItem[]) => void;
  addItem: (item: ContentItem) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  generateContent: (keyword: string, promptId: string) => Promise<void>;
  regenerateItem: (id: string) => Promise<void>;
  updateItemStatus: (id: string, status: ContentStatus) => void;
  setCharacterName: (name: string) => void;
  setResearchData: (data: string) => void;
  clearItems: () => void;
  closeProgressModal: () => void;

  // New: Content Group Actions
  setContentGroups: (groups: ContentGroup[]) => void;
  saveContentGroup: (name: string, researchItemIds: string[]) => ContentGroup;
  loadContentGroup: (groupId: string) => void;
  deleteContentGroup: (groupId: string) => void;
  setSelectedGroupId: (id: string | null) => void;
}

// Helper function to create character name from keyword
function createCharacterName(keyword: string): string {
  const cleaned = keyword.replace(/[^가-힣a-zA-Z]/g, "");
  if (/[가-힣]/.test(cleaned)) {
    return cleaned.slice(0, 2);
  }
  return cleaned.slice(0, 4);
}

export const useContentStore = create<ContentState>()(
  devtools(
    (set, get) => ({
      // Initial State
      items: [],
      selectedIds: new Set<string>(),
      isGenerating: false,
      characterName: "",
      researchData: "",
      generationProgress: {
        isOpen: false,
        currentStep: "",
        steps: [],
      },

      // New: Content Groups State
      contentGroups: [],
      selectedGroupId: null,

      // Actions
      setItems: (items) => set({ items }),

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, item],
        })),

      toggleSelection: (id) => {
        const { selectedIds } = get();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        set({ selectedIds: newSelected });
      },

      selectAll: () => {
        const allIds = new Set(get().items.map((item) => item.id));
        set({ selectedIds: allIds });
      },

      deselectAll: () => set({ selectedIds: new Set() }),

      generateContent: async (keyword, promptId) => {
        // Initialize progress modal
        const initialSteps = [
          { name: "설정 확인", status: "pending" as const },
          { name: "캐릭터 생성", status: "pending" as const },
          { name: "콘텐츠 기획 중", status: "pending" as const },
          { name: "결과 정리", status: "pending" as const },
        ];

        set({
          isGenerating: true,
          generationProgress: {
            isOpen: true,
            currentStep: "설정 확인",
            steps: initialSteps,
          },
        });

        const updateStep = (stepName: string, status: "loading" | "done" | "error", message?: string) => {
          const { generationProgress } = get();
          const newSteps = generationProgress.steps.map((step) =>
            step.name === stepName ? { ...step, status, message } : step
          );
          set({
            generationProgress: {
              ...generationProgress,
              currentStep: stepName,
              steps: newSteps,
            },
          });
        };

        try {
          // Step 1: 설정 확인
          updateStep("설정 확인", "loading");
          const settings = useSettingsStore.getState();
          const provider = settings.apiSelection.contentApi;
          const apiKey = settings.apiKeys[provider as keyof typeof settings.apiKeys];
          const researchData = get().researchData;

          if (!apiKey) {
            updateStep("설정 확인", "error", `${provider} API 키가 설정되지 않았습니다`);
            set({ isGenerating: false });
            return;
          }
          updateStep("설정 확인", "done", `${provider} API 사용`);

          // Step 2: 캐릭터 생성
          updateStep("캐릭터 생성", "loading");
          const characterName = createCharacterName(keyword);
          set({ characterName });
          updateStep("캐릭터 생성", "done", `캐릭터: ${characterName}`);

          // Step 3: 콘텐츠 기획 중
          updateStep("콘텐츠 기획 중", "loading", "LLM이 10개의 콘텐츠를 기획하고 있습니다...");

          // Get the selected prompt template
          const promptTemplate = settings.contentPrompts.find((p) => p.id === promptId);
          const promptName = promptTemplate?.name || promptId;

          // Build the prompt for API preview
          const contentPromptText = `키워드: ${keyword}
프롬프트 템플릿: ${promptName}

${promptTemplate?.prompt || "콘텐츠 기획 프롬프트"}

캐릭터명: ${characterName}
생성 개수: 10개

${researchData ? `\n자료조사 데이터:\n${researchData}` : ""}

위 정보를 바탕으로 10개의 인스타그램 콘텐츠를 기획해주세요.
각 콘텐츠는 title, content, imageConcept를 포함해야 합니다.`;

          console.log("Content generation request:", {
            keyword,
            promptId,
            count: 10,
            provider,
            hasApiKey: !!apiKey,
            hasResearchData: !!researchData,
          });

          // Show API preview modal
          const { showPreview } = useApiPreviewStore.getState();
          const { confirmed } = await showPreview({
            type: "content",
            title: "콘텐츠 기획 API 호출",
            provider,
            endpoint: "generateContentPlan",
            prompt: contentPromptText,
            additionalParams: {
              keyword,
              promptId,
              promptName,
              count: 10,
              hasResearchData: !!researchData,
            },
          });

          if (!confirmed) {
            updateStep("콘텐츠 기획 중", "error", "사용자 취소");
            set({ isGenerating: false });
            return;
          }

          // Call Tauri backend (use snake_case for Rust)
          const planItems = await tauriApi.generateContentPlan({
            keyword,
            prompt_id: promptId,
            count: 10,
            api_key: apiKey,
            llm_provider: provider,
            research_data: researchData || undefined,
          });

          console.log("Content generation response:", planItems);
          updateStep("콘텐츠 기획 중", "done", `${planItems.length}개 콘텐츠 생성 완료`);

          // Step 4: 결과 정리
          updateStep("결과 정리", "loading");

          // Convert backend format (snake_case) to frontend format (camelCase)
          const items: ContentItem[] = planItems.map((item) => ({
            id: item.id,
            title: item.title,
            characterName: item.character_name,
            journalNumber: item.journal_number,
            content: item.content,
            imageConcept: item.image_concept,
            status: item.status as ContentStatus,
          }));

          updateStep("결과 정리", "done", "완료!");

          set({
            items,
            isGenerating: false,
            selectedIds: new Set(items.map((item) => item.id)),
          });

          // Auto-save content group and project
          const { currentProject, saveProject } = useProjectStore.getState();
          if (currentProject) {
            // Auto-create content group with keyword as name
            const groupName = `${keyword} - ${new Date().toLocaleDateString("ko-KR")}`;
            const { selectedResearchIds } = useKeywordStore.getState();
            get().saveContentGroup(groupName, Array.from(selectedResearchIds));

            // Save project with the new content group
            saveProject();
          }
        } catch (error) {
          console.error("Failed to generate content:", error);

          const errorMessage = error instanceof Error ? error.message : String(error);
          const { generationProgress } = get();
          set({
            generationProgress: {
              ...generationProgress,
              error: `콘텐츠 생성 실패: ${errorMessage}`,
            },
            isGenerating: false,
          });
        }
      },

      regenerateItem: async (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status: "generating" as ContentStatus } : item
          ),
        }));

        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, status: "completed" as ContentStatus } : item
            ),
          }));
        } catch (error) {
          console.error("Failed to regenerate item:", error);
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, status: "error" as ContentStatus } : item
            ),
          }));
        }
      },

      updateItemStatus: (id, status) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status } : item
          ),
        })),

      setCharacterName: (name) => set({ characterName: name }),

      setResearchData: (data) => set({ researchData: data }),

      clearItems: () =>
        set({
          items: [],
          selectedIds: new Set(),
          characterName: "",
          researchData: "",
          contentGroups: [],
          selectedGroupId: null,
        }),

      closeProgressModal: () =>
        set({
          generationProgress: {
            isOpen: false,
            currentStep: "",
            steps: [],
          },
        }),

      // New: Content Group Actions
      setContentGroups: (groups: ContentGroup[]) => {
        set({ contentGroups: groups });
      },

      saveContentGroup: (name: string, researchItemIds: string[]) => {
        const { items } = get();
        const now = new Date().toISOString();

        // Convert current items to ContentGroup format
        const contentItems: ProjectContentItem[] = items.map((item) => ({
          id: item.id,
          title: item.title,
          characterName: item.characterName,
          journalNumber: item.journalNumber,
          content: item.content,
          imageConcept: item.imageConcept,
          status: item.status,
          generatedImageId: item.generatedImageUrl,
        }));

        const newGroup: ContentGroup = {
          id: generateId("group"),
          name,
          researchItemIds,
          contents: contentItems,
          createdAt: now,
        };

        set((state) => ({
          contentGroups: [...state.contentGroups, newGroup],
          selectedGroupId: newGroup.id,
        }));

        // Auto-save project if one exists
        const { currentProject, saveProject } = useProjectStore.getState();
        if (currentProject) {
          saveProject();
        }

        return newGroup;
      },

      loadContentGroup: (groupId: string) => {
        const { contentGroups } = get();
        const group = contentGroups.find((g) => g.id === groupId);

        if (group) {
          // Convert ContentGroup items to ContentItem format
          const items: ContentItem[] = group.contents.map((item) => ({
            id: item.id,
            title: item.title,
            characterName: item.characterName,
            journalNumber: item.journalNumber,
            content: item.content,
            imageConcept: item.imageConcept,
            status: item.status as ContentStatus,
            generatedImageUrl: item.generatedImageId,
          }));

          set({
            items,
            selectedIds: new Set(items.map((i) => i.id)),
            selectedGroupId: groupId,
          });
        }
      },

      deleteContentGroup: (groupId: string) => {
        set((state) => ({
          contentGroups: state.contentGroups.filter((g) => g.id !== groupId),
          selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
        }));
      },

      setSelectedGroupId: (id: string | null) => {
        set({ selectedGroupId: id });
      },
    }),
    { name: "content-store" }
  )
);
