import { ResumeSummaryRepository } from '../database/resume-summary/ResumeSummaryRepository.js';
import { JobSkillRepository } from '../database/job-skill/JobSkillRepository.js';
import { ResumeJobScoreRepository } from '../database/resume-job-score/ResumeJobScoreRepository.js';
import { ResumeJobSkillScoreRepository } from '../database/resume-job-skill-score/ResumeJobSkillScoreRepository.js';
import { JobApplicationRepository } from '../database/job-application/JobApplicationRepository.js';
import { scoreResumeSkills } from '../agents/scoreResumeSkillsAgent.js';

export class ResumeJobAddScoreService {
  constructor(
    private readonly resumeSummaryRepository: ResumeSummaryRepository,
    private readonly jobSkillRepository: JobSkillRepository,
    private readonly resumeJobScoreRepository: ResumeJobScoreRepository,
    private readonly resumeJobSkillScoreRepository: ResumeJobSkillScoreRepository,
    private readonly jobApplicationRepository: JobApplicationRepository
  ) { }

  async process(resumeId: number, jobId: number): Promise<void> {
    if (await this.resumeJobScoreRepository.existsByResumeIdAndJobId(resumeId, jobId))
      return;

    if (await this.resumeJobSkillScoreRepository.existsByResumeIdAndJobId(resumeId, jobId))
      return;

    const summary = await this.resumeSummaryRepository.findById(resumeId);
    const resumeMarkdown = summary && summary.summary ? summary.summary.toString('utf-8') : '';
    if (!resumeMarkdown) return;

    const jobSkills = await this.jobSkillRepository.findByJobId(jobId);
    if (!jobSkills || jobSkills.length === 0) return;

    const skills = jobSkills.map(js => ({ skill: js.name, requirement: js.requirement }));

    const scores = await scoreResumeSkills(skills, resumeMarkdown);

    // persist per-skill scores
    const len = Math.min(scores.length, jobSkills.length);
    for (let i = 0; i < len; i++) {
      const js = jobSkills[i];
      const sc = scores[i];
      if (!js) continue;
      await this.resumeJobSkillScoreRepository.create(resumeId, js.id, sc as number);
    }

    // compute overall job score as weighted average using job skill weights
    let weightedSum = 0;
    let weightTotal = 0;
    for (let i = 0; i < len; i++) {
      const js = jobSkills[i];
      const sc = scores[i] as number;
      if (!js) continue;
      weightedSum += sc * js.weight;
      weightTotal += js.weight;
    }
    if (weightTotal > 0) {
      const avg = Math.round(weightedSum / weightTotal);

      const hasApplication = await this.jobApplicationRepository.findById(jobId) !== null;
      if (hasApplication) {
        await this.resumeJobScoreRepository.create(resumeId, jobId, avg, false);
      } else {
        const maxScore = await this.resumeJobScoreRepository.findMaxScoreByJobId(jobId);
        if (maxScore === null || avg > maxScore) {
          await this.resumeJobScoreRepository.clearSelectedByJobId(jobId);
          await this.resumeJobScoreRepository.create(resumeId, jobId, avg, true);
        } else {
          await this.resumeJobScoreRepository.create(resumeId, jobId, avg, false);
        }
      }
    }
  }
}
