import { useState, useEffect } from "react";
import { getSystemFonts } from "@/services/tauriApi";
import { fontOptions as defaultFonts } from "@/constants/layoutEditor";

export function useSystemFonts() {
  const [fonts, setFonts] = useState<string[]>(defaultFonts);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        setIsLoading(true);
        const systemFonts = await getSystemFonts();

        // Combine default fonts with system fonts, removing duplicates
        const allFonts = [...new Set([...defaultFonts, ...systemFonts])];

        // Sort alphabetically
        allFonts.sort((a, b) => a.localeCompare(b, "ko"));

        setFonts(allFonts);
        setError(null);
      } catch (err) {
        console.error("Failed to load system fonts:", err);
        setError(err instanceof Error ? err.message : "폰트 로드 실패");
        // Keep using default fonts on error
      } finally {
        setIsLoading(false);
      }
    }

    loadFonts();
  }, []);

  return { fonts, isLoading, error };
}
