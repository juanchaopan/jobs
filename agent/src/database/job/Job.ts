import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column({ type: 'varchar', length: 255 })
  declare key: string;

  @Column({ type: 'varchar', length: 2047 })
  declare url: string;

  @Column({ type: 'varchar', length: 255 })
  declare company: string;

  @Column({ type: 'varchar', length: 255 })
  declare title: string;

  @Column('text', { nullable: true })
  declare description: string | null;
}
