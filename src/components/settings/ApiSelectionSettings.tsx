import { useSettingsStore } from "@/stores/settingsStore";

export default function ApiSelectionSettings() {
  const { apiSelection, setApiSelection, apiKeys } = useSettingsStore();

  const contentProviders = [
    {
      id: "anthropic" as const,
      name: "Anthropic (Claude)",
      description: "Claude 3.5 Sonnet - 뛰어난 한국어 이해력",
      hasKey: !!apiKeys.anthropic,
    },
    {
      id: "openai" as const,
      name: "OpenAI (GPT)",
      description: "GPT-4 - 다양한 스타일 생성",
      hasKey: !!apiKeys.openai,
    },
    {
      id: "google" as const,
      name: "Google (Gemini)",
      description: "Gemini 1.5 Flash - 빠른 응답 속도",
      hasKey: !!apiKeys.google,
    },
  ];

  const imageProviders = [
    {
      id: "google" as const,
      name: "Google (Gemini)",
      description: "Gemini 2.5 Flash Image - 빠르고 경제적",
      hasKey: !!apiKeys.google,
    },
    {
      id: "openai" as const,
      name: "OpenAI (DALL-E)",
      description: "DALL-E 3 - 고품질 이미지 생성",
      hasKey: !!apiKeys.openai,
    },
  ];

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-600">
        콘텐츠 기획과 이미지 생성에 사용할 API를 선택하세요.
      </p>

      {/* Content Generation API */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800">콘텐츠 기획 API</h4>
        <p className="text-xs text-gray-500">
          짧은 지식 콘텐츠를 생성할 때 사용됩니다.
        </p>
        <div className="space-y-2">
          {contentProviders.map((provider) => (
            <label
              key={provider.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                apiSelection.contentApi === provider.id
                  ? "border-primary-300 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300"
              } ${!provider.hasKey ? "opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="content-api"
                value={provider.id}
                checked={apiSelection.contentApi === provider.id}
                onChange={() =>
                  setApiSelection({
                    ...apiSelection,
                    contentApi: provider.id,
                  })
                }
                disabled={!provider.hasKey}
                className="w-4 h-4 text-primary-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800">{provider.name}</div>
                <div className="text-xs text-gray-500">
                  {provider.description}
                </div>
              </div>
              {!provider.hasKey && (
                <span className="text-xs text-red-500">API 키 필요</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Image Generation API */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800">이미지 생성 API</h4>
        <p className="text-xs text-gray-500">
          캐러셀 이미지를 생성할 때 사용됩니다.
        </p>
        <div className="space-y-2">
          {imageProviders.map((provider) => (
            <label
              key={provider.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                apiSelection.imageApi === provider.id
                  ? "border-primary-300 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300"
              } ${!provider.hasKey ? "opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="image-api"
                value={provider.id}
                checked={apiSelection.imageApi === provider.id}
                onChange={() =>
                  setApiSelection({
                    ...apiSelection,
                    imageApi: provider.id,
                  })
                }
                disabled={!provider.hasKey}
                className="w-4 h-4 text-primary-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800">{provider.name}</div>
                <div className="text-xs text-gray-500">
                  {provider.description}
                </div>
              </div>
              {!provider.hasKey && (
                <span className="text-xs text-red-500">API 키 필요</span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
