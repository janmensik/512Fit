import { useState } from 'react';
import { Cpu, Save, Trash2 } from 'lucide-react';
import type { ControllerProfile, SceneSetup } from '../types/dmx';
import { getMaxControllerChannels, getPagesPerFixture } from '../utils/dmxMath';

interface SetupControllerTabProps {
  activeScene: SceneSetup;
  controllers: ControllerProfile[];
  activeController: ControllerProfile;
  onUpdateSceneMeta: (name: string, description: string) => void;
  onSelectController: (controllerId: string) => void;
  onUpdateCustomController: (controller: ControllerProfile) => void;
  onSaveControllerToLibrary: (controller: ControllerProfile) => void;
  onDeleteScene: (id: string) => void;
  canDeleteScene: boolean;
}

export function SetupControllerTab({
  activeScene,
  controllers,
  activeController,
  onUpdateSceneMeta,
  onSelectController,
  onUpdateCustomController,
  onSaveControllerToLibrary,
  onDeleteScene,
  canDeleteScene,
}: SetupControllerTabProps) {
  const [newCtrlName, setNewCtrlName] = useState('');

  const maxCh = getMaxControllerChannels(activeController);
  const pages = getPagesPerFixture(activeController);

  const handleSaveAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const name =
      newCtrlName.trim() ||
      `Custom ${maxCh}ch (${activeController.slidersPerPage}sl × ${pages}p × ${activeController.fixtureCount}fix)`;
    const saved: ControllerProfile = {
      ...activeController,
      id: `ctrl-custom-${Date.now()}`,
      name,
      isFactory: false,
    };
    onSaveControllerToLibrary(saved);
    setNewCtrlName('');
  };

  return (
    <div className="space-y-6">
      {/* Scene Metadata */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-semibold text-zinc-100">1. Scene / Setup Details</h2>
          {canDeleteScene && (
            <button
              type="button"
              onClick={() => onDeleteScene(activeScene.id)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete Scene
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="scene-name" className="text-xs font-medium text-zinc-300">
              Scene Name
            </label>
            <input
              id="scene-name"
              type="text"
              value={activeScene.name}
              onChange={(e) => onUpdateSceneMeta(e.target.value, activeScene.description || '')}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="scene-desc" className="text-xs font-medium text-zinc-300">
              Notes / Venue (optional)
            </label>
            <input
              id="scene-desc"
              type="text"
              value={activeScene.description || ''}
              placeholder="e.g. Club stage, wedding setup..."
              onChange={(e) => onUpdateSceneMeta(activeScene.name, e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* DMX Controller Setup */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="h-5 w-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-zinc-100">2. DMX Controller Setup</h2>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label htmlFor="controller-preset" className="text-xs font-medium text-zinc-300">
              Select Saved / Factory Controller
            </label>
            <select
              id="controller-preset"
              value={activeController.id}
              onChange={(e) => onSelectController(e.target.value)}
              className="w-full max-w-full min-w-0 truncate rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base sm:text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            >
              {controllers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isFactory ? '(Factory)' : '(Custom)'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ctrl-sliders" className="text-xs font-medium text-zinc-300">
                Sliders per Page
              </label>
              <input
                id="ctrl-sliders"
                type="number"
                inputMode="numeric"
                min={1}
                max={64}
                value={activeController.slidersPerPage}
                onChange={(e) =>
                  onUpdateCustomController({
                    ...activeController,
                    slidersPerPage: Math.max(1, Math.min(64, Number(e.target.value) || 1)),
                  })
                }
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ctrl-fixtures" className="text-xs font-medium text-zinc-300">
                Number of Fixtures
              </label>
              <input
                id="ctrl-fixtures"
                type="number"
                inputMode="numeric"
                min={1}
                max={32}
                value={activeController.fixtureCount}
                onChange={(e) =>
                  onUpdateCustomController({
                    ...activeController,
                    fixtureCount: Math.max(1, Math.min(32, Number(e.target.value) || 1)),
                  })
                }
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                <input
                  type="checkbox"
                  checked={activeController.hasABSwitch}
                  onChange={(e) =>
                    onUpdateCustomController({
                      ...activeController,
                      hasABSwitch: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-amber-500"
                />
                <span className="text-sm font-medium text-zinc-200">Has A/B Page Switch</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs text-zinc-400">
            Controller Capacity:{' '}
            <strong className="text-zinc-100">{maxCh} DMX channels</strong> (
            {activeController.fixtureCount}{' '}
            {activeController.fixtureCount === 1 ? 'Fixture' : 'Fixtures'} ×{' '}
            {activeController.slidersPerPage * pages} ch each)
          </div>

          <form onSubmit={handleSaveAsPreset} className="flex flex-col sm:flex-row sm:items-end gap-2 pt-2 border-t border-zinc-800">
            <div className="w-full sm:flex-1 min-w-0 flex flex-col gap-1.5">
              <label htmlFor="save-ctrl-name" className="text-xs font-medium text-zinc-400">
                Save current controller settings as a reusable preset
              </label>
              <input
                id="save-ctrl-name"
                type="text"
                value={newCtrlName}
                onChange={(e) => setNewCtrlName(e.target.value)}
                placeholder="e.g. My 192ch Stairville Console"
                className="w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Controller
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
