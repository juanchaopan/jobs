import type { Channel } from 'amqplib';
import { convertFileToMarkdown } from '../agents/convertFileToMarkdownAgent.js';
import { getApplicableJobTitles } from '../agents/getApplicableJobTitlesAgent.js';
import { ResumeRepository } from '../database/resume/ResumeRepository.js';
import { ResumeSummaryRepository } from '../database/resume-summary/ResumeSummaryRepository.js';
import { ResumeTitleRepository } from '../database/resume-title/ResumeTitleRepository.js';
import { JobRepository } from '../database/job/JobRepository.js';
import { RESUME_QUEUE } from '../types/queues.js';

export class ResumeAddContentService {
  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly resumeSummaryRepository: ResumeSummaryRepository,
    private readonly resumeTitleRepository: ResumeTitleRepository,
    private readonly jobRepository: JobRepository,
    private readonly channel: Channel
  ) { }

  async process(resumeId: number): Promise<void> {
    if (await this.resumeSummaryRepository.existsById(resumeId))
      return;

    if (await this.resumeTitleRepository.existsByResumeId(resumeId))
      return;

    const resume = await this.resumeRepository.findById(resumeId);

    if (!resume || !resume.content) {
      return;
    }

    await this.resumeSummaryRepository.deleteById(resume.id);
    const markdown = await convertFileToMarkdown(resume.content, resume.extension ?? '');
    await this.resumeSummaryRepository.create(resume.id, Buffer.from(markdown, 'utf-8'));

    await this.resumeTitleRepository.deleteByResumeId(resume.id);
    const jobTitles = await getApplicableJobTitles(markdown);
    for (const title of jobTitles) {
      await this.resumeTitleRepository.create(resume.id, title);
    }

    // notify scoring service for all jobs
    const jobs = await this.jobRepository.findAll();
    for (const j of jobs) {
      this.channel.sendToQueue(RESUME_QUEUE, Buffer.from(JSON.stringify({ type: 'add.job', value: { resumeId: resume.id, jobId: j.id } })));
    }
  }
}
