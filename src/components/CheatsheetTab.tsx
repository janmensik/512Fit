import { useState } from 'react';
import { Eye, Printer } from 'lucide-react';
import type { ControllerProfile, SceneLightInstance } from '../types/dmx';
import {
  getDipSwitches,
  getPositionColor,
  mapChannelRangeToController,
} from '../utils/dmxMath';

interface CheatsheetTabProps {
  lights: SceneLightInstance[];
  positions: string[];
  controller: ControllerProfile;
  onInspectInSimulator: (light: SceneLightInstance) => void;
}

export function CheatsheetTab({
  lights,
  positions,
  controller,
  onInspectInSimulator,
}: CheatsheetTabProps) {
  const [showDip, setShowDip] = useState(false);

  // Group lights by position
  const grouped = new Map<string, SceneLightInstance[]>();
  for (const pos of positions) {
    const items = lights.filter((l) => l.position === pos);
    if (items.length > 0) grouped.set(pos, items);
  }
  for (const l of lights) {
    if (!positions.includes(l.position)) {
      const list = grouped.get(l.position) ?? [];
      list.push(l);
      grouped.set(l.position, list);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            Operator Quick Cheatsheet
          </h2>
          <p className="text-xs text-zinc-400">
            Grouped by Position. Tap any light to highlight it on the Controller Simulator.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200">
            <input
              type="checkbox"
              checked={showDip}
              onChange={(e) => setShowDip(e.target.checked)}
              className="h-3.5 w-3.5 accent-amber-500"
            />
            Show DIP Switches
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 print:hidden"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      {grouped.size === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
          No lights configured in this scene.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from(grouped.entries()).map(([pos, items]) => {
            const posColor = getPositionColor(pos, positions);
            const sorted = [...items].sort((a, b) => a.startChannel - b.startChannel);

            return (
              <section
                key={pos}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 overflow-hidden"
              >
                <div className={`border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between ${posColor.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${posColor.dot}`} />
                    <h3 className={`text-sm font-bold tracking-wide uppercase ${posColor.text}`}>
                      {pos}
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {sorted.length} {sorted.length === 1 ? 'light' : 'lights'}
                  </span>
                </div>

                <div className="divide-y divide-zinc-800/80">
                  {sorted.map((light) => {
                    const mapping = mapChannelRangeToController(
                      light.startChannel,
                      light.channelCount,
                      controller
                    );
                    const endCh = light.startChannel + light.channelCount - 1;
                    const dips = showDip ? getDipSwitches(light.startChannel) : [];

                    return (
                      <div
                        key={light.instanceId}
                        className="p-3.5 hover:bg-zinc-800/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-zinc-100 text-sm">
                                {light.customName?.trim() || light.name}
                              </span>
                              {light.customName?.trim() && (
                                <span className="text-xs text-zinc-500">
                                  {light.name}
                                </span>
                              )}
                              <span className="text-xs text-zinc-400">
                                ({light.profileLabel})
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono font-bold text-amber-300 ring-1 ring-amber-500/30">
                                DMX {light.channelCount === 1 ? light.startChannel : `${light.startChannel}–${endCh}`}
                              </span>
                              <span className="rounded bg-sky-500/15 px-2 py-0.5 font-medium text-sky-300 ring-1 ring-sky-500/30">
                                {mapping.formattedSummary}
                              </span>
                            </div>

                            {light.channels && light.channels.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {light.channels.map((chName, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-300"
                                  >
                                    <span className="font-mono text-zinc-500">
                                      {light.startChannel + idx}:
                                    </span>{' '}
                                    {chName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onInspectInSimulator(light)}
                            title="Show on Controller Simulator"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-amber-500/50 hover:text-amber-300 print:hidden"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">Console</span>
                          </button>
                        </div>

                        {showDip && (
                          <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-zinc-800/60">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase mr-1">
                              DIP
                            </span>
                            {dips.map((on, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col items-center gap-0.5"
                                title={`Pin ${idx + 1} (${1 << idx}): ${on ? 'ON' : 'OFF'}`}
                              >
                                <div
                                  className={`h-4 w-2.5 rounded-sm border ${
                                    on
                                      ? 'border-amber-400 bg-amber-400'
                                      : 'border-zinc-700 bg-zinc-950'
                                  }`}
                                />
                                <span className="text-[9px] text-zinc-500">{idx + 1}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
