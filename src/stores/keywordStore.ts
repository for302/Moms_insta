import { create } from "zustand";
import { devtools } from "zustand/middleware";
import * as tauriApi from "@/services/tauriApi";
import { useSettingsStore } from "./settingsStore";
import { useContentStore } from "./contentStore";
import { useProjectStore } from "./projectStore";
import { useApiPreviewStore } from "./apiPreviewStore";
import type { ResearchItem, SourceReference } from "./projectStore";

export interface KeywordSuggestion {
  id: string;
  keyword: string;
  trend: "rising" | "stable" | "hot";
  source: string;
}

export interface PaperResult {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  publicationDate: string;
  source: string;
  citationCount?: number;
  doi?: string;
  url?: string;
}

export interface IngredientAnalysis {
  ingredientName: string;
  koreanName: string;
  ewgScore?: number;
  benefits: string[];
  cautions: string[];
  recommendedConcentration?: string;
  relatedPapers: PaperResult[];
}

export interface ResearchProgress {
  isOpen: boolean;
  currentStep: string;
  steps: { name: string; status: "pending" | "loading" | "done" | "error"; message?: string }[];
  error?: string;
}

interface KeywordState {
  // State
  keyword: string;
  suggestions: KeywordSuggestion[];
  isLoadingSuggestions: boolean;
  isLoadingResearch: boolean;
  researchResults: PaperResult[];
  ingredientAnalysis: IngredientAnalysis | null;
  researchProgress: ResearchProgress;

  // New: Research History & Selection
  researchPrompt: string;
  researchHistory: ResearchItem[];
  selectedResearchIds: Set<string>;

  // Actions
  setKeyword: (keyword: string) => void;
  fetchSuggestions: () => Promise<void>;
  selectSuggestion: (keyword: string) => void;
  startResearch: () => Promise<void>;
  clearResearch: () => void;
  closeProgressModal: () => void;

  // New: Research History Actions
  setResearchPrompt: (prompt: string) => void;
  startDetailedResearch: () => Promise<ResearchItem | null>;
  updateResearchTitle: (id: string, title: string) => void;
  setResearchHistory: (items: ResearchItem[]) => void;
  selectResearchItem: (id: string) => void;
  deselectResearchItem: (id: string) => void;
  toggleResearchSelection: (id: string) => void;
  clearResearchSelection: () => void;
  deleteResearchItem: (id: string) => void;
}

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useKeywordStore = create<KeywordState>()(
  devtools(
    (set, get) => ({
      // Initial State
      keyword: "",
      suggestions: [],
      isLoadingSuggestions: false,
      isLoadingResearch: false,
      researchResults: [],
      ingredientAnalysis: null,
      researchProgress: {
        isOpen: false,
        currentStep: "",
        steps: [],
      },

      // New: Research History & Selection State
      researchPrompt: "",
      researchHistory: [],
      selectedResearchIds: new Set<string>(),

      // Actions
      setKeyword: (keyword) => set({ keyword }),

      fetchSuggestions: async () => {
        const { keyword } = get();
        if (!keyword.trim()) return;

        set({ isLoadingSuggestions: true });
        try {
          const apiSuggestions = await tauriApi.suggestKeywords(keyword);

          const suggestions: KeywordSuggestion[] = apiSuggestions.map((s) => ({
            id: s.id,
            keyword: s.keyword,
            trend: s.trend as "rising" | "stable" | "hot",
            source: s.source,
          }));

          set({ suggestions, isLoadingSuggestions: false });
        } catch (error) {
          console.error("Failed to fetch suggestions:", error);

          // Fallback mock data
          const mockSuggestions: KeywordSuggestion[] = [
            { id: "1", keyword: `${keyword} 효능`, trend: "hot", source: "google" },
            { id: "2", keyword: `${keyword} 부작용`, trend: "rising", source: "google" },
            { id: "3", keyword: `${keyword} 화장품`, trend: "stable", source: "google" },
            { id: "4", keyword: `${keyword} 아기`, trend: "rising", source: "google" },
          ];
          set({ suggestions: mockSuggestions, isLoadingSuggestions: false });
        }
      },

      selectSuggestion: (keyword) => {
        set({ keyword, suggestions: [] });
      },

      startResearch: async () => {
        const { keyword } = get();
        if (!keyword.trim()) return;

        // Initialize progress modal
        const initialSteps = [
          { name: "API 설정 확인", status: "pending" as const },
          { name: "논문 검색", status: "pending" as const },
          { name: "성분 분석", status: "pending" as const },
          { name: "결과 정리", status: "pending" as const },
        ];

        set({
          isLoadingResearch: true,
          researchProgress: {
            isOpen: true,
            currentStep: "API 설정 확인",
            steps: initialSteps,
          },
        });

        const updateStep = (stepName: string, status: "loading" | "done" | "error", message?: string) => {
          const { researchProgress } = get();
          const newSteps = researchProgress.steps.map((step) =>
            step.name === stepName ? { ...step, status, message } : step
          );
          set({
            researchProgress: {
              ...researchProgress,
              currentStep: stepName,
              steps: newSteps,
            },
          });
        };

        try {
          // Step 1: API 설정 확인
          updateStep("API 설정 확인", "loading");
          const settings = useSettingsStore.getState();
          const provider = settings.apiSelection.contentApi;
          const apiKey = settings.apiKeys[provider as keyof typeof settings.apiKeys];

          if (!apiKey) {
            updateStep("API 설정 확인", "error", `${provider} API 키가 설정되지 않았습니다`);
            set({ isLoadingResearch: false });
            return;
          }
          updateStep("API 설정 확인", "done", `${provider} API 사용`);

          // Step 2: 논문 검색
          updateStep("논문 검색", "loading");
          let papersResult: tauriApi.PaperResult[] = [];
          try {
            papersResult = await tauriApi.searchPapers(keyword, 10);
            updateStep("논문 검색", "done", `${papersResult.length}개 논문 발견`);
          } catch (error) {
            console.error("Paper search failed:", error);
            updateStep("논문 검색", "error", `검색 실패: ${error}`);
          }

          // Step 3: 성분 분석
          updateStep("성분 분석", "loading");
          let analysisResult: tauriApi.IngredientAnalysis | null = null;
          try {
            analysisResult = await tauriApi.analyzeIngredient(keyword, apiKey, provider);
            updateStep("성분 분석", "done", "분석 완료");
          } catch (error) {
            console.error("Ingredient analysis failed:", error);
            updateStep("성분 분석", "error", `분석 실패: ${error}`);
          }

          // Step 4: 결과 정리
          updateStep("결과 정리", "loading");

          // Debug: log raw responses
          console.log("Raw papersResult:", JSON.stringify(papersResult, null, 2));
          console.log("Raw analysisResult:", JSON.stringify(analysisResult, null, 2));

          // Convert backend format to frontend format (with null safety)
          const papersArray = Array.isArray(papersResult) ? papersResult : [];
          const papers: PaperResult[] = papersArray.map((p: any) => ({
            id: p?.id || "",
            title: p?.title || "",
            authors: Array.isArray(p?.authors) ? p.authors : [],
            abstract: p?.abstractText || p?.abstract_text || "",
            publicationDate: p?.publicationDate || p?.publication_date || "",
            source: p?.source || "",
            citationCount: p?.citationCount ?? p?.citation_count ?? undefined,
            doi: p?.doi ?? undefined,
          }));

          let analysis: IngredientAnalysis | null = null;
          if (analysisResult && typeof analysisResult === "object") {
            // Safely get relatedPapers array
            let relatedPapersRaw: any[] = [];
            if (Array.isArray(analysisResult.relatedPapers)) {
              relatedPapersRaw = analysisResult.relatedPapers;
            } else if (Array.isArray((analysisResult as any).related_papers)) {
              relatedPapersRaw = (analysisResult as any).related_papers;
            }

            analysis = {
              ingredientName: analysisResult.ingredientName || (analysisResult as any).ingredient_name || keyword,
              koreanName: analysisResult.koreanName || (analysisResult as any).korean_name || keyword,
              ewgScore: analysisResult.ewgScore ?? (analysisResult as any).ewg_score ?? undefined,
              benefits: Array.isArray(analysisResult.benefits) ? analysisResult.benefits : [],
              cautions: Array.isArray(analysisResult.cautions) ? analysisResult.cautions : [],
              recommendedConcentration: analysisResult.recommendedConcentration ?? (analysisResult as any).recommended_concentration ?? undefined,
              relatedPapers: relatedPapersRaw.map((p: any) => ({
                id: p?.id || "",
                title: p?.title || "",
                authors: Array.isArray(p?.authors) ? p.authors : [],
                abstract: p?.abstractText || p?.abstract_text || "",
                publicationDate: p?.publicationDate || p?.publication_date || "",
                source: p?.source || "",
                citationCount: p?.citationCount ?? p?.citation_count ?? undefined,
                doi: p?.doi ?? undefined,
              })),
            };
          }

          // Store research data for content generation
          const researchSummary = analysis
            ? `성분: ${analysis.ingredientName}\nEWG 등급: ${analysis.ewgScore ?? "N/A"}\n효능: ${analysis.benefits.join(", ")}\n주의사항: ${analysis.cautions.join(", ")}`
            : "";

          useContentStore.getState().setResearchData(researchSummary);

          updateStep("결과 정리", "done", `논문 ${papers.length}개, 성분 분석 ${analysis ? "완료" : "실패"}`);

          set({
            researchResults: papers,
            ingredientAnalysis: analysis || {
              ingredientName: keyword,
              koreanName: keyword,
              ewgScore: undefined,
              benefits: ["정보를 불러오는 중입니다..."],
              cautions: [],
              relatedPapers: [],
            },
            isLoadingResearch: false,
          });
        } catch (error) {
          console.error("Failed to start research:", error);

          const { researchProgress } = get();
          set({
            researchProgress: {
              ...researchProgress,
              error: `연구 실패: ${error}`,
            },
            researchResults: [],
            ingredientAnalysis: {
              ingredientName: keyword,
              koreanName: keyword,
              ewgScore: 1,
              benefits: ["피부 보습", "피부 장벽 강화", "상처 치유 촉진"],
              cautions: ["특별한 주의사항 없음"],
              relatedPapers: [],
            },
            isLoadingResearch: false,
          });
        }
      },

      clearResearch: () =>
        set({
          researchResults: [],
          ingredientAnalysis: null,
          researchHistory: [],
          selectedResearchIds: new Set<string>(),
          researchPrompt: "",
        }),

      closeProgressModal: () =>
        set({
          researchProgress: {
            isOpen: false,
            currentStep: "",
            steps: [],
          },
        }),

      // New: Research History Actions
      setResearchPrompt: (prompt: string) => set({ researchPrompt: prompt }),

      startDetailedResearch: async () => {
        const { researchPrompt, keyword } = get();
        const searchKeyword = researchPrompt.trim() || keyword.trim();
        if (!searchKeyword) return null;

        // Initialize progress modal
        const initialSteps = [
          { name: "API 설정 확인", status: "pending" as const },
          { name: "논문 검색", status: "pending" as const },
          { name: "성분 분석", status: "pending" as const },
          { name: "리포트 생성", status: "pending" as const },
        ];

        set({
          isLoadingResearch: true,
          researchProgress: {
            isOpen: true,
            currentStep: "API 설정 확인",
            steps: initialSteps,
          },
        });

        const updateStep = (stepName: string, status: "loading" | "done" | "error", message?: string) => {
          const { researchProgress } = get();
          const newSteps = researchProgress.steps.map((step) =>
            step.name === stepName ? { ...step, status, message } : step
          );
          set({
            researchProgress: {
              ...researchProgress,
              currentStep: stepName,
              steps: newSteps,
            },
          });
        };

        try {
          // Step 1: API 설정 확인
          updateStep("API 설정 확인", "loading");
          const settings = useSettingsStore.getState();
          const provider = settings.apiSelection.contentApi;
          const apiKey = settings.apiKeys[provider as keyof typeof settings.apiKeys];

          if (!apiKey) {
            updateStep("API 설정 확인", "error", `${provider} API 키가 설정되지 않았습니다`);
            set({ isLoadingResearch: false });
            return null;
          }
          updateStep("API 설정 확인", "done", `${provider} API 사용`);

          // Step 2: 논문 검색
          updateStep("논문 검색", "loading");
          let papersResult: tauriApi.PaperResult[] = [];
          try {
            papersResult = await tauriApi.searchPapers(searchKeyword, 10);
            updateStep("논문 검색", "done", `${papersResult.length}개 논문 발견`);
          } catch (error) {
            console.error("Paper search failed:", error);
            updateStep("논문 검색", "error", `검색 실패: ${error}`);
          }

          // Step 3: 성분 분석
          updateStep("성분 분석", "loading");
          let analysisResult: tauriApi.IngredientAnalysis | null = null;
          try {
            // Build the prompt for API preview
            const researchPromptText = `다음 화장품 성분에 대해 분석해주세요:

성분명: ${searchKeyword}

분석 요청 항목:
1. 성분 영문명 및 한글명
2. EWG 등급 (1-10)
3. 주요 효능 목록
4. 주의사항
5. 권장 사용 농도

관련 논문 수: ${papersResult.length}개

JSON 형식으로 응답해주세요.`;

            // Show API preview modal
            const { showPreview } = useApiPreviewStore.getState();
            const { confirmed } = await showPreview({
              type: "research",
              title: "성분 분석 API 호출",
              provider,
              endpoint: "analyzeIngredient",
              prompt: researchPromptText,
              additionalParams: {
                ingredientName: searchKeyword,
                paperCount: papersResult.length,
              },
            });

            if (!confirmed) {
              updateStep("성분 분석", "error", "사용자 취소");
              set({ isLoadingResearch: false });
              return null;
            }

            // Use the edited prompt (pass as part of the API call context if needed)
            analysisResult = await tauriApi.analyzeIngredient(searchKeyword, apiKey, provider);
            updateStep("성분 분석", "done", "분석 완료");
          } catch (error) {
            console.error("Ingredient analysis failed:", error);
            updateStep("성분 분석", "error", `분석 실패: ${error}`);
          }

          // Step 4: 리포트 생성
          updateStep("리포트 생성", "loading");

          // Convert to papers format
          const papersArray = Array.isArray(papersResult) ? papersResult : [];
          const papers: PaperResult[] = papersArray.map((p: any) => ({
            id: p?.id || generateId("paper"),
            title: p?.title || "",
            authors: Array.isArray(p?.authors) ? p.authors : [],
            abstract: p?.abstractText || p?.abstract_text || "",
            publicationDate: p?.publicationDate || p?.publication_date || "",
            source: p?.source || "",
            citationCount: p?.citationCount ?? p?.citation_count ?? undefined,
            doi: p?.doi ?? undefined,
            url: p?.doi ? `https://doi.org/${p.doi}` : undefined,
          }));

          // Create sources from papers
          const sources: SourceReference[] = papers.map((p) => ({
            id: generateId("src"),
            title: p.title,
            url: p.url || (p.doi ? `https://doi.org/${p.doi}` : ""),
            type: "paper" as const,
            citedIn: "research",
          }));

          // Build ingredient analysis
          let ingredientAnalysis: IngredientAnalysis | null = null;
          if (analysisResult && typeof analysisResult === "object") {
            let relatedPapersRaw: any[] = [];
            if (Array.isArray(analysisResult.relatedPapers)) {
              relatedPapersRaw = analysisResult.relatedPapers;
            } else if (Array.isArray((analysisResult as any).related_papers)) {
              relatedPapersRaw = (analysisResult as any).related_papers;
            }

            ingredientAnalysis = {
              ingredientName: analysisResult.ingredientName || (analysisResult as any).ingredient_name || searchKeyword,
              koreanName: analysisResult.koreanName || (analysisResult as any).korean_name || searchKeyword,
              ewgScore: analysisResult.ewgScore ?? (analysisResult as any).ewg_score ?? undefined,
              benefits: Array.isArray(analysisResult.benefits) ? analysisResult.benefits : [],
              cautions: Array.isArray(analysisResult.cautions) ? analysisResult.cautions : [],
              recommendedConcentration: analysisResult.recommendedConcentration ?? (analysisResult as any).recommended_concentration ?? undefined,
              relatedPapers: relatedPapersRaw.map((p: any) => ({
                id: p?.id || generateId("paper"),
                title: p?.title || "",
                authors: Array.isArray(p?.authors) ? p.authors : [],
                abstract: p?.abstractText || p?.abstract_text || "",
                publicationDate: p?.publicationDate || p?.publication_date || "",
                source: p?.source || "",
                citationCount: p?.citationCount ?? p?.citation_count ?? undefined,
                doi: p?.doi ?? undefined,
              })),
            };
          }

          // Build summary
          const summary = ingredientAnalysis
            ? `${ingredientAnalysis.koreanName}(${ingredientAnalysis.ingredientName})은(는) ${ingredientAnalysis.benefits.slice(0, 3).join(", ")} 등의 효능이 있습니다. EWG 등급: ${ingredientAnalysis.ewgScore ?? "N/A"}`
            : `${searchKeyword}에 대한 ${papers.length}개의 논문을 찾았습니다.`;

          // Create ResearchItem
          const now = new Date().toISOString();
          const researchItem: ResearchItem = {
            id: generateId("research"),
            prompt: searchKeyword,
            title: ingredientAnalysis?.koreanName || searchKeyword,
            summary,
            fullReport: {
              ingredientAnalysis: ingredientAnalysis ? {
                ingredientName: ingredientAnalysis.ingredientName,
                koreanName: ingredientAnalysis.koreanName,
                ewgScore: ingredientAnalysis.ewgScore ?? null,
                benefits: ingredientAnalysis.benefits,
                cautions: ingredientAnalysis.cautions,
                recommendedConcentration: ingredientAnalysis.recommendedConcentration ?? null,
              } : null,
              papers: papers.map((p) => ({
                id: p.id,
                title: p.title,
                authors: p.authors,
                abstract: p.abstract,
                publicationDate: p.publicationDate,
                source: p.source,
                citationCount: p.citationCount ?? null,
                doi: p.doi ?? null,
                url: p.url,
              })),
              sources,
            },
            createdAt: now,
            updatedAt: now,
          };

          // Store research data for content generation
          const researchSummary = ingredientAnalysis
            ? `성분: ${ingredientAnalysis.ingredientName}\nEWG 등급: ${ingredientAnalysis.ewgScore ?? "N/A"}\n효능: ${ingredientAnalysis.benefits.join(", ")}\n주의사항: ${ingredientAnalysis.cautions.join(", ")}`
            : "";

          useContentStore.getState().setResearchData(researchSummary);

          updateStep("리포트 생성", "done", "저장 완료");

          // Update state - add to history
          set((state) => ({
            researchResults: papers,
            ingredientAnalysis,
            isLoadingResearch: false,
            researchHistory: [...state.researchHistory, researchItem],
          }));

          // Auto-save project if one exists
          const { currentProject, saveProject } = useProjectStore.getState();
          if (currentProject) {
            saveProject();
          }

          return researchItem;
        } catch (error) {
          console.error("Failed to start detailed research:", error);
          const { researchProgress } = get();
          set({
            researchProgress: {
              ...researchProgress,
              error: `연구 실패: ${error}`,
            },
            isLoadingResearch: false,
          });
          return null;
        }
      },

      updateResearchTitle: (id: string, title: string) => {
        set((state) => ({
          researchHistory: state.researchHistory.map((item) =>
            item.id === id ? { ...item, title, updatedAt: new Date().toISOString() } : item
          ),
        }));
      },

      setResearchHistory: (items: ResearchItem[]) => {
        set({ researchHistory: items });
      },

      selectResearchItem: (id: string) => {
        set((state) => {
          const newSet = new Set(state.selectedResearchIds);
          newSet.add(id);
          return { selectedResearchIds: newSet };
        });
      },

      deselectResearchItem: (id: string) => {
        set((state) => {
          const newSet = new Set(state.selectedResearchIds);
          newSet.delete(id);
          return { selectedResearchIds: newSet };
        });
      },

      toggleResearchSelection: (id: string) => {
        set((state) => {
          const newSet = new Set(state.selectedResearchIds);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return { selectedResearchIds: newSet };
        });
      },

      clearResearchSelection: () => {
        set({ selectedResearchIds: new Set<string>() });
      },

      deleteResearchItem: (id: string) => {
        set((state) => {
          const newSet = new Set(state.selectedResearchIds);
          newSet.delete(id);
          return {
            researchHistory: state.researchHistory.filter((item) => item.id !== id),
            selectedResearchIds: newSet,
          };
        });
      },
    }),
    { name: "keyword-store" }
  )
);
