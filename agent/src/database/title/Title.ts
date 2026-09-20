import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('titles')
export class Title {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  declare id: number;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;
}
