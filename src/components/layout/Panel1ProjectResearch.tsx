import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useKeywordStore } from "@/stores/keywordStore";
import { useContentStore } from "@/stores/contentStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  FolderOpen,
  Plus,
  Upload,
  Search,
  BookOpen,
  Edit3,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Check,
  X,
  FileText,
  Settings,
} from "lucide-react";
import ProjectListModal from "../modals/ProjectListModal";
import ProjectCreateModal from "../modals/ProjectCreateModal";
import ResearchListModal from "../modals/ResearchListModal";
import SettingsModal, { SettingsTab } from "../settings/SettingsModal";

interface Panel1Props {
  className?: string;
}

export default function Panel1ProjectResearch({ className = "" }: Panel1Props) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isProjectCreateModalOpen, setIsProjectCreateModalOpen] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>("content-prompts");
  const [expandedResearchId, setExpandedResearchId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const openSettingsModal = (tab: SettingsTab) => {
    setSettingsInitialTab(tab);
    setIsSettingsModalOpen(true);
  };

  const { currentProject, updateProjectName } = useProjectStore();
  const {
    researchPrompt,
    setResearchPrompt,
    researchHistory,
    startDetailedResearch,
    updateResearchTitle,
    deleteResearchItem,
    isLoadingResearch,
    selectResearchItem,
    clearResearchSelection,
    researchSources,
    toggleResearchSource,
    researchLimit,
    setResearchLimit,
    excludedSourceIds,
    toggleExcludedSource,
  } = useKeywordStore();
  const { generateContent } = useContentStore();
  const {
    contentPrompts,
    selectedContentPromptId,
    setSelectedContentPrompt
  } = useSettingsStore();

  const handleStartResearch = async () => {
    if (!researchPrompt.trim()) return;
    await startDetailedResearch();
  };

  // 기획일괄진행: 자료조사 → 자료 선택 → 콘텐츠 기획
  const handleBatchProcess = async () => {
    if (!researchPrompt.trim()) return;

    if (!selectedContentPromptId) {
      alert("먼저 설정에서 짧은지식 프롬프트를 선택해주세요.");
      return;
    }

    setIsBatchProcessing(true);
    try {
      // 1. 자료조사 실행
      const researchItem = await startDetailedResearch();
      if (!researchItem) {
        setIsBatchProcessing(false);
        return;
      }

      // 2. 자료 자동 선택
      clearResearchSelection();
      selectResearchItem(researchItem.id);

      // 3. 콘텐츠 기획 자동 실행 (20개)
      await generateContent(researchItem.prompt, selectedContentPromptId);
    } catch (error) {
      console.error("Batch process failed:", error);
      alert("일괄 처리 중 오류가 발생했습니다.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleSaveTitle = (id: string) => {
    if (editingTitle.trim()) {
      updateResearchTitle(id, editingTitle.trim());
    }
    setEditingTitleId(null);
    setEditingTitle("");
  };

  const handleSaveProjectName = () => {
    if (editingProjectName.trim() && currentProject) {
      updateProjectName(editingProjectName.trim());
    }
    setIsEditingProjectName(false);
    setEditingProjectName("");
  };

  const toggleExpand = (id: string) => {
    setExpandedResearchId(expandedResearchId === id ? null : id);
  };

  return (
    <aside className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden ${className}`}>
      {/* 0. 콘텐츠 주제 (프롬프트) 선택 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-green-600" />
          <span className="font-medium text-gray-700">콘텐츠 주제</span>
          <button
            onClick={() => openSettingsModal("content-prompts")}
            className="ml-auto p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="프롬프트 설정"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <select
          value={selectedContentPromptId || ""}
          onChange={(e) => setSelectedContentPrompt(e.target.value || null)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">프롬프트 선택...</option>
          {contentPrompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.name}
            </option>
          ))}
        </select>
        {selectedContentPromptId && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {contentPrompts.find(p => p.id === selectedContentPromptId)?.prompt.slice(0, 100)}...
          </p>
        )}
      </div>

      {/* 1. 프로젝트 섹션 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="w-4 h-4 text-purple-600" />
          <span className="font-medium text-gray-700">프로젝트</span>
        </div>

        {/* 프로젝트명 표시/수정 */}
        <div className="mb-3">
          {currentProject ? (
            isEditingProjectName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingProjectName}
                  onChange={(e) => setEditingProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveProjectName();
                    if (e.key === "Escape") {
                      setIsEditingProjectName(false);
                      setEditingProjectName("");
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveProjectName}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                  title="저장"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingProjectName(false);
                    setEditingProjectName("");
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                  title="취소"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors group"
                onClick={() => {
                  setIsEditingProjectName(true);
                  setEditingProjectName(currentProject.name);
                }}
              >
                <span className="flex-1 font-medium text-purple-700 truncate">
                  {currentProject.name}
                </span>
                <Edit3 className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 text-sm">
              프로젝트 없음
            </div>
          )}
        </div>

        {/* 생성/불러오기 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsProjectCreateModalOpen(true)}
            className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            생성
          </button>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
          >
            <Upload className="w-4 h-4" />
            불러오기
          </button>
        </div>
      </div>

      {/* 1. 자료조사 섹션 */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-700">자료조사</span>
        </div>

        {/* 프롬프트 입력 */}
        <textarea
          value={researchPrompt}
          onChange={(e) => setResearchPrompt(e.target.value)}
          placeholder="조사하고 싶은 내용을 입력하세요 (예: 판테놀의 피부 효능과 안전성)"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20 mb-3"
        />

        {/* 검색 소스 선택 */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {researchSources.map((source) => (
            <label
              key={source.type}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={source.enabled}
                onChange={() => toggleResearchSource(source.type)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
              />
              <span className="text-sm text-gray-700">{source.label}</span>
            </label>
          ))}
          {/* 검색 개수 선택 */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-sm text-gray-500">각</span>
            <select
              value={researchLimit}
              onChange={(e) => setResearchLimit(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={30}>30개</option>
            </select>
          </div>
        </div>

        {/* 자료조사 + 기획일괄진행 버튼 */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleStartResearch}
            disabled={isLoadingResearch || isBatchProcessing || !researchPrompt.trim() || !researchSources.some(s => s.enabled)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Search className="w-4 h-4" />
            {isLoadingResearch && !isBatchProcessing ? "조사 중..." : "자료조사"}
          </button>
          <button
            onClick={handleBatchProcess}
            disabled={isLoadingResearch || isBatchProcessing || !researchPrompt.trim() || !researchSources.some(s => s.enabled) || !selectedContentPromptId}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            title="자료조사 후 자동으로 콘텐츠 기획까지 진행"
          >
            <Zap className="w-4 h-4" />
            {isBatchProcessing ? "진행 중..." : "기획일괄진행"}
          </button>
        </div>

        {/* 자료조사 결과 목록 */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {researchHistory.map((item) => (
            <div
              key={item.id}
              className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
            >
              {/* 헤더 */}
              <div className="p-3 flex items-center gap-2">
                {editingTitleId === item.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleSaveTitle(item.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTitle(item.id)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                ) : (
                  <span
                    className="flex-1 font-medium text-sm text-gray-800 cursor-pointer hover:text-purple-600"
                    onClick={() => toggleExpand(item.id)}
                  >
                    {item.title}
                  </span>
                )}
                <button
                  onClick={() => {
                    setEditingTitleId(item.id);
                    setEditingTitle(item.title);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="제목 수정"
                >
                  <Edit3 className="w-3 h-3 text-gray-500" />
                </button>
                <button
                  onClick={() => deleteResearchItem(item.id)}
                  className="p-1 hover:bg-red-100 rounded"
                  title="삭제"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {expandedResearchId === item.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>

              {/* 요약 (항상 표시) */}
              <div className="px-3 pb-2">
                <p className="text-xs text-gray-600 line-clamp-2">{item.summary}</p>
              </div>

              {/* 확장된 내용 */}
              {expandedResearchId === item.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-gray-200 pt-2">
                  {item.fullReport.ingredientAnalysis && (
                    <>
                      <div className="text-xs">
                        <span className="font-medium text-gray-700">EWG 등급: </span>
                        <span className="text-green-600">
                          {item.fullReport.ingredientAnalysis.ewgScore ?? "N/A"}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-gray-700">효능: </span>
                        <span className="text-gray-600">
                          {item.fullReport.ingredientAnalysis.benefits.slice(0, 3).join(", ")}
                        </span>
                      </div>
                    </>
                  )}

                  {/* 논문 목록 */}
                  {item.fullReport.papers.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-700 flex items-center justify-between">
                        <span>논문 ({item.fullReport.papers.filter(p => !excludedSourceIds.has(p.id)).length}/{item.fullReport.papers.length})</span>
                      </div>
                      {item.fullReport.papers.map((paper) => (
                        <label
                          key={paper.id}
                          className={`text-xs bg-white p-2 rounded border flex items-start gap-2 cursor-pointer hover:bg-gray-50 ${
                            excludedSourceIds.has(paper.id) ? "opacity-50" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!excludedSourceIds.has(paper.id)}
                            onChange={() => toggleExcludedSource(paper.id)}
                            className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-700 line-clamp-1">{paper.title}</div>
                            <div className="text-gray-500">{paper.source}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* 뉴스 목록 */}
                  {item.fullReport.news && item.fullReport.news.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-700">
                        뉴스 ({item.fullReport.news.filter(n => !excludedSourceIds.has(n.link)).length}/{item.fullReport.news.length})
                      </div>
                      {item.fullReport.news.map((news, idx) => (
                        <label
                          key={news.link || idx}
                          className={`text-xs bg-white p-2 rounded border flex items-start gap-2 cursor-pointer hover:bg-gray-50 ${
                            excludedSourceIds.has(news.link) ? "opacity-50" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!excludedSourceIds.has(news.link)}
                            onChange={() => toggleExcludedSource(news.link)}
                            className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-700 line-clamp-1">{news.title}</div>
                            <div className="text-gray-500 text-[10px]">{news.source}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* 학회 목록 */}
                  {item.fullReport.conferences && item.fullReport.conferences.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-700">
                        학회 ({item.fullReport.conferences.filter(c => !excludedSourceIds.has(c.id)).length}/{item.fullReport.conferences.length})
                      </div>
                      {item.fullReport.conferences.map((conf) => (
                        <label
                          key={conf.id}
                          className={`text-xs bg-white p-2 rounded border flex items-start gap-2 cursor-pointer hover:bg-gray-50 ${
                            excludedSourceIds.has(conf.id) ? "opacity-50" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!excludedSourceIds.has(conf.id)}
                            onChange={() => toggleExcludedSource(conf.id)}
                            className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-700 line-clamp-1">{conf.title}</div>
                            <div className="text-gray-500">{conf.source}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 전체 보기 버튼 */}
        {researchHistory.length > 0 && (
          <button
            onClick={() => setIsResearchModalOpen(true)}
            className="w-full mt-3 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            자료조사 전체 보기
          </button>
        )}
      </div>

      {/* Modals */}
      <ProjectListModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
      <ProjectCreateModal
        isOpen={isProjectCreateModalOpen}
        onClose={() => setIsProjectCreateModalOpen(false)}
      />
      <ResearchListModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsInitialTab}
      />
    </aside>
  );
}
