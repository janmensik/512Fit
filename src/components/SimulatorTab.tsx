import { useEffect } from 'react';
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

  const getLightsInRange = (startCh: number, endCh: number) =>
    lights.filter((l) => {
      const lEnd = l.startChannel + l.channelCount - 1;
      return l.startChannel <= endCh && lEnd >= startCh;
    });

  const getFixtureOccupancy = (fixIdx: number) => {
    const fixStart = (fixIdx - 1) * chPerFixture + 1;
    const pageAStart = fixStart;
    const pageAEnd = fixStart + controller.slidersPerPage - 1;
    const pageALights = getLightsInRange(pageAStart, pageAEnd);

    const pageBStart = fixStart + controller.slidersPerPage;
    const pageBEnd = fixIdx * chPerFixture;
    const pageBLights = controller.hasABSwitch
      ? getLightsInRange(pageBStart, pageBEnd)
      : [];

    return {
      hasPageA: pageALights.length > 0,
      hasPageB: pageBLights.length > 0,
      pageACount: pageALights.length,
      pageBCount: pageBLights.length,
      isUsed: pageALights.length > 0 || pageBLights.length > 0,
    };
  };

  const selectedFixOcc = getFixtureOccupancy(selectedFixture);

  const usedFixtures = Array.from(
    { length: controller.fixtureCount },
    (_, idx) => idx + 1
  ).filter((fixNum) => getFixtureOccupancy(fixNum).isUsed);

  useEffect(() => {
    if (usedFixtures.length > 0 && !selectedFixOcc.isUsed) {
      const firstFix = usedFixtures[0];
      const occ = getFixtureOccupancy(firstFix);
      onSelectFixture(firstFix);
      if (controller.hasABSwitch) {
        if (selectedPage === 'A' && !occ.hasPageA && occ.hasPageB) {
          onSelectPage('B');
        } else if (selectedPage === 'B' && !occ.hasPageB && occ.hasPageA) {
          onSelectPage('A');
        }
      }
    }
  }, [
    usedFixtures.length,
    selectedFixOcc.isUsed,
    controller.hasABSwitch,
    selectedPage,
    onSelectFixture,
    onSelectPage,
  ]);

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
      <div className="rounded-2xl border-2 border-zinc-800 bg-zinc-900 p-3 sm:p-5 shadow-2xl space-y-5">
        {/* Top Row: Fixture Buttons */}
        {controller.fixtureCount > 1 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Fixture Select
            </div>
            {usedFixtures.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs text-zinc-500">
                No lights assigned to any fixture yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {usedFixtures.map((fixNum) => {
                  const isSelected = selectedFixture === fixNum;
                  const posList = fixturePositions(fixNum);
                  const occ = getFixtureOccupancy(fixNum);

                  return (
                    <button
                      key={fixNum}
                      type="button"
                      onClick={() => {
                        onSelectFixture(fixNum);
                        if (controller.hasABSwitch) {
                          if (selectedPage === 'A' && !occ.hasPageA && occ.hasPageB) {
                            onSelectPage('B');
                          } else if (selectedPage === 'B' && !occ.hasPageB && occ.hasPageA) {
                            onSelectPage('A');
                          }
                        }
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl p-2.5 transition-all min-w-0 ${
                        isSelected
                          ? 'border-2 border-amber-400 bg-amber-500/25 text-amber-50 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                          : 'border-2 border-emerald-500 bg-emerald-950/70 text-emerald-100 shadow-md shadow-emerald-500/10 hover:bg-emerald-900/70'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {!isSelected && (
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        )}
                        <span className="text-xs font-bold">FIX {fixNum}</span>
                        {controller.hasABSwitch && (
                          <span className="inline-flex items-center gap-0.5">
                            <span
                              className={`rounded px-1 text-[9px] font-extrabold ${
                                occ.hasPageA
                                  ? 'bg-emerald-500 text-zinc-950'
                                  : 'bg-zinc-900 text-zinc-600'
                              }`}
                            >
                              A
                            </span>
                            <span
                              className={`rounded px-1 text-[9px] font-extrabold ${
                                occ.hasPageB
                                  ? 'bg-emerald-500 text-zinc-950'
                                  : 'bg-zinc-900 text-zinc-600'
                              }`}
                            >
                              B
                            </span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] truncate max-w-full mt-0.5 ${
                          isSelected
                            ? 'text-amber-200'
                            : 'text-emerald-300 font-medium'
                        }`}
                      >
                        {posList.length > 0 ? posList.join(', ') : 'Empty'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Middle Row: Page A/B Switch */}
        {controller.hasABSwitch && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-zinc-800 py-3">
            <div className="text-xs font-semibold text-zinc-300">
              Page Select (Fixture {selectedFixture})
            </div>
            <div className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex rounded-xl border border-zinc-700 bg-zinc-950 p-1 gap-1">
              {(['A', 'B'] as const).map((page) => {
                const active = selectedPage === page;
                const count =
                  page === 'A' ? selectedFixOcc.pageACount : selectedFixOcc.pageBCount;
                const hasLights = count > 0;
                const rangeStart =
                  (selectedFixture - 1) * chPerFixture +
                  (page === 'B' ? controller.slidersPerPage : 0) +
                  1;
                const rangeEnd = rangeStart + controller.slidersPerPage - 1;
                return (
                  <button
                    key={page}
                    type="button"
                    disabled={!hasLights && !active}
                    onClick={() => onSelectPage(page)}
                    className={`inline-flex flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-2 sm:px-3.5 sm:py-1.5 text-xs font-bold transition-all min-w-0 ${
                      active
                        ? 'border-2 border-sky-400 bg-sky-500/25 text-sky-50 ring-2 ring-sky-400/50'
                        : hasLights
                        ? 'border-2 border-emerald-500 bg-emerald-950/70 text-emerald-100 shadow-md shadow-emerald-500/10 hover:bg-emerald-900/70'
                        : 'border border-dashed border-zinc-800/80 bg-zinc-950/30 text-zinc-700 opacity-35 cursor-not-allowed'
                    }`}
                  >
                    {hasLights && !active && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    )}
                    <span>
                      Page {page} (Ch {rangeStart}–{rangeEnd})
                    </span>
                    {hasLights ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          active
                            ? 'bg-sky-400 text-zinc-950'
                            : 'bg-emerald-500 text-zinc-950'
                        }`}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="text-[10px] font-normal">(Empty)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Fader Sliders Grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 xl:grid-cols-[repeat(var(--sliders-per-page),minmax(0,1fr))] gap-2"
          style={
            {
              '--sliders-per-page': Math.min(24, controller.slidersPerPage),
            } as React.CSSProperties
          }
        >
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
                    <div
                      className="text-[11px] font-semibold text-zinc-100 truncate"
                      title={primary.name}
                    >
                      {primary.customName?.trim() || primary.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {primary.channels?.[dmxCh - primary.startChannel] ||
                        (primary.channelCount > 1
                          ? `Ch ${dmxCh - primary.startChannel + 1}/${primary.channelCount}`
                          : '1ch')}
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
