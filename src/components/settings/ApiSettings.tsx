import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, Check, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useSettingsStore, ApiKeys } from "@/stores/settingsStore";
import * as tauriApi from "@/services/tauriApi";

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

interface ValidationState {
  google: ValidationStatus;
  openai: ValidationStatus;
  anthropic: ValidationStatus;
}

interface ValidationError {
  google: string;
  openai: string;
  anthropic: string;
}

export default function ApiSettings() {
  const { apiKeys, saveApiKeys } = useSettingsStore();
  const [localKeys, setLocalKeys] = useState<ApiKeys>(apiKeys);
  const [showKeys, setShowKeys] = useState({
    google: false,
    openai: false,
    anthropic: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationState>({
    google: "idle",
    openai: "idle",
    anthropic: "idle",
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError>({
    google: "",
    openai: "",
    anthropic: "",
  });

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveApiKeys(localKeys);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const validateKey = async (provider: "google" | "openai" | "anthropic") => {
    const key = localKeys[provider];
    if (!key.trim()) {
      setValidationErrors((prev) => ({ ...prev, [provider]: "API 키를 입력해주세요." }));
      setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }));
      return;
    }

    setValidationStatus((prev) => ({ ...prev, [provider]: "validating" }));
    setValidationErrors((prev) => ({ ...prev, [provider]: "" }));

    try {
      let isValid = false;
      switch (provider) {
        case "openai":
          isValid = await tauriApi.validateOpenaiKey(key);
          break;
        case "anthropic":
          isValid = await tauriApi.validateAnthropicKey(key);
          break;
        case "google":
          isValid = await tauriApi.validateGoogleKey(key);
          break;
      }

      setValidationStatus((prev) => ({ ...prev, [provider]: isValid ? "valid" : "invalid" }));
      if (!isValid) {
        setValidationErrors((prev) => ({ ...prev, [provider]: "API 키가 유효하지 않습니다." }));
      }
    } catch (error) {
      setValidationStatus((prev) => ({ ...prev, [provider]: "invalid" }));
      // Tauri returns error as string, not Error object
      let errorMessage = "검증 중 오류가 발생했습니다.";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
      setValidationErrors((prev) => ({
        ...prev,
        [provider]: errorMessage,
      }));
    }
  };

  const getValidationIcon = (status: ValidationStatus) => {
    switch (status) {
      case "validating":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "valid":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "invalid":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const hasChanges =
    localKeys.google !== apiKeys.google ||
    localKeys.openai !== apiKeys.openai ||
    localKeys.anthropic !== apiKeys.anthropic;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        각 API 서비스의 키를 입력하세요. API 키는 암호화되어 로컬에 저장됩니다.
      </p>

      {/* Google API Key */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Google API Key
        </label>
        <p className="text-xs text-gray-500">
          Gemini API, Custom Search API에 사용됩니다.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKeys.google ? "text" : "password"}
              value={localKeys.google}
              onChange={(e) => {
                setLocalKeys({ ...localKeys, google: e.target.value });
                setValidationStatus((prev) => ({ ...prev, google: "idle" }));
              }}
              placeholder="Google API 키를 입력하세요"
              className={`input pr-16 ${
                validationStatus.google === "valid"
                  ? "border-green-500"
                  : validationStatus.google === "invalid"
                  ? "border-red-500"
                  : ""
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {getValidationIcon(validationStatus.google)}
              <button
                onClick={() => setShowKeys({ ...showKeys, google: !showKeys.google })}
                className="text-gray-400 hover:text-gray-600"
              >
                {showKeys.google ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={() => validateKey("google")}
            disabled={validationStatus.google === "validating" || !localKeys.google.trim()}
            className="btn btn-secondary whitespace-nowrap"
          >
            {validationStatus.google === "validating" ? "검증 중..." : "검증"}
          </button>
        </div>
        {validationErrors.google && (
          <p className="text-xs text-red-500">{validationErrors.google}</p>
        )}
        {validationStatus.google === "valid" && (
          <p className="text-xs text-green-500">API 키가 유효합니다.</p>
        )}
      </div>

      {/* OpenAI API Key */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          OpenAI API Key
        </label>
        <p className="text-xs text-gray-500">
          GPT 모델, DALL-E 이미지 생성에 사용됩니다.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKeys.openai ? "text" : "password"}
              value={localKeys.openai}
              onChange={(e) => {
                setLocalKeys({ ...localKeys, openai: e.target.value });
                setValidationStatus((prev) => ({ ...prev, openai: "idle" }));
              }}
              placeholder="OpenAI API 키를 입력하세요"
              className={`input pr-16 ${
                validationStatus.openai === "valid"
                  ? "border-green-500"
                  : validationStatus.openai === "invalid"
                  ? "border-red-500"
                  : ""
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {getValidationIcon(validationStatus.openai)}
              <button
                onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
                className="text-gray-400 hover:text-gray-600"
              >
                {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={() => validateKey("openai")}
            disabled={validationStatus.openai === "validating" || !localKeys.openai.trim()}
            className="btn btn-secondary whitespace-nowrap"
          >
            {validationStatus.openai === "validating" ? "검증 중..." : "검증"}
          </button>
        </div>
        {validationErrors.openai && (
          <p className="text-xs text-red-500">{validationErrors.openai}</p>
        )}
        {validationStatus.openai === "valid" && (
          <p className="text-xs text-green-500">API 키가 유효합니다.</p>
        )}
      </div>

      {/* Anthropic API Key */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Anthropic API Key
        </label>
        <p className="text-xs text-gray-500">
          Claude 모델 사용에 필요합니다.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKeys.anthropic ? "text" : "password"}
              value={localKeys.anthropic}
              onChange={(e) => {
                setLocalKeys({ ...localKeys, anthropic: e.target.value });
                setValidationStatus((prev) => ({ ...prev, anthropic: "idle" }));
              }}
              placeholder="Anthropic API 키를 입력하세요"
              className={`input pr-16 ${
                validationStatus.anthropic === "valid"
                  ? "border-green-500"
                  : validationStatus.anthropic === "invalid"
                  ? "border-red-500"
                  : ""
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {getValidationIcon(validationStatus.anthropic)}
              <button
                onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}
                className="text-gray-400 hover:text-gray-600"
              >
                {showKeys.anthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={() => validateKey("anthropic")}
            disabled={validationStatus.anthropic === "validating" || !localKeys.anthropic.trim()}
            className="btn btn-secondary whitespace-nowrap"
          >
            {validationStatus.anthropic === "validating" ? "검증 중..." : "검증"}
          </button>
        </div>
        {validationErrors.anthropic && (
          <p className="text-xs text-red-500">{validationErrors.anthropic}</p>
        )}
        {validationStatus.anthropic === "valid" && (
          <p className="text-xs text-green-500">API 키가 유효합니다.</p>
        )}
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
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
              {isSaving ? "저장 중..." : "저장"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
