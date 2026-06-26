import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUTOSAVE_MS, DEFAULT_BRUSH } from "./constants";
import { createHistory } from "./history";
import {
  createFrame,
  createId,
  createLayer,
  createProject,
  duplicateFrameData,
  getActiveLayer,
  getSortedFrames,
  getSortedLayers,
  migrateProject,
  reindexFrames,
  reindexLayers,
  setFrameActiveLayer,
  touchFrame,
  touchProject,
  updateFrameLayer,
} from "./projectUtils";
import { buildOnionLayers } from "./onionSkin";
import { layerStackKey, duplicateLayerData } from "./layerUtils";
import {
  deleteProject,
  duplicateProject,
  importProjectJson,
  listProjects,
  loadProject,
  saveProject,
} from "./storage";
import type {
  AnimationFrame,
  AnimationProject,
  BrushSettings,
  DrawTool,
  EditorScreen,
  ExportConfig,
  FrameLayer,
  MobileTab,
  GridSettings,
  OnionSkinSettings,
  ProjectMeta,
  SaveStatus,
} from "./types";
import type { NewProjectConfig } from "./types";

export function useFrameAnimator() {
  const [screen, setScreen] = useState<EditorScreen>("dashboard");
  const [project, setProject] = useState<AnimationProject | null>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const [tool, setTool] = useState<DrawTool>("pencil");
  const [brush, setBrush] = useState<BrushSettings>(DEFAULT_BRUSH);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [exportOpen, setExportOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: "gif",
    fps: 12,
    transparent: false,
    quality: 0.92,
  });
  const [mobileTab, setMobileTab] = useState<MobileTab>("draw");
  const [clipboardFrame, setClipboardFrame] = useState<AnimationFrame | null>(null);
  const [clipboardLayer, setClipboardLayer] = useState<FrameLayer | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState("");

  const historyRef = useRef(createHistory());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentImageRef = useRef<string>("");

  const sortedFrames = useMemo(
    () => (project ? getSortedFrames(project) : []),
    [project]
  );

  const currentFrame = useMemo(
    () => sortedFrames.find((f) => f.id === currentFrameId) ?? sortedFrames[0] ?? null,
    [currentFrameId, sortedFrames]
  );

  const currentLayer = useMemo(
    () => (currentFrame ? getActiveLayer(currentFrame) : null),
    [currentFrame]
  );

  const sortedLayers = useMemo(
    () => (currentFrame ? getSortedLayers(currentFrame) : []),
    [currentFrame]
  );

  const currentLayerStackKey = useMemo(
    () => (currentFrame ? layerStackKey(currentFrame) : ""),
    [currentFrame]
  );

  const currentIndex = useMemo(
    () => (currentFrame ? sortedFrames.findIndex((f) => f.id === currentFrame.id) : -1),
    [currentFrame, sortedFrames]
  );

  const onionLayers = useMemo(() => {
    if (!project) return [];
    return buildOnionLayers(sortedFrames, currentIndex, project.settings.onionSkin);
  }, [project, sortedFrames, currentIndex]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q));
  }, [projectSearch, projects]);

  const refreshProjects = useCallback(() => {
    void listProjects().then(setProjects);
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const syncHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const scheduleSave = useCallback(
    (next: AnimationProject) => {
      setSaveStatus("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveStatus("saving");
        const touched = touchProject(next);
        await saveProject(touched);
        setProject(touched);
        setSaveStatus("saved");
        refreshProjects();
      }, AUTOSAVE_MS);
    },
    [refreshProjects]
  );

  const updateProject = useCallback(
    (updater: (p: AnimationProject) => AnimationProject) => {
      setProject((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const saveNow = useCallback(async () => {
    if (!project) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    const touched = touchProject(project);
    await saveProject(touched);
    setProject(touched);
    setSaveStatus("saved");
    refreshProjects();
  }, [project, refreshProjects]);

  const newProject = useCallback(
    (config: NewProjectConfig) => {
      const created = migrateProject(createProject(config));
      const firstLayer = getActiveLayer(created.frames[0]!);
      historyRef.current.reset(firstLayer?.imageData ?? "");
      syncHistoryState();
      setProject(created);
      setCurrentFrameId(created.frames[0]?.id ?? null);
      setExportConfig((c) => ({ ...c, fps: created.fps }));
      setScreen("editor");
      scheduleSave(created);
    },
    [scheduleSave, syncHistoryState]
  );

  const openProject = useCallback(
    async (id: string) => {
      const loaded = await loadProject(id);
      if (!loaded) return;
      const first = getSortedFrames(loaded)[0];
      const firstLayer = first ? getActiveLayer(first) : null;
      historyRef.current.reset(firstLayer?.imageData ?? "");
      syncHistoryState();
      setProject(loaded);
      setCurrentFrameId(first?.id ?? null);
      setExportConfig((c) => ({ ...c, fps: loaded.fps, transparent: loaded.transparent }));
      setScreen("editor");
    },
    [syncHistoryState]
  );

  const closeEditor = useCallback(() => {
    stopPlayback();
    setScreen("dashboard");
    setProject(null);
    setCurrentFrameId(null);
    historyRef.current.clear();
    refreshProjects();
  }, [refreshProjects]);

  const removeProject = useCallback(
    async (id: string) => {
      await deleteProject(id);
      refreshProjects();
    },
    [refreshProjects]
  );

  const duplicateProjectById = useCallback(
    async (id: string) => {
      await duplicateProject(id);
      refreshProjects();
    },
    [refreshProjects]
  );

  const importProject = useCallback(
    async (file: File) => {
      const imported = await importProjectJson(file);
      refreshProjects();
      await openProject(imported.id);
    },
    [openProject, refreshProjects]
  );

  const selectFrame = useCallback(
    async (frameId: string, layerImageData?: string) => {
      if (!project || frameId === currentFrameId) return;

      if (currentFrameId && layerImageData !== undefined && currentFrame?.activeLayerId) {
        const patched = updateFrameLayer(currentFrame, currentFrame.activeLayerId, {
          imageData: layerImageData,
        });
        const touched = await touchFrame(patched, project);
        updateProject((p) => ({
          ...p,
          frames: p.frames.map((f) => (f.id === currentFrameId ? touched : f)),
        }));
      }

      const target = project.frames.find((f) => f.id === frameId);
      if (!target) return;
      const layer = getActiveLayer(target);
      historyRef.current.reset(layer?.imageData ?? "");
      syncHistoryState();
      setCurrentFrameId(frameId);
      currentImageRef.current = layer?.imageData ?? "";
    },
    [currentFrame, currentFrameId, project, syncHistoryState, updateProject]
  );

  const addFrame = useCallback(() => {
    if (!project) return;
    const order = project.frames.length + 1;
    const frame = createFrame(order, project.width, project.height, project.background, project.transparent);
    updateProject((p) => ({ ...p, frames: [...p.frames, frame] }));
    setCurrentFrameId(frame.id);
    const layer = getActiveLayer(frame);
    historyRef.current.reset(layer?.imageData ?? "");
    syncHistoryState();
  }, [project, syncHistoryState, updateProject]);

  const duplicateFrame = useCallback(() => {
    if (!project || !currentFrame) return;
    const order = project.frames.length + 1;
    const copy = duplicateFrameData(currentFrame, order);
    updateProject((p) => ({ ...p, frames: [...p.frames, copy] }));
    setCurrentFrameId(copy.id);
    const layer = getActiveLayer(copy);
    historyRef.current.reset(layer?.imageData ?? "");
    syncHistoryState();
  }, [currentFrame, project, syncHistoryState, updateProject]);

  const deleteFrame = useCallback(() => {
    if (!project || !currentFrame || project.frames.length <= 1) return;
    const remaining = reindexFrames(project.frames.filter((f) => f.id !== currentFrame.id));
    const next = remaining[Math.min(currentIndex, remaining.length - 1)];
    updateProject((p) => ({ ...p, frames: remaining }));
    setCurrentFrameId(next?.id ?? null);
    if (next) {
      const layer = getActiveLayer(next);
      historyRef.current.reset(layer?.imageData ?? "");
      syncHistoryState();
    }
  }, [currentFrame, currentIndex, project, syncHistoryState, updateProject]);

  const copyFrame = useCallback(() => {
    if (!currentFrame) return;
    setClipboardFrame({ ...currentFrame });
  }, [currentFrame]);

  const pasteFrame = useCallback(() => {
    if (!project || !clipboardFrame) return;
    const order = project.frames.length + 1;
    const pasted = duplicateFrameData(clipboardFrame, order);
    updateProject((p) => ({ ...p, frames: [...p.frames, pasted] }));
    setCurrentFrameId(pasted.id);
    const layer = getActiveLayer(pasted);
    historyRef.current.reset(layer?.imageData ?? "");
    syncHistoryState();
  }, [clipboardFrame, project, syncHistoryState, updateProject]);

  const goToFrame = useCallback(
    (delta: number) => {
      if (!sortedFrames.length) return;
      const idx = Math.max(0, Math.min(sortedFrames.length - 1, currentIndex + delta));
      void selectFrame(sortedFrames[idx].id, currentImageRef.current);
    },
    [currentIndex, selectFrame, sortedFrames]
  );

  const commitLayerImage = useCallback(
    (imageData: string, pushHistory = true) => {
      if (!project || !currentFrame?.activeLayerId) return;
      currentImageRef.current = imageData;
      if (pushHistory) {
        historyRef.current.push(imageData);
        syncHistoryState();
      }
      const patched = updateFrameLayer(currentFrame, currentFrame.activeLayerId, { imageData });
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? patched : f)),
      }));
      if (thumbTimer.current) clearTimeout(thumbTimer.current);
      thumbTimer.current = setTimeout(() => {
        void touchFrame(patched, project).then((updated) => {
          updateProject((p) => ({
            ...p,
            frames: p.frames.map((f) => (f.id === currentFrame.id ? updated : f)),
          }));
        });
      }, 600);
    },
    [currentFrame, project, syncHistoryState, updateProject]
  );

  const selectLayer = useCallback(
    (layerId: string, layerImageData?: string) => {
      if (!project || !currentFrame || layerId === currentFrame.activeLayerId) return;

      let frame = currentFrame;
      if (layerImageData !== undefined && currentFrame.activeLayerId) {
        frame = updateFrameLayer(currentFrame, currentFrame.activeLayerId, {
          imageData: layerImageData,
        });
      }
      const next = setFrameActiveLayer(frame, layerId);
      const layer = next.layers.find((l) => l.id === layerId);
      historyRef.current.reset(layer?.imageData ?? "");
      syncHistoryState();
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
      currentImageRef.current = layer?.imageData ?? "";
    },
    [currentFrame, project, syncHistoryState, updateProject]
  );

  const addLayer = useCallback(() => {
    if (!project || !currentFrame) return;
    const order = currentFrame.layers.length + 1;
    const layer = createLayer(
      order,
      project.width,
      project.height,
      project.background,
      project.transparent,
      `Layer ${order}`,
      false
    );
    const layers = reindexLayers([...currentFrame.layers, layer]);
    const next = { ...currentFrame, layers, activeLayerId: layer.id };
    updateProject((p) => ({
      ...p,
      frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
    }));
    historyRef.current.reset(layer.imageData);
    syncHistoryState();
    currentImageRef.current = layer.imageData;
  }, [currentFrame, project, syncHistoryState, updateProject]);

  const deleteLayer = useCallback(
    (layerId: string) => {
      if (!project || !currentFrame || currentFrame.layers.length <= 1) return;
      const remaining = reindexLayers(currentFrame.layers.filter((l) => l.id !== layerId));
      const wasActive = currentFrame.activeLayerId === layerId;
      const activeLayerId = wasActive
        ? remaining[remaining.length - 1]?.id ?? ""
        : currentFrame.activeLayerId;
      const next = { ...currentFrame, layers: remaining, activeLayerId };
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
      if (wasActive) {
        const layer = remaining.find((l) => l.id === activeLayerId);
        historyRef.current.reset(layer?.imageData ?? "");
        syncHistoryState();
        currentImageRef.current = layer?.imageData ?? "";
      }
      void touchFrame(next, project).then((touched) => {
        updateProject((p) => ({
          ...p,
          frames: p.frames.map((f) => (f.id === currentFrame.id ? touched : f)),
        }));
      });
    },
    [currentFrame, project, syncHistoryState, updateProject]
  );

  const duplicateLayer = useCallback(
    (layerId: string) => {
      if (!project || !currentFrame) return;
      const source = currentFrame.layers.find((l) => l.id === layerId);
      if (!source) return;
      const order = currentFrame.layers.length + 1;
      const copy = duplicateLayerData(source, order, createId("layer"));
      const layers = reindexLayers([...currentFrame.layers, copy]);
      const next = { ...currentFrame, layers, activeLayerId: copy.id };
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
      historyRef.current.reset(copy.imageData);
      syncHistoryState();
      currentImageRef.current = copy.imageData;
    },
    [currentFrame, project, syncHistoryState, updateProject]
  );

  const copyLayer = useCallback(
    (layerId?: string, liveImageData?: string) => {
      if (!currentFrame) return;
      const id = layerId ?? currentFrame.activeLayerId;
      const layer = currentFrame.layers.find((l) => l.id === id);
      if (!layer) return;
      const isActive = id === currentFrame.activeLayerId;
      const imageData =
        liveImageData ?? (isActive ? currentImageRef.current : layer.imageData) ?? layer.imageData;
      setClipboardLayer({ ...layer, imageData });
    },
    [currentFrame]
  );

  const pasteLayer = useCallback(
    (layerImageData?: string) => {
      if (!project || !currentFrame || !clipboardLayer) return;

      const live = layerImageData ?? currentImageRef.current;
      let frame = currentFrame;
      if (currentFrame.activeLayerId) {
        frame = updateFrameLayer(currentFrame, currentFrame.activeLayerId, {
          imageData: live,
        });
      }

      const order = frame.layers.length + 1;
      const pasted = duplicateLayerData(clipboardLayer, order, createId("layer"));
      pasted.name = `${clipboardLayer.name} paste`;
      const layers = reindexLayers([...frame.layers, pasted]);
      const next = { ...frame, layers, activeLayerId: pasted.id };
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
      historyRef.current.reset(pasted.imageData);
      syncHistoryState();
      currentImageRef.current = pasted.imageData;
      void touchFrame(next, project).then((touched) => {
        updateProject((p) => ({
          ...p,
          frames: p.frames.map((f) => (f.id === currentFrame.id ? touched : f)),
        }));
      });
    },
    [clipboardLayer, currentFrame, project, syncHistoryState, updateProject]
  );

  const toggleLayerVisible = useCallback(
    (layerId: string) => {
      if (!currentFrame) return;
      const layer = currentFrame.layers.find((l) => l.id === layerId);
      if (!layer) return;
      const next = updateFrameLayer(currentFrame, layerId, { visible: !layer.visible });
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
      void touchFrame(next, project!).then((touched) => {
        updateProject((p) => ({
          ...p,
          frames: p.frames.map((f) => (f.id === currentFrame!.id ? touched : f)),
        }));
      });
    },
    [currentFrame, project, updateProject]
  );

  const toggleLayerLocked = useCallback(
    (layerId: string) => {
      if (!currentFrame) return;
      const layer = currentFrame.layers.find((l) => l.id === layerId);
      if (!layer) return;
      const next = updateFrameLayer(currentFrame, layerId, { locked: !layer.locked });
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
    },
    [currentFrame, updateProject]
  );

  const renameLayer = useCallback(
    (layerId: string, name: string) => {
      if (!currentFrame) return;
      const next = updateFrameLayer(currentFrame, layerId, { name: name.trim() || "Layer" });
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
    },
    [currentFrame, updateProject]
  );

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      if (!currentFrame || !project) return;
      const next = updateFrameLayer(currentFrame, layerId, { opacity });
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
      void touchFrame(next, project).then((touched) => {
        updateProject((p) => ({
          ...p,
          frames: p.frames.map((f) => (f.id === currentFrame.id ? touched : f)),
        }));
      });
    },
    [currentFrame, project, updateProject]
  );

  const moveLayer = useCallback(
    (layerId: string, direction: -1 | 1) => {
      if (!currentFrame) return;
      const layers = getSortedLayers(currentFrame);
      const idx = layers.findIndex((l) => l.id === layerId);
      const swapIdx = idx + direction;
      if (idx < 0 || swapIdx < 0 || swapIdx >= layers.length) return;
      const nextLayers = [...layers];
      const [moved] = nextLayers.splice(idx, 1);
      nextLayers.splice(swapIdx, 0, moved);
      const next = { ...currentFrame, layers: reindexLayers(nextLayers) };
      updateProject((p) => ({
        ...p,
        frames: p.frames.map((f) => (f.id === currentFrame.id ? next : f)),
      }));
      void touchFrame(next, project!).then((touched) => {
        updateProject((p) => ({
          ...p,
          frames: p.frames.map((f) => (f.id === currentFrame!.id ? touched : f)),
        }));
      });
    },
    [currentFrame, project, updateProject]
  );

  const pushHistorySnapshot = useCallback(
    (snapshot: string) => {
      historyRef.current.push(snapshot);
      syncHistoryState();
    },
    [syncHistoryState]
  );

  const undo = useCallback(() => {
    const prev = historyRef.current.undo(currentImageRef.current);
    if (!prev) return;
    currentImageRef.current = prev;
    setRestoredImage(prev);
    syncHistoryState();
    void commitLayerImage(prev, false);
    return prev;
  }, [commitLayerImage, syncHistoryState]);

  const redo = useCallback(() => {
    const next = historyRef.current.redo(currentImageRef.current);
    if (!next) return;
    currentImageRef.current = next;
    setRestoredImage(next);
    syncHistoryState();
    void commitLayerImage(next, false);
    return next;
  }, [commitLayerImage, syncHistoryState]);

  const clearCurrentLayer = useCallback(() => {
    if (!project) return;
    const canvas = document.createElement("canvas");
    canvas.width = project.width;
    canvas.height = project.height;
    const data = canvas.toDataURL("image/png");
    setRestoredImage(data);
    commitLayerImage(data, false);
  }, [commitLayerImage, project]);

  const setOnionSkin = useCallback(
    (patch: Partial<OnionSkinSettings>) => {
      updateProject((p) => ({
        ...p,
        settings: {
          ...p.settings,
          onionSkin: { ...p.settings.onionSkin, ...patch },
        },
      }));
    },
    [updateProject]
  );

  const setGrid = useCallback(
    (patch: Partial<GridSettings>) => {
      updateProject((p) => ({
        ...p,
        settings: {
          ...p.settings,
          grid: { ...p.settings.grid, ...patch },
        },
      }));
    },
    [updateProject]
  );

  const reorderFrame = useCallback(
    (fromId: string, toId: string) => {
      if (!project || fromId === toId) return;
      const frames = getSortedFrames(project);
      const fromIdx = frames.findIndex((f) => f.id === fromId);
      const toIdx = frames.findIndex((f) => f.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const next = [...frames];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      updateProject((p) => ({ ...p, frames: reindexFrames(next) }));
    },
    [project, updateProject]
  );

  const setFps = useCallback(
    (fps: number) => {
      const clamped = Math.min(60, Math.max(1, Math.round(fps)));
      updateProject((p) => ({ ...p, fps: clamped }));
      setExportConfig((c) => ({ ...c, fps: clamped }));
    },
    [updateProject]
  );

  const stopPlayback = useCallback(() => {
    if (playTimer.current) {
      clearInterval(playTimer.current);
      playTimer.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (!project || sortedFrames.length === 0) return;
    stopPlayback();
    setIsPlaying(true);
    let idx = currentIndex >= 0 ? currentIndex : 0;

    playTimer.current = setInterval(() => {
      idx += 1;
      if (idx >= sortedFrames.length) {
        if (loop) idx = 0;
        else {
          stopPlayback();
          return;
        }
      }
      const frame = sortedFrames[idx];
      setCurrentFrameId(frame.id);
      const layer = getActiveLayer(frame);
      currentImageRef.current = layer?.imageData ?? "";
      historyRef.current.reset(layer?.imageData ?? "");
      syncHistoryState();
    }, 1000 / project.fps);
  }, [currentIndex, loop, project, sortedFrames, stopPlayback, syncHistoryState]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const renameProject = useCallback(
    (title: string) => {
      updateProject((p) => ({ ...p, title: title.trim() || "Untitled" }));
    },
    [updateProject]
  );

  return {
    screen,
    project,
    projects: filteredProjects,
    projectSearch,
    setProjectSearch,
    currentFrame,
    currentLayer,
    sortedLayers,
    currentLayerStackKey,
    currentIndex,
    onionLayers,
    sortedFrames,
    tool,
    setTool,
    brush,
    setBrush,
    saveStatus,
    isPlaying,
    loop,
    setLoop,
    zoom,
    setZoom,
    pan,
    setPan,
    exportOpen,
    setExportOpen,
    exportConfig,
    setExportConfig,
    mobileTab,
    setMobileTab,
    canUndo,
    canRedo,
    restoredImage,
    clearRestoredImage: () => setRestoredImage(null),
    refreshProjects,
    newProject,
    openProject,
    closeEditor,
    removeProject,
    duplicateProjectById,
    importProject,
    selectFrame,
    addFrame,
    duplicateFrame,
    deleteFrame,
    copyFrame,
    pasteFrame,
    goToFrame,
    reorderFrame,
    commitLayerImage,
    selectLayer,
    addLayer,
    deleteLayer,
    duplicateLayer,
    copyLayer,
    pasteLayer,
    hasClipboardLayer: !!clipboardLayer,
    clipboardLayerName: clipboardLayer?.name ?? null,
    toggleLayerVisible,
    toggleLayerLocked,
    renameLayer,
    setLayerOpacity,
    moveLayer,
    pushHistorySnapshot,
    undo,
    redo,
    clearCurrentLayer,
    setOnionSkin,
    setGrid,
    setFps,
    togglePlayback,
    stopPlayback,
    saveNow,
    renameProject,
    currentImageRef,
  };
}
