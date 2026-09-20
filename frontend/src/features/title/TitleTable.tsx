"use client";

import { Title } from "./titleApi";

interface Props {
  titles: Title[];
  onEdit: (title: Title) => void;
  onDelete: (id: number) => void;
}

export function TitleTable({ titles, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
            <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-zinc-400 w-16">ID</th>
            <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-zinc-400">Name</th>
            <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {titles.map((title) => (
            <tr
              key={title.id}
              className="border-b last:border-0 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <td className="px-6 py-4 text-gray-400 dark:text-zinc-500 font-mono text-xs">{title.id}</td>
              <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{title.name}</td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(title)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(title.id)}
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

export default TitleTable;
