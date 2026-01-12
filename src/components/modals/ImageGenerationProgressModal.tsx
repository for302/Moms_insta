import { useState } from "react";
import { useImageStore } from "@/stores/imageStore";
import { X, Image, Check, Loader2, AlertCircle, ChevronDown, ChevronUp, Copy } from "lucide-react";

export default function ImageGenerationProgressModal() {
  const { generationStatus, isGenerating, closeGenerationModal } = useImageStore();
  const [showApiDetails, setShowApiDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!generationStatus.isOpen) return null;

  const progress =
    generationStatus.total > 0
      ? Math.round((generationStatus.currentIndex / generationStatus.total) * 100)
      : 0;

  const isComplete = !isGenerating && generationStatus.currentIndex === generationStatus.total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isComplete ? closeGenerationModal : undefined}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-pink-50">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-800">이미지 생성 중</h2>
          </div>
          {isComplete && (
            <button
              onClick={closeGenerationModal}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* 진행 상황 */}
        <div className="p-6 space-y-6">
          {/* 진행률 바 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">진행률</span>
              <span className="font-medium text-gray-800">
                {generationStatus.currentIndex} / {generationStatus.total}
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-sm text-gray-500">{progress}%</div>
          </div>

          {/* 현재 생성 중인 콘텐츠 */}
          {isGenerating && generationStatus.currentContentTitle && (
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
              <div>
                <div className="text-sm font-medium text-orange-800">생성 중...</div>
                <div className="text-sm text-orange-600">
                  {generationStatus.currentContentTitle}
                </div>
              </div>
            </div>
          )}

          {/* 완료된 이미지 목록 */}
          {generationStatus.completedImages.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">완료된 이미지</div>
              <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                {generationStatus.completedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-400"
                  >
                    <img
                      src={image.url}
                      alt={`Generated ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {generationStatus.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{generationStatus.error}</span>
            </div>
          )}

          {/* 완료 메시지 */}
          {isComplete && (
            <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
              <Check className="w-5 h-5" />
              <span className="font-medium">
                {generationStatus.total}개의 이미지 생성이 완료되었습니다!
              </span>
            </div>
          )}

          {/* 실제 API 호출 정보 (완료 후 표시) */}
          {isComplete && generationStatus.actualApiCallInfo && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowApiDetails(!showApiDetails)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  실제 API 호출 정보
                </span>
                {showApiDetails ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {showApiDetails && (
                <div className="p-4 space-y-3 bg-white">
                  {/* API 정보 요약 */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Provider:</span>{" "}
                      <span className="font-medium">{generationStatus.actualApiCallInfo.provider}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Model:</span>{" "}
                      <span className="font-medium">{generationStatus.actualApiCallInfo.model}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Aspect Ratio:</span>{" "}
                      <span className="font-medium">{generationStatus.actualApiCallInfo.aspectRatio}</span>
                    </div>
                  </div>

                  {/* 스타일 프롬프트 */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">스타일 프롬프트:</div>
                    <div className="text-sm bg-gray-50 p-2 rounded border border-gray-200 max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {generationStatus.actualApiCallInfo.stylePrompt || "(없음)"}
                    </div>
                  </div>

                  {/* 네거티브 프롬프트 */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">네거티브 프롬프트:</div>
                    <div className="text-sm bg-gray-50 p-2 rounded border border-gray-200 max-h-16 overflow-y-auto">
                      {generationStatus.actualApiCallInfo.negativePrompt || "(없음)"}
                    </div>
                  </div>

                  {/* 이미지 콘셉트 목록 */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">이미지 콘셉트:</div>
                    <div className="text-sm bg-gray-50 p-2 rounded border border-gray-200 max-h-32 overflow-y-auto space-y-1">
                      {generationStatus.actualApiCallInfo.requests.map((req, i) => (
                        <div key={req.contentId} className="text-xs">
                          <span className="text-gray-400">{i + 1}.</span> {req.imageConcept}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 복사 버튼 */}
                  <button
                    onClick={async () => {
                      const info = generationStatus.actualApiCallInfo;
                      if (!info) return;
                      const text = JSON.stringify(info, null, 2);
                      await navigator.clipboard.writeText(text);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>API 호출 정보 복사</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={closeGenerationModal}
            disabled={isGenerating}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              isGenerating
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            {isGenerating ? "생성 중..." : "닫기"}
          </button>
        </div>
      </div>
    </div>
  );
}
