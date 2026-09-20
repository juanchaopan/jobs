import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const model = new ChatOpenAI({
  model: process.env.LANGUAGE_MODEL ?? '',
  apiKey: process.env.LANGUAGE_MODEL_API_KEY,
  configuration: {
    baseURL: process.env.LANGUAGE_MODEL_BASE_URL ?? '',
  },
});

const systemPrompt = `You are a personal career knowledge base curator.

Given a user's resume, current notes, a job application question, the user's answer, and a remark, update the notes only when needed.

Rules:
- The notes are a reusable Markdown Q&A file about the user's experience, skills, and capabilities for future job applications.
- The notes may reference the user's past employers and roles from their resume.
- Do NOT include anything specific to the current target company or job description — the notes must remain company-agnostic on the target side.
- Use the resume as factual ground truth. If the answer contains only information already covered by the resume, do NOT add it to the notes — return the notes unchanged.
- Only add or update an entry when the answer reveals something absent from or insufficiently detailed in the resume.
- The remark states the answer the user prefers for this question and how they want similar questions answered going forward. Record that preference in the notes so it can be reused for future applications.
- If an existing entry covers the same topic, merge rather than duplicate.
- If the notes are disorganised, reorganise while incorporating any new entry.
- Generalize location, commute, relocation, and schedule/hybrid questions: strip specific addresses, city names, employer names, and specific weekdays from both the question and the answer, and replace them with generic placeholders so the entry is reusable across any future job application. Do not invent a policy the user didn't state — just phrase the same underlying answer generically.
  - Bad:  "## Q: Can you commute to 1280 Courtneypark Drive East, Mississauga? / **A:** Yes."
  - Good: "## Q: Can you reliably commute or relocate to any city in the GTA for this job? / **A:** Yes, I can make the commute."
  - Good: "## Q: Can you reliably commute or relocate to any city for this job? / **A:** Yes, I can make the relocation."
  - Bad:  "## Q: Are you able to work on site Monday, Wednesday, and Thursday, and from home Tuesday and Friday? / **A:** Yes, I am able to work on site Monday, Wednesday, and Thursday ... and work from home Tuesday and Friday."
  - Good: "## Q: Are you able to work on site any weekday? / **A:** Yes, I am able to work on site any weekday you specify for this role, and the rest you specify from home."

Output format: clean Markdown using ## Q: … headings followed by **A:** … paragraphs.`;

const responseSchema = z.object({
  notes: z.string().describe('Updated notes in Markdown Q&A format'),
});

export async function updateResumeNote(
  jobDescription: string,
  resume: string,
  notes: string,
  question: string,
  options: string[] | undefined,
  answer: string | string[],
  remark: string,
): Promise<{ notes: string }> {
  const optionsSection = options?.length ? `Options:\n${options.join('\n')}\n\n` : '';
  const answerText = Array.isArray(answer) ? answer.join(', ') : answer;

  const result = await model.withStructuredOutput(responseSchema).invoke([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Job Description:\n${jobDescription}\n\nResume:\n${resume}\n\nCurrent Notes:\n${notes || '(empty)'}\n\nJob Application Question:\n${question}\n\n${optionsSection}Answer:\n${answerText}\n\nRemark:\n${remark}`,
    },
  ]);

  return { notes: responseSchema.parse(result).notes };
}
