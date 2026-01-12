import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Star, Check } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";

export default function ContentPromptSettings() {
  const {
    contentPrompts,
    selectedContentPromptId,
    addContentPrompt,
    updateContentPrompt,
    deleteContentPrompt,
    setSelectedContentPrompt,
  } = useSettingsStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    selectedContentPromptId || contentPrompts[0]?.id || null
  );
  const [editForm, setEditForm] = useState({
    name: "",
    prompt: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedPrompt = contentPrompts.find((p) => p.id === selectedId);

  // Load selected prompt data
  useEffect(() => {
    if (selectedPrompt) {
      setEditForm({
        name: selectedPrompt.name,
        prompt: selectedPrompt.prompt,
      });
    }
  }, [selectedId, selectedPrompt]);

  const handleAdd = () => {
    addContentPrompt({
      name: "새 프롬프트",
      prompt: "",
      isDefault: false,
    });
    // Select the newly added prompt
    setTimeout(() => {
      const prompts = useSettingsStore.getState().contentPrompts;
      const newest = prompts[prompts.length - 1];
      if (newest) {
        setSelectedId(newest.id);
      }
    }, 100);
  };

  const handleSelectPrompt = (id: string) => {
    setSelectedId(id);
    setSelectedContentPrompt(id);
  };

  const handleSave = async () => {
    if (!selectedId) return;

    setIsSaving(true);
    try {
      updateContentPrompt(selectedId, {
        name: editForm.name,
        prompt: editForm.prompt,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedId || selectedPrompt?.isDefault) return;

    deleteContentPrompt(selectedId);

    // Select another prompt
    const remaining = contentPrompts.filter((p) => p.id !== selectedId);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    } else {
      setSelectedId(null);
    }
  };

  return (
    <div className="flex gap-4 h-full min-h-[400px]">
      {/* Left: Prompt List */}
      <div className="w-48 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">프롬프트 목록</h4>
          <button
            onClick={handleAdd}
            className="p-1 text-primary-600 hover:bg-primary-50 rounded"
            title="새 프롬프트 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {contentPrompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleSelectPrompt(prompt.id)}
              className={`w-full text-left p-2 rounded-lg transition-colors ${
                selectedId === prompt.id
                  ? "bg-primary-100 border-primary-300 border"
                  : "hover:bg-gray-100 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                {prompt.isDefault && (
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
                <span className="text-sm truncate">{prompt.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Detail Editor */}
      <div className="flex-1 flex flex-col border-l border-gray-200 pl-4">
        {selectedPrompt ? (
          <>
            {/* Name Input */}
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                프롬프트 이름
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="프롬프트 이름"
                className="input"
                disabled={selectedPrompt.isDefault}
              />
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2 mb-4 flex-1">
              <label className="block text-sm font-medium text-gray-700">
                프롬프트 내용
              </label>
              <textarea
                value={editForm.prompt}
                onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                placeholder="콘텐츠 생성 시 AI에게 전달될 지시사항을 입력하세요"
                className="input resize-none h-48"
              />
              <p className="text-xs text-gray-500">
                팁: 전문가의 페르소나, 타겟 독자, 톤앤매너 등을 명시하면 더 좋은
                결과를 얻을 수 있습니다.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !editForm.name.trim() || !editForm.prompt.trim()}
                className="btn btn-primary flex items-center gap-2"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    저장됨
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    저장
                  </>
                )}
              </button>

              {!selectedPrompt.isDefault && (
                <button
                  onClick={handleDelete}
                  className="btn btn-secondary text-red-600 hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            프롬프트를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
