"use client";

import { useState, useEffect } from "react";
import { resumeApi, JobMatchScore } from "./resumeApi";
import { jobApi, Job } from "../job/jobApi";
import { jobApplicationQuestionApi, JobApplicationQuestion } from "./jobApplicationQuestionApi";

type Tab = "job" | "resume" | "questions";

interface Props {
    item: JobMatchScore;
    resumeName: string;
    onClose: () => void;
}

export function ApplicationStatusModal({ item, resumeName, onClose }: Props) {
    const [tab, setTab] = useState<Tab>("job");
    const [refreshKey, setRefreshKey] = useState(0);

    const [job, setJob] = useState<Job | null>(null);
    const [jobLoading, setJobLoading] = useState(true);
    const [jobError, setJobError] = useState<string | null>(null);

    const [resume, setResume] = useState<{ id: number; name: string; extension: string; note?: string; summary?: string } | null>(null);
    const [resumeLoading, setResumeLoading] = useState(true);
    const [resumeError, setResumeError] = useState<string | null>(null);

    const [applicationStatus, setApplicationStatus] = useState(item.applicationStatus);
    const [applicationStatusReason, setApplicationStatusReason] = useState(item.applicationStatusReason);

    const [questions, setQuestions] = useState<JobApplicationQuestion[]>([]);
    const [qLoading, setQLoading] = useState(true);
    const [qError, setQError] = useState<string | null>(null);
    const [remarks, setRemarks] = useState<Record<number, string>>({});
    const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

    useEffect(() => {
        let active = true;
        async function run() {
            setJobLoading(true);
            setJobError(null);
            try {
                const [j, updated] = await Promise.all([
                    jobApi.getById(item.jobId),
                    resumeApi.matchById(item.id),
                ]);
                if (!active) return;
                setJob(j);
                setApplicationStatus(updated.applicationStatus);
                setApplicationStatusReason(updated.applicationStatusReason);
            } catch (e: unknown) {
                if (active) setJobError(e instanceof Error ? e.message : "Failed to load job");
            } finally {
                if (active) setJobLoading(false);
            }
        }
        void run();
        return () => { active = false; };
    }, [item.jobId, item.id, refreshKey]);

    useEffect(() => {
        let active = true;
        async function run() {
            setResumeLoading(true);
            setResumeError(null);
            try {
                const [r, s] = await Promise.all([
                    resumeApi.getById(item.resumeId),
                    resumeApi.getSummary(item.resumeId).catch(() => null),
                ]);
                if (active) setResume({ ...r, summary: s?.summary });
            } catch (e: unknown) {
                if (active) setResumeError(e instanceof Error ? e.message : "Failed to load resume");
            } finally {
                if (active) setResumeLoading(false);
            }
        }
        void run();
        return () => { active = false; };
    }, [item.resumeId, refreshKey]);

    useEffect(() => {
        let active = true;
        async function run() {
            setQLoading(true);
            setQError(null);
            try {
                const qs = await jobApplicationQuestionApi.getByJobId(item.jobId);
                if (!active) return;
                setQuestions(qs);
                setRemarks(Object.fromEntries(qs.map((q) => [q.id, q.remark ?? ""])));
            } catch (e: unknown) {
                if (active) setQError(e instanceof Error ? e.message : "Failed to load questions");
            } finally {
                if (active) setQLoading(false);
            }
        }
        void run();
        return () => { active = false; };
    }, [item.jobId, refreshKey]);

    async function handleSubmitRemark(q: JobApplicationQuestion) {
        setActionLoading((prev) => ({ ...prev, [q.id]: true }));
        try {
            const updated = await jobApplicationQuestionApi.submitRemark(q.id, remarks[q.id] ?? "");
            setQuestions((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
        } finally {
            setActionLoading((prev) => ({ ...prev, [q.id]: false }));
        }
    }

    async function handleApprove(q: JobApplicationQuestion) {
        setActionLoading((prev) => ({ ...prev, [q.id]: true }));
        try {
            const [updated] = await Promise.all([
                jobApplicationQuestionApi.approve(q.id),
                jobApplicationQuestionApi.note(q.id),
            ]);
            setQuestions((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
        } finally {
            setActionLoading((prev) => ({ ...prev, [q.id]: false }));
        }
    }

    const tabBtn = (t: Tab, label: string) => (
        <button
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                    ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800"
                    : "text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
            }`}
        >
            {label}
        </button>
    );

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Application Detail</h2>
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            {item.title}
                        </a>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{item.company}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{resumeName}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                        {applicationStatus && (
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                                    {applicationStatus}
                                </span>
                                {applicationStatusReason && (
                                    <span className="text-xs text-gray-400 dark:text-zinc-500 max-w-50 truncate" title={applicationStatusReason}>{applicationStatusReason}</span>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => setRefreshKey((k) => k + 1)}
                            className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            aria-label="Refresh"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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

                {/* Tabs */}
                <div className="px-6 py-3 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div className="flex gap-2">
                        {tabBtn("job", "Job Detail")}
                        {tabBtn("resume", "Resume")}
                        {tabBtn("questions", "Questions")}
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
                    {/* ── Job tab ── */}
                    {tab === "job" && (
                        jobLoading ? (
                            <div className="text-center py-12 text-gray-400 dark:text-zinc-500">Loading…</div>
                        ) : jobError ? (
                            <div className="text-center py-12 text-red-500 dark:text-red-400">{jobError}</div>
                        ) : job ? (
                            <>
                                <div>
                                    <span className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Description</span>
                                    <div
                                        className="text-sm text-gray-800 dark:text-zinc-200 leading-relaxed wrap-break-words"
                                        dangerouslySetInnerHTML={{ __html: job.description }}
                                    />
                                </div>
                            </>
                        ) : null
                    )}

                    {/* ── Resume tab ── */}
                    {tab === "resume" && (
                        resumeLoading ? (
                            <div className="text-center py-12 text-gray-400 dark:text-zinc-500">Loading…</div>
                        ) : resumeError ? (
                            <div className="text-center py-12 text-red-500 dark:text-red-400">{resumeError}</div>
                        ) : resume ? (
                            <>
                                {resume.note && (
                                    <div>
                                        <span className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Note</span>
                                        <div className="text-sm text-gray-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">{resume.note}</div>
                                    </div>
                                )}
                                {resume.summary && (
                                    <div>
                                        <span className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Summary</span>
                                        <div className="text-sm text-gray-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">{resume.summary}</div>
                                    </div>
                                )}
                            </>
                        ) : null
                    )}

                    {/* ── Questions tab ── */}
                    {tab === "questions" && (
                        qLoading ? (
                            <div className="text-center py-12 text-gray-400 dark:text-zinc-500">Loading…</div>
                        ) : qError ? (
                            <div className="text-center py-12 text-red-500 dark:text-red-400">{qError}</div>
                        ) : questions.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 dark:text-zinc-500">No questions found.</div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {questions.map((q) => {
                                    const isPrepared = q.status === "Prepared";
                                    const isActing = !!actionLoading[q.id];
                                    const isSelect = q.type === "single-select" || q.type === "multi-select";
                                    const options: { value: string; label: string }[] = isSelect ? (() => {
                                        try { return JSON.parse(q.constraints)?.options ?? []; } catch { return []; }
                                    })() : [];
                                    const dotColor = q.status === "Ready" ? "bg-green-500" : q.status === "Prepared" ? "bg-red-500" : q.status === "Waiting" ? "bg-yellow-500" : "bg-gray-400";
                                    return (
                                        <div key={q.id} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 flex flex-col gap-3">
                                            {/* Row: dot, type, confidence */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} title={q.status} />
                                                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{q.type}</span>
                                                {typeof q.confidence === "number" && (
                                                    <span className="ml-auto text-xs font-mono text-gray-400 dark:text-zinc-500">
                                                        confidence: {q.confidence}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Question */}
                                            <div>
                                                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 block mb-1">Question</span>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{q.question}</p>
                                            </div>

                                            {/* Constraints — raw display only for non-select types */}
                                            {q.constraints && !isSelect && (
                                                <div>
                                                    <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 block mb-1">Constraints</span>
                                                    <p className="text-xs text-gray-600 dark:text-zinc-400">{q.constraints}</p>
                                                </div>
                                            )}

                                            {/* Answer */}
                                            {q.answer && (
                                                <div>
                                                    <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 block mb-1">Answer</span>
                                                    {q.type === "single-select" ? (
                                                        <div className="flex flex-col gap-1">
                                                            {options.map((opt) => (
                                                                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-800 dark:text-zinc-200">
                                                                    <input type="radio" disabled checked={q.answer === opt.value} className="accent-blue-600" />
                                                                    {opt.label}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    ) : q.type === "multi-select" ? (() => {
                                                        let selected: string[];
                                                        try {
                                                            const parsed = JSON.parse(q.answer);
                                                            if (Array.isArray(parsed)) {
                                                                selected = parsed.map(String);
                                                            } else if (parsed?.options && Array.isArray(parsed.options)) {
                                                                selected = (parsed.options as { value: string }[]).map((o) => o.value);
                                                            } else {
                                                                selected = q.answer.split(",").map((s) => s.trim());
                                                            }
                                                        } catch {
                                                            selected = q.answer.split(",").map((s) => s.trim());
                                                        }
                                                        return (
                                                            <div className="flex flex-col gap-1">
                                                                {options.map((opt) => (
                                                                    <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-800 dark:text-zinc-200">
                                                                        <input type="checkbox" disabled checked={selected.includes(opt.value)} className="accent-blue-600" />
                                                                        {opt.label}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        );
                                                    })() : q.type === "number" ? (
                                                        <input type="number" disabled value={q.answer} className="text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-gray-800 dark:text-zinc-200 w-40" />
                                                    ) : (
                                                        <textarea
                                                            ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }}
                                                            readOnly
                                                            value={q.answer}
                                                            rows={1}
                                                            className="text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-200 w-full resize-none overflow-hidden"
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* Error */}
                                            {q.error && (
                                                <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg text-xs text-red-600 dark:text-red-400">
                                                    {q.error}
                                                </div>
                                            )}

                                            {/* Remark + actions (Prepared only) */}
                                            {isPrepared ? (
                                                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Remark</span>
                                                    <textarea
                                                        value={remarks[q.id] ?? ""}
                                                        onChange={(e) => setRemarks((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                                        rows={3}
                                                        disabled={isActing}
                                                        placeholder="Add remarks for the AI to improve the answer…"
                                                        className="w-full text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleSubmitRemark(q)}
                                                            disabled={isActing}
                                                            className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            {isActing ? "…" : "Regenerate"}
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(q)}
                                                            disabled={isActing}
                                                            className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            {isActing ? "…" : "Approve"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : q.remark ? (
                                                <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 block mb-1">Remark</span>
                                                    <p className="text-xs text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">{q.remark}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )
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

export default ApplicationStatusModal;
