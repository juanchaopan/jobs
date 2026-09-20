import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('job_applications')
export class JobApplication {
  @PrimaryColumn({ type: 'int' })
  declare id: number;

  @Column({ type: 'varchar', length: 255 })
  declare status: string;

  @Column({ type: 'varchar', length: 255 })
  declare reason: string;

  @Column({ type: 'int', name: 'resume_id' })
  declare resumeId: number;
}
