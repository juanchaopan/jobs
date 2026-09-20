const BASE = process.env.VITE_BACKEND_URL ?? "";

export interface JobApplicationQuestion {
  id: number;
  jobId: number;
  key: string;
  type: string;
  question: string;
  constraints: string;
  answer: string;
  confidence: number;
  error: string;
  remark: string;
  status: string;
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  const json: { data: T } = await res.json();
  return json.data;
}

export const jobApplicationQuestionApi = {
  getByJobId: (jobId: number): Promise<JobApplicationQuestion[]> =>
    fetch(`${BASE}/api/job-application-questions?jobId=${jobId}`).then(unwrap<JobApplicationQuestion[]>),

  getById: (id: number): Promise<JobApplicationQuestion> =>
    fetch(`${BASE}/api/job-application-questions/${id}`).then(unwrap<JobApplicationQuestion>),

  submitRemark: (id: number, remark: string): Promise<JobApplicationQuestion> =>
    fetch(`${BASE}/api/job-application-questions/${id}/submit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remark }),
    }).then(unwrap<JobApplicationQuestion>),

  approve: (id: number): Promise<JobApplicationQuestion> =>
    fetch(`${BASE}/api/job-application-questions/${id}/approve`, { method: "PUT" })
      .then(unwrap<JobApplicationQuestion>),

  note: (id: number): Promise<JobApplicationQuestion> =>
    fetch(`${BASE}/api/job-application-questions/${id}/note`, { method: "PUT" })
      .then(unwrap<JobApplicationQuestion>),
} as const;
