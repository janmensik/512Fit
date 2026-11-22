import { AlertTriangle, CheckCircle2, Copy, Download, Plus, Sliders } from 'lucide-react';
import type { SceneSetup, ValidationReport } from '../types/dmx';

interface SceneHeaderProps {
  scenes: SceneSetup[];
  activeScene: SceneSetup;
  validation: ValidationReport;
  onSelectScene: (id: string) => void;
  onNewScene: () => void;
  onDuplicateScene: () => void;
  onOpenStorageModal: () => void;
}

export function SceneHeader({
  scenes,
  activeScene,
  validation,
  onSelectScene,
  onNewScene,
  onDuplicateScene,
  onOpenStorageModal,
}: SceneHeaderProps) {
  const totalLights = activeScene.lights.length;
  const totalChannels = activeScene.lights.reduce((sum, l) => sum + l.channelCount, 0);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <Sliders className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-100 leading-none">
              512Fit
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">DMX Channel & Controller Planner</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="scene-select" className="sr-only">
            Active Scene
          </label>
          <select
            id="scene-select"
            value={activeScene.id}
            onChange={(e) => onSelectScene(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-100 focus:border-amber-500 focus:outline-none"
          >
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onNewScene}
            title="Create new scene"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">New</span>
          </button>

          <button
            type="button"
            onClick={onDuplicateScene}
            title="Duplicate current scene"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Copy</span>
          </button>

          <button
            type="button"
            onClick={onOpenStorageModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700 ring-1 ring-zinc-700"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>JSON / Save</span>
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-900 bg-zinc-900/50 px-4 sm:px-6 py-1.5">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 text-zinc-400">
            <span>
              <strong className="text-zinc-200">{totalLights}</strong> lights
            </span>
            <span>•</span>
            <span>
              <strong className="text-zinc-200">{totalChannels}</strong> DMX ch used
            </span>
          </div>

          {validation.totalIssues === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Optimal Layout (0 Overlaps)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-300 ring-1 ring-amber-500/30">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {validation.totalIssues} Layout {validation.totalIssues === 1 ? 'Issue' : 'Issues'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
