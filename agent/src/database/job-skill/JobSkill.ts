import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('job_skills')
export class JobSkill {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 255 })
  declare requirement: string;

  @Column({ type: 'int' })
  declare weight: number;

  @Column({ type: 'int', name: 'job_id' })
  declare jobId: number;
}
