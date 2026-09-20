import type { Channel } from 'amqplib';
import { extractJobSkills } from '../agents/extractJobSkillsAgent.js';
import { ResumeRepository } from '../database/resume/ResumeRepository.js';
import { JobRepository } from '../database/job/JobRepository.js';
import { JobSkillRepository } from '../database/job-skill/JobSkillRepository.js';
import { RESUME_QUEUE } from '../types/queues.js';


export class JobAddAnalysisService {
  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly jobRepository: JobRepository,
    private readonly jobSkillRepository: JobSkillRepository,
    private readonly channel: Channel
  ) { }

  async process(jobId: number): Promise<void> {
    if (await this.jobSkillRepository.existsByJobId(jobId))
      return;

    const job = await this.jobRepository.findById(jobId);

    if (!job || !job.description) {
      return;
    }

    const skills = await extractJobSkills(job.description);
    for (const { skill, requirement, weight } of skills) {
      await this.jobSkillRepository.create(jobId, skill, requirement, weight);
    }

    // notify resume scoring service for all resumes
    const resumes = await this.resumeRepository.findAll();
    for (const r of resumes) {
      this.channel.sendToQueue(RESUME_QUEUE, Buffer.from(JSON.stringify({ type: 'add.job', value: { resumeId: r.id, jobId } })));
    }

  }
}
