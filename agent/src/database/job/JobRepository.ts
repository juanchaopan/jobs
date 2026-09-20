import { DataSource, Repository } from 'typeorm';
import { Job } from './Job.js';

export class JobRepository {
  private readonly repo: Repository<Job>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Job);
  }

  async existsByKey(key: string): Promise<boolean> {
    const count = await this.repo.count({ where: { key } });
    return count > 0;
  }

  async create(key: string, url: string, company: string, title: string, description: string | null = null): Promise<Job> {
    const entity = this.repo.create({ key, url, company, title, description });
    return this.repo.save(entity);
  }

  async findById(id: number): Promise<Job | null> {
    return this.repo.findOneBy({ id });
  }

  async findAll(): Promise<Job[]> {
    return this.repo.find();
  }
}
