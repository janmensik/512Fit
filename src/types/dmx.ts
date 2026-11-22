export interface ControllerProfile {
  id: string;
  name: string;
  slidersPerPage: number;
  hasABSwitch: boolean;
  fixtureCount: number;
  isFactory?: boolean;
}

export interface LightMode {
  id: string;
  name: string;
  channelCount: number;
  profileLabel: string;
  channels?: string[];
}

export interface CatalogLight {
  id: string;
  name: string;
  channelCount: number;
  profileLabel: string;
  defaultFixedStartChannel: number | null;
  isFactory?: boolean;
  channels?: string[];
  modes?: LightMode[];
}

export interface SceneLightInstance {
  instanceId: string;
  catalogLightId?: string;
  selectedModeId?: string;
  name: string;
  customName?: string;
  profileLabel: string;
  channelCount: number;
  channels?: string[];
  position: string;
  isFixed: boolean;
  isLocked?: boolean;
  startChannel: number;
}

export interface SceneSetup {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
  controllerId: string;
  customController?: ControllerProfile;
  lights: SceneLightInstance[];
  positions: string[];
}

export interface ControllerMapping {
  fixture: number;
  page: 'A' | 'B';
  startSlider: number;
  endSlider: number;
  spansMultiplePages: boolean;
  spansMultipleFixtures: boolean;
  outOfControllerRange: boolean;
  formattedSummary: string;
}

export interface ChannelConflict {
  channel: number;
  lights: SceneLightInstance[];
}

export interface ValidationReport {
  overlaps: ChannelConflict[];
  pageSplits: SceneLightInstance[];
  outOfRange: SceneLightInstance[];
  totalIssues: number;
}

export interface WorkspaceExport {
  version: 1;
  exportedAt: string;
  scenes: SceneSetup[];
  customControllers: ControllerProfile[];
  customLights: CatalogLight[];
}
