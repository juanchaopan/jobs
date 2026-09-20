import { useEffect, useState } from "react";

export function usePaginatedFetch<T>(
  fetcher: (page: number, size: number) => Promise<{ items: T[]; total: number }>,
  initialSize = 10,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setPageSize] = useState(initialSize);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const data = await fetcher(page, size);
        if (active) {
          setItems(data.items);
          setTotal(data.total);
          setError(null);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => { active = false; };
    // fetcher is a stable module-level reference; page/size/refreshKey drive re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  return {
    items,
    loading,
    error,
    page,
    size,
    total,
    totalPages,
    hasNext: page + 1 < totalPages,
    hasPrev: page > 0,
    changeSize(n: number) { setLoading(true); setError(null); setPageSize(n); setPage(0); },
    goTo(n: number) { setLoading(true); setError(null); setPage(n); },
    refresh() { setLoading(true); setError(null); setRefreshKey((k) => k + 1); },
  };
}
