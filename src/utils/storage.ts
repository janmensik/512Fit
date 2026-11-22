import catalogData from '../data/catalog.json';
import type {
  CatalogLight,
  ControllerProfile,
  SceneLightInstance,
  SceneSetup,
  WorkspaceExport,
} from '../types/dmx';
import { recommendDmxChannels } from './dmxOptimizer';

const STORAGE_KEYS = {
  SCENES: '512fit_scenes_v1',
  ACTIVE_SCENE_ID: '512fit_active_scene_v1',
  CUSTOM_CONTROLLERS: '512fit_custom_controllers_v1',
  CUSTOM_LIGHTS: '512fit_custom_lights_v1',
};

export const FACTORY_CONTROLLERS: ControllerProfile[] = catalogData.controllers;
export const FACTORY_LIGHTS: CatalogLight[] = catalogData.lights;
export const DEFAULT_POSITIONS: string[] = catalogData.defaultPositions;

export function createDemoScene(): SceneSetup {
  const controller = FACTORY_CONTROLLERS[0];
  const initialLights: SceneLightInstance[] = [
    {
      instanceId: 'demo-rgbw-1',
      catalogLightId: 'light-fixed-rgbw-1',
      name: 'Fixed RGBW LED #1',
      profileLabel: '4ch - RGBW',
      channelCount: 4,
      position: 'Front',
      isFixed: true,
      startChannel: 3,
    },
    {
      instanceId: 'demo-rgbw-2',
      catalogLightId: 'light-fixed-rgbw-2',
      name: 'Fixed RGBW LED #2',
      profileLabel: '4ch - RGBW',
      channelCount: 4,
      position: 'Front',
      isFixed: true,
      startChannel: 7,
    },
    {
      instanceId: 'demo-rgbw-3',
      catalogLightId: 'light-fixed-rgbw-3',
      name: 'Fixed RGBW LED #3',
      profileLabel: '4ch - RGBW',
      channelCount: 4,
      position: 'Front',
      isFixed: true,
      startChannel: 11,
    },
    {
      instanceId: 'demo-white-1',
      catalogLightId: 'light-fixed-white-1',
      name: 'Fixed White LED #1',
      profileLabel: '1ch - White',
      channelCount: 1,
      position: 'Table',
      isFixed: true,
      startChannel: 23,
    },
    {
      instanceId: 'demo-white-2',
      catalogLightId: 'light-fixed-white-2',
      name: 'Fixed White LED #2',
      profileLabel: '1ch - White',
      channelCount: 1,
      position: 'Table',
      isFixed: true,
      startChannel: 24,
    },
    {
      instanceId: 'demo-white-3',
      catalogLightId: 'light-fixed-white-3',
      name: 'Fixed White LED #3',
      profileLabel: '1ch - White',
      channelCount: 1,
      position: 'Table',
      isFixed: true,
      startChannel: 25,
    },
    {
      instanceId: 'demo-white-4',
      catalogLightId: 'light-fixed-white-4',
      name: 'Fixed White LED #4',
      profileLabel: '1ch - White',
      channelCount: 1,
      position: 'Table',
      isFixed: true,
      startChannel: 26,
    },
    {
      instanceId: 'demo-hp-1',
      catalogLightId: 'light-hp-2ch',
      name: 'High-Power LED #1',
      profileLabel: '2ch - White, Strobe',
      channelCount: 2,
      position: 'Spot',
      isFixed: false,
      startChannel: 1,
    },
    {
      instanceId: 'demo-hp-2',
      catalogLightId: 'light-hp-2ch',
      name: 'High-Power LED #2',
      profileLabel: '2ch - White, Strobe',
      channelCount: 2,
      position: 'Spot',
      isFixed: false,
      startChannel: 1,
    },
    {
      instanceId: 'demo-lp-1',
      catalogLightId: 'light-lp-6ch',
      name: 'Low-Power Par #1',
      profileLabel: '6ch - RGBWAU',
      channelCount: 6,
      position: 'Left',
      isFixed: false,
      startChannel: 1,
    },
    {
      instanceId: 'demo-lp-2',
      catalogLightId: 'light-lp-6ch',
      name: 'Low-Power Par #2',
      profileLabel: '6ch - RGBWAU',
      channelCount: 6,
      position: 'Left',
      isFixed: false,
      startChannel: 1,
    },
    {
      instanceId: 'demo-lp-3',
      catalogLightId: 'light-lp-6ch',
      name: 'Low-Power Par #3',
      profileLabel: '6ch - RGBWAU',
      channelCount: 6,
      position: 'Right',
      isFixed: false,
      startChannel: 1,
    },
    {
      instanceId: 'demo-lp-4',
      catalogLightId: 'light-lp-6ch',
      name: 'Low-Power Par #4',
      profileLabel: '6ch - RGBWAU',
      channelCount: 6,
      position: 'Right',
      isFixed: false,
      startChannel: 1,
    },
  ];

  const optimized = recommendDmxChannels(initialLights, controller);

  return {
    id: 'scene-demo-rig',
    name: 'My Main Rig (Demo)',
    description: '3x Fixed RGBW (3-14), 4x Fixed White (23-26), 2x 2ch High-Power, 4x 6ch RGBWAU',
    updatedAt: new Date().toISOString(),
    controllerId: controller.id,
    lights: optimized.lights,
    positions: [...DEFAULT_POSITIONS],
  };
}

export function loadScenes(): SceneSetup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCENES);
    if (raw) {
      const parsed = JSON.parse(raw) as SceneSetup[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore corrupted storage
  }
  return [createDemoScene()];
}

export function saveScenes(scenes: SceneSetup[]) {
  localStorage.setItem(STORAGE_KEYS.SCENES, JSON.stringify(scenes));
}

export function loadActiveSceneId(fallbackId: string): string {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_SCENE_ID) || fallbackId;
}

export function saveActiveSceneId(id: string) {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_SCENE_ID, id);
}

export function loadCustomControllers(): ControllerProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CONTROLLERS);
    return raw ? (JSON.parse(raw) as ControllerProfile[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomControllers(controllers: ControllerProfile[]) {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_CONTROLLERS, JSON.stringify(controllers));
}

export function loadCustomLights(): CatalogLight[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_LIGHTS);
    return raw ? (JSON.parse(raw) as CatalogLight[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomLights(lights: CatalogLight[]) {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_LIGHTS, JSON.stringify(lights));
}

export function buildWorkspaceExport(
  scenes: SceneSetup[],
  customControllers: ControllerProfile[],
  customLights: CatalogLight[]
): WorkspaceExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    scenes,
    customControllers,
    customLights,
  };
}
