# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tauri v2 desktop application for creating Instagram cosmetic ingredient carousel content. The app helps users research cosmetic ingredients (via PubMed papers and AI analysis), generate content plans using LLMs, and create styled images with text overlays.

Korean name: "인스타그램 소재 기획/제작기" (Instagram Content Planner/Maker)

## Development Commands

```bash
# Start development server (frontend + Tauri dev window)
npm run tauri dev

# Build for production
npm run tauri build

# Frontend only (Vite dev server at localhost:1420)
npm run dev

# Type check
npm run build  # runs tsc && vite build
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Tauri v2 (Rust) with tokio async runtime
- **State Management**: Zustand with devtools/persist middleware
- **External APIs**: OpenAI, Anthropic Claude, Google Imagen/Gemini, PubMed

### Key Directories
```
src/                    # React frontend
  components/
    layout/             # Main 4-panel UI (Panel1-4)
    modals/             # Dialog components
    settings/           # Settings panel components
    layout-editor/      # Canvas layout editor for image overlays
  stores/               # Zustand stores
  services/tauriApi.ts  # All Tauri invoke() calls

src-tauri/              # Rust backend
  src/
    commands/           # Tauri command handlers (invoke targets)
    services/           # External API integrations (openai, anthropic, google, pubmed)
    models/             # Shared data types
    error.rs            # Custom error types
    lib.rs              # Tauri app setup and command registration
```

### Data Flow

1. **Projects**: Central data unit containing research items, content groups, and generated images
2. **Stores**:
   - `projectStore` - Project CRUD, syncs with other stores on load
   - `keywordStore` - Research history and paper results
   - `contentStore` - Content items and content groups
   - `imageStore` - Generated images
   - `settingsStore` - API keys, prompts, layout presets (persisted to localStorage)

3. **Frontend → Backend**: All backend calls go through `src/services/tauriApi.ts` which wraps Tauri's `invoke()`. The API uses snake_case for Rust backend compatibility.

### UI Structure

4-panel layout (flex-based):
- Panel 1: Project selection + Research (ingredient analysis, paper search)
- Panel 2: Content planning (LLM-generated content items)
- Panel 3: Image settings (prompt selection, layout editor)
- Panel 4: Generated images gallery

### Layout Editor

The layout editor (`src/components/layout-editor/`) allows drag-and-drop positioning of text/image/shape elements on a canvas. Elements are stored in `LayoutPreset` structures with percentage-based positioning.

## Type Conventions

- Frontend uses camelCase, backend uses snake_case
- `tauriApi.ts` contains interface definitions that bridge both conventions
- Layout elements use percentage-based coordinates (0-100) for responsive sizing

## Path Alias

TypeScript/Vite configured with `@/` alias pointing to `src/` directory.
