"use client";

import { useState } from "react";
import { titleApi, Title } from "./titleApi";
import { TitleTable } from "./TitleTable";
import { TitleFormModal } from "./TitleFormModal";
import { useFetch } from "@/hooks/useFetch";

type ModalState = { mode: "add" } | { mode: "edit"; id: number };

export function TitlePage() {
  const { items: titles, setItems: setTitles, loading, error, reload } = useFetch<Title>(titleApi.list);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  function openAdd() {
    setModal({ mode: "add" });
    setModalError(null);
  }

  function openEdit(title: Title) {
    setModal({ mode: "edit", id: title.id });
    setModalError(null);
  }

  async function handleSave(name: string) {
    if (!name) { setModalError("Name is required."); return; }
    setSaving(true);
    setModalError(null);
    try {
      if (modal?.mode === "add") {
        const created = await titleApi.create(name);
        setTitles((prev) => [...prev, created]);
      } else if (modal?.mode === "edit") {
        const updated = await titleApi.update(modal.id, name);
        setTitles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
      setModal(null);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this title? This cannot be undone.")) return;
    try {
      await titleApi.remove(id);
      setTitles((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Titles</h1>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Title
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
            <span>{error}</span>
            <button onClick={reload} className="underline ml-4 shrink-0">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400 dark:text-zinc-500">Loading…</div>
        ) : titles.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-zinc-500">
            No titles yet. {" "}
            <button onClick={openAdd} className="underline">Add one</button>{" "}
            to get started.
          </div>
        ) : (
          <TitleTable
            titles={titles}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {modal && (
        <TitleFormModal
          mode={modal.mode}
          itemId={modal.mode === "edit" ? modal.id : undefined}
          saving={saving}
          error={modalError}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default TitlePage;
