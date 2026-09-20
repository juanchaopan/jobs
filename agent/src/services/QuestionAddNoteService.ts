import { JobApplicationRepository } from '../database/job-application/JobApplicationRepository.js';
import { JobApplicationQuestionRepository } from '../database/job-application-question/JobApplicationQuestionRepository.js';
import { JobRepository } from '../database/job/JobRepository.js';
import { ResumeRepository } from '../database/resume/ResumeRepository.js';
import { ResumeSummaryRepository } from '../database/resume-summary/ResumeSummaryRepository.js';
import { updateResumeNote } from '../agents/updateResumeNoteAgent.js';

export class QuestionAddNoteService {
  constructor(
    private readonly jobApplicationRepository: JobApplicationRepository,
    private readonly jobApplicationQuestionRepository: JobApplicationQuestionRepository,
    private readonly jobRepository: JobRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly resumeSummaryRepository: ResumeSummaryRepository,
  ) { }

  async process(questionId: number): Promise<void> {
    const question = await this.jobApplicationQuestionRepository.findById(questionId);
    if (!question) return;

    const [application, job] = await Promise.all([
      this.jobApplicationRepository.findById(question.jobId),
      this.jobRepository.findById(question.jobId),
    ]);
    if (!application) return;

    const [resume, resumeSummary] = await Promise.all([
      this.resumeRepository.findById(application.resumeId),
      this.resumeSummaryRepository.findById(application.resumeId),
    ]);
    if (!resume) return;

    let options: string[] | undefined;
    let valueToLabel = new Map<string, string>();
    if (question.constraints) {
      try {
        const parsed = JSON.parse(question.constraints);
        const rawOptions: { value: string; label: string }[] = parsed.options ?? [];
        options = rawOptions.map((o) => o.label);
        valueToLabel = new Map(rawOptions.map((o) => [o.value, o.label]));
      } catch {
        options = undefined;
      }
    }

    let answer: string | string[];
    try {
      const parsed = JSON.parse(question.answer ?? '');
      if (Array.isArray(parsed)) {
        answer = parsed.map((v: string) => valueToLabel.get(v) ?? v);
      } else {
        answer = valueToLabel.get(String(parsed)) ?? String(parsed);
      }
    } catch {
      answer = question.answer ?? '';
    }

    const { notes } = await updateResumeNote(
      job?.description ?? '',
      resumeSummary?.summary?.toString() ?? '',
      resume.note,
      question.question,
      options,
      answer,
      question.remark ?? '',
    );

    await this.resumeRepository.updateNote(resume.id, notes);
  }
}
