const BASE = process.env.VITE_BACKEND_URL ?? "";

export interface Resume {
  id: number;
  name: string;
  extension: string;
  note?: string;
}

export interface JobResumeScore {
  resumeName: string;
  score: number;
}

export interface JobMatchScore {
  id: number;
  resumeId: number;
  jobId: number;
  score: number;
  title: string;
  company: string;
  url: string;
  applicationStatus: string | null;
  applicationStatusReason: string | null;
  jobResumeScores: JobResumeScore[];
}

interface RawScore { 'resume-name': string; score: number; }
interface RawJobMatchScore {
  id: number; 'resume-id': number; 'job-id': number; score: number;
  title: string; company: string; url: string;
  'application-status': string | null; 'application-status-reason': string | null;
  'job-resume-scores': RawScore[] | null;
}
function mapScore(r: RawJobMatchScore): JobMatchScore {
  return {
    id: r.id,
    resumeId: r['resume-id'],
    jobId: r['job-id'],
    score: r.score,
    title: r.title,
    company: r.company,
    url: r.url,
    applicationStatus: r['application-status'],
    applicationStatusReason: r['application-status-reason'],
    jobResumeScores: (r['job-resume-scores'] ?? []).map(s => ({ resumeName: s['resume-name'], score: s.score })),
  };
}
export interface ResumeJobSkillScore {
  id: number;
  resumeId: number;
  jobSkillId: number;
  score: number;
  name: string;
  requirement: string;
  weight: number;
}
async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  const json: { data: T } = await res.json();
  return json.data;
}

export const resumeApi = {
  list: (): Promise<Resume[]> =>
    fetch(`${BASE}/api/resumes`).then(unwrap<Resume[]>),
  getById: (id: number): Promise<Resume> => fetch(`${BASE}/api/resumes/${id}`).then(unwrap<Resume>),

  create: (name: string, note: string): Promise<Resume> =>
    fetch(`${BASE}/api/resumes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, note }),
    }).then(unwrap<Resume>),

  update: (id: number, name: string, note: string): Promise<Resume> =>
    fetch(`${BASE}/api/resumes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, note }),
    }).then(unwrap<Resume>),

  remove: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE}/api/resumes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  },

  uploadFile: (id: number, file: File): Promise<Resume> => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/api/resumes/${id}/content`, { method: "PUT", body: form }).then(unwrap<Resume>);
  },

  fileUrl: (id: number): string => `${BASE}/api/resumes/${id}/content`,

  match: async (resumeId: number, page: number, size: number): Promise<{ items: JobMatchScore[]; total: number }> => {
    const res = await fetch(`${BASE}/api/resumeJobScore?resumeId=${resumeId}&page=${page}&size=${size}`);
    if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
    const json: { data: RawJobMatchScore[] } = await res.json();
    const totalHeader = res.headers.get("X-Total-Count");
    const total = totalHeader ? parseInt(totalHeader, 10) : json.data.length;
    return { items: json.data.map(mapScore), total };
  },

  getSummary: (resumeId: number): Promise<{ id: number; summary: string }> =>
    fetch(`${BASE}/api/resume-summaries/${resumeId}`).then(unwrap<{ id: number; summary: string }>),

  matchById: (id: number): Promise<JobMatchScore> =>
    fetch(`${BASE}/api/resumeJobScore/${id}`).then(unwrap<RawJobMatchScore>).then(mapScore),

  applyJob: (jobId: number, resumeId: number): Promise<void> =>
    fetch(`${BASE}/api/jobApplications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId, 'resume-id': resumeId }),
    }).then(unwrap<unknown>).then(() => undefined),

  retryJob: (jobId: number): Promise<void> =>
    fetch(`${BASE}/api/jobApplications/${jobId}/retry`, { method: "POST" })
      .then(unwrap<unknown>).then(() => undefined),

  closeJob: (jobId: number, resumeId: number): Promise<void> =>
    fetch(`${BASE}/api/jobApplications/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId, 'resume-id': resumeId }),
    }).then(unwrap<unknown>).then(() => undefined),

  matchDetail: (resumeId: number, jobId: number): Promise<ResumeJobSkillScore[]> =>
    fetch(`${BASE}/api/resumeJobSkillScore?resumeId=${resumeId}&jobId=${jobId}`).then(unwrap<ResumeJobSkillScore[]>),
} as const;
