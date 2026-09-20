import { DataSource, Repository } from 'typeorm';
import { Resume } from './Resume.js';

export class ResumeRepository {
  private readonly repo: Repository<Resume>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Resume);
  }

  async findById(id: number): Promise<Resume | null> {
    return this.repo.findOneBy({ id });
  }

  async findAll(): Promise<Resume[]> {
    return this.repo.find();
  }

  async updateNote(id: number, note: string): Promise<void> {
    await this.repo.update({ id }, { note });
  }
}
