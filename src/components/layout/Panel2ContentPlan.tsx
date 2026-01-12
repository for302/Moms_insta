import { useState } from "react";
import { useKeywordStore } from "@/stores/keywordStore";
import { useContentStore } from "@/stores/contentStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  FileText,
  Search,
  Wand2,
  Check,
  Square,
  CheckSquare,
  Upload,
} from "lucide-react";
import ResearchSelectModal from "../modals/ResearchSelectModal";
import ContentGroupModal from "../modals/ContentGroupModal";

interface Panel2Props {
  className?: string;
}

export default function Panel2ContentPlan({ className = "" }: Panel2Props) {
  const [isResearchSelectOpen, setIsResearchSelectOpen] = useState(false);
  const [isContentGroupOpen, setIsContentGroupOpen] = useState(false);

  const { researchHistory, selectedResearchIds } = useKeywordStore();
  const {
    items,
    selectedIds,
    isGenerating,
    generateContent,
    toggleSelection,
    selectAll,
    deselectAll,
  } = useContentStore();
  const { contentPrompts, selectedContentPromptId, setSelectedContentPrompt } = useSettingsStore();

  // Get selected research titles for display
  const selectedResearchTitles = researchHistory
    .filter((r) => selectedResearchIds.has(r.id))
    .map((r) => r.title);

  const handleGenerateContent = async () => {
    if (selectedResearchIds.size === 0) {
      alert("먼저 자료를 선택해주세요.");
      return;
    }
    if (!selectedContentPromptId) {
      alert("짧은지식 프롬프트를 선택해주세요.");
      return;
    }

    // Get the first selected research item's prompt/keyword
    const selectedResearch = researchHistory.find((r) => selectedResearchIds.has(r.id));
    if (!selectedResearch) return;

    await generateContent(selectedResearch.prompt, selectedContentPromptId);
  };

  const handleLoadContentGroup = () => {
    setIsContentGroupOpen(true);
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-green-600" />
          <span className="font-medium text-gray-700">콘텐츠 기획 목록</span>
        </div>

        {/* 자료 선택 */}
        <div className="space-y-2 mb-3">
          <label className="text-xs font-medium text-gray-600">자료 선택</label>
          <button
            onClick={() => setIsResearchSelectOpen(true)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-50"
          >
            <span className={selectedResearchIds.size > 0 ? "text-gray-800" : "text-gray-400"}>
              {selectedResearchIds.size > 0
                ? selectedResearchTitles.join(", ")
                : "자료를 선택하세요"}
            </span>
            <Search className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* 짧은지식 프롬프트 선택 */}
        <div className="space-y-2 mb-3">
          <label className="text-xs font-medium text-gray-600">짧은지식 프롬프트</label>
          <select
            value={selectedContentPromptId || ""}
            onChange={(e) => setSelectedContentPrompt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">프롬프트 선택</option>
            {contentPrompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name}
              </option>
            ))}
          </select>
        </div>

        {/* 콘텐츠 기획하기 버튼 */}
        <button
          onClick={handleGenerateContent}
          disabled={isGenerating || selectedResearchIds.size === 0}
          className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Wand2 className="w-4 h-4" />
          {isGenerating ? "생성 중..." : "콘텐츠 기획하기 (20개)"}
        </button>
      </div>

      {/* 콘텐츠 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 전체 선택 */}
        {items.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-green-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              전체 선택 ({selectedIds.size}/{items.length})
            </button>
          </div>
        )}

        {/* 콘텐츠 아이템 목록 */}
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              onClick={() => toggleSelection(item.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedIds.has(item.id)
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex items-start gap-2">
                {selectedIds.has(item.id) ? (
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-purple-600">
                      #{index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.characterName}의 연구일지 #{item.journalNumber}
                    </span>
                  </div>
                  <div className="font-medium text-sm text-gray-800 mb-1 line-clamp-1">
                    {item.title}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{item.content}</p>
                  <div className="mt-1 text-xs text-gray-400 line-clamp-1">
                    이미지: {item.imageConcept}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              자료를 선택하고 콘텐츠를 기획해보세요
            </div>
          )}
        </div>
      </div>

      {/* 콘텐츠 그룹 불러오기 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLoadContentGroup}
          className="w-full px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
        >
          <Upload className="w-4 h-4" />
          저장된 콘텐츠 불러오기
        </button>
      </div>

      {/* Modals */}
      <ResearchSelectModal
        isOpen={isResearchSelectOpen}
        onClose={() => setIsResearchSelectOpen(false)}
      />
      <ContentGroupModal
        isOpen={isContentGroupOpen}
        onClose={() => setIsContentGroupOpen(false)}
        mode="load"
      />
    </section>
  );
}
