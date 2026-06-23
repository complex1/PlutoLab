import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PANEL_TEMPLATES } from "./constants";
import { exportFullGridPng, exportPanelPng, exportPdf, exportProjectJson, exportZip } from "./exportUtils";
import {
  createPanel,
  createProject,
  createScene,
  duplicatePanel,
  getAllPanelsOrdered,
  getCanvasSize,
  getSortedPanels,
  getSortedScenes,
  movePanel,
  reorderPanels,
  touchPanel,
  touchProject,
} from "./projectUtils";
import {
  deleteProject,
  duplicateProject,
  importProjectJson,
  listProjects,
  loadProject,
  saveProject,
} from "./storage";
import type {
  AspectRatio,
  BrushSettings,
  DashboardSection,
  DrawStroke,
  DrawTool,
  EditorTab,
  EditorView,
  ExportConfig,
  Panel,
  PanelEditorTab,
  ProjectMeta,
  SaveStatus,
  StoryboardProject,
} from "./types";

const DEFAULT_EXPORT: ExportConfig = {
  range: "all",
  format: "pdf",
  includeNotes: true,
  includeSceneTitles: true,
  includeDurations: true,
  pdfPanelsPerPage: 4,
  quality: "high",
};

export function useStoryboard() {
  const [screen, setScreen] = useState<"dashboard" | "editor">("dashboard");
  const [editorView, setEditorView] = useState<EditorView>("grid");
  const [project, setProject] = useState<StoryboardProject | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectMeta[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [panelSearch, setPanelSearch] = useState("");
  const [gridZoom, setGridZoom] = useState(100);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT);
  const [panelEditorTab, setPanelEditorTab] = useState<PanelEditorTab>("notes");
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>("projects");
  const [projectSearch, setProjectSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState<EditorTab>("panels");
  const [drawTool, setDrawTool] = useState<DrawTool>("pencil");
  const [brush, setBrush] = useState<BrushSettings>({
    color: "#1a1d26",
    size: 3,
    opacity: 1,
    soft: true,
  });
  const [undoStack, setUndoStack] = useState<DrawStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawStroke[][]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPanel = project?.panels.find((p) => p.id === selectedPanelId) ?? null;
  const orderedPanels = project ? getAllPanelsOrdered(project) : [];

  const refreshRecent = useCallback(() => {
    void listProjects().then(setRecentProjects);
  }, []);

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  const scheduleSave = useCallback(
    (next: StoryboardProject) => {
      setSaveStatus("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveStatus("saving");
        const touched = touchProject(next);
        await saveProject(touched);
        setProject(touched);
        setSaveStatus("saved");
        refreshRecent();
      }, 1500);
    },
    [refreshRecent]
  );

  const updateProject = useCallback(
    (updater: (p: StoryboardProject) => StoryboardProject) => {
      setProject((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const newProject = useCallback(
    (title: string, description: string, aspectRatio: AspectRatio, customW?: number, customH?: number) => {
      const p = createProject(title, description, aspectRatio, customW, customH);
      setProject(p);
      setSelectedPanelId(p.panels[0]?.id ?? null);
      setScreen("editor");
      scheduleSave(p);
      refreshRecent();
    },
    [refreshRecent, scheduleSave]
  );

  const openProject = useCallback(async (id: string) => {
    const p = await loadProject(id);
    if (!p) return;
    setProject(p);
    setSelectedPanelId(p.panels[0]?.id ?? null);
    setSelectedSceneId(p.scenes[0]?.id ?? null);
    setEditorView("grid");
    setScreen("editor");
    setSaveStatus("saved");
  }, []);

  const closeEditor = useCallback(() => {
    setScreen("dashboard");
    setProject(null);
    setSelectedPanelId(null);
    refreshRecent();
  }, [refreshRecent]);

  const saveNow = useCallback(async () => {
    if (!project) return;
    setSaveStatus("saving");
    const touched = touchProject(project);
    await saveProject(touched);
    setProject(touched);
    setSaveStatus("saved");
    refreshRecent();
  }, [project, refreshRecent]);

  const removeProject = useCallback(
    async (id: string) => {
      await deleteProject(id);
      refreshRecent();
      if (project?.id === id) closeEditor();
    },
    [closeEditor, project?.id, refreshRecent]
  );

  const duplicateProjectHandler = useCallback(
    async (id: string) => {
      const copy = await duplicateProject(id);
      refreshRecent();
      if (copy) await openProject(copy.id);
    },
    [openProject, refreshRecent]
  );

  const importProject = useCallback(
    async (file: File) => {
      const p = await importProjectJson(file);
      setProject(p);
      setSelectedPanelId(p.panels[0]?.id ?? null);
      setScreen("editor");
      refreshRecent();
    },
    [refreshRecent]
  );

  const addScene = useCallback(() => {
    updateProject((p) => {
      const scenes = getSortedScenes(p);
      const scene = createScene(`Scene ${scenes.length + 1}`, scenes.length + 1);
      return { ...p, scenes: [...p.scenes, scene] };
    });
  }, [updateProject]);

  const updateScene = useCallback(
    (sceneId: string, changes: Partial<{ title: string; description: string; collapsed: boolean }>) => {
      updateProject((p) => ({
        ...p,
        scenes: p.scenes.map((s) => (s.id === sceneId ? { ...s, ...changes } : s)),
      }));
    },
    [updateProject]
  );

  const deleteScene = useCallback(
    (sceneId: string) => {
      if (!project || project.scenes.length <= 1) return;

      if (selectedSceneId === sceneId) {
        setSelectedSceneId(null);
      }

      updateProject((p) => {
        const remainingScenes = p.scenes.filter((s) => s.id !== sceneId);
        const fallbackScene = remainingScenes[0];
        if (!fallbackScene) return p;

        const panels = p.panels.map((panel) =>
          panel.sceneId === sceneId ? { ...panel, sceneId: fallbackScene.id } : panel
        );

        return {
          ...p,
          scenes: remainingScenes,
          panels,
        };
      });
    },
    [project, selectedSceneId, updateProject]
  );

  const addPanel = useCallback(
    (sceneId?: string, templateId?: string, afterPanelId?: string) => {
      updateProject((p) => {
        const targetSceneId = sceneId ?? p.scenes[0]?.id;
        if (!targetSceneId) return p;
        const template = PANEL_TEMPLATES.find((t) => t.id === templateId);
        const scenePanels = getSortedPanels(p, targetSceneId);
        let order = scenePanels.length + 1;
        if (afterPanelId) {
          const after = p.panels.find((panel) => panel.id === afterPanelId);
          if (after) order = after.order + 1;
        }
        const panel = createPanel(targetSceneId, order, {
          title: `Panel ${String(order).padStart(2, "0")}`,
          shotType: template?.shotType ?? "wide-shot",
          cameraAngle: template?.cameraAngle ?? "eye-level",
        });
        const shifted = p.panels.map((existing) =>
          existing.sceneId === targetSceneId && existing.order >= order
            ? { ...existing, order: existing.order + 1 }
            : existing
        );
        setSelectedPanelId(panel.id);
        return { ...p, panels: [...shifted, panel] };
      });
    },
    [updateProject]
  );

  const updatePanel = useCallback(
    (panelId: string, changes: Partial<Panel>) => {
      updateProject((p) => ({
        ...p,
        panels: p.panels.map((panel) =>
          panel.id === panelId ? touchPanel(panel, changes) : panel
        ),
      }));
    },
    [updateProject]
  );

  const deletePanel = useCallback(
    (panelId: string) => {
      updateProject((p) => {
        const remaining = p.panels.filter((panel) => panel.id !== panelId);
        if (selectedPanelId === panelId) {
          setSelectedPanelId(remaining[0]?.id ?? null);
        }
        return { ...p, panels: remaining.map((panel, i) => ({ ...panel, order: i + 1 })) };
      });
    },
    [selectedPanelId, updateProject]
  );

  const duplicatePanelHandler = useCallback(
    (panelId: string) => {
      updateProject((p) => {
        const source = p.panels.find((panel) => panel.id === panelId);
        if (!source) return p;
        const copy = duplicatePanel(source, source.order + 1);
        const shifted = p.panels.map((panel) =>
          panel.sceneId === source.sceneId && panel.order > source.order
            ? { ...panel, order: panel.order + 1 }
            : panel
        );
        setSelectedPanelId(copy.id);
        return { ...p, panels: [...shifted, copy] };
      });
    },
    [updateProject]
  );

  const clearPanel = useCallback(
    (panelId: string) => {
      updatePanel(panelId, {
        strokes: [],
        imageData: null,
        backgroundImage: null,
        action: "",
        dialogue: "",
      });
      setUndoStack([]);
      setRedoStack([]);
    },
    [updatePanel]
  );

  const movePanelHandler = useCallback(
    (panelId: string, direction: "left" | "right" | "up" | "down") => {
      if (!project) return;
      updateProject((p) => ({
        ...p,
        panels: movePanel(p, panelId, direction),
      }));
    },
    [project, updateProject]
  );

  const dragReorder = useCallback(
    (fromId: string, toId: string) => {
      updateProject((p) => ({ ...p, panels: reorderPanels(p.panels, fromId, toId) }));
    },
    [updateProject]
  );

  const commitDrawing = useCallback(
    (panelId: string, strokes: DrawStroke[], imageData: string) => {
      const panel = project?.panels.find((p) => p.id === panelId);
      if (panel) {
        setUndoStack((s) => [...s, panel.strokes]);
        setRedoStack([]);
      }
      updatePanel(panelId, { strokes, imageData });
    },
    [project?.panels, updatePanel]
  );

  const undoDraw = useCallback(() => {
    if (!selectedPanel || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, selectedPanel.strokes]);
    updatePanel(selectedPanel.id, { strokes: prev });
  }, [selectedPanel, undoStack, updatePanel]);

  const redoDraw = useCallback(() => {
    if (!selectedPanel || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, selectedPanel.strokes]);
    updatePanel(selectedPanel.id, { strokes: next });
  }, [selectedPanel, redoStack, updatePanel]);

  const uploadPanelImage = useCallback(
    (panelId: string, dataUrl: string, asBackground = true) => {
      if (asBackground) {
        updatePanel(panelId, { backgroundImage: dataUrl });
      } else {
        updatePanel(panelId, { imageData: dataUrl, backgroundImage: null, strokes: [] });
      }
    },
    [updatePanel]
  );

  const removePanelImage = useCallback(
    (panelId: string) => {
      updatePanel(panelId, { backgroundImage: null, imageData: null });
    },
    [updatePanel]
  );

  const syncPanelImage = useCallback(
    (panelId: string, imageData: string) => {
      updatePanel(panelId, { imageData });
    },
    [updatePanel]
  );

  const toggleTheme = useCallback(() => {
    updateProject((p) => ({
      ...p,
      settings: {
        ...p.settings,
        theme: p.settings.theme === "dark" ? "light" : "dark",
      },
    }));
  }, [updateProject]);

  const setGridColumns = useCallback(
    (cols: 2 | 3 | 4) => {
      updateProject((p) => ({
        ...p,
        settings: { ...p.settings, gridColumns: cols },
      }));
    },
    [updateProject]
  );

  const setViewMode = useCallback(
    (mode: "compact" | "detailed") => {
      updateProject((p) => ({
        ...p,
        settings: { ...p.settings, viewMode: mode },
      }));
    },
    [updateProject]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const canvasSize = project ? getCanvasSize(project) : { w: 320, h: 180 };

  const openPanelEditor = useCallback((panelId: string) => {
    setSelectedPanelId(panelId);
    setEditorView("panel");
  }, []);

  const updateProjectTitle = useCallback(
    (title: string) => {
      updateProject((p) => ({ ...p, title }));
    },
    [updateProject]
  );

  const runExport = useCallback(() => {
    if (!project) return;
    const { range, format, pdfPanelsPerPage } = exportConfig;
    if (format === "json") {
      exportProjectJson(project);
    } else if (format === "zip") {
      exportZip(project);
    } else if (format === "png") {
      if (range === "selected" && selectedPanel) {
        exportPanelPng(selectedPanel.imageData, selectedPanel.title);
      } else {
        const panels =
          range === "scene" && selectedSceneId
            ? getSortedPanels(project, selectedSceneId)
            : orderedPanels;
        exportFullGridPng(project, panels, canvasSize.w, canvasSize.h);
      }
    } else if (format === "pdf") {
      exportPdf(project, pdfPanelsPerPage);
    }
    setExportOpen(false);
  }, [canvasSize.h, canvasSize.w, exportConfig, orderedPanels, project, selectedPanel, selectedSceneId]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return recentProjects;
    return recentProjects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [projectSearch, recentProjects]);

  const filteredPanelsForGrid = useMemo(() => {
    if (!project) return [];
    let panels = selectedSceneId
      ? getSortedPanels(project, selectedSceneId)
      : orderedPanels;
    const q = panelSearch.trim().toLowerCase();
    if (q) {
      panels = panels.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.action.toLowerCase().includes(q) ||
          p.dialogue.toLowerCase().includes(q)
      );
    }
    return panels;
  }, [orderedPanels, panelSearch, project, selectedSceneId]);

  const totalDuration = useMemo(
    () => orderedPanels.reduce((sum, p) => sum + p.duration, 0),
    [orderedPanels]
  );

  return {
    screen,
    editorView,
    setEditorView,
    project,
    recentProjects: filteredProjects,
    projectSearch,
    setProjectSearch,
    dashboardSection,
    setDashboardSection,
    selectedPanelId,
    setSelectedPanelId,
    selectedSceneId,
    setSelectedSceneId,
    panelSearch,
    setPanelSearch,
    gridZoom,
    setGridZoom,
    exportOpen,
    setExportOpen,
    exportConfig,
    setExportConfig,
    panelEditorTab,
    setPanelEditorTab,
    filteredPanelsForGrid,
    totalDuration,
    openPanelEditor,
    updateProjectTitle,
    runExport,
    selectedPanel,
    orderedPanels,
    saveStatus,
    previewOpen,
    setPreviewOpen,
    previewIndex,
    setPreviewIndex,
    mobileTab,
    setMobileTab,
    drawTool,
    setDrawTool,
    brush,
    setBrush,
    canvasSize,
    newProject,
    openProject,
    closeEditor,
    saveNow,
    removeProject,
    duplicateProject: duplicateProjectHandler,
    importProject,
    addScene,
    updateScene,
    deleteScene,
    addPanel,
    updatePanel,
    deletePanel,
    duplicatePanel: duplicatePanelHandler,
    clearPanel,
    movePanel: movePanelHandler,
    dragReorder,
    commitDrawing,
    undoDraw,
    redoDraw,
    uploadPanelImage,
    removePanelImage,
    syncPanelImage,
    toggleTheme,
    setGridColumns,
    setViewMode,
    exportJson: () => project && exportProjectJson(project),
    exportPng: () =>
      selectedPanel && exportPanelPng(selectedPanel.imageData, selectedPanel.title),
    exportGridPng: () =>
      project && exportFullGridPng(project, orderedPanels, canvasSize.w, canvasSize.h),
    exportPdf: (perPage: 2 | 4 | 6 = 4) => project && exportPdf(project, perPage),
    exportZip: () => project && exportZip(project),
  };
}
