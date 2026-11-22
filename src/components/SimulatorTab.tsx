import type { ControllerProfile, SceneLightInstance } from '../types/dmx';
import {
  getChannelsPerFixture,
  getPositionColor,
  mapChannelRangeToController,
} from '../utils/dmxMath';

interface SimulatorTabProps {
  lights: SceneLightInstance[];
  positions: string[];
  controller: ControllerProfile;
  selectedFixture: number;
  selectedPage: 'A' | 'B';
  highlightedLightId: string | null;
  onSelectFixture: (fixture: number) => void;
  onSelectPage: (page: 'A' | 'B') => void;
  onSelectLight: (id: string | null) => void;
}

export function SimulatorTab({
  lights,
  positions,
  controller,
  selectedFixture,
  selectedPage,
  highlightedLightId,
  onSelectFixture,
  onSelectPage,
  onSelectLight,
}: SimulatorTabProps) {
  const chPerFixture = getChannelsPerFixture(controller);
  const pageOffset = controller.hasABSwitch && selectedPage === 'B' ? controller.slidersPerPage : 0;
  const pageStartCh = (selectedFixture - 1) * chPerFixture + pageOffset + 1;

  // Map each fixture to positions present on it
  const fixturePositions = (fixIdx: number) => {
    const posSet = new Set<string>();
    for (const l of lights) {
      const m = mapChannelRangeToController(l.startChannel, l.channelCount, controller);
      if (m.fixture === fixIdx) posSet.add(l.position);
    }
    return Array.from(posSet);
  };

  const sliders = Array.from({ length: controller.slidersPerPage }, (_, i) => {
    const sliderNum = i + 1;
    const dmxCh = pageStartCh + i;
    const matchingLights = lights.filter(
      (l) => dmxCh >= l.startChannel && dmxCh <= l.startChannel + l.channelCount - 1
    );
    return { sliderNum, dmxCh, matchingLights };
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">
          Simulated DMX Controller
        </h2>
        <p className="text-xs text-zinc-400">
          {controller.name} — Select a Fixture button and Page A/B to see what each physical slider controls.
        </p>
      </div>

      {/* Hardware Console Deck */}
      <div className="rounded-2xl border-2 border-zinc-800 bg-zinc-900 p-4 sm:p-5 shadow-2xl space-y-5">
        {/* Top Row: Fixture Buttons */}
        {controller.fixtureCount > 1 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Fixture Select
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Array.from({ length: controller.fixtureCount }, (_, idx) => {
                const fixNum = idx + 1;
                const isSelected = selectedFixture === fixNum;
                const posList = fixturePositions(fixNum);

                return (
                  <button
                    key={fixNum}
                    type="button"
                    onClick={() => onSelectFixture(fixNum)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-lg shadow-amber-500/10'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-xs font-bold">FIX {fixNum}</span>
                    <span className="text-[10px] text-zinc-400 truncate max-w-full mt-0.5">
                      {posList.length > 0 ? posList.join(', ') : 'Empty'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Middle Row: Page A/B Switch */}
        {controller.hasABSwitch && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-zinc-800 py-3">
            <div className="text-xs font-semibold text-zinc-300">
              Page Select (Fixture {selectedFixture})
            </div>
            <div className="inline-flex rounded-xl border border-zinc-700 bg-zinc-950 p-1">
              {(['A', 'B'] as const).map((page) => {
                const active = selectedPage === page;
                const rangeStart =
                  (selectedFixture - 1) * chPerFixture +
                  (page === 'B' ? controller.slidersPerPage : 0) +
                  1;
                const rangeEnd = rangeStart + controller.slidersPerPage - 1;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => onSelectPage(page)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
                      active
                        ? 'bg-sky-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Page {page} (Ch {rangeStart}–{rangeEnd})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Fader Sliders Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
          {sliders.map(({ sliderNum, dmxCh, matchingLights }) => {
            const primary = matchingLights[0];
            const isOverlap = matchingLights.length > 1;
            const isHighlighted =
              highlightedLightId !== null &&
              matchingLights.some((l) => l.instanceId === highlightedLightId);
            const posColor = primary
              ? getPositionColor(primary.position, positions)
              : null;

            return (
              <button
                key={sliderNum}
                type="button"
                onClick={() =>
                  onSelectLight(primary ? primary.instanceId : null)
                }
                className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all ${
                  isOverlap
                    ? 'border-rose-500 bg-rose-950/30'
                    : isHighlighted
                    ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/50'
                    : primary
                    ? `${posColor!.border} ${posColor!.bg}`
                    : 'border-zinc-800 bg-zinc-950/60 opacity-60'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>S{sliderNum}</span>
                  <span>#{dmxCh}</span>
                </div>

                {/* Visual Fader Track */}
                <div className="my-2.5 h-16 w-2 rounded-full bg-zinc-800 relative flex items-center justify-center">
                  <div
                    className={`h-4 w-5 rounded-sm border shadow ${
                      primary
                        ? 'border-zinc-200 bg-zinc-100'
                        : 'border-zinc-600 bg-zinc-700 translate-y-5'
                    }`}
                  />
                </div>

                {primary ? (
                  <div className="w-full space-y-0.5">
                    <div className={`text-[10px] font-bold uppercase truncate ${posColor!.text}`}>
                      {primary.position}
                    </div>
                    <div className="text-[11px] font-semibold text-zinc-100 truncate">
                      {primary.name}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {primary.channelCount > 1
                        ? `Ch ${dmxCh - primary.startChannel + 1}/${primary.channelCount}`
                        : '1ch'}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-600 py-2">Unused</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
