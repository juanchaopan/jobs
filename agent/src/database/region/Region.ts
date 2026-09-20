import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('regions')
export class Region {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;
}
