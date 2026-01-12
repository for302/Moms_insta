import { FileText, Image, CheckSquare, Square, CheckCheck } from "lucide-react";
import { useContentStore } from "@/stores/contentStore";
import { useImageStore } from "@/stores/imageStore";

interface CenterPanelProps {
  className?: string;
}

export default function CenterPanel({ className }: CenterPanelProps) {
  const {
    items,
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll
  } = useContentStore();

  const { generateImages, isGenerating: isGeneratingImages, generationProgress } = useImageStore();

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const handleGenerateImages = async () => {
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      await generateImages(selectedItems.map(item => item.id));
    }
  };

  return (
    <section className={`panel flex flex-col ${className}`}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>콘텐츠 기획 목록</span>
          <span className="text-sm text-gray-500">
            ({selectedIds.size}/{items.length}개 선택)
          </span>
        </div>
        <button
          onClick={allSelected ? deselectAll : selectAll}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <CheckCheck className="w-4 h-4" />
          {allSelected ? "전체 해제" : "전체 선택"}
        </button>
      </div>

      <div className="panel-body flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText className="w-12 h-12 mb-2" />
            <p>키워드를 입력하고 자료 조사를 시작하세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <ContentItem
                key={item.id}
                item={item}
                index={index + 1}
                isSelected={selectedIds.has(item.id)}
                onToggle={() => toggleSelection(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Generate Images Button */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={handleGenerateImages}
          disabled={selectedIds.size === 0 || isGeneratingImages}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <Image className="w-4 h-4" />
          {isGeneratingImages
            ? `이미지 생성 중... (${Math.round(generationProgress)}%)`
            : `이미지 생성하기 (${selectedIds.size}개)`
          }
        </button>
      </div>
    </section>
  );
}

interface ContentItemProps {
  item: {
    id: string;
    title: string;
    characterName: string;
    journalNumber: number;
    content: string;
    imageConcept: string;
    status: 'pending' | 'generating' | 'completed' | 'error';
  };
  index: number;
  isSelected: boolean;
  onToggle: () => void;
}

function ContentItem({ item, index, isSelected, onToggle }: ContentItemProps) {
  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-primary-300 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-1">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded">
              #{index}
            </span>
            <span className="text-xs text-gray-500">
              {item.characterName}의 연구일지
            </span>
          </div>
          <h4 className="font-medium text-gray-800 mb-1 truncate">
            {item.title}
          </h4>
          <p className="text-sm text-gray-600 line-clamp-2">
            {item.content}
          </p>
          <p className="text-xs text-gray-400 mt-2 truncate">
            이미지: {item.imageConcept}
          </p>
        </div>

        {/* Status Indicator */}
        {item.status !== 'pending' && (
          <div className="flex-shrink-0">
            {item.status === 'generating' && (
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            )}
            {item.status === 'completed' && (
              <div className="w-2 h-2 rounded-full bg-green-400" />
            )}
            {item.status === 'error' && (
              <div className="w-2 h-2 rounded-full bg-red-400" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
