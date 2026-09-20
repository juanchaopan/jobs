import { DataSource, Repository } from 'typeorm';
import { ResumeJobScore } from './ResumeJobScore.js';

export class ResumeJobScoreRepository {
  private readonly repo: Repository<ResumeJobScore>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ResumeJobScore);
  }

  async create(resumeId: number, jobId: number, score: number, selected: boolean): Promise<ResumeJobScore> {
    const entity = this.repo.create({ resumeId, jobId, score, selected });
    return this.repo.save(entity);
  }

  async existsByResumeIdAndJobId(resumeId: number, jobId: number): Promise<boolean> {
    const count = await this.repo.count({ where: { resumeId, jobId } });
    return count > 0;
  }

  async deleteByResumeId(resumeId: number): Promise<void> {
    await this.repo.delete({ resumeId });
  }

  async findMaxScoreByJobId(jobId: number): Promise<number | null> {
    const result = await this.repo
      .createQueryBuilder('r')
      .select('MAX(r.score)', 'max')
      .where('r.job_id = :jobId', { jobId })
      .getRawOne<{ max: number | null }>();
    return result?.max ?? null;
  }

  async clearSelectedByJobId(jobId: number): Promise<void> {
    await this.repo.update({ jobId }, { selected: false });
  }
}
