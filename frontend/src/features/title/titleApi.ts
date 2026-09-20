const BASE = process.env.VITE_BACKEND_URL ?? "";

export interface Title {
  id: number;
  name: string;
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  const json: { data: T } = await res.json();
  return json.data;
}

export const titleApi = {
  list: (): Promise<Title[]> => fetch(`${BASE}/api/titles`).then(unwrap<Title[]>),
  getById: (id: number): Promise<Title> => fetch(`${BASE}/api/titles/${id}`).then(unwrap<Title>),

  create: (name: string): Promise<Title> =>
    fetch(`${BASE}/api/titles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(unwrap<Title>),

  update: (id: number, name: string): Promise<Title> =>
    fetch(`${BASE}/api/titles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(unwrap<Title>),

  remove: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE}/api/titles/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  },
} as const;

export default titleApi;
