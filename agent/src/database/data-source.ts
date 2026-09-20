import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Resume } from './resume/Resume.js';
import { ResumeSummary } from './resume-summary/ResumeSummary.js';
import { ResumeTitle } from './resume-title/ResumeTitle.js';
import { Title } from './title/Title.js';
import { Region } from './region/Region.js';
import { Job } from './job/Job.js';
import { JobSkill } from './job-skill/JobSkill.js';
import { ResumeJobScore } from './resume-job-score/ResumeJobScore.js';
import { ResumeJobSkillScore } from './resume-job-skill-score/ResumeJobSkillScore.js';
import { JobApplication } from './job-application/JobApplication.js';
import { JobApplicationQuestion } from './job-application-question/JobApplicationQuestion.js';

const POSTGRES_HOST = process.env['POSTGRES_HOST'] ?? 'localhost';
const POSTGRES_PORT = parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10);
const POSTGRES_USER = process.env['POSTGRES_USER'] ?? 'postgres';
const POSTGRES_PASSWORD = process.env['POSTGRES_PASSWORD'] ?? 'postgres';
const POSTGRES_DB = process.env['POSTGRES_DB'] ?? 'app';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: POSTGRES_HOST,
  port: POSTGRES_PORT,
  username: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  entities: [Resume, ResumeSummary, ResumeTitle, Title, Region, Job, JobSkill, ResumeJobScore, ResumeJobSkillScore, JobApplication, JobApplicationQuestion],
  synchronize: false,
});
