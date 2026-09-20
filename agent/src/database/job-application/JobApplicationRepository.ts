import { DataSource, Repository } from 'typeorm';
import { JobApplication } from './JobApplication.js';

export class JobApplicationRepository {
  private readonly repo: Repository<JobApplication>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(JobApplication);
  }

  async create(id: number, resumeId: number, status: string, reason: string = ''): Promise<JobApplication> {
    const entity = this.repo.create({ id, resumeId, status, reason });
    return this.repo.save(entity);
  }

  async findById(id: number): Promise<JobApplication | null> {
    return this.repo.findOneBy({ id });
  }

  async updateStatus(id: number, status: string, reason: string = ''): Promise<void> {
    await this.repo.update({ id }, { status, reason });
  }
}
