import { DataSource, Repository } from 'typeorm';
import { ResumeJobSkillScore } from './ResumeJobSkillScore.js';

export class ResumeJobSkillScoreRepository {
  private readonly repo: Repository<ResumeJobSkillScore>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ResumeJobSkillScore);
  }

  async create(resumeId: number, jobSkillId: number, score: number): Promise<ResumeJobSkillScore> {
    const entity = this.repo.create({ resumeId, jobSkillId, score });
    return this.repo.save(entity);
  }
  async existsByResumeIdAndJobId(resumeId: number, jobId: number): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('rjss')
      .innerJoin('job_skills', 'js', 'js.id = rjss.job_skill_id AND js.job_id = :jobId', { jobId })
      .where('rjss.resume_id = :resumeId', { resumeId })
      .getCount();

    return count > 0;
  }

  async deleteByResumeId(resumeId: number): Promise<void> {
    await this.repo.delete({ resumeId });
  }
}
