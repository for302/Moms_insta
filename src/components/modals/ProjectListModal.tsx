import { useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { X, FolderOpen, Trash2, Clock } from "lucide-react";

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectListModal({ isOpen, onClose }: ProjectListModalProps) {
  const { projectList, listProjects, loadProject, deleteProject, isLoading } = useProjectStore();

  useEffect(() => {
    if (isOpen) {
      listProjects();
    }
  }, [isOpen, listProjects]);

  if (!isOpen) return null;

  const handleLoadProject = async (projectId: string) => {
    await loadProject(projectId);
    onClose();
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("이 프로젝트를 삭제하시겠습니까?");
    if (confirmed) {
      await deleteProject(projectId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800">프로젝트 불러오기</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 프로젝트 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : projectList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              저장된 프로젝트가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {projectList.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleLoadProject(project.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 group-hover:text-purple-700">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(project.updatedAt)}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-gray-600">
                        <span>자료조사 {project.researchCount}개</span>
                        <span>콘텐츠 {project.contentCount}개</span>
                        <span>이미지 {project.imageCount}개</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
