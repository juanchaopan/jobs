import { DataSource, Repository } from 'typeorm';
import { JobApplicationQuestion } from './JobApplicationQuestion.js';

export class JobApplicationQuestionRepository {
  private readonly repo: Repository<JobApplicationQuestion>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(JobApplicationQuestion);
  }

  async create(jobId: number, key: string, type: string, question: string, constraints: string | null, status: string): Promise<JobApplicationQuestion> {
    const entity = this.repo.create({ jobId, key, type, question, constraints, status });
    return this.repo.save(entity);
  }

  async updateFeedbackByJobIdAndKey(jobId: number, key: string, error: string, status: string): Promise<void> {
    await this.repo.update({ jobId, key }, { error, status });
  }

  async updateAnswerByJobIdAndKey(jobId: number, key: string, answer: string, confidence: number, status: string): Promise<void> {
    await this.repo.update({ jobId, key }, { answer, confidence, status });
  }

  async findById(id: number): Promise<JobApplicationQuestion | null> {
    return this.repo.findOneBy({ id });
  }

  async findByJobId(jobId: number): Promise<JobApplicationQuestion[]> {
    return this.repo.find({ where: { jobId } });
  }

  async updateStatusByJobId(jobId: number, status: string): Promise<void> {
    await this.repo.update({ jobId }, { status });
  }
}
