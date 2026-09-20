import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('resume_summaries')
export class ResumeSummary {
  @PrimaryColumn({ type: 'int' })
  declare id: number;

  @Column('bytea', { nullable: true })
  declare summary: Buffer | null;
}
