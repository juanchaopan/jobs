import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column('bytea', { nullable: true })
  declare content: Buffer | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare extension: string | null;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;
  
  @Column({ type: 'text' })
  declare note: string;
}
