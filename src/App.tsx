import { useState } from "react";
import Panel1ProjectResearch from "./components/layout/Panel1ProjectResearch";
import Panel2ContentPlan from "./components/layout/Panel2ContentPlan";
import Panel3ImageSettings from "./components/layout/Panel3ImageSettings";
import Panel4GeneratedImages from "./components/layout/Panel4GeneratedImages";
import SettingsModal from "./components/settings/SettingsModal";
import ResearchProgressModal from "./components/research/ResearchProgressModal";
import ContentProgressModal from "./components/content/ContentProgressModal";
import ImageGenerationProgressModal from "./components/modals/ImageGenerationProgressModal";
import ApiCallPreviewModal from "./components/modals/ApiCallPreviewModal";
import { Settings } from "lucide-react";

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
          <h1 className="text-xl font-bold text-gray-800">
            인스타그램 소재 기획/제작기
          </h1>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="설정"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      {/* Main Content - 4 Panel Layout (비율 기반) */}
      <main className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Panel 1: 프로젝트 + 자료조사 (flex-[0.7]) */}
        <Panel1ProjectResearch className="flex-[0.7] min-w-[280px]" />

        {/* Panel 2: 콘텐츠 기획 목록 (flex-[0.7]) */}
        <Panel2ContentPlan className="flex-[0.7] min-w-[280px]" />

        {/* Panel 3: 이미지 설정 (flex-[0.7]) */}
        <Panel3ImageSettings className="flex-[0.7] min-w-[280px]" />

        {/* Panel 4: 생성된 이미지 (flex-[1.5] - 더 넓게) */}
        <Panel4GeneratedImages className="flex-[1.5] min-w-[360px]" />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Research Progress Modal */}
      <ResearchProgressModal />

      {/* Content Generation Progress Modal */}
      <ContentProgressModal />

      {/* Image Generation Progress Modal */}
      <ImageGenerationProgressModal />

      {/* API Call Preview Modal */}
      <ApiCallPreviewModal />
    </div>
  );
}

export default App;
