import { DataSource, Repository } from 'typeorm';
import { Title } from './Title.js';

export class TitleRepository {
  private readonly repo: Repository<Title>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Title);
  }

  async findAll(): Promise<Title[]> {
    return this.repo.find();
  }

  async findById(id: number): Promise<Title | null> {
    return this.repo.findOneBy({ id });
  }

  async findByName(name: string): Promise<Title | null> {
    return this.repo.findOneBy({ name });
  }

  async create(name: string): Promise<Title> {
    const entity = this.repo.create({ name });
    return this.repo.save(entity);
  }

  async deleteById(id: number): Promise<void> {
    await this.repo.delete({ id });
  }
}
