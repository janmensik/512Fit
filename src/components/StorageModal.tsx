import { useRef, useState } from 'react';
import { Check, Copy, Download, Upload, X } from 'lucide-react';
import type { CatalogLight, ControllerProfile, SceneSetup, WorkspaceExport } from '../types/dmx';
import {
  DEFAULT_POSITIONS,
  FACTORY_CONTROLLERS,
  FACTORY_LIGHTS,
  buildWorkspaceExport,
} from '../utils/storage';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: SceneSetup[];
  customControllers: ControllerProfile[];
  customLights: CatalogLight[];
  onImportWorkspace: (data: WorkspaceExport) => void;
}

export function StorageModal({
  isOpen,
  onClose,
  scenes,
  customControllers,
  customLights,
  onImportWorkspace,
}: StorageModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedCatalog, setCopiedCatalog] = useState(false);

  if (!isOpen) return null;

  const handleDownloadJson = () => {
    const payload = buildWorkspaceExport(scenes, customControllers, customLights);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `512fit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as WorkspaceExport;
      if (!Array.isArray(parsed.scenes)) {
        throw new Error('Invalid 512Fit JSON file: missing scenes array.');
      }
      onImportWorkspace(parsed);
      setImportError(null);
      onClose();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse JSON file.');
    }
  };

  const handleCopyCatalogJson = async () => {
    const mergedCatalog = {
      controllers: [...FACTORY_CONTROLLERS, ...customControllers],
      lights: [...FACTORY_LIGHTS, ...customLights],
      defaultPositions: DEFAULT_POSITIONS,
    };
    await navigator.clipboard.writeText(JSON.stringify(mergedCatalog, null, 2));
    setCopiedCatalog(true);
    setTimeout(() => setCopiedCatalog(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 id="storage-modal-title" className="text-base font-bold text-zinc-100">
            Save, Export & Import JSON
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Your scenes, custom lights, and custom controllers are automatically saved in your
          browser&apos;s LocalStorage. Use JSON export/import to back up or transfer between devices.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export All (.json)
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import (.json)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {importError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {importError}
          </div>
        )}

        <div className="border-t border-zinc-800 pt-4 space-y-2">
          <div className="text-xs font-semibold text-zinc-300">
            GitHub Global Catalog (`src/data/catalog.json`)
          </div>
          <p className="text-xs text-zinc-400">
            Copy the merged factory + custom lights/controllers JSON to commit into your GitHub
            repository&apos;s global catalog.
          </p>
          <button
            type="button"
            onClick={handleCopyCatalogJson}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            {copiedCatalog ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                Copied catalog.json!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy Global catalog.json
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
