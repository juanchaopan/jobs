const BASE = process.env.VITE_BACKEND_URL ?? "";

export interface Region {
  id: number;
  name: string;
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  const json: { data: T } = await res.json();
  return json.data;
}

export const regionApi = {
  list: (): Promise<Region[]> => fetch(`${BASE}/api/regions`).then(unwrap<Region[]>),
  getById: (id: number): Promise<Region> => fetch(`${BASE}/api/regions/${id}`).then(unwrap<Region>),

  create: (name: string): Promise<Region> =>
    fetch(`${BASE}/api/regions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(unwrap<Region>),

  update: (id: number, name: string): Promise<Region> =>
    fetch(`${BASE}/api/regions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(unwrap<Region>),

  remove: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE}/api/regions/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  },
} as const;

export default regionApi;
