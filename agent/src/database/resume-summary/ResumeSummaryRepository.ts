import { DataSource, Repository } from 'typeorm';
import { ResumeSummary } from './ResumeSummary.js';

export class ResumeSummaryRepository {
  private readonly repo: Repository<ResumeSummary>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ResumeSummary);
  }

  async findById(id: number): Promise<ResumeSummary | null> {
    return this.repo.findOneBy({ id });
  }

  async existsById(id: number): Promise<boolean> {
    const count = await this.repo.count({ where: { id } });
    return count > 0;
  }

  async create(id: number, summary: Buffer): Promise<ResumeSummary> {
    const entity = this.repo.create({ id, summary });
    return this.repo.save(entity);
  }

  async deleteById(id: number): Promise<void> {
    await this.repo.delete({ id });
  }
}
