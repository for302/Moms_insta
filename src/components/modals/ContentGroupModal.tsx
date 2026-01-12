import { useState } from "react";
import { useContentStore } from "@/stores/contentStore";
import { useKeywordStore } from "@/stores/keywordStore";
import { X, Save, Upload, FileText, Trash2, Clock } from "lucide-react";

interface ContentGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "save" | "load";
}

export default function ContentGroupModal({ isOpen, onClose, mode }: ContentGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const { contentGroups, saveContentGroup, loadContentGroup, deleteContentGroup, items } =
    useContentStore();
  const { selectedResearchIds } = useKeywordStore();

  if (!isOpen) return null;

  const handleSave = () => {
    if (!groupName.trim()) {
      alert("그룹 이름을 입력해주세요.");
      return;
    }
    if (items.length === 0) {
      alert("저장할 콘텐츠가 없습니다.");
      return;
    }

    saveContentGroup(groupName.trim(), Array.from(selectedResearchIds));
    setGroupName("");
    onClose();
  };

  const handleLoad = (groupId: string) => {
    loadContentGroup(groupId);
    onClose();
  };

  const handleDelete = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("이 콘텐츠 그룹을 삭제하시겠습니까?");
    if (confirmed) {
      deleteContentGroup(groupId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
            {mode === "save" ? (
              <Save className="w-5 h-5 text-green-600" />
            ) : (
              <Upload className="w-5 h-5 text-blue-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-800">
              {mode === "save" ? "콘텐츠 그룹 저장" : "콘텐츠 그룹 불러오기"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === "save" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  그룹 이름
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="예: 판테놀 콘텐츠 시리즈"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p>저장할 콘텐츠: {items.length}개</p>
                <p>연결된 자료조사: {selectedResearchIds.size}개</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {contentGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  저장된 콘텐츠 그룹이 없습니다
                </div>
              ) : (
                contentGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => handleLoad(group.id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <h3 className="font-medium text-gray-800 group-hover:text-blue-700">
                            {group.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>콘텐츠 {group.contents.length}개</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(group.createdAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(group.id, e)}
                        className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {mode === "save" ? (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!groupName.trim() || items.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                저장
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
