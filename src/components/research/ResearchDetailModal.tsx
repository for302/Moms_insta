import { X, FileText, CheckCircle, AlertTriangle, BookOpen, ExternalLink } from "lucide-react";
import { useKeywordStore } from "@/stores/keywordStore";

interface ResearchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResearchDetailModal({ isOpen, onClose }: ResearchDetailModalProps) {
  const { ingredientAnalysis, researchResults } = useKeywordStore();

  if (!isOpen || !ingredientAnalysis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[800px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {ingredientAnalysis.ingredientName}
              </h3>
              <p className="text-sm text-gray-600">{ingredientAnalysis.koreanName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ingredientAnalysis.ewgScore !== undefined && (
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                ingredientAnalysis.ewgScore <= 2 ? "bg-green-100 text-green-700" :
                ingredientAnalysis.ewgScore <= 6 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}>
                EWG 등급: {ingredientAnalysis.ewgScore}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Recommended Concentration */}
          {ingredientAnalysis.recommendedConcentration && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-1">권장 농도</h4>
              <p className="text-blue-700">{ingredientAnalysis.recommendedConcentration}</p>
            </div>
          )}

          {/* Benefits & Cautions Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Benefits */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-800">효능</h4>
              </div>
              <ul className="space-y-2">
                {ingredientAnalysis.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cautions */}
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h4 className="font-medium text-orange-800">주의사항</h4>
              </div>
              <ul className="space-y-2">
                {ingredientAnalysis.cautions.map((caution, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-orange-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    {caution}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Related Papers */}
          {researchResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-primary-600" />
                <h4 className="font-medium text-gray-800">관련 논문 ({researchResults.length}건)</h4>
              </div>
              <div className="space-y-3">
                {researchResults.map((paper) => (
                  <div key={paper.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-800 mb-1 line-clamp-2">
                          {paper.title}
                        </h5>
                        <p className="text-xs text-gray-500 mb-2">
                          {paper.authors.slice(0, 3).join(", ")}
                          {paper.authors.length > 3 && ` 외 ${paper.authors.length - 3}명`}
                          {paper.publicationDate && ` (${paper.publicationDate})`}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {paper.abstract}
                        </p>
                      </div>
                      {paper.doi && (
                        <a
                          href={paper.doi}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                          title="논문 보기"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {paper.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
