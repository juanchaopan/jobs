import { ResumeTitleRepository } from '../database/resume-title/ResumeTitleRepository.js';
import { ResumeSummaryRepository } from '../database/resume-summary/ResumeSummaryRepository.js';
import { ResumeJobScoreRepository } from '../database/resume-job-score/ResumeJobScoreRepository.js';
import { ResumeJobSkillScoreRepository } from '../database/resume-job-skill-score/ResumeJobSkillScoreRepository.js';

export class ResumeDeleteService {
  constructor(
    private readonly resumeTitleRepository: ResumeTitleRepository,
    private readonly resumeSummaryRepository: ResumeSummaryRepository,
    private readonly resumeJobScoreRepository: ResumeJobScoreRepository,
    private readonly resumeJobSkillScoreRepository: ResumeJobSkillScoreRepository
  ) { }

  async process(resumeId: number): Promise<void> {
    // Delete titles first
    await this.resumeTitleRepository.deleteByResumeId(resumeId);

    // Delete summary
    await this.resumeSummaryRepository.deleteById(resumeId);

    // Delete job scores
    await this.resumeJobScoreRepository.deleteByResumeId(resumeId);
    await this.resumeJobSkillScoreRepository.deleteByResumeId(resumeId);
  }
}
