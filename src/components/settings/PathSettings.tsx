import { useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { open } from "@tauri-apps/plugin-dialog";

export default function PathSettings() {
  const { savePath, setSavePath } = useSettingsStore();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectFolder = async () => {
    try {
      setIsSelecting(true);
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: savePath || undefined,
        title: "이미지 저장 폴더 선택",
      });
      if (selected && typeof selected === "string") {
        await setSavePath(selected);
      }
    } catch (error) {
      console.error("폴더 선택 오류:", error);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        생성된 이미지가 저장될 기본 경로를 설정하세요.
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          이미지 저장 경로
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={savePath}
            onChange={(e) => setSavePath(e.target.value)}
            placeholder="저장 경로를 선택하세요"
            className="input flex-1"
            readOnly
          />
          <button
            onClick={handleSelectFolder}
            disabled={isSelecting}
            className="btn btn-secondary"
          >
            {isSelecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FolderOpen className="w-4 h-4 mr-2" />
            )}
            {isSelecting ? "선택 중..." : "폴더 선택"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          이미지는 날짜/키워드별 하위 폴더에 자동으로 정리됩니다.
          <br />
          예: {savePath || "[저장경로]"}/2024-01-15/판테놀/carousel_01.png
        </p>
      </div>

      {/* Preview of folder structure */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          폴더 구조 미리보기
        </h4>
        <div className="font-mono text-xs text-gray-600 space-y-1">
          <div>{savePath || "[저장경로]"}/</div>
          <div className="pl-4">├── 2024-01-15/</div>
          <div className="pl-8">├── 판테놀/</div>
          <div className="pl-12">├── carousel_01.png</div>
          <div className="pl-12">├── carousel_02.png</div>
          <div className="pl-12">└── ...</div>
          <div className="pl-8">└── 나이아신아마이드/</div>
          <div className="pl-12">└── ...</div>
          <div className="pl-4">└── 2024-01-16/</div>
          <div className="pl-8">└── ...</div>
        </div>
      </div>
    </div>
  );
}
