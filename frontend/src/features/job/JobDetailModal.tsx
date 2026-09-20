"use client";

import { useState, useEffect } from "react";
import { jobApi, Job, JobSkill } from "./jobApi";

interface Props {
  jobId: number;
  onClose: () => void;
}

export function JobDetailModal({ jobId, onClose }: Props) {
  const [tab, setTab] = useState<'detail' | 'skills'>('detail');
  const [job, setJob] = useState<Job | null>(null);
  const [skills, setSkills] = useState<JobSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const [j, s] = await Promise.all([jobApi.getById(jobId), jobApi.getSkills(jobId)]);
        if (!active) return;
        setJob(j);
        setSkills(s);
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load job");
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => { active = false; };
  }, [jobId]);
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {job ? job.title : "Job Detail"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex gap-3">
            <button
              onClick={() => setTab('detail')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'detail' ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-900/30' : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
            >
              Job Detail
            </button>
            <button
              onClick={() => setTab('skills')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'skills' ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-900/30' : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
            >
              Skills
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {loading ? (
            <div className="text-center py-10 text-gray-400 dark:text-zinc-500">Loading…</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500 dark:text-red-400">{error}</div>
          ) : !job ? null : tab === 'detail' ? (
            <>
              {/* Title */}
              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Title</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
              </div>

              {/* Company (same font) */}
              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Company</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{job.company}</div>
              </div>

              {/* Description (HTML) */}
              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Description</span>
                <div
                  className="text-sm text-gray-800 dark:text-zinc-200 leading-relaxed wrap-break-words"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {skills.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-zinc-400">No skills listed for this job.</div>
              ) : (
                skills.map((s) => (
                  <div key={s.id} className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{s.name}</div>
                      <div className="text-sm text-gray-600 dark:text-zinc-300">{s.requirement}</div>
                    </div>
                    {typeof s.weight === 'number' && (
                      <div className="ml-4 shrink-0 text-sm font-medium text-gray-700 dark:text-zinc-200 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        {s.weight}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-800 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default JobDetailModal;
