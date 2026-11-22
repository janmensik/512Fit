import type { ControllerProfile, SceneLightInstance } from '../types/dmx';
import { getChannelsPerFixture, getMaxControllerChannels } from './dmxMath';

interface PageSlot {
  fixture: number;
  page: 'A' | 'B';
  startCh: number;
  endCh: number;
}

export interface OptimizeResult {
  lights: SceneLightInstance[];
  strategyUsed: string;
  notes: string[];
}

function canFitInRange(
  startCh: number,
  count: number,
  rangeStart: number,
  rangeEnd: number,
  occupied: boolean[]
): boolean {
  if (startCh < rangeStart || startCh + count - 1 > rangeEnd) return false;
  for (let c = startCh; c < startCh + count; c++) {
    if (occupied[c]) return false;
  }
  return true;
}

function markOccupied(startCh: number, count: number, occupied: boolean[]) {
  for (let c = startCh; c < startCh + count; c++) {
    if (c >= 1 && c <= 512) occupied[c] = true;
  }
}

function findFirstFitInPage(
  count: number,
  page: PageSlot,
  occupied: boolean[]
): number | null {
  for (let ch = page.startCh; ch <= page.endCh - count + 1; ch++) {
    if (canFitInRange(ch, count, page.startCh, page.endCh, occupied)) {
      return ch;
    }
  }
  return null;
}

function tryPackGroupIntoPages(
  group: SceneLightInstance[],
  pages: PageSlot[],
  occupied: boolean[]
): Map<string, number> | null {
  const tempOccupied = [...occupied];
  const assignments = new Map<string, number>();

  for (const light of group) {
    let placed = false;
    for (const page of pages) {
      const ch = findFirstFitInPage(light.channelCount, page, tempOccupied);
      if (ch !== null) {
        markOccupied(ch, light.channelCount, tempOccupied);
        assignments.set(light.instanceId, ch);
        placed = true;
        break;
      }
    }
    if (!placed) return null;
  }

  return assignments;
}

export function recommendDmxChannels(
  lights: SceneLightInstance[],
  controller: ControllerProfile
): OptimizeResult {
  const occupied = new Array<boolean>(513).fill(false);
  const fixedOrLocked = lights.filter((l) => l.isFixed || l.isLocked);
  const configurable = lights.filter((l) => !l.isFixed && !l.isLocked);

  for (const light of fixedOrLocked) {
    markOccupied(light.startChannel, light.channelCount, occupied);
  }

  if (configurable.length === 0) {
    return {
      lights,
      strategyUsed: 'All lights are Fixed or Locked',
      notes: ['No configurable lights needed auto-assignment.'],
    };
  }

  const maxChannels = getMaxControllerChannels(controller);
  const chPerFixture = getChannelsPerFixture(controller);
  const pagesA: PageSlot[] = [];
  const pagesB: PageSlot[] = [];

  for (let f = 1; f <= controller.fixtureCount; f++) {
    const fixStart = (f - 1) * chPerFixture + 1;
    const pageAEnd = Math.min(maxChannels, fixStart + controller.slidersPerPage - 1);
    if (fixStart <= maxChannels) {
      pagesA.push({ fixture: f, page: 'A', startCh: fixStart, endCh: pageAEnd });
    }
    if (controller.hasABSwitch) {
      const pageBStart = fixStart + controller.slidersPerPage;
      const pageBEnd = Math.min(maxChannels, pageBStart + controller.slidersPerPage - 1);
      if (pageBStart <= maxChannels) {
        pagesB.push({ fixture: f, page: 'B', startCh: pageBStart, endCh: pageBEnd });
      }
    }
  }

  // Fast-path: Check if all configurable lights fit on Fixture 1, Page A
  if (pagesA.length > 0) {
    const directFit = tryPackGroupIntoPages(configurable, [pagesA[0]], occupied);
    if (directFit) {
      const updated = lights.map((l) =>
        directFit.has(l.instanceId)
          ? { ...l, startChannel: directFit.get(l.instanceId)! }
          : l
      );
      return {
        lights: updated,
        strategyUsed: `Direct Page A Fit (Sliders 1–${controller.slidersPerPage})`,
        notes: [
          `All configurable lights fit on Fixture 1 Page A so you don't need to switch pages or fixtures.`,
        ],
      };
    }
  }

  // Group configurable lights by Position
  const positionOrder: string[] = [];
  const groups = new Map<string, SceneLightInstance[]>();
  for (const light of configurable) {
    if (!groups.has(light.position)) {
      positionOrder.push(light.position);
      groups.set(light.position, []);
    }
    groups.get(light.position)!.push(light);
  }

  // Sort lights inside each position by profileLabel then name so identical lights sit together
  for (const [, group] of groups) {
    group.sort(
      (a, b) =>
        b.channelCount - a.channelCount ||
        a.profileLabel.localeCompare(b.profileLabel) ||
        a.name.localeCompare(b.name)
    );
  }

  const finalAssignments = new Map<string, number>();
  const notes: string[] = [];

  // Helper to check if a page is completely empty
  const isPageEmpty = (page: PageSlot) => {
    for (let c = page.startCh; c <= page.endCh; c++) {
      if (occupied[c]) return false;
    }
    return true;
  };

  for (const pos of positionOrder) {
    const group = groups.get(pos)!;
    let placedGroup: Map<string, number> | null = null;

    // 1. Try an empty Page A
    for (const pageA of pagesA) {
      if (isPageEmpty(pageA)) {
        const attempt = tryPackGroupIntoPages(group, [pageA], occupied);
        if (attempt) {
          placedGroup = attempt;
          notes.push(`"${pos}" grouped cleanly on Fixture ${pageA.fixture} Page A.`);
          break;
        }
      }
    }

    // 2. Try any Page A (even partially used)
    if (!placedGroup) {
      for (const pageA of pagesA) {
        const attempt = tryPackGroupIntoPages(group, [pageA], occupied);
        if (attempt) {
          placedGroup = attempt;
          notes.push(`"${pos}" placed together on Fixture ${pageA.fixture} Page A.`);
          break;
        }
      }
    }

    // 3. Try same Fixture (Page A + Page B)
    if (!placedGroup && controller.hasABSwitch) {
      for (let f = 1; f <= controller.fixtureCount; f++) {
        const pA = pagesA.find((p) => p.fixture === f);
        const pB = pagesB.find((p) => p.fixture === f);
        const fixPages = [pA, pB].filter((p): p is PageSlot => Boolean(p));
        if (fixPages.length > 0) {
          const attempt = tryPackGroupIntoPages(group, fixPages, occupied);
          if (attempt) {
            placedGroup = attempt;
            notes.push(`"${pos}" grouped on Fixture ${f} (Page A + Page B).`);
            break;
          }
        }
      }
    }

    // 4. Try any empty Page B
    if (!placedGroup) {
      for (const pageB of pagesB) {
        if (isPageEmpty(pageB)) {
          const attempt = tryPackGroupIntoPages(group, [pageB], occupied);
          if (attempt) {
            placedGroup = attempt;
            notes.push(`"${pos}" grouped on Fixture ${pageB.fixture} Page B.`);
            break;
          }
        }
      }
    }

    // 5. Fallback: place each light individually into Page A first, then Page B, then raw 512
    if (placedGroup) {
      for (const [id, ch] of placedGroup.entries()) {
        const light = group.find((l) => l.instanceId === id)!;
        markOccupied(ch, light.channelCount, occupied);
        finalAssignments.set(id, ch);
      }
    } else {
      const allPages = [...pagesA, ...pagesB];
      for (const light of group) {
        let chFound: number | null = null;
        for (const page of allPages) {
          chFound = findFirstFitInPage(light.channelCount, page, occupied);
          if (chFound !== null) break;
        }
        if (chFound === null) {
          // Oversized or beyond controller range: search 1..512
          for (let ch = 1; ch <= 512 - light.channelCount + 1; ch++) {
            if (canFitInRange(ch, light.channelCount, 1, 512, occupied)) {
              chFound = ch;
              break;
            }
          }
        }
        if (chFound !== null) {
          markOccupied(chFound, light.channelCount, occupied);
          finalAssignments.set(light.instanceId, chFound);
        }
      }
      notes.push(`"${pos}" distributed across available pages without splitting lights.`);
    }
  }

  const updatedLights = lights.map((l) =>
    finalAssignments.has(l.instanceId)
      ? { ...l, startChannel: finalAssignments.get(l.instanceId)! }
      : l
  );

  return {
    lights: updatedLights,
    strategyUsed: 'Position-Grouped • Page A Priority • No Page-Split',
    notes,
  };
}
