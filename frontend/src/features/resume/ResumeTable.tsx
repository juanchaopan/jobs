"use client";

import { useRef } from "react";
import { Resume } from "./resumeApi";

interface Props {
  resumes: Resume[];
  uploading: Record<number, boolean>;
  onEdit: (resume: Resume) => void;
  onMatch: (resume: Resume) => void;
  onUpload: (id: number, file: File) => void;
  onDownload: (resume: Resume) => void;
  onDelete: (id: number) => void;
}

export function ResumeTable({ resumes, uploading, onEdit, onMatch, onUpload, onDownload, onDelete }: Props) {
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
            <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-zinc-400 w-16">ID</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-zinc-400">Name</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-zinc-400 w-28">File</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {resumes.map((resume) => (
            <tr
              key={resume.id}
              className="border-b last:border-0 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <td className="px-6 py-4 text-gray-400 dark:text-zinc-500 font-mono text-xs">{resume.id}</td>
              <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{resume.name}</td>
              <td className="px-6 py-4">
                {resume.extension ? (
                  <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">
                    .{resume.extension}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-zinc-600 text-xs">No file</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(resume)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onMatch(resume)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  >
                    Match
                  </button>

                  <input
                    type="file"
                    className="hidden"
                    ref={(el) => { fileRefs.current[resume.id] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUpload(resume.id, file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileRefs.current[resume.id]?.click()}
                    disabled={!!uploading[resume.id]}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploading[resume.id] ? "Uploading…" : "Upload"}
                  </button>

                  {resume.extension && (
                    <button
                      onClick={() => onDownload(resume)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      Download
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(resume.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
