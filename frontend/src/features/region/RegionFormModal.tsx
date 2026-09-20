"use client";

import { useState, useEffect } from "react";
import { regionApi } from "./regionApi";

interface Props {
  mode: "add" | "edit";
  itemId?: number;
  saving: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function RegionFormModal({ mode, itemId, saving, error, onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [fetchLoading, setFetchLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode !== "edit" || !itemId) return;
    const id = itemId;
    let active = true;
    async function run() {
      try {
        const item = await regionApi.getById(id);
        if (active) setName(item.name);
      } finally {
        if (active) setFetchLoading(false);
      }
    }
    void run();
    return () => { active = false; };
  }, [mode, itemId]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
          {mode === "add" ? "Add Region" : "Edit Region"}
        </h2>

        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
          Name
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          disabled={fetchLoading}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !fetchLoading && onSave(name.trim())}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="e.g. North America"
        />
        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name.trim())}
            disabled={saving || fetchLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "add" ? "Add" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegionFormModal;
