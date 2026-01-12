import { useState } from "react";
import { useApiPreviewStore } from "@/stores/apiPreviewStore";
import { X, Send, Code, FileText, Image, Search, AlertTriangle, Copy, Check, Edit3 } from "lucide-react";

export default function ApiCallPreviewModal() {
  const {
    isOpen,
    callInfo,
    editedPrompt,
    setEditedPrompt,
    confirm,
    cancel,
  } = useApiPreviewStore();

  const [copied, setCopied] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen || !callInfo) return null;

  const handlePromptSave = () => {
    setPromptSaved(true);
    setIsEditing(false);
    setTimeout(() => setPromptSaved(false), 2000);
  };

  const handlePromptChange = (value: string) => {
    setEditedPrompt(value);
    setIsEditing(true);
    setPromptSaved(false);
  };

  const handleCopyApiRequest = async () => {
    // Generate API request object
    const apiRequest = {
      provider: callInfo.provider,
      endpoint: callInfo.endpoint,
      type: callInfo.type,
      prompt: editedPrompt,
      ...(callInfo.additionalParams && { parameters: callInfo.additionalParams }),
    };

    const requestJson = JSON.stringify(apiRequest, null, 2);

    try {
      await navigator.clipboard.writeText(requestJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("클립보드 복사에 실패했습니다.");
    }
  };

  const getTypeIcon = () => {
    switch (callInfo.type) {
      case "research":
        return <Search className="w-5 h-5 text-blue-600" />;
      case "content":
        return <FileText className="w-5 h-5 text-green-600" />;
      case "image":
        return <Image className="w-5 h-5 text-orange-600" />;
      default:
        return <Code className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = () => {
    switch (callInfo.type) {
      case "research":
        return "from-blue-50 to-indigo-50";
      case "content":
        return "from-green-50 to-emerald-50";
      case "image":
        return "from-orange-50 to-amber-50";
      default:
        return "from-gray-50 to-slate-50";
    }
  };

  const getButtonColor = () => {
    switch (callInfo.type) {
      case "research":
        return "bg-blue-600 hover:bg-blue-700";
      case "content":
        return "bg-green-600 hover:bg-green-700";
      case "image":
        return "bg-orange-600 hover:bg-orange-700";
      default:
        return "bg-gray-600 hover:bg-gray-700";
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={cancel} />

      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r ${getTypeColor()}`}>
          <div className="flex items-center gap-3">
            {getTypeIcon()}
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                API 호출 확인
              </h2>
              <p className="text-sm text-gray-600">{callInfo.title}</p>
            </div>
          </div>
          <button
            onClick={cancel}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* API 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Provider
              </label>
              <span className="text-sm font-medium text-gray-800">
                {callInfo.provider}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Endpoint / Type
              </label>
              <span className="text-sm font-medium text-gray-800">
                {callInfo.endpoint}
              </span>
            </div>
          </div>

          {/* 프롬프트 편집 영역 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                프롬프트 / 요청 내용
              </label>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <span className="text-xs text-orange-500 font-medium">
                    수정 중...
                  </span>
                )}
                {promptSaved && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    수정 완료!
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {editedPrompt.length}자
                </span>
              </div>
            </div>
            <textarea
              value={editedPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className={`w-full h-64 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm ${
                isEditing ? "border-orange-400 bg-orange-50/30" : "border-gray-300"
              }`}
              placeholder="프롬프트 내용..."
            />
            {/* 프롬프트 수정 완료 버튼 */}
            <div className="flex justify-end">
              <button
                onClick={handlePromptSave}
                disabled={!isEditing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isEditing
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                프롬프트 수정 완료
              </button>
            </div>
          </div>

          {/* 추가 파라미터 */}
          {callInfo.additionalParams && Object.keys(callInfo.additionalParams).length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                추가 파라미터
              </label>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(callInfo.additionalParams, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* 경고 */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-700">
              확인 버튼을 누르면 위 내용으로 API가 호출됩니다.
              프롬프트를 수정하면 수정된 내용으로 호출됩니다.
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={cancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleCopyApiRequest}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  복사됨!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  API 요청 코드 복사
                </>
              )}
            </button>
            <button
              onClick={confirm}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${getButtonColor()}`}
            >
              <Send className="w-4 h-4" />
              확인 및 호출
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
