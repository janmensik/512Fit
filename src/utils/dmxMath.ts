import type {
  ControllerMapping,
  ControllerProfile,
  SceneLightInstance,
  ValidationReport,
} from '../types/dmx';

export function getPagesPerFixture(controller: ControllerProfile): number {
  return controller.hasABSwitch ? 2 : 1;
}

export function getChannelsPerFixture(controller: ControllerProfile): number {
  return controller.slidersPerPage * getPagesPerFixture(controller);
}

export function getMaxControllerChannels(controller: ControllerProfile): number {
  return Math.min(512, getChannelsPerFixture(controller) * controller.fixtureCount);
}

export function mapChannelToController(
  channel: number,
  controller: ControllerProfile
): { fixture: number; page: 'A' | 'B'; slider: number } {
  const chPerFixture = getChannelsPerFixture(controller);
  const fixture = Math.floor((channel - 1) / chPerFixture) + 1;
  const offsetInFixture = (channel - 1) % chPerFixture;
  const page: 'A' | 'B' =
    controller.hasABSwitch && offsetInFixture >= controller.slidersPerPage ? 'B' : 'A';
  const slider = (offsetInFixture % controller.slidersPerPage) + 1;
  return { fixture, page, slider };
}

export function mapChannelRangeToController(
  startChannel: number,
  channelCount: number,
  controller: ControllerProfile
): ControllerMapping {
  const safeStart = Math.max(1, startChannel);
  const endChannel = safeStart + Math.max(1, channelCount) - 1;
  const maxChannels = getMaxControllerChannels(controller);

  const startPos = mapChannelToController(safeStart, controller);
  const endPos = mapChannelToController(endChannel, controller);

  const spansMultipleFixtures = startPos.fixture !== endPos.fixture;
  const spansMultiplePages = spansMultipleFixtures || startPos.page !== endPos.page;
  const outOfControllerRange =
    startChannel < 1 || endChannel > 512 || endChannel > maxChannels;

  const parts: string[] = [];
  if (controller.fixtureCount > 1) {
    parts.push(
      spansMultipleFixtures
        ? `Fixture ${startPos.fixture}–${endPos.fixture}`
        : `Fixture ${startPos.fixture}`
    );
  }
  if (controller.hasABSwitch) {
    parts.push(
      spansMultiplePages && !spansMultipleFixtures
        ? `Page ${startPos.page}–${endPos.page}`
        : `Page ${startPos.page}`
    );
  }
  if (channelCount === 1) {
    parts.push(`Slider ${startPos.slider}`);
  } else if (!spansMultiplePages) {
    parts.push(`Sliders ${startPos.slider}–${endPos.slider}`);
  } else {
    parts.push(`Sliders ${startPos.slider}→${endPos.slider}`);
  }

  return {
    fixture: startPos.fixture,
    page: startPos.page,
    startSlider: startPos.slider,
    endSlider: endPos.slider,
    spansMultiplePages,
    spansMultipleFixtures,
    outOfControllerRange,
    formattedSummary: parts.join(' • '),
  };
}

export function detectChannelConflicts(
  lights: SceneLightInstance[],
  controller: ControllerProfile
): ValidationReport {
  const channelMap = new Map<number, SceneLightInstance[]>();
  const pageSplits: SceneLightInstance[] = [];
  const outOfRange: SceneLightInstance[] = [];

  for (const light of lights) {
    const start = light.startChannel;
    const end = start + light.channelCount - 1;
    for (let ch = start; ch <= end; ch++) {
      if (ch >= 1 && ch <= 512) {
        const list = channelMap.get(ch) ?? [];
        list.push(light);
        channelMap.set(ch, list);
      }
    }

    const mapping = mapChannelRangeToController(start, light.channelCount, controller);
    if (mapping.outOfControllerRange) {
      outOfRange.push(light);
    } else if (
      mapping.spansMultiplePages &&
      light.channelCount <= controller.slidersPerPage
    ) {
      pageSplits.push(light);
    }
  }

  const overlaps = Array.from(channelMap.entries())
    .filter(([, list]) => list.length > 1)
    .map(([channel, list]) => ({ channel, lights: list }))
    .sort((a, b) => a.channel - b.channel);

  return {
    overlaps,
    pageSplits,
    outOfRange,
    totalIssues: overlaps.length + pageSplits.length + outOfRange.length,
  };
}

export function getDipSwitches(startChannel: number): boolean[] {
  const clamped = Math.max(0, Math.min(511, startChannel));
  const switches: boolean[] = [];
  for (let bit = 0; bit < 9; bit++) {
    switches.push(((clamped >> bit) & 1) === 1);
  }
  return switches;
}

const POSITION_COLORS = [
  { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300', dot: 'bg-amber-400' },
  { bg: 'bg-sky-500/15', border: 'border-sky-500/40', text: 'text-sky-300', dot: 'bg-sky-400' },
  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  { bg: 'bg-violet-500/15', border: 'border-violet-500/40', text: 'text-violet-300', dot: 'bg-violet-400' },
  { bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-300', dot: 'bg-rose-400' },
  { bg: 'bg-teal-500/15', border: 'border-teal-500/40', text: 'text-teal-300', dot: 'bg-teal-400' },
  { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-300', dot: 'bg-orange-400' },
];

export function getPositionColor(position: string, allPositions: string[]) {
  const idx = Math.max(0, allPositions.indexOf(position));
  return POSITION_COLORS[idx % POSITION_COLORS.length];
}
