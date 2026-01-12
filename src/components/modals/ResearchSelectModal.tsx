import { useKeywordStore } from "@/stores/keywordStore";
import { X, BookOpen, Check, Square, CheckSquare } from "lucide-react";

interface ResearchSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResearchSelectModal({ isOpen, onClose }: ResearchSelectModalProps) {
  const {
    researchHistory,
    selectedResearchIds,
    toggleResearchSelection,
    clearResearchSelection,
  } = useKeywordStore();

  if (!isOpen) return null;

  const allSelected =
    researchHistory.length > 0 && selectedResearchIds.size === researchHistory.length;

  const handleSelectAll = () => {
    if (allSelected) {
      clearResearchSelection();
    } else {
      researchHistory.forEach((item) => {
        if (!selectedResearchIds.has(item.id)) {
          toggleResearchSelection(item.id);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[500px] max-h-[70vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">자료 선택</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 전체 선택 */}
        {researchHistory.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-green-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              전체 선택 ({selectedResearchIds.size}/{researchHistory.length})
            </button>
          </div>
        )}

        {/* 자료 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {researchHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              자료조사 기록이 없습니다.
              <br />
              먼저 자료조사를 진행해주세요.
            </div>
          ) : (
            <div className="space-y-2">
              {researchHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleResearchSelection(item.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedResearchIds.has(item.id)
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selectedResearchIds.has(item.id) ? (
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>논문 {item.fullReport.papers.length}개</span>
                        {item.fullReport.ingredientAnalysis && (
                          <span>
                            EWG {item.fullReport.ingredientAnalysis.ewgScore ?? "N/A"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={clearResearchSelection}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              선택 해제
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              확인 ({selectedResearchIds.size}개 선택)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
