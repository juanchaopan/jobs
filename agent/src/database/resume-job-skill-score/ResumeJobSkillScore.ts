import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('resume_job_skill_scores')
export class ResumeJobSkillScore {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column({ type: 'int', name: 'resume_id' })
  declare resumeId: number;

  @Column({ type: 'int', name: 'job_skill_id' })
  declare jobSkillId: number;

  @Column({ type: 'int' })
  declare score: number;
}
