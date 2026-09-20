"use client";

import { useState } from "react";
import { resumeApi, Resume } from "./resumeApi";
import { ResumeTable } from "./ResumeTable";
import { ResumeFormModal } from "./ResumeFormModal";
import { ResumeMatchModal } from "./ResumeMatchModal";
import { useFetch } from "@/hooks/useFetch";

type ModalState = { mode: "add" } | { mode: "edit"; id: number };

export function ResumePage() {
  const { items: resumes, setItems: setResumes, loading, error, reload } = useFetch<Resume>(resumeApi.list);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [matchResume, setMatchResume] = useState<{ id: number; name: string } | null>(null);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});

  function openAdd() {
    setModal({ mode: "add" });
    setModalError(null);
  }

  function openEdit(resume: Resume) {
    setModal({ mode: "edit", id: resume.id });
    setModalError(null);
  }

  async function handleSave(name: string, note: string) {
    if (!name) { setModalError("Name is required."); return; }
    if (!note) { setModalError("Note is required."); return; }
    setSaving(true);
    setModalError(null);
    try {
      if (modal?.mode === "add") {
        const created = await resumeApi.create(name, note);
        setResumes((prev) => [...prev, created]);
      } else if (modal?.mode === "edit") {
        const updated = await resumeApi.update(modal.id, name, note);
        setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
      setModal(null);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this resume? This cannot be undone.")) return;
    try {
      await resumeApi.remove(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleUpload(id: number, file: File) {
    setUploading((prev) => ({ ...prev, [id]: true }));
    try {
      const updated = await resumeApi.uploadFile(id, file);
      setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading((prev) => ({ ...prev, [id]: false }));
    }
  }

  function handleDownload({ id, name, extension }: Resume) {
    const a = document.createElement("a");
    a.href = resumeApi.fileUrl(id);
    a.download = `${name}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resumes</h1>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Resume
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
        ) : resumes.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-zinc-500">
            No resumes yet.{" "}
            <button onClick={openAdd} className="underline">Add one</button>{" "}
            to get started.
          </div>
        ) : (
          <ResumeTable
            resumes={resumes}
            uploading={uploading}
            onEdit={openEdit}
            onMatch={(resume) => setMatchResume({ id: resume.id, name: resume.name })}
            onUpload={handleUpload}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        )}
      </div>

      {modal && (
        <ResumeFormModal
          mode={modal.mode}
          itemId={modal.mode === "edit" ? modal.id : undefined}
          saving={saving}
          error={modalError}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {matchResume && (
        <ResumeMatchModal
          resumeId={matchResume.id}
          resumeName={matchResume.name}
          resumes={resumes}
          onClose={() => setMatchResume(null)}
        />
      )}
    </div>
  );
}
