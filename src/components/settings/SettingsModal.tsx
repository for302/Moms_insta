import { useState, useEffect } from "react";
import {
  X,
  Key,
  Image,
  FileText,
  FolderOpen,
  Settings2,
  LayoutGrid,
  Type,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import ApiSettings from "./ApiSettings";
import ImagePromptSettings from "./ImagePromptSettings";
import ContentPromptSettings from "./ContentPromptSettings";
import PathSettings from "./PathSettings";
import ApiSelectionSettings from "./ApiSelectionSettings";
import LayoutSettingsComponent from "./LayoutSettings";
import FontSettings from "./FontSettings";

export type SettingsTab =
  | "api-keys"
  | "api-selection"
  | "image-prompts"
  | "content-prompts"
  | "layout-settings"
  | "font-settings"
  | "save-path";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "layout-settings",
    label: "이미지 배치 설정",
    icon: <LayoutGrid className="w-4 h-4" />,
  },
  {
    id: "font-settings",
    label: "폰트 설정",
    icon: <Type className="w-4 h-4" />,
  },
  {
    id: "image-prompts",
    label: "이미지 프롬프트",
    icon: <Image className="w-4 h-4" />,
  },
  {
    id: "content-prompts",
    label: "짧은지식 프롬프트",
    icon: <FileText className="w-4 h-4" />,
  },
  { id: "save-path", label: "저장 경로", icon: <FolderOpen className="w-4 h-4" /> },
  { id: "api-keys", label: "API 키", icon: <Key className="w-4 h-4" /> },
  {
    id: "api-selection",
    label: "API 연동",
    icon: <Settings2 className="w-4 h-4" />,
  },
];

export default function SettingsModal({ isOpen, onClose, initialTab }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || "layout-settings");
  const { loadSettings, isLoaded } = useSettingsStore();

  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (isOpen && !isLoaded) {
      loadSettings();
    }
  }, [isOpen, isLoaded, loadSettings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[1350px] max-w-[95vw] h-[85vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-gray-50 border-r border-gray-200 p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">설정</h2>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary-100 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tab Content - pr-4 for scrollbar space */}
          <div className="flex-1 overflow-y-auto p-6 pr-4">
            {activeTab === "api-keys" && <ApiSettings />}
            {activeTab === "api-selection" && <ApiSelectionSettings />}
            {activeTab === "image-prompts" && <ImagePromptSettings />}
            {activeTab === "content-prompts" && <ContentPromptSettings />}
            {activeTab === "layout-settings" && <LayoutSettingsComponent />}
            {activeTab === "font-settings" && <FontSettings />}
            {activeTab === "save-path" && <PathSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
