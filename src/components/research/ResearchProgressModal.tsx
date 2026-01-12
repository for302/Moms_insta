import { X, CheckCircle, Loader2, AlertCircle, Clock } from "lucide-react";
import { useKeywordStore } from "@/stores/keywordStore";

export default function ResearchProgressModal() {
  const { researchProgress, closeProgressModal } = useKeywordStore();

  if (!researchProgress.isOpen) return null;

  const getStatusIcon = (status: "pending" | "loading" | "done" | "error") => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-gray-400" />;
      case "loading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "done":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: "pending" | "loading" | "done" | "error") => {
    switch (status) {
      case "pending":
        return "text-gray-500";
      case "loading":
        return "text-blue-600 font-medium";
      case "done":
        return "text-green-600";
      case "error":
        return "text-red-600";
    }
  };

  const allDone = researchProgress.steps.every(
    (step) => step.status === "done" || step.status === "error"
  );

  const hasError = researchProgress.steps.some((step) => step.status === "error");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={allDone ? closeProgressModal : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[500px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">
            자료조사 진행상황
          </h3>
          {allDone && (
            <button
              onClick={closeProgressModal}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {researchProgress.steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${getStatusColor(step.status)}`}>
                    {step.name}
                  </div>
                  {step.message && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {step.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error message */}
          {researchProgress.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="text-sm text-red-700">{researchProgress.error}</div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            {allDone ? (
              <button
                onClick={closeProgressModal}
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                  hasError
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-primary-500 hover:bg-primary-600"
                }`}
              >
                {hasError ? "확인 (일부 실패)" : "완료"}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>진행 중...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
