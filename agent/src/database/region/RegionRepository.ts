import { DataSource, Repository } from 'typeorm';
import { Region } from './Region.js';

export class RegionRepository {
  private readonly repo: Repository<Region>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Region);
  }

  async findAll(): Promise<Region[]> {
    return this.repo.find();
  }

  async findById(id: number): Promise<Region | null> {
    return this.repo.findOneBy({ id });
  }

  async findByName(name: string): Promise<Region | null> {
    return this.repo.findOneBy({ name });
  }

  async create(name: string): Promise<Region> {
    const entity = this.repo.create({ name });
    return this.repo.save(entity);
  }

  async deleteById(id: number): Promise<void> {
    await this.repo.delete({ id });
  }
}
