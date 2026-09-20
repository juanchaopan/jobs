"use client";

import { useState, useCallback } from "react";
import { resumeApi, JobMatchScore, Resume } from "./resumeApi";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { ResumeMatchDetailModal } from "./ResumeMatchDetailModal";
import { ApplicationStatusModal } from "./ApplicationStatusModal";

const PAGE_SIZE = 10;

interface Props {
    resumeId: number;
    resumeName: string;
    resumes: Resume[];
    onClose: () => void;
}

export function ResumeMatchModal({ resumeId, resumeName, resumes, onClose }: Props) {
    const fetcher = useCallback(
        (page: number, size: number) => resumeApi.match(resumeId, page, size),
        [resumeId],
    );

    const {
        items,
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
        refresh,
    } = usePaginatedFetch<JobMatchScore>(fetcher, PAGE_SIZE);

    const [jumpInput, setJumpInput] = useState("");
    const [detailItem, setDetailItem] = useState<JobMatchScore | null>(null);
    const [statusItem, setStatusItem] = useState<JobMatchScore | null>(null);
    const [applying, setApplying] = useState<Record<number, boolean>>({});
    const [retrying, setRetrying] = useState<Record<number, boolean>>({});
    const [closing, setClosing] = useState<Record<number, boolean>>({});
    const [statusOverrides, setStatusOverrides] = useState<Record<number, { status: string; reason: string | null }>>({});
    const [selectedResumeName, setSelectedResumeName] = useState<Record<number, string>>({});

    function resolveTargetResumeId(item: JobMatchScore): number {
        const chosen = selectedResumeName[item.id] ?? resumeName;
        return chosen === resumeName
            ? resumeId
            : (resumes.find(r => r.name === chosen)?.id ?? resumeId);
    }

    async function handleApply(item: JobMatchScore) {
        const targetId = resolveTargetResumeId(item);

        setApplying((prev) => ({ ...prev, [item.id]: true }));
        try {
            await resumeApi.applyJob(item.jobId, targetId);
            if (targetId === resumeId) {
                const updated = await resumeApi.matchById(item.id);
                if (updated.applicationStatus != null) {
                    setStatusOverrides((prev) => ({ ...prev, [item.id]: { status: updated.applicationStatus!, reason: updated.applicationStatusReason } }) as Record<number, { status: string; reason: string | null }>);
                }
            } else {
                refresh();
            }
        } finally {
            setApplying((prev) => ({ ...prev, [item.id]: false }));
        }
    }

    async function handleClose(item: JobMatchScore) {
        const targetId = resolveTargetResumeId(item);

        setClosing((prev) => ({ ...prev, [item.id]: true }));
        try {
            await resumeApi.closeJob(item.jobId, targetId);
            if (targetId === resumeId) {
                const updated = await resumeApi.matchById(item.id);
                if (updated.applicationStatus != null) {
                    setStatusOverrides((prev) => ({ ...prev, [item.id]: { status: updated.applicationStatus!, reason: updated.applicationStatusReason } }) as Record<number, { status: string; reason: string | null }>);
                }
            } else {
                refresh();
            }
        } catch (e) {
            alert((e as Error).message);
            refresh();
        } finally {
            setClosing((prev) => ({ ...prev, [item.id]: false }));
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Job Match Scores</h2>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{resumeName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setStatusOverrides({}); refresh(); }}
                            disabled={loading}
                            className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Refresh"
                        >
                            <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
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
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5">
                    {error && (
                        <div className="mb-4 flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                            <span>{error}</span>
                            <button onClick={() => goTo(page)} className="underline ml-4 shrink-0">Retry</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12 text-gray-400 dark:text-zinc-500">Loading…</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-zinc-500">No match results found.</div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
                                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 w-32">Company</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 w-32">Job Title</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 w-24">Score</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr
                                            key={item.jobId}
                                            className="border-b last:border-0 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 w-32 break-words">{item.company}</td>
                                            <td className="px-4 py-3 w-32">
                                                <a href={item.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 dark:text-blue-400 hover:underline break-words"
                                                    title={item.title}
                                                >
                                                    {item.title}
                                                </a>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-block font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                                    {item.score}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {(() => {
                                                        const override = statusOverrides[item.id];
                                                        const statusStr = override?.status ?? item.applicationStatus;
                                                        const reason = override?.reason ?? item.applicationStatusReason;
                                                        if (statusStr != null) {
                                                            if (statusStr === "Aborted") {
                                                                return (
                                                                    <button
                                                                        disabled={retrying[item.id]}
                                                                        onClick={async () => {
                                                                            setRetrying((prev) => ({ ...prev, [item.id]: true }));
                                                                            try {
                                                                                await resumeApi.retryJob(item.jobId);
                                                                                refresh();
                                                                            } finally {
                                                                                setRetrying((prev) => ({ ...prev, [item.id]: false }));
                                                                            }
                                                                        }}
                                                                        className="px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        {retrying[item.id] ? "…" : "Retry"}
                                                                    </button>
                                                                );
                                                            }
                                                            return (
                                                                <div className="flex flex-col items-end gap-0.5">
                                                                    <button
                                                                        onClick={() => setStatusItem(item)}
                                                                        className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                                                    >
                                                                        {statusStr}
                                                                    </button>
                                                                    {reason && (
                                                                        <span className="text-xs text-gray-400 dark:text-zinc-500 max-w-40 truncate" title={reason}>{reason}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleApply(item)}
                                                                        disabled={applying[item.id] || closing[item.id]}
                                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        {applying[item.id] ? "…" : "Apply"}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleClose(item)}
                                                                        disabled={applying[item.id] || closing[item.id]}
                                                                        className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        {closing[item.id] ? "…" : "Close"}
                                                                    </button>
                                                                </div>
                                                                {item.jobResumeScores.length > 0 && (
                                                                    <select
                                                                        value={selectedResumeName[item.id] ?? resumeName}
                                                                        onChange={(e) => setSelectedResumeName((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                                        className="text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-1 py-0.5 max-w-40"
                                                                    >
                                                                        {item.jobResumeScores.map((r) => (
                                                                            <option key={r.resumeName} value={r.resumeName}>
                                                                                {r.resumeName} ({r.score})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                    <button
                                                        onClick={() => setDetailItem(item)}
                                                        className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                    >
                                                        Detail
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination footer */}
                {!loading && !error && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => goTo(page - 1)}
                                disabled={!hasPrev}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ← Prev
                            </button>
                            <span className="text-sm text-gray-500 dark:text-zinc-400">
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => goTo(page + 1)}
                                disabled={!hasNext}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                                className="w-14 text-sm text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1.5"
                            />
                            <span className="text-sm text-gray-500 dark:text-zinc-400">Per page</span>
                            <select
                                value={size}
                                onChange={(e) => changeSize(parseInt(e.target.value, 10))}
                                className="text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1.5"
                            >
                                {[10, 20, 50].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            <span className="text-sm text-gray-500 dark:text-zinc-400">Total: {total}</span>
                        </div>
                    </div>
                )}
            </div>

            {detailItem && (
                <ResumeMatchDetailModal
                    resumeId={resumeId}
                    jobId={detailItem.jobId}
                    jobTitle={detailItem.title}
                    company={detailItem.company}
                    totalScore={detailItem.score}
                    url={detailItem.url}
                    onClose={() => setDetailItem(null)}
                />
            )}

            {statusItem && (
                <ApplicationStatusModal
                    item={statusItem}
                    resumeName={resumeName}
                    onClose={() => setStatusItem(null)}
                />
            )}
        </div>
    );
}

export default ResumeMatchModal;
