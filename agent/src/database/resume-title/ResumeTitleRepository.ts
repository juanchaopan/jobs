import { DataSource, Repository } from 'typeorm';
import { ResumeTitle } from './ResumeTitle.js';

export class ResumeTitleRepository {
  private readonly repo: Repository<ResumeTitle>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ResumeTitle);
  }

  async create(resumeId: number, title: string): Promise<ResumeTitle> {
    const entity = this.repo.create({ resumeId, title });
    return this.repo.save(entity);
  }

  async deleteByResumeId(resumeId: number): Promise<void> {
    await this.repo.delete({ resumeId });
  }

  async existsByResumeId(resumeId: number): Promise<boolean> {
    const count = await this.repo.count({ where: { resumeId } });
    return count > 0;
  }
}
