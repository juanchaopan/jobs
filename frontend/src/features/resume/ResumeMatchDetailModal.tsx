"use client";

import { useState, useEffect } from "react";
import { resumeApi, ResumeJobSkillScore } from "./resumeApi";

interface Props {
    resumeId: number;
    jobId: number;
    jobTitle: string;
    company: string;
    totalScore: number;
    url: string;
    onClose: () => void;
}

export function ResumeMatchDetailModal({ resumeId, jobId, jobTitle, company, totalScore, url, onClose }: Props) {
    const [skills, setSkills] = useState<ResumeJobSkillScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        async function run() {
            try {
                const data = await resumeApi.matchDetail(resumeId, jobId);
                if (active) setSkills(data);
            } catch (e: unknown) {
                if (active) setError(e instanceof Error ? e.message : "Failed to load skill scores");
            } finally {
                if (active) setLoading(false);
            }
        }
        void run();
        return () => { active = false; };
    }, [resumeId, jobId]);

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Skill Score Detail</h2>
                        <a href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline block"
                            title={jobTitle}
                        >
                            {jobTitle}
                        </a>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{company}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg font-mono">
                            Total: {totalScore}
                        </span>
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
                    {loading ? (
                        <div className="text-center py-12 text-gray-400 dark:text-zinc-500">Loading…</div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-500 dark:text-red-400">{error}</div>
                    ) : skills.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-zinc-500">No skill scores found.</div>
                    ) : (
                        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
                                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">Skill</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">Requirement</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 w-20">Weight</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-zinc-400 w-20">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {skills.map((s) => (
                                        <tr
                                            key={s.id}
                                            className="border-b last:border-0 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-zinc-400 text-xs">{s.requirement}</td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-500 dark:text-zinc-400">{s.weight}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-block font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                                    {s.score}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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

export default ResumeMatchDetailModal;
