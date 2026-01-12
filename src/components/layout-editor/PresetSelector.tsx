import { useState } from "react";
import { Plus, Trash2, Copy, Check, Save, Loader2 } from "lucide-react";
import { LayoutPreset, ImageSizePreset } from "@/stores/settingsStore";

interface PresetSelectorProps {
  presets: LayoutPreset[];
  selectedPresetId: string;
  currentPreset?: LayoutPreset;
  imageSizePresets?: ImageSizePreset[];
  onSelect: (id: string) => void;
  onAdd?: (name: string, imageSizePresetId: string) => void;
  onDuplicate?: () => void;
  onDelete?: (id: string) => void;
  onSizeChange?: (sizePresetId: string) => void;
  onSave?: () => Promise<void>;
  compact?: boolean;
}

export default function PresetSelector({
  presets,
  selectedPresetId,
  currentPreset,
  imageSizePresets,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onSizeChange,
  onSave,
  compact = false,
}: PresetSelectorProps) {
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAddPreset = () => {
    if (!newPresetName.trim() || !onAdd) return;
    const sizePresetId = currentPreset?.imageSizePresetId || imageSizePresets?.[0]?.id || "";
    onAdd(newPresetName, sizePresetId);
    setNewPresetName("");
    setIsAddingPreset(false);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  if (compact) {
    // Compact mode for Panel4
    return (
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
        <select
          value={selectedPresetId}
          onChange={(e) => onSelect(e.target.value)}
          className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded bg-white"
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} {preset.isDefault && "(기본)"}
            </option>
          ))}
        </select>

        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="복제"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}

        {onSave && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 bg-pink-600 text-white text-xs rounded hover:bg-pink-700 disabled:opacity-50 flex items-center gap-1"
          >
            {saved ? (
              <>
                <Check className="w-3 h-3" />
                저장됨
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                저장중
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                저장
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Full mode for Settings Modal
  return (
    <div className="flex gap-4">
      {/* Layout Preset */}
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-700 mb-2">레이아웃 프리셋</h4>
        {isAddingPreset ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="새 프리셋 이름"
              className="input flex-1 text-sm"
              autoFocus
            />
            <button onClick={handleAddPreset} className="btn btn-primary p-2" title="추가">
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAddingPreset(false)}
              className="btn btn-secondary p-2"
              title="취소"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <select
              value={selectedPresetId}
              onChange={(e) => onSelect(e.target.value)}
              className="input flex-1 text-sm"
            >
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} {preset.isDefault && "(기본)"}
                </option>
              ))}
            </select>
            {onAdd && (
              <button
                onClick={() => setIsAddingPreset(true)}
                className="btn btn-secondary p-2"
                title="새 프리셋 추가"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            {onDuplicate && (
              <button onClick={onDuplicate} className="btn btn-secondary p-2" title="복제">
                <Copy className="w-4 h-4" />
              </button>
            )}
            {onDelete && currentPreset && !currentPreset.isDefault && (
              <button
                onClick={() => onDelete(currentPreset.id)}
                className="btn btn-secondary p-2 text-red-500 hover:bg-red-50"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image Size */}
      {imageSizePresets && onSizeChange && currentPreset && (
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-700 mb-2">이미지 크기</h4>
          <select
            value={currentPreset.imageSizePresetId}
            onChange={(e) => onSizeChange(e.target.value)}
            className="input w-full text-sm"
          >
            {imageSizePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} : {preset.width}x{preset.height}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
