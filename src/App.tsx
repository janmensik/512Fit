import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Cpu, Lightbulb, Sliders } from 'lucide-react';
import { CheatsheetTab } from './components/CheatsheetTab';
import { LightsChannelsTab } from './components/LightsChannelsTab';
import { SceneHeader } from './components/SceneHeader';
import { SetupControllerTab } from './components/SetupControllerTab';
import { SimulatorTab } from './components/SimulatorTab';
import { StorageModal } from './components/StorageModal';
import type {
  CatalogLight,
  ControllerProfile,
  SceneLightInstance,
  SceneSetup,
  WorkspaceExport,
} from './types/dmx';
import {
  detectChannelConflicts,
  mapChannelRangeToController,
} from './utils/dmxMath';
import { recommendDmxChannels } from './utils/dmxOptimizer';
import {
  DEFAULT_POSITIONS,
  FACTORY_CONTROLLERS,
  FACTORY_LIGHTS,
  loadActiveSceneId,
  loadCustomControllers,
  loadCustomLights,
  loadScenes,
  saveActiveSceneId,
  saveCustomControllers,
  saveCustomLights,
  saveScenes,
} from './utils/storage';

type TabId = 'setup' | 'lights' | 'cheatsheet' | 'simulator';

export function App() {
  const [scenes, setScenes] = useState<SceneSetup[]>(() => loadScenes());
  const [activeSceneId, setActiveSceneId] = useState<string>(() =>
    loadActiveSceneId(loadScenes()[0].id)
  );
  const [customControllers, setCustomControllers] = useState<ControllerProfile[]>(
    () => loadCustomControllers()
  );
  const [customLights, setCustomLights] = useState<CatalogLight[]>(() =>
    loadCustomLights()
  );

  const [activeTab, setActiveTab] = useState<TabId>('lights');
  const [strategyNote, setStrategyNote] = useState<string | null>(null);
  const [isStorageOpen, setIsStorageOpen] = useState(false);

  // Simulator state
  const [simFixture, setSimFixture] = useState(1);
  const [simPage, setSimPage] = useState<'A' | 'B'>('A');
  const [highlightedLightId, setHighlightedLightId] = useState<string | null>(null);

  useEffect(() => {
    saveScenes(scenes);
  }, [scenes]);

  useEffect(() => {
    saveActiveSceneId(activeSceneId);
  }, [activeSceneId]);

  useEffect(() => {
    saveCustomControllers(customControllers);
  }, [customControllers]);

  useEffect(() => {
    saveCustomLights(customLights);
  }, [customLights]);

  const allControllers = useMemo(
    () => [...FACTORY_CONTROLLERS, ...customControllers],
    [customControllers]
  );

  const allCatalogLights = useMemo(
    () => [...FACTORY_LIGHTS, ...customLights],
    [customLights]
  );

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) ?? scenes[0],
    [scenes, activeSceneId]
  );

  const activeController = useMemo(() => {
    if (activeScene.customController) return activeScene.customController;
    return (
      allControllers.find((c) => c.id === activeScene.controllerId) ??
      allControllers[0]
    );
  }, [activeScene, allControllers]);

  const validation = useMemo(
    () => detectChannelConflicts(activeScene.lights, activeController),
    [activeScene.lights, activeController]
  );

  const updateActiveScene = (updater: (scene: SceneSetup) => SceneSetup) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === activeScene.id
          ? { ...updater(s), updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const handleNewScene = () => {
    const newScene: SceneSetup = {
      id: `scene-${Date.now()}`,
      name: `New Scene ${scenes.length + 1}`,
      updatedAt: new Date().toISOString(),
      controllerId: FACTORY_CONTROLLERS[0].id,
      lights: [],
      positions: [...DEFAULT_POSITIONS],
    };
    setScenes((prev) => [...prev, newScene]);
    setActiveSceneId(newScene.id);
    setActiveTab('setup');
  };

  const handleDuplicateScene = () => {
    const copy: SceneSetup = {
      ...activeScene,
      id: `scene-${Date.now()}`,
      name: `${activeScene.name} (Copy)`,
      updatedAt: new Date().toISOString(),
      lights: activeScene.lights.map((l) => ({
        ...l,
        instanceId: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      })),
    };
    setScenes((prev) => [...prev, copy]);
    setActiveSceneId(copy.id);
  };

  const handleDeleteScene = (id: string) => {
    if (scenes.length <= 1) return;
    const remaining = scenes.filter((s) => s.id !== id);
    setScenes(remaining);
    setActiveSceneId(remaining[0].id);
  };

  const handleAutoRecommend = () => {
    const result = recommendDmxChannels(activeScene.lights, activeController);
    updateActiveScene((s) => ({ ...s, lights: result.lights }));
    setStrategyNote(`${result.strategyUsed} — ${result.notes[0] || ''}`);
  };

  const handleAddPosition = (pos: string) => {
    const trimmed = pos.trim();
    if (!trimmed) return;
    updateActiveScene((s) => {
      if (s.positions.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
        return s;
      }
      return { ...s, positions: [...s.positions, trimmed] };
    });
  };

  const handleRenamePosition = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    updateActiveScene((s) => {
      const exists = s.positions.some((p) => p !== oldName && p.toLowerCase() === trimmed.toLowerCase());
      const nextPositions = exists
        ? s.positions.filter((p) => p !== oldName)
        : s.positions.map((p) => (p === oldName ? trimmed : p));
      return {
        ...s,
        positions: nextPositions,
        lights: s.lights.map((l) => (l.position === oldName ? { ...l, position: trimmed } : l)),
      };
    });
  };

  const handleDeletePosition = (name: string) => {
    updateActiveScene((s) => {
      if (s.positions.length <= 1) return s;
      const nextPositions = s.positions.filter((p) => p !== name);
      const fallback = nextPositions[0];
      return {
        ...s,
        positions: nextPositions,
        lights: s.lights.map((l) => (l.position === name ? { ...l, position: fallback } : l)),
      };
    });
  };

  const handleInspectInSimulator = (light: SceneLightInstance) => {
    const mapping = mapChannelRangeToController(
      light.startChannel,
      light.channelCount,
      activeController
    );
    setSimFixture(Math.max(1, Math.min(activeController.fixtureCount, mapping.fixture)));
    setSimPage(mapping.page);
    setHighlightedLightId(light.instanceId);
    setActiveTab('simulator');
  };

  const handleImportWorkspace = (data: WorkspaceExport) => {
    if (data.scenes.length > 0) {
      setScenes(data.scenes);
      setActiveSceneId(data.scenes[0].id);
    }
    if (Array.isArray(data.customControllers)) {
      setCustomControllers(data.customControllers);
    }
    if (Array.isArray(data.customLights)) {
      setCustomLights(data.customLights);
    }
  };

  const navItems: { id: TabId; label: string; icon: typeof Sliders }[] = [
    { id: 'setup', label: 'Setup', icon: Cpu },
    { id: 'lights', label: 'Lights', icon: Lightbulb },
    { id: 'cheatsheet', label: 'Cheatsheet', icon: ClipboardList },
    { id: 'simulator', label: 'Console', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24 sm:pb-12">
      <SceneHeader
        scenes={scenes}
        activeScene={activeScene}
        validation={validation}
        onSelectScene={setActiveSceneId}
        onNewScene={handleNewScene}
        onDuplicateScene={handleDuplicateScene}
        onOpenStorageModal={() => setIsStorageOpen(true)}
      />

      {/* Desktop Top Tabs */}
      <nav
        aria-label="Primary sections"
        className="hidden sm:block border-b border-zinc-800 bg-zinc-950"
      >
        <div className="flex w-full gap-1 px-4 sm:px-6">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 py-6">
        {activeTab === 'setup' && (
          <SetupControllerTab
            activeScene={activeScene}
            controllers={allControllers}
            activeController={activeController}
            onUpdateSceneMeta={(name, description) =>
              updateActiveScene((s) => ({ ...s, name, description }))
            }
            onSelectController={(controllerId) =>
              updateActiveScene((s) => ({
                ...s,
                controllerId,
                customController: undefined,
              }))
            }
            onUpdateCustomController={(customController) =>
              updateActiveScene((s) => ({ ...s, customController }))
            }
            onSaveControllerToLibrary={(ctrl) => {
              setCustomControllers((prev) => [...prev, ctrl]);
              updateActiveScene((s) => ({
                ...s,
                controllerId: ctrl.id,
                customController: undefined,
              }));
            }}
            onDeleteScene={handleDeleteScene}
            canDeleteScene={scenes.length > 1}
          />
        )}

        {activeTab === 'lights' && (
          <LightsChannelsTab
            lights={activeScene.lights}
            positions={activeScene.positions}
            catalogLights={allCatalogLights}
            controller={activeController}
            validation={validation}
            strategyNote={strategyNote}
            onAddLights={(newLights) =>
              updateActiveScene((s) => ({ ...s, lights: [...s.lights, ...newLights] }))
            }
            onUpdateLight={(instanceId, patch) =>
              updateActiveScene((s) => ({
                ...s,
                lights: s.lights.map((l) =>
                  l.instanceId === instanceId ? { ...l, ...patch } : l
                ),
              }))
            }
            onRemoveLight={(instanceId) =>
              updateActiveScene((s) => ({
                ...s,
                lights: s.lights.filter((l) => l.instanceId !== instanceId),
              }))
            }
            onAutoRecommend={handleAutoRecommend}
            onSaveLightToCatalog={(light) =>
              setCustomLights((prev) => [...prev, light])
            }
            onAddPosition={handleAddPosition}
            onRenamePosition={handleRenamePosition}
            onDeletePosition={handleDeletePosition}
          />
        )}

        {activeTab === 'cheatsheet' && (
          <CheatsheetTab
            lights={activeScene.lights}
            positions={activeScene.positions}
            controller={activeController}
            onInspectInSimulator={handleInspectInSimulator}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorTab
            lights={activeScene.lights}
            positions={activeScene.positions}
            controller={activeController}
            selectedFixture={simFixture}
            selectedPage={simPage}
            highlightedLightId={highlightedLightId}
            onSelectFixture={setSimFixture}
            onSelectPage={setSimPage}
            onSelectLight={setHighlightedLightId}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur sm:hidden print:hidden"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="grid grid-cols-4">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
                  active ? 'text-amber-400' : 'text-zinc-400'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <StorageModal
        isOpen={isStorageOpen}
        onClose={() => setIsStorageOpen(false)}
        scenes={scenes}
        customControllers={customControllers}
        customLights={customLights}
        onImportWorkspace={handleImportWorkspace}
      />
    </div>
  );
}

export default App;
