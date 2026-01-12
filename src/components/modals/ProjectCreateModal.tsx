import { useState } from "react";
import { X, FolderPlus } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectCreateModal({ isOpen, onClose }: ProjectCreateModalProps) {
  const [projectName, setProjectName] = useState("");
  const { createProject, isLoading } = useProjectStore();

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!projectName.trim()) return;

    const confirmed = window.confirm(
      "새 프로젝트를 생성하면 현재 작업이 초기화됩니다. 계속하시겠습니까?"
    );
    if (!confirmed) return;

    await createProject(projectName.trim());
    setProjectName("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && projectName.trim()) {
      handleCreate();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800">새 프로젝트 생성</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            프로젝트 이름
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: 판테놀, 나이아신아마이드"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            autoFocus
          />
          <p className="mt-2 text-xs text-gray-500">
            조사할 화장품 성분이나 주제를 입력하세요.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || !projectName.trim()}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "생성 중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
