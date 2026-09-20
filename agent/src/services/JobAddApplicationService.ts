import type { Channel } from 'amqplib';
import { apply } from '../chrome/apply.js';
import { solveCaptchaChallenge } from '../agents/solveCaptchaAgent.js';
import { JobApplicationRepository } from '../database/job-application/JobApplicationRepository.js';
import { JobApplicationQuestionRepository } from '../database/job-application-question/JobApplicationQuestionRepository.js';
import { JobRepository } from '../database/job/JobRepository.js';
import { ResumeRepository } from '../database/resume/ResumeRepository.js';
import { QUESTION_QUEUE } from '../types/queues.js';

export class JobAddApplicationService {
  constructor(
    private readonly jobApplicationRepository: JobApplicationRepository,
    private readonly jobApplicationQuestionRepository: JobApplicationQuestionRepository,
    private readonly jobRepository: JobRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly channel: Channel,
  ) { }

  async process(jobId: number, resumeId: number): Promise<void> {
    const application = await this.jobApplicationRepository.findById(jobId);
    if (!application || (application.status !== 'Started' && application.status !== 'Processing') || application.resumeId !== resumeId) return;

    const questions = await this.jobApplicationQuestionRepository.findByJobId(jobId);
    if (questions.length > 0 && questions.some(q => q.status !== 'Ready')) return;

    const job = await this.jobRepository.findById(jobId);
    const resume = await this.resumeRepository.findById(resumeId);
    if (!job || !resume) return;

    const resumePath = `${process.env.RESOURCE_PATH}/${resumeId}.${resume.extension}`;

    const answers = new Map<string, string | string[]>(
      questions.filter(q => q.answer != null).map(q => {
        const raw = q.answer as string;
        const value = raw.startsWith('[') ? JSON.parse(raw) as string[] : raw;
        return [q.key, value];
      })
    );

    const createAnswerCallback = async ({ key, question, type, options, min, max, length, format }: {
      key: string;
      question: string;
      type: string;
      options?: Array<{ value: string; label: string }>;
      min?: string;
      max?: string;
      length?: number;
      format?: string;
    }) => {
      const constraintFields: Record<string, unknown> = {};
      if (options !== undefined) constraintFields.options = options;
      if (min !== undefined) constraintFields.min = min;
      if (max !== undefined) constraintFields.max = max;
      if (length !== undefined) constraintFields.length = length;
      if (format !== undefined) constraintFields.format = format;
      const constraints = Object.keys(constraintFields).length > 0 ? JSON.stringify(constraintFields) : null;
      await this.jobApplicationQuestionRepository.create(jobId, key, type, question, constraints, 'Waiting');
    };

    const updateAnswerCallback = async ({ key, error }: {
      key: string;
      error: string;
    }) => {
      await this.jobApplicationQuestionRepository.updateFeedbackByJobIdAndKey(jobId, key, error, 'Waiting');
    };

    const captchaCallback = async ({ prompt, images }: { prompt: string; images: Array<{ id: number; url: string }> }): Promise<number[]> => {
      try {
        return await solveCaptchaChallenge(prompt, images);
      } catch (e) {
        console.log(`h: solveCaptcha failed for jobId=${jobId}`, e);
        return [];
      }
    };

    const result = await apply(job.url, resumePath, answers, createAnswerCallback, updateAnswerCallback, captchaCallback);
    await this.jobApplicationRepository.updateStatus(jobId, result.status, result.reason);
    if (result.status === 'Processing') {
      const waitingQuestions = await this.jobApplicationQuestionRepository.findByJobId(jobId);
      for (const q of waitingQuestions.filter(q => q.status === 'Waiting')) {
        this.channel.sendToQueue(QUESTION_QUEUE, Buffer.from(JSON.stringify({ type: 'add', value: { questionId: q.id } })));
      }
    } else if (result.status === 'Applied') {
      await this.jobApplicationQuestionRepository.updateStatusByJobId(jobId, 'Applied');
    } else if (result.status === 'Aborted') {
      await this.jobApplicationQuestionRepository.updateStatusByJobId(jobId, 'Aborted');
    } else if (result.status === 'Closed') {
      await this.jobApplicationQuestionRepository.updateStatusByJobId(jobId, 'Closed');
    }
  }
}
