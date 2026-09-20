import { JobApplicationRepository } from '../database/job-application/JobApplicationRepository.js';
import { JobApplicationQuestionRepository } from '../database/job-application-question/JobApplicationQuestionRepository.js';
import { JobRepository } from '../database/job/JobRepository.js';
import { ResumeRepository } from '../database/resume/ResumeRepository.js';
import { ResumeSummaryRepository } from '../database/resume-summary/ResumeSummaryRepository.js';
import { generateAnswer } from '../agents/generateAnswerAgent.js';

export class QuestionAddService {
  constructor(
    private readonly jobApplicationRepository: JobApplicationRepository,
    private readonly jobApplicationQuestionRepository: JobApplicationQuestionRepository,
    private readonly jobRepository: JobRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly resumeSummaryRepository: ResumeSummaryRepository,
  ) { }

  async process(questionId: number): Promise<void> {
    const q = await this.jobApplicationQuestionRepository.findById(questionId);
    if (!q || q.status !== 'Waiting') return;

    const application = await this.jobApplicationRepository.findById(q.jobId);
    if (!application) return;

    const job = await this.jobRepository.findById(q.jobId);
    const resume = await this.resumeRepository.findById(application.resumeId);
    const resumeSummary = await this.resumeSummaryRepository.findById(application.resumeId);

    const { answer, confidence } = await generateAnswer(
      job?.description ?? '',
      resumeSummary?.summary?.toString() ?? '',
      resume?.note ?? '',
      q.question,
      q.type,
      q.constraints ?? '',
      q.answer ?? undefined,
      q.error ?? undefined,
      q.remark ?? undefined,
    );

    const answerStr = Array.isArray(answer) ? JSON.stringify(answer) : answer;
    await this.jobApplicationQuestionRepository.updateAnswerByJobIdAndKey(q.jobId, q.key, answerStr, confidence, 'Prepared');
  }
}
