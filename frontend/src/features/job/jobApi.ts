const BASE = process.env.VITE_BACKEND_URL ?? "";

export interface Job {
  id: number;
  key: string;
  title: string;
  company: string;
  url: string;
  description: string;
}

export interface JobSkill {
  id: number;
  name: string;
  requirement: string;
  weight: number;
  jobId: number;
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  const json: { data: T } = await res.json();
  return json.data;
}

export type JobListResponse = { items: Job[]; total: number };

export const jobApi = {
  list: async (page: number, size: number): Promise<JobListResponse> => {
    const res = await fetch(`${BASE}/api/jobs?page=${page}&size=${size}`);
    if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
    const json: { data: Job[] } = await res.json();
    const totalHeader = res.headers.get("X-Total-Count");
    const total = totalHeader ? parseInt(totalHeader, 10) : json.data.length;
    return { items: json.data, total };
  },

  dispatch: (): Promise<number> =>
    fetch(`${BASE}/api/jobs/dispatch`, { method: "POST" }).then(unwrap<number>),

  getById: (id: number): Promise<Job> =>
    fetch(`${BASE}/api/jobs/${id}`).then(unwrap<Job>),
  getSkills: (jobId: number): Promise<JobSkill[]> =>
    fetch(`${BASE}/api/job-skills?jobId=${jobId}`).then(unwrap<JobSkill[]>),

  // Fetch skills for multiple jobs in parallel and return a map jobId -> skills[]
  skillsForJobs: async (jobIds: number[]): Promise<Record<number, JobSkill[]>> => {
    const entries = await Promise.all(
      jobIds.map(async (id) => {
        try {
          const skills = await fetch(`${BASE}/api/job-skills?jobId=${id}`).then(unwrap<JobSkill[]>);
          return [id, skills] as const;
        } catch {
          return [id, []] as const;
        }
      })
    );
    return Object.fromEntries(entries) as Record<number, JobSkill[]>;
  },
} as const;

export default jobApi;
