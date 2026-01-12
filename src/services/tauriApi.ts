import { invoke } from "@tauri-apps/api/core";

// Project Types
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
  ingredientAnalysis: {
    ingredientName: string;
    koreanName: string;
    ewgScore: number | null;
    benefits: string[];
    cautions: string[];
    recommendedConcentration: string | null;
  } | null;
  papers: Array<{
    id: string;
    title: string;
    authors: string[];
    abstract: string;
    publicationDate: string;
    source: string;
    citationCount: number | null;
    doi: string | null;
    url?: string;
  }>;
  conferences: Array<{
    id: string;
    title: string;
    authors: string[];
    publishedDate: string;
    source: string;
    doi: string | null;
    url: string | null;
  }>;
  webResults: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
  news: Array<{
    title: string;
    description: string;
    link: string;
    pubDate: string;
    source: string;
  }>;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    type: "paper" | "journal" | "website";
    citedIn: string;
  }>;
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

// Types matching Rust backend
export interface KeywordSuggestion {
  id: string;
  keyword: string;
  trend: string;
  source: string;
}

export interface PaperResult {
  id: string;
  title: string;
  authors: string[];
  abstractText: string;
  publicationDate: string;
  source: string;
  citationCount: number | null;
  doi: string | null;
}

export interface IngredientAnalysis {
  ingredientName: string;
  koreanName: string;
  ewgScore: number | null;
  benefits: string[];
  cautions: string[];
  recommendedConcentration: string | null;
  relatedPapers: PaperResult[];
}

// Response types - use snake_case to match Rust backend
export interface ContentPlanItem {
  id: string;
  title: string;
  character_name: string;
  journal_number: number;
  content: string;
  image_concept: string;
  status: string;
}

export interface CharacterPersona {
  name: string;
  description: string;
  personality_traits: string[];
}

export interface GeneratedImage {
  id: string;
  content_id: string;
  url: string;
  local_path: string | null;
  width: number;
  height: number;
}

// Request types - use snake_case to match Rust backend
export interface ContentGenerationRequest {
  keyword: string;
  prompt_id: string;
  count: number;
  api_key?: string;
  llm_provider?: string;
  research_data?: string;
}

export interface ImageGenerationRequest {
  content_id: string;
  image_concept: string;
  style_prompt: string;
  style_image_path?: string;
}

export interface ImagePrompt {
  id: string;
  name: string;
  prompt: string;
  styleImagePath?: string;
  previewImagePath?: string;
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

export interface LayoutElement {
  id: string;
  name: string;
  enabled: boolean;
  element_type: string;  // snake_case for Rust backend
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutSettings {
  selected_preset_id: string;  // snake_case for Rust backend
  elements: LayoutElement[];
}

export interface AppSettings {
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
  apiSelection: {
    contentGeneration: string;
    imageGeneration: string;
  };
  imagePrompts: ImagePrompt[];
  contentPrompts: ContentPrompt[];
  savePath: string;
  layoutSettings: LayoutSettings;
  imageSizePresets: ImageSizePreset[];
}

// API Functions

/**
 * Get keyword suggestions based on input
 */
export async function suggestKeywords(keyword: string): Promise<KeywordSuggestion[]> {
  return invoke<KeywordSuggestion[]>("suggest_keywords", { keyword });
}

/**
 * Search for academic papers
 */
export async function searchPapers(keyword: string, limit?: number): Promise<PaperResult[]> {
  return invoke<PaperResult[]>("search_papers", { keyword, limit });
}

/**
 * Analyze an ingredient using LLM
 */
export async function analyzeIngredient(
  ingredientName: string,
  apiKey?: string,
  llmProvider?: string
): Promise<IngredientAnalysis> {
  return invoke<IngredientAnalysis>("analyze_ingredient", {
    ingredientName,
    apiKey,
    llmProvider,
  });
}

// ============================================
// New Search Source Types and Functions
// ============================================

export interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
}

export interface ConferenceSearchResult {
  id: string;
  title: string;
  authors: string[];
  publishedDate: string;
  source: string;
  doi: string | null;
  url: string | null;
}

export interface NewsSearchResult {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

/**
 * Search web using Google Custom Search
 */
export async function searchWeb(
  query: string,
  apiKey: string,
  cx: string
): Promise<WebSearchResult[]> {
  return invoke<WebSearchResult[]>("search_web", { query, apiKey, cx });
}

/**
 * Search conferences/academic papers using CrossRef API
 */
export async function searchConferences(
  keyword: string,
  limit?: number
): Promise<ConferenceSearchResult[]> {
  return invoke<ConferenceSearchResult[]>("search_conferences", { keyword, limit });
}

/**
 * Search news using RSS feeds (Yonhap, CNN)
 */
export async function searchNews(keyword: string): Promise<NewsSearchResult[]> {
  return invoke<NewsSearchResult[]>("search_news", { keyword });
}

/**
 * Generate content plan
 */
export async function generateContentPlan(
  request: ContentGenerationRequest
): Promise<ContentPlanItem[]> {
  return invoke<ContentPlanItem[]>("generate_content_plan", { request });
}

/**
 * Create character persona from keyword
 */
export async function createPersona(keyword: string): Promise<CharacterPersona> {
  return invoke<CharacterPersona>("create_persona", { keyword });
}

/**
 * Generate single image
 */
export async function generateImage(
  request: ImageGenerationRequest,
  apiKey?: string,
  provider?: string,
  model?: string,
  aspectRatio?: string,
  negativePrompt?: string
): Promise<GeneratedImage> {
  return invoke<GeneratedImage>("generate_image", {
    request,
    apiKey,
    provider,
    model,
    aspectRatio,
    negativePrompt,
  });
}

/**
 * Generate multiple images in batch
 */
export async function generateBatchImages(
  requests: ImageGenerationRequest[],
  apiKey?: string,
  provider?: string,
  model?: string,
  aspectRatio?: string,
  negativePrompt?: string
): Promise<GeneratedImage[]> {
  return invoke<GeneratedImage[]>("generate_batch_images", {
    requests,
    apiKey,
    provider,
    model,
    aspectRatio,
    negativePrompt,
  });
}

/**
 * Download image to local storage
 */
export async function downloadImage(
  imageUrl: string,
  savePath: string,
  withText?: boolean
): Promise<string> {
  return invoke<string>("download_image", { imageUrl, savePath, withText });
}

/**
 * Download all images to local storage
 */
export async function downloadAllImages(
  images: GeneratedImage[],
  basePath: string,
  withText?: boolean
): Promise<string[]> {
  return invoke<string[]>("download_all_images", { images, basePath, withText });
}

/**
 * Get app settings
 */
export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

/**
 * Save app settings
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  return invoke<void>("save_settings", { settings });
}

/**
 * Save API keys
 */
export async function saveApiKeys(keys: AppSettings["apiKeys"]): Promise<void> {
  return invoke<void>("save_api_keys", { keys });
}

/**
 * Get save path
 */
export async function getSavePath(): Promise<string> {
  return invoke<string>("get_save_path");
}

/**
 * Set save path
 */
export async function setSavePath(path: string): Promise<void> {
  return invoke<void>("set_save_path", { path });
}

/**
 * Validate OpenAI API key
 */
export async function validateOpenaiKey(apiKey: string): Promise<boolean> {
  return invoke<boolean>("validate_openai_key", { apiKey });
}

/**
 * Validate Anthropic API key
 */
export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  return invoke<boolean>("validate_anthropic_key", { apiKey });
}

/**
 * Validate Google API key
 */
export async function validateGoogleKey(apiKey: string): Promise<boolean> {
  return invoke<boolean>("validate_google_key", { apiKey });
}

/**
 * Generate preview image for a prompt
 */
export async function generatePreviewImage(
  promptId: string,
  prompt: string,
  apiKey: string,
  provider: string,
  model?: string,
  aspectRatio?: string,
  negativePrompt?: string
): Promise<string> {
  const args = {
    promptId,
    prompt,
    apiKey,
    provider,
    model,
    aspectRatio,
    negativePrompt,
  };
  console.log("generatePreviewImage args:", JSON.stringify(args, null, 2));
  return invoke<string>("generate_preview_image", args);
}

/**
 * Save image prompt
 */
export async function saveImagePrompt(prompt: ImagePrompt): Promise<void> {
  return invoke<void>("save_image_prompt", { prompt });
}

/**
 * Delete image prompt
 */
export async function deleteImagePrompt(promptId: string): Promise<void> {
  return invoke<void>("delete_image_prompt", { promptId });
}

/**
 * Save layout settings
 */
export async function saveLayoutSettings(layout: LayoutSettings): Promise<void> {
  return invoke<void>("save_layout_settings", { layout });
}

/**
 * Get system fonts
 */
export async function getSystemFonts(): Promise<string[]> {
  return invoke<string[]>("get_system_fonts");
}

/**
 * Generate prompt from image using LLM vision
 */
export async function generatePromptFromImage(
  imagePath: string,
  apiKey: string,
  provider: string
): Promise<string> {
  return invoke<string>("generate_prompt_from_image", {
    imagePath,
    apiKey,
    provider,
  });
}

// ============================================
// Project Management API
// ============================================

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// In-memory storage for projects (fallback when backend is not available)
let projectsStorage: Map<string, Project> = new Map();

/**
 * Create a new project
 */
export async function createProject(name: string): Promise<Project> {
  try {
    return await invoke<Project>("create_project", { name });
  } catch (e) {
    console.warn("Backend create_project not available, using local storage:", e);
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId("proj"),
      name,
      createdAt: now,
      updatedAt: now,
      researchItems: [],
      contentGroups: [],
      generatedImages: [],
    };
    projectsStorage.set(project.id, project);
    saveProjectsToLocalStorage();
    return project;
  }
}

/**
 * Load a project by ID
 */
export async function loadProject(projectId: string): Promise<Project> {
  try {
    return await invoke<Project>("load_project", { projectId });
  } catch (e) {
    console.warn("Backend load_project not available, using local storage:", e);
    loadProjectsFromLocalStorage();
    const project = projectsStorage.get(projectId);
    if (!project) {
      throw new Error("프로젝트를 찾을 수 없습니다");
    }
    return project;
  }
}

/**
 * Save a project
 */
export async function saveProject(project: Project): Promise<void> {
  try {
    await invoke<void>("save_project", { project });
  } catch (e) {
    console.warn("Backend save_project not available, using local storage:", e);
    project.updatedAt = new Date().toISOString();
    projectsStorage.set(project.id, project);
    saveProjectsToLocalStorage();
  }
}

/**
 * Delete a project by ID
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    await invoke<void>("delete_project", { projectId });
  } catch (e) {
    console.warn("Backend delete_project not available, using local storage:", e);
    projectsStorage.delete(projectId);
    saveProjectsToLocalStorage();
  }
}

/**
 * List all projects
 */
export async function listProjects(): Promise<ProjectMeta[]> {
  try {
    return await invoke<ProjectMeta[]>("list_projects");
  } catch (e) {
    console.warn("Backend list_projects not available, using local storage:", e);
    loadProjectsFromLocalStorage();
    const projects: ProjectMeta[] = [];
    projectsStorage.forEach((project) => {
      projects.push({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        researchCount: project.researchItems.length,
        contentCount: project.contentGroups.reduce((acc, g) => acc + g.contents.length, 0),
        imageCount: project.generatedImages.length,
      });
    });
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

/**
 * Save research item to a project
 */
export async function saveResearchItem(projectId: string, research: ResearchItem): Promise<void> {
  try {
    await invoke<void>("save_research_item", { projectId, research });
  } catch (e) {
    console.warn("Backend save_research_item not available, using local storage:", e);
    loadProjectsFromLocalStorage();
    const project = projectsStorage.get(projectId);
    if (project) {
      const existingIndex = project.researchItems.findIndex((r) => r.id === research.id);
      if (existingIndex >= 0) {
        project.researchItems[existingIndex] = research;
      } else {
        project.researchItems.push(research);
      }
      project.updatedAt = new Date().toISOString();
      saveProjectsToLocalStorage();
    }
  }
}

/**
 * Save content group to a project
 */
export async function saveContentGroup(projectId: string, group: ContentGroup): Promise<void> {
  try {
    await invoke<void>("save_content_group", { projectId, group });
  } catch (e) {
    console.warn("Backend save_content_group not available, using local storage:", e);
    loadProjectsFromLocalStorage();
    const project = projectsStorage.get(projectId);
    if (project) {
      const existingIndex = project.contentGroups.findIndex((g) => g.id === group.id);
      if (existingIndex >= 0) {
        project.contentGroups[existingIndex] = group;
      } else {
        project.contentGroups.push(group);
      }
      project.updatedAt = new Date().toISOString();
      saveProjectsToLocalStorage();
    }
  }
}

// Local storage helpers
const PROJECTS_STORAGE_KEY = "moms_insta_projects";

function saveProjectsToLocalStorage(): void {
  try {
    const data: Record<string, Project> = {};
    projectsStorage.forEach((v, k) => {
      data[k] = v;
    });
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save projects to localStorage:", e);
  }
}

function loadProjectsFromLocalStorage(): void {
  try {
    const data = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as Record<string, Project>;
      projectsStorage = new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.error("Failed to load projects from localStorage:", e);
  }
}

// Initialize from localStorage
loadProjectsFromLocalStorage();

/**
 * Get the images directory for a project
 */
export async function getProjectImagesDir(projectId: string): Promise<string> {
  return invoke<string>("get_project_images_dir", { projectId });
}

/**
 * Delete image file from disk
 */
export async function deleteImageFile(path: string): Promise<void> {
  return invoke<void>("delete_image_file", { path });
}

/**
 * Open folder in system file explorer
 */
export async function openFolderInExplorer(path: string): Promise<void> {
  return invoke<void>("open_folder_in_explorer", { path });
}
