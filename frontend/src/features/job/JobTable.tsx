"use client";

import { Job } from "./jobApi";

interface Props {
  jobs: Job[];
  onView: (jobId: number) => void;
}

export function JobTable({ jobs, onView }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
            <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-zinc-400 w-16">ID</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-zinc-400">Title</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-zinc-400">Company</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-zinc-400 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-b last:border-0 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <td className="px-6 py-4 text-gray-400 dark:text-zinc-500 font-mono text-xs">{job.id}</td>
              <td className="px-6 py-4 max-w-xs">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline truncate block"
                  title={job.title}
                >
                  {job.title}
                </a>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-700 dark:text-zinc-300">{job.company}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => onView(job.id)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    View
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

export default JobTable;
