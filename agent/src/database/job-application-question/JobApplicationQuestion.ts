import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('job_application_questions')
export class JobApplicationQuestion {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column({ type: 'int', name: 'job_id' })
  declare jobId: number;

  @Column({ type: 'varchar', length: 511 })
  declare key: string;

  @Column({ type: 'varchar', length: 255 })
  declare type: string;

  @Column({ type: 'varchar', length: 2047 })
  declare question: string;

  @Column({ type: 'text', nullable: true })
  declare constraints: string | null;

  @Column({ type: 'varchar', length: 2047, nullable: true })
  declare answer: string | null;

  @Column({ type: 'int', nullable: true })
  declare confidence: number | null;

  @Column({ type: 'varchar', length: 2047, nullable: true })
  declare error: string | null;

  @Column({ type: 'varchar', length: 2047, nullable: true })
  declare remark: string | null;

  @Column({ type: 'varchar', length: 255 })
  declare status: string;
}
