import { useState } from "react";
import { Search, Sparkles, BookOpen, ImageIcon, Star, CheckCircle, AlertTriangle, FileText, Eye, Wand2 } from "lucide-react";
import { useKeywordStore } from "@/stores/keywordStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useContentStore } from "@/stores/contentStore";
import { convertFileSrc } from "@tauri-apps/api/core";
import ResearchDetailModal from "../research/ResearchDetailModal";

interface LeftPanelProps {
  className?: string;
}

export default function LeftPanel({ className }: LeftPanelProps) {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const {
    keyword,
    setKeyword,
    suggestions,
    isLoadingSuggestions,
    isLoadingResearch,
    fetchSuggestions,
    startResearch,
    selectSuggestion,
    ingredientAnalysis,
    researchResults
  } = useKeywordStore();

  const { imagePrompts, selectedImagePromptId, setSelectedImagePrompt, selectedContentPromptId } = useSettingsStore();
  const { generateContent, isGenerating } = useContentStore();

  const handleGenerateContent = () => {
    if (keyword.trim() && selectedContentPromptId) {
      generateContent(keyword, selectedContentPromptId);
    }
  };

  const getImageSrc = (path: string) => {
    try {
      return convertFileSrc(path);
    } catch {
      return path;
    }
  };

  return (
    <aside className={`panel flex flex-col ${className}`}>
      <div className="panel-header flex items-center gap-2">
        <Search className="w-4 h-4" />
        <span>키워드 입력</span>
      </div>

      <div className="panel-body flex flex-col gap-4 flex-1 overflow-y-auto">
        {/* Keyword Input */}
        <div className="space-y-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="성분명을 입력하세요 (예: 판테놀)"
            className="input"
          />
          <button
            onClick={fetchSuggestions}
            disabled={isLoadingSuggestions || !keyword.trim()}
            className="btn btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isLoadingSuggestions ? "검색 중..." : "키워드 제안"}
          </button>
        </div>

        {/* Keyword Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">추천 키워드</label>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => selectSuggestion(suggestion.keyword)}
                  className="tag"
                >
                  {suggestion.keyword}
                  {suggestion.trend === 'hot' && (
                    <span className="ml-1 text-red-500">HOT</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Research Button */}
        <button
          onClick={startResearch}
          disabled={isLoadingResearch || !keyword.trim()}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          {isLoadingResearch ? "조사 중..." : "자료 조사"}
        </button>

        {/* Prompt Selector - Thumbnail Card Grid */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">이미지 프롬프트</label>
          <div className="grid grid-cols-2 gap-2">
            {imagePrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedImagePrompt(prompt.id)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                  prompt.id === selectedImagePromptId
                    ? "border-primary-500 ring-2 ring-primary-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Preview Image or Placeholder */}
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  {prompt.previewImagePath ? (
                    <img
                      src={getImageSrc(prompt.previewImagePath)}
                      alt={prompt.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>

                {/* Default Badge */}
                {prompt.isDefault && (
                  <div className="absolute top-1 right-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  </div>
                )}

                {/* Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <span className="text-xs text-white truncate block">
                    {prompt.name}
                  </span>
                </div>

                {/* Selection Indicator */}
                {prompt.id === selectedImagePromptId && (
                  <div className="absolute top-1 left-1 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Research Results Preview */}
        {ingredientAnalysis && (
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-gray-700">자료조사 결과</span>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(true)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 hover:underline"
              >
                <Eye className="w-3 h-3" />
                전체 보기
              </button>
            </div>

            {/* Ingredient Info */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">
                  {ingredientAnalysis.ingredientName}
                </h4>
                {ingredientAnalysis.ewgScore !== undefined && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    ingredientAnalysis.ewgScore <= 2 ? "bg-green-100 text-green-700" :
                    ingredientAnalysis.ewgScore <= 6 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    EWG {ingredientAnalysis.ewgScore}
                  </span>
                )}
              </div>
              {ingredientAnalysis.recommendedConcentration && (
                <p className="text-xs text-gray-600">
                  권장 농도: {ingredientAnalysis.recommendedConcentration}
                </p>
              )}
            </div>

            {/* Benefits */}
            {ingredientAnalysis.benefits.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  <span>효능</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-0.5 pl-4">
                  {ingredientAnalysis.benefits.map((benefit, idx) => (
                    <li key={idx} className="list-disc">{benefit}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cautions */}
            {ingredientAnalysis.cautions.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>주의사항</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-0.5 pl-4">
                  {ingredientAnalysis.cautions.map((caution, idx) => (
                    <li key={idx} className="list-disc">{caution}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Papers Count */}
            {researchResults.length > 0 && (
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                관련 논문 {researchResults.length}건 발견
              </div>
            )}

            {/* Generate Content Button */}
            <button
              onClick={handleGenerateContent}
              disabled={isGenerating || !keyword.trim()}
              className="btn btn-primary w-full flex items-center justify-center gap-2 mt-4"
            >
              <Wand2 className="w-4 h-4" />
              {isGenerating ? "생성 중..." : "콘텐츠 생성하기"}
            </button>
          </div>
        )}
      </div>

      {/* Research Detail Modal */}
      <ResearchDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </aside>
  );
}
