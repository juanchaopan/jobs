"use client";

import { useState } from "react";
import { jobApi, Job } from "./jobApi";
import { JobTable } from "./JobTable";
import { JobDetailModal } from "./JobDetailModal";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";

const PAGE_SIZE = 10;

export function JobPage() {
  const {
    items: jobs,
    loading,
    error,
    page,
    size,
    total,
    totalPages,
    hasNext,
    hasPrev,
    goTo,
    changeSize,
  } = usePaginatedFetch<Job>(jobApi.list, PAGE_SIZE);
  const [selected, setSelected] = useState<number | null>(null);
  const [jumpInput, setJumpInput] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [dispatchCount, setDispatchCount] = useState<number | null>(null);

  async function handleDispatch() {
    setDispatching(true);
    setDispatchCount(null);
    try {
      const count = await jobApi.dispatch();
      setDispatchCount(count);
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jobs</h1>
          <div className="flex items-center gap-3">
            {dispatchCount !== null && (
              <span className="text-sm text-gray-500 dark:text-zinc-400">{dispatchCount} dispatched</span>
            )}
            <button
              onClick={handleDispatch}
              disabled={dispatching}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {dispatching ? "Dispatching…" : "Dispatch"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
            <span>{error}</span>
            <button onClick={() => goTo(page)} className="underline ml-4 shrink-0">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400 dark:text-zinc-500">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-zinc-500">No jobs found.</div>
        ) : (
          <JobTable jobs={jobs} onView={setSelected} />
        )}

        {/* Pagination */}
        {!loading && !error && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => goTo(page - 1)}
                disabled={!hasPrev}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-zinc-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => goTo(page + 1)}
                disabled={!hasNext}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-zinc-400">Go to</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(jumpInput, 10);
                    if (!isNaN(n) && n >= 1 && n <= totalPages) {
                      goTo(n - 1);
                      setJumpInput("");
                    }
                  }
                }}
                placeholder={String(page + 1)}
                className="w-16 text-sm text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-2"
              />
              <span className="text-sm text-gray-500 dark:text-zinc-400">Per page</span>
              <select
                value={size}
                onChange={(e) => changeSize(parseInt(e.target.value, 10))}
                className="text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500 dark:text-zinc-400">Total: {total}</span>
            </div>
          </div>
        )}
      </div>

        {selected !== null && (
        <JobDetailModal
          jobId={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default JobPage;
