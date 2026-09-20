import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('resume_job_scores')
export class ResumeJobScore {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column({ type: 'int', name: 'resume_id' })
  declare resumeId: number;

  @Column({ type: 'int', name: 'job_id' })
  declare jobId: number;

  @Column({ type: 'int' })
  declare score: number;

  @Column({ type: 'boolean' })
  declare selected: boolean;
}
