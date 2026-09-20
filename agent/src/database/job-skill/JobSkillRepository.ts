import { DataSource, Repository } from 'typeorm';
import { JobSkill } from './JobSkill.js';

export class JobSkillRepository {
    private readonly repo: Repository<JobSkill>;

    constructor(dataSource: DataSource) {
        this.repo = dataSource.getRepository(JobSkill);
    }

    async create(jobId: number, name: string, requirement: string, weight: number): Promise<JobSkill> {
        const entity = this.repo.create({ jobId, name, requirement, weight });
        return this.repo.save(entity);
    }

    async existsByJobId(jobId: number): Promise<boolean> {
        const count = await this.repo.count({ where: { jobId } });
        return count > 0;
    }

    async findByJobId(jobId: number): Promise<JobSkill[]> {
        return this.repo.find({ where: { jobId } });
    }
}
