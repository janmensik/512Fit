import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Lock,
  Pencil,
  Plus,
  Sparkles,
  Tags,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import type {
  CatalogLight,
  ControllerProfile,
  SceneLightInstance,
  ValidationReport,
} from '../types/dmx';
import {
  getPositionColor,
  mapChannelRangeToController,
} from '../utils/dmxMath';

interface LightsChannelsTabProps {
  lights: SceneLightInstance[];
  positions: string[];
  catalogLights: CatalogLight[];
  controller: ControllerProfile;
  validation: ValidationReport;
  strategyNote: string | null;
  onAddLights: (newLights: SceneLightInstance[]) => void;
  onUpdateLight: (instanceId: string, patch: Partial<SceneLightInstance>) => void;
  onRemoveLight: (instanceId: string) => void;
  onAutoRecommend: () => void;
  onSaveLightToCatalog: (light: CatalogLight) => void;
  onAddPosition: (pos: string) => void;
  onRenamePosition: (oldName: string, newName: string) => void;
  onDeletePosition: (name: string) => void;
}

export function LightsChannelsTab({
  lights,
  positions,
  catalogLights,
  controller,
  validation,
  strategyNote,
  onAddLights,
  onUpdateLight,
  onRemoveLight,
  onAutoRecommend,
  onSaveLightToCatalog,
  onAddPosition,
  onRenamePosition,
  onDeletePosition,
}: LightsChannelsTabProps) {
  const [selectedCatalogId, setSelectedCatalogId] = useState(catalogLights[0]?.id || '');
  const [selectedModeId, setSelectedModeId] = useState(catalogLights[0]?.modes?.[0]?.id || '');
  const [addPosition, setAddPosition] = useState(positions[0] || 'Front');
  const [customPosInput, setCustomPosInput] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Position manager state
  const [showPositionManager, setShowPositionManager] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [editingPos, setEditingPos] = useState<string | null>(null);
  const [editingPosValue, setEditingPosValue] = useState('');

  useEffect(() => {
    if (!positions.includes(addPosition) && positions.length > 0) {
      setAddPosition(positions[0]);
    }
  }, [positions, addPosition]);

  // Custom light form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customChannels, setCustomChannels] = useState(4);
  const [customProfile, setCustomProfile] = useState('4ch - RGBW');
  const [customIsFixed, setCustomIsFixed] = useState(false);
  const [customFixedStart, setCustomFixedStart] = useState(1);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const overlappingChannels = new Set(validation.overlaps.map((o) => o.channel));
  const splitIds = new Set(validation.pageSplits.map((l) => l.instanceId));
  const outOfRangeIds = new Set(validation.outOfRange.map((l) => l.instanceId));

  const selectedTemplate = catalogLights.find((c) => c.id === selectedCatalogId);
  const selectedMode =
    selectedTemplate?.modes?.find((m) => m.id === selectedModeId) ??
    selectedTemplate?.modes?.[0];

  const handleAddFromCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    const template = selectedTemplate;
    if (!template) return;

    const targetPos = customPosInput.trim() || addPosition;
    if (customPosInput.trim() && !positions.includes(customPosInput.trim())) {
      onAddPosition(customPosInput.trim());
    }

    const channelCount = selectedMode?.channelCount ?? template.channelCount;
    const profileLabel = selectedMode?.profileLabel ?? template.profileLabel;
    const channels = selectedMode?.channels ?? template.channels;

    const instances: SceneLightInstance[] = [];
    for (let i = 0; i < quantity; i++) {
      const suffix = quantity > 1 ? ` #${i + 1}` : '';
      const isFixed = template.defaultFixedStartChannel !== null;
      instances.push({
        instanceId: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
        catalogLightId: template.id,
        selectedModeId: selectedMode?.id,
        name: `${template.name}${suffix}`,
        profileLabel,
        channelCount,
        channels,
        position: targetPos,
        isFixed,
        startChannel: isFixed ? template.defaultFixedStartChannel! : 1,
      });
    }
    onAddLights(instances);
    setCustomPosInput('');
    setQuantity(1);
  };

  const handleCreateCustomLight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const targetPos = customPosInput.trim() || addPosition;
    if (customPosInput.trim() && !positions.includes(customPosInput.trim())) {
      onAddPosition(customPosInput.trim());
    }

    const catalogId = `light-custom-${Date.now()}`;
    if (saveToLibrary) {
      onSaveLightToCatalog({
        id: catalogId,
        name: customName.trim(),
        channelCount: customChannels,
        profileLabel: customProfile.trim() || `${customChannels}ch`,
        defaultFixedStartChannel: customIsFixed ? customFixedStart : null,
        isFactory: false,
      });
    }

    const instances: SceneLightInstance[] = [];
    for (let i = 0; i < quantity; i++) {
      const suffix = quantity > 1 ? ` #${i + 1}` : '';
      instances.push({
        instanceId: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
        catalogLightId: saveToLibrary ? catalogId : undefined,
        name: `${customName.trim()}${suffix}`,
        profileLabel: customProfile.trim() || `${customChannels}ch`,
        channelCount: customChannels,
        position: targetPos,
        isFixed: customIsFixed,
        startChannel: customIsFixed ? customFixedStart : 1,
      });
    }

    onAddLights(instances);
    setCustomName('');
    setShowCustomForm(false);
    setQuantity(1);
  };

  const hasOverlap = (light: SceneLightInstance) => {
    for (let c = light.startChannel; c < light.startChannel + light.channelCount; c++) {
      if (overlappingChannels.has(c)) return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Add Lights Section */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-semibold text-zinc-100">3. Add Lights to Scene</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPositionManager(!showPositionManager)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300"
            >
              <Tags className="h-3.5 w-3.5" aria-hidden="true" />
              {showPositionManager ? 'Hide Positions' : 'Manage Positions'}
            </button>
            <button
              type="button"
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              {showCustomForm ? '← Pick from Catalog' : '+ Create Custom Light'}
            </button>
          </div>
        </div>

        {showPositionManager && (
          <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Position Labels
              </h3>
              <span className="text-[11px] text-zinc-500">
                Rename or delete labels (lights are updated automatically)
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                aria-label="New position label"
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPositionName.trim()) {
                    e.preventDefault();
                    onAddPosition(newPositionName.trim());
                    setAddPosition(newPositionName.trim());
                    setNewPositionName('');
                  }
                }}
                placeholder="New position (e.g. Truss, DJ Booth)"
                className="flex-1 min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newPositionName.trim()) return;
                  onAddPosition(newPositionName.trim());
                  setAddPosition(newPositionName.trim());
                  setNewPositionName('');
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-sky-400"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Position
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {positions.map((pos) => {
                const count = lights.filter((l) => l.position === pos).length;
                const posColor = getPositionColor(pos, positions);
                const isEditing = editingPos === pos;

                if (isEditing) {
                  return (
                    <div
                      key={pos}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-500/50 bg-zinc-900 px-2 py-1"
                    >
                      <input
                        type="text"
                        aria-label={`Rename position ${pos}`}
                        value={editingPosValue}
                        onChange={(e) => setEditingPosValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onRenamePosition(pos, editingPosValue);
                            setEditingPos(null);
                          } else if (e.key === 'Escape') {
                            setEditingPos(null);
                          }
                        }}
                        className="w-28 bg-transparent text-xs font-medium text-zinc-100 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onRenamePosition(pos, editingPosValue);
                          setEditingPos(null);
                        }}
                        aria-label="Save position name"
                        className="rounded p-1 text-emerald-400 hover:bg-zinc-800"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPos(null)}
                        aria-label="Cancel rename"
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={pos}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${posColor.bg} ${posColor.border} ${posColor.text}`}
                  >
                    <span className="font-semibold">{pos}</span>
                    <span className="opacity-70">({count})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPos(pos);
                        setEditingPosValue(pos);
                      }}
                      title={`Rename ${pos}`}
                      aria-label={`Rename ${pos}`}
                      className="ml-1 rounded p-0.5 hover:bg-black/20"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                    </button>
                    {positions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeletePosition(pos)}
                        title={`Delete ${pos}`}
                        aria-label={`Delete ${pos}`}
                        className="rounded p-0.5 hover:bg-black/20 text-rose-300"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!showCustomForm ? (
          <form onSubmit={handleAddFromCatalog} className="grid gap-3 sm:grid-cols-12 items-end">
            <div className="sm:col-span-5 flex flex-col gap-1.5">
              <label htmlFor="catalog-light-select" className="text-xs font-medium text-zinc-300">
                Light / Dimmer
              </label>
              <select
                id="catalog-light-select"
                value={selectedCatalogId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCatalogId(newId);
                  const next = catalogLights.find((c) => c.id === newId);
                  setSelectedModeId(next?.modes?.[0]?.id || '');
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              >
                {catalogLights.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.profileLabel})
                    {l.defaultFixedStartChannel !== null ? ` [Fixed Ch ${l.defaultFixedStartChannel}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate?.modes && selectedTemplate.modes.length > 1 && (
              <div className="sm:col-span-12 flex flex-col gap-1.5">
                <label htmlFor="catalog-mode-select" className="text-xs font-medium text-amber-300">
                  DMX Channel Mode ({selectedTemplate.name})
                </label>
                <select
                  id="catalog-mode-select"
                  value={selectedMode?.id || ''}
                  onChange={(e) => setSelectedModeId(e.target.value)}
                  className="rounded-lg border border-amber-500/40 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                >
                  {selectedTemplate.modes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.profileLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-3 flex flex-col gap-1.5">
              <label htmlFor="add-position-select" className="text-xs font-medium text-zinc-300">
                Position Label
              </label>
              <select
                id="add-position-select"
                value={addPosition}
                onChange={(e) => setAddPosition(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              >
                {positions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="add-qty" className="text-xs font-medium text-zinc-300">
                Qty
              </label>
              <input
                id="add-qty"
                type="number"
                inputMode="numeric"
                min={1}
                max={24}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateCustomLight} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="custom-light-name" className="text-xs font-medium text-zinc-300">
                  Light Name
                </label>
                <input
                  id="custom-light-name"
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Wash Bar 8ch"
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="custom-light-ch" className="text-xs font-medium text-zinc-300">
                  Channels
                </label>
                <input
                  id="custom-light-ch"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={64}
                  value={customChannels}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(64, Number(e.target.value) || 1));
                    setCustomChannels(val);
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="custom-light-profile" className="text-xs font-medium text-zinc-300">
                  Profile Label
                </label>
                <input
                  id="custom-light-profile"
                  type="text"
                  value={customProfile}
                  onChange={(e) => setCustomProfile(e.target.value)}
                  placeholder="e.g. 6ch - RGBWAU"
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customIsFixed}
                  onChange={(e) => setCustomIsFixed(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Fixed DMX Start Channel
              </label>

              {customIsFixed && (
                <div className="flex items-center gap-2">
                  <label htmlFor="custom-fixed-ch" className="text-xs text-zinc-400">
                    Start Ch:
                  </label>
                  <input
                    id="custom-fixed-ch"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={512}
                    value={customFixedStart}
                    onChange={(e) => setCustomFixedStart(Math.max(1, Math.min(512, Number(e.target.value) || 1)))}
                    className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Save to My Lights Library
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create & Add to Scene
            </button>
          </form>
        )}
      </section>

      {/* Auto-Recommend Bar */}
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-amber-200">
            4. Smart DMX Channel Optimizer
          </h3>
          <p className="text-xs text-amber-200/80 mt-0.5">
            {strategyNote ||
              'Automatically places configurable lights around fixed lights, grouped by Position, with no Page A/B splits.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onAutoRecommend}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-[0.99]"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Auto-Recommend DMX Channels
        </button>
      </section>

      {/* Conflict Warnings */}
      {validation.totalIssues > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-rose-300 text-sm">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Channel Warnings Detected
          </div>
          {validation.overlaps.length > 0 && (
            <p>
              • Overlapping DMX channels:{' '}
              {validation.overlaps
                .slice(0, 6)
                .map((o) => `Ch ${o.channel} (${o.lights.map((l) => l.name).join(' & ')})`)
                .join(', ')}
              {validation.overlaps.length > 6 ? ` (+${validation.overlaps.length - 6} more)` : ''}
            </p>
          )}
          {validation.pageSplits.length > 0 && (
            <p>
              • Page/Fixture splits:{' '}
              {validation.pageSplits.map((l) => l.name).join(', ')} cross a Page A/B or Fixture boundary.
            </p>
          )}
          {validation.outOfRange.length > 0 && (
            <p>
              • Out of controller range:{' '}
              {validation.outOfRange.map((l) => l.name).join(', ')}.
            </p>
          )}
        </div>
      )}

      {/* Scene Lights List */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">
          Scene Lights ({lights.length})
        </h3>

        {lights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
            No lights in this scene yet. Add lights above to get started.
          </div>
        ) : (
          <div className="space-y-2.5">
            {lights.map((light) => {
              const mapping = mapChannelRangeToController(
                light.startChannel,
                light.channelCount,
                controller
              );
              const posColor = getPositionColor(light.position, positions);
              const endCh = light.startChannel + light.channelCount - 1;
              const isErr =
                hasOverlap(light) ||
                splitIds.has(light.instanceId) ||
                outOfRangeIds.has(light.instanceId);

              return (
                <div
                  key={light.instanceId}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    isErr
                      ? 'border-rose-500/60 bg-rose-950/20'
                      : 'border-zinc-800 bg-zinc-900/70'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${posColor.bg} ${posColor.border} ${posColor.text}`}
                        >
                          {light.position}
                        </span>
                        <span className="font-semibold text-zinc-100 text-sm truncate">
                          {light.name}
                        </span>
                        <span className="text-xs text-zinc-400">({light.profileLabel})</span>
                        {light.isFixed && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">
                            FIXED
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-amber-300">
                          DMX {light.channelCount === 1 ? light.startChannel : `${light.startChannel}–${endCh}`}
                        </span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-sky-300 font-medium">{mapping.formattedSummary}</span>
                      </div>
                    </div>

                    {/* Mobile-friendly channel controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(() => {
                        const cat = light.catalogLightId
                          ? catalogLights.find((c) => c.id === light.catalogLightId)
                          : undefined;
                        if (!cat?.modes || cat.modes.length <= 1) return null;
                        return (
                          <select
                            aria-label={`DMX mode for ${light.name}`}
                            value={light.selectedModeId || cat.modes[0].id}
                            onChange={(e) => {
                              const mode = cat.modes!.find((m) => m.id === e.target.value);
                              if (mode) {
                                onUpdateLight(light.instanceId, {
                                  selectedModeId: mode.id,
                                  channelCount: mode.channelCount,
                                  profileLabel: mode.profileLabel,
                                  channels: mode.channels,
                                });
                              }
                            }}
                            className="rounded-lg border border-amber-500/40 bg-zinc-950 px-2 py-1 text-xs text-amber-200"
                          >
                            {cat.modes.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.channelCount}ch ({m.name})
                              </option>
                            ))}
                          </select>
                        );
                      })()}

                      <select
                        aria-label={`Position for ${light.name}`}
                        value={light.position}
                        onChange={(e) =>
                          onUpdateLight(light.instanceId, { position: e.target.value })
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                      >
                        {positions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>

                      {!light.isFixed && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateLight(light.instanceId, {
                                startChannel: Math.max(1, light.startChannel - 1),
                              })
                            }
                            aria-label="Decrease DMX channel"
                            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
                          >
                            -1
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            aria-label={`DMX start channel for ${light.name}`}
                            min={1}
                            max={512}
                            value={light.startChannel}
                            onChange={(e) =>
                              onUpdateLight(light.instanceId, {
                                startChannel: Math.max(1, Math.min(512, Number(e.target.value) || 1)),
                              })
                            }
                            className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-center font-mono text-xs font-bold text-zinc-100"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateLight(light.instanceId, {
                                startChannel: Math.min(512, light.startChannel + 1),
                              })
                            }
                            aria-label="Increase DMX channel"
                            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
                          >
                            +1
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onUpdateLight(light.instanceId, { isLocked: !light.isLocked })
                            }
                            title={light.isLocked ? 'Unlock channel' : 'Lock channel'}
                            aria-label={light.isLocked ? 'Unlock channel' : 'Lock channel'}
                            className={`rounded-lg border p-1.5 ${
                              light.isLocked
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                                : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {light.isLocked ? (
                              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemoveLight(light.instanceId)}
                        aria-label={`Remove ${light.name}`}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-400 hover:border-rose-500/40 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
