import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('resume_titles')
export class ResumeTitle {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column({ type: 'varchar', length: 255 })
  declare title: string;

  @Column({ name: 'resume_id', type: 'int' })
  declare resumeId: number;
}
