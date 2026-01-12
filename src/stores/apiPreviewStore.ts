import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type ApiCallType = "research" | "content" | "image";

export interface ApiCallInfo {
  type: ApiCallType;
  title: string;
  provider: string;
  endpoint: string;
  prompt: string;
  additionalParams?: Record<string, unknown>;
}

interface ApiPreviewState {
  // State
  isOpen: boolean;
  callInfo: ApiCallInfo | null;
  editedPrompt: string;
  isLoading: boolean;

  // Resolve function for the promise
  resolveCallback: ((confirmed: boolean, editedPrompt: string) => void) | null;

  // Actions
  showPreview: (info: ApiCallInfo) => Promise<{ confirmed: boolean; prompt: string }>;
  confirm: () => void;
  cancel: () => void;
  setEditedPrompt: (prompt: string) => void;
  reset: () => void;
}

export const useApiPreviewStore = create<ApiPreviewState>()(
  devtools(
    (set, get) => ({
      // Initial State
      isOpen: false,
      callInfo: null,
      editedPrompt: "",
      isLoading: false,
      resolveCallback: null,

      // Actions
      showPreview: (info: ApiCallInfo) => {
        return new Promise((resolve) => {
          set({
            isOpen: true,
            callInfo: info,
            editedPrompt: info.prompt,
            resolveCallback: (confirmed: boolean, editedPrompt: string) => {
              resolve({ confirmed, prompt: editedPrompt });
            },
          });
        });
      },

      confirm: () => {
        const { resolveCallback, editedPrompt } = get();
        if (resolveCallback) {
          resolveCallback(true, editedPrompt);
        }
        set({
          isOpen: false,
          callInfo: null,
          editedPrompt: "",
          resolveCallback: null,
        });
      },

      cancel: () => {
        const { resolveCallback } = get();
        if (resolveCallback) {
          resolveCallback(false, "");
        }
        set({
          isOpen: false,
          callInfo: null,
          editedPrompt: "",
          resolveCallback: null,
        });
      },

      setEditedPrompt: (prompt: string) => {
        set({ editedPrompt: prompt });
      },

      reset: () => {
        set({
          isOpen: false,
          callInfo: null,
          editedPrompt: "",
          isLoading: false,
          resolveCallback: null,
        });
      },
    }),
    { name: "api-preview-store" }
  )
);
