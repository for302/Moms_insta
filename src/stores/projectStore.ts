import { create } from "zustand";
import { devtools } from "zustand/middleware";
import * as tauriApi from "@/services/tauriApi";
import { useKeywordStore } from "./keywordStore";
import { useContentStore } from "./contentStore";
import { useImageStore } from "./imageStore";

// Types
export interface ResearchItem {
  id: string;
  prompt: string;
  title: string;
  summary: string;
  fullReport: ResearchReport;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchReport {
  ingredientAnalysis: IngredientAnalysis | null;
  papers: PaperResult[];
  conferences: ConferenceResult[];
  webResults: WebResult[];
  news: NewsResult[];
  sources: SourceReference[];
}

export interface ConferenceResult {
  id: string;
  title: string;
  authors: string[];
  publishedDate: string;
  source: string;
  doi: string | null;
  url: string | null;
}

export interface WebResult {
  title: string;
  link: string;
  snippet: string;
}

export interface NewsResult {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface IngredientAnalysis {
  ingredientName: string;
  koreanName: string;
  ewgScore: number | null;
  benefits: string[];
  cautions: string[];
  recommendedConcentration: string | null;
}

export interface PaperResult {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  publicationDate: string;
  source: string;
  citationCount: number | null;
  doi: string | null;
  url?: string;
}

export interface SourceReference {
  id: string;
  title: string;
  url: string;
  type: "paper" | "journal" | "website";
  citedIn: string;
}

export interface ContentGroup {
  id: string;
  name: string;
  researchItemIds: string[];
  contents: ContentItem[];
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  characterName: string;
  journalNumber: number;
  content: string;
  imageConcept: string;
  status: "pending" | "generating" | "completed" | "error";
  generatedImageId?: string;
}

export interface GeneratedImageRecord {
  id: string;
  contentId: string;
  contentGroupId: string;
  imageUrl: string;
  localPath: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  researchItems: ResearchItem[];
  contentGroups: ContentGroup[];
  generatedImages: GeneratedImageRecord[];
}

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  researchCount: number;
  contentCount: number;
  imageCount: number;
}

interface ProjectState {
  // State
  currentProject: Project | null;
  projectList: ProjectMeta[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  createProject: (name: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  listProjects: () => Promise<void>;
  updateProjectName: (name: string) => void;

  // Research Management
  addResearchItem: (item: ResearchItem) => void;
  updateResearchItem: (id: string, updates: Partial<ResearchItem>) => void;
  deleteResearchItem: (id: string) => void;

  // Content Group Management
  addContentGroup: (group: ContentGroup) => void;
  updateContentGroup: (id: string, updates: Partial<ContentGroup>) => void;
  deleteContentGroup: (id: string) => void;

  // Image Management
  addGeneratedImage: (image: GeneratedImageRecord) => void;
  deleteGeneratedImage: (id: string) => void;

  // Reset
  resetProject: () => void;
  clearError: () => void;
}

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createEmptyProject = (name: string): Project => ({
  id: generateId("proj"),
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  researchItems: [],
  contentGroups: [],
  generatedImages: [],
});

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      // Initial State
      currentProject: null,
      projectList: [],
      isLoading: false,
      isSaving: false,
      error: null,

      // Actions
      createProject: async (name: string) => {
        set({ isLoading: true, error: null });
        try {
          // Reset all other stores first
          useKeywordStore.getState().clearResearch();
          useContentStore.getState().clearItems();
          useImageStore.getState().clearImages();

          // Create project via backend/localStorage
          let project: Project;
          try {
            project = await tauriApi.createProject(name);
          } catch (e) {
            console.warn("Backend create failed, creating local project:", e);
            project = createEmptyProject(name);
          }

          set({
            currentProject: project,
            isLoading: false,
          });

          // Refresh project list
          get().listProjects();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "프로젝트 생성 실패",
            isLoading: false,
          });
        }
      },

      loadProject: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
          // Try to load from backend
          let project: Project;
          try {
            project = await tauriApi.loadProject(projectId);
          } catch (e) {
            console.warn("Backend load failed:", e);
            throw new Error("프로젝트를 불러올 수 없습니다");
          }

          // Reset and populate other stores with project data
          useKeywordStore.getState().clearResearch();
          useContentStore.getState().clearItems();
          useImageStore.getState().clearImages();

          // Load research data into keywordStore
          if (project.researchItems.length > 0) {
            useKeywordStore.getState().setResearchHistory(project.researchItems);
          }

          // Load content groups into contentStore
          if (project.contentGroups.length > 0) {
            useContentStore.getState().setContentGroups(project.contentGroups);
            // Auto-load the first content group to populate items and selectedIds
            const firstGroup = project.contentGroups[0];
            if (firstGroup && firstGroup.contents.length > 0) {
              useContentStore.getState().loadContentGroup(firstGroup.id);
            }
          }

          // Load images into imageStore
          if (project.generatedImages.length > 0) {
            useImageStore.getState().setImages(
              project.generatedImages.map((img) => ({
                id: img.id,
                contentId: img.contentId,
                url: img.imageUrl,
                localPath: img.localPath,
              }))
            );
          }

          set({
            currentProject: project,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "프로젝트 로드 실패",
            isLoading: false,
          });
        }
      },

      saveProject: async () => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({ isSaving: true, error: null });
        try {
          // Gather data from all stores
          const researchItems = useKeywordStore.getState().researchHistory;
          let contentGroups = [...useContentStore.getState().contentGroups];
          const currentItems = useContentStore.getState().items;
          const images = useImageStore.getState().images;

          // If there are current items but no content groups, or if current items differ from saved groups,
          // auto-save them as a content group
          if (currentItems.length > 0) {
            const selectedGroupId = useContentStore.getState().selectedGroupId;
            const existingGroup = contentGroups.find((g) => g.id === selectedGroupId);

            if (!existingGroup) {
              // No existing group, create a new one with current items
              const newGroup: ContentGroup = {
                id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: `콘텐츠 ${new Date().toLocaleDateString("ko-KR")}`,
                researchItemIds: [],
                contents: currentItems.map((item) => ({
                  id: item.id,
                  title: item.title,
                  characterName: item.characterName,
                  journalNumber: item.journalNumber,
                  content: item.content,
                  imageConcept: item.imageConcept,
                  status: item.status,
                  generatedImageId: item.generatedImageUrl,
                })),
                createdAt: new Date().toISOString(),
              };
              contentGroups.push(newGroup);
            } else {
              // Update existing group with current items
              existingGroup.contents = currentItems.map((item) => ({
                id: item.id,
                title: item.title,
                characterName: item.characterName,
                journalNumber: item.journalNumber,
                content: item.content,
                imageConcept: item.imageConcept,
                status: item.status,
                generatedImageId: item.generatedImageUrl,
              }));
            }
          }

          const updatedProject: Project = {
            ...currentProject,
            updatedAt: new Date().toISOString(),
            researchItems,
            contentGroups,
            generatedImages: images.map((img) => ({
              id: img.id,
              contentId: img.contentId,
              contentGroupId: "",
              imageUrl: img.url,
              localPath: img.localPath || "",
              createdAt: new Date().toISOString(),
            })),
          };

          // Try to save to backend
          try {
            await tauriApi.saveProject(updatedProject);
          } catch (e) {
            console.warn("Backend save failed, continuing with local state:", e);
          }

          set({
            currentProject: updatedProject,
            isSaving: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "프로젝트 저장 실패",
            isSaving: false,
          });
        }
      },

      deleteProject: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
          try {
            await tauriApi.deleteProject(projectId);
          } catch (e) {
            console.warn("Backend delete failed:", e);
          }

          const { currentProject } = get();
          if (currentProject?.id === projectId) {
            set({ currentProject: null });
          }

          // Refresh project list
          get().listProjects();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "프로젝트 삭제 실패",
            isLoading: false,
          });
        }
      },

      listProjects: async () => {
        try {
          const projects = await tauriApi.listProjects();
          set({ projectList: projects });
        } catch (e) {
          console.warn("Failed to list projects:", e);
          set({ projectList: [] });
        }
      },

      updateProjectName: (name: string) => {
        set((state) => {
          if (!state.currentProject) return state;
          const updatedProject = {
            ...state.currentProject,
            name,
            updatedAt: new Date().toISOString(),
          };
          // Auto-save after name change
          setTimeout(() => get().saveProject(), 100);
          return { currentProject: updatedProject };
        });
      },

      // Research Management
      addResearchItem: (item: ResearchItem) => {
        set((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              researchItems: [...state.currentProject.researchItems, item],
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      updateResearchItem: (id: string, updates: Partial<ResearchItem>) => {
        set((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              researchItems: state.currentProject.researchItems.map((item) =>
                item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
              ),
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      deleteResearchItem: (id: string) => {
        set((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              researchItems: state.currentProject.researchItems.filter((item) => item.id !== id),
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      // Content Group Management
      addContentGroup: (group: ContentGroup) => {
        set((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              contentGroups: [...state.currentProject.contentGroups, group],
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      updateContentGroup: (id: string, updates: Partial<ContentGroup>) => {
        set((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              contentGroups: state.currentProject.contentGroups.map((group) =>
                group.id === id ? { ...group, ...updates } : group
              ),
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      deleteContentGroup: (id: string) => {
        set((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              contentGroups: state.currentProject.contentGroups.filter((group) => group.id !== id),
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      // Image Management
      addGeneratedImage: (image: GeneratedImageRecord) => {
        set((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              generatedImages: [...state.currentProject.generatedImages, image],
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      deleteGeneratedImage: (id: string) => {
        set((state) => {
          if (!state.currentProject) return state;
          return {
            currentProject: {
              ...state.currentProject,
              generatedImages: state.currentProject.generatedImages.filter((img) => img.id !== id),
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      // Reset
      resetProject: () => {
        useKeywordStore.getState().clearResearch();
        useContentStore.getState().clearItems();
        useImageStore.getState().clearImages();
        set({ currentProject: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    { name: "project-store" }
  )
);
