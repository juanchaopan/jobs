import { useEffect, useReducer, useState } from "react";

export function useFetch<T>(fetcher: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, increment] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const data = await fetcher();
        if (active) { setItems(data); setError(null); }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => { active = false; };
    // fetcher is a stable module-level reference; re-running is controlled by tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return {
    items,
    setItems,
    loading,
    error,
    reload() { setLoading(true); setError(null); increment(); },
  };
}
