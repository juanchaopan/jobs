import amqp, { type ChannelModel, type Channel, type ConsumeMessage } from 'amqplib';
import { AppDataSource } from './database/data-source.js';
import { ResumeRepository } from './database/resume/ResumeRepository.js';
import { ResumeSummaryRepository } from './database/resume-summary/ResumeSummaryRepository.js';
import { ResumeTitleRepository } from './database/resume-title/ResumeTitleRepository.js';
import { TitleRepository } from './database/title/TitleRepository.js';
import { RegionRepository } from './database/region/RegionRepository.js';
import { JobRepository } from './database/job/JobRepository.js';
import { JobSkillRepository } from './database/job-skill/JobSkillRepository.js';
import { ResumeJobScoreRepository } from './database/resume-job-score/ResumeJobScoreRepository.js';
import { ResumeJobSkillScoreRepository } from './database/resume-job-skill-score/ResumeJobSkillScoreRepository.js';
import { JobApplicationRepository } from './database/job-application/JobApplicationRepository.js';
import { JobApplicationQuestionRepository } from './database/job-application-question/JobApplicationQuestionRepository.js';
import { ResumeAddContentService } from './services/ResumeAddContentService.js';
import { ResumeDeleteService } from './services/ResumeDeleteService.js';
import { JobAddService } from './services/JobAddService.js';
import { JobAddAnalysisService } from './services/JobAddAnalysisService.js';
import { ResumeJobAddScoreService } from './services/ResumeJobAddScoreService.js';
import { JobAddApplicationService } from './services/JobAddApplicationService.js';
import { QuestionAddService } from './services/QuestionAddService.js';
import { QuestionAddNoteService } from './services/QuestionAddNoteService.js';
import { RESUME_QUEUE, JOB_QUEUE, QUESTION_QUEUE } from './types/queues.js';

const RABBITMQ_HOST = process.env.RABBITMQ_HOST ?? 'localhost';
const RABBITMQ_PORT = parseInt(process.env.RABBITMQ_PORT ?? '5672', 10);
const RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME ?? 'guest';
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD ?? 'guest';
const RABBITMQ_URL = `amqp://${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

function log(...args: unknown[]): void {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

async function connect(): Promise<{ model: ChannelModel; resumeChannel: Channel; jobChannel: Channel; questionChannel: Channel }> {
  const model = await amqp.connect(RABBITMQ_URL);

  const resumeChannel = await model.createChannel();
  const jobChannel = await model.createChannel();
  const questionChannel = await model.createChannel();

  for (const [name, ch] of [['resume', resumeChannel], ['job', jobChannel], ['question', questionChannel]] as const) {
    ch.on('error', (err: Error) => log(`[!] ${name} channel error:`, err.message));
    await ch.assertQueue(RESUME_QUEUE, { durable: true });
    await ch.assertQueue(JOB_QUEUE, { durable: true });
    await ch.assertQueue(QUESTION_QUEUE, { durable: true });
    await ch.prefetch(1);
  }

  log(`[*] Connected to RabbitMQ. Waiting for messages in queues: "${RESUME_QUEUE}", "${JOB_QUEUE}", "${QUESTION_QUEUE}"`);

  return { model, resumeChannel, jobChannel, questionChannel };
}

async function subscribe(): Promise<void> {
  await AppDataSource.initialize();

  const { model, resumeChannel, jobChannel, questionChannel } = await connect();

  const resumeRepository = new ResumeRepository(AppDataSource);
  const resumeSummaryRepository = new ResumeSummaryRepository(AppDataSource);
  const resumeTitleRepository = new ResumeTitleRepository(AppDataSource);
  const titleRepository = new TitleRepository(AppDataSource);
  const regionRepository = new RegionRepository(AppDataSource);
  const jobRepository = new JobRepository(AppDataSource);
  const jobSkillRepository = new JobSkillRepository(AppDataSource);
  const resumeJobScoreRepository = new ResumeJobScoreRepository(AppDataSource);
  const resumeJobSkillScoreRepository = new ResumeJobSkillScoreRepository(AppDataSource);
  const jobApplicationRepository = new JobApplicationRepository(AppDataSource);
  const jobApplicationQuestionRepository = new JobApplicationQuestionRepository(AppDataSource);

  const resumeAddContentService = new ResumeAddContentService(resumeRepository, resumeSummaryRepository, resumeTitleRepository, jobRepository, resumeChannel);
  const resumeDeleteService = new ResumeDeleteService(resumeTitleRepository, resumeSummaryRepository, resumeJobScoreRepository, resumeJobSkillScoreRepository);
  const jobAddService = new JobAddService(titleRepository, regionRepository, jobRepository, jobChannel);
  const jobAddAnalysisService = new JobAddAnalysisService(resumeRepository, jobRepository, jobSkillRepository, resumeChannel);
  const resumeJobAddScoreService = new ResumeJobAddScoreService(resumeSummaryRepository, jobSkillRepository, resumeJobScoreRepository, resumeJobSkillScoreRepository, jobApplicationRepository);
  const jobAddApplicationService = new JobAddApplicationService(jobApplicationRepository, jobApplicationQuestionRepository, jobRepository, resumeRepository, questionChannel);
  const questionAddService = new QuestionAddService(jobApplicationRepository, jobApplicationQuestionRepository, jobRepository, resumeRepository, resumeSummaryRepository);
  const questionAddNoteService = new QuestionAddNoteService(jobApplicationRepository, jobApplicationQuestionRepository, jobRepository, resumeRepository, resumeSummaryRepository);

  resumeChannel.consume(RESUME_QUEUE, async (msg: ConsumeMessage | null) => {
    if (msg === null) {
      console.warn('[!] Consumer cancelled by server.');
      return;
    }

    const payload = JSON.parse(msg.content.toString());

    let label = `RESUME_QUEUE ${payload.type}`;
    try {
      switch (payload.type) {
        case 'add.content':
          label = `RESUME_QUEUE add.content resumeId=${payload.value.resumeId}`;
          log(`[x] Received ${label}`);
          await resumeAddContentService.process(payload.value.resumeId);
          break;
        case 'add.job':
          label = `RESUME_QUEUE add.job resumeId=${payload.value.resumeId} jobId=${payload.value.jobId}`;
          log(`[x] Received ${label}`);
          await resumeJobAddScoreService.process(payload.value.resumeId, payload.value.jobId);
          break;
        case 'delete':
          label = `RESUME_QUEUE delete resumeId=${payload.value.resumeId}`;
          log(`[x] Received ${label}`);
          await resumeDeleteService.process(payload.value.resumeId);
          break;
        default:
          console.warn(`[!] Unknown message type`);
      }

      resumeChannel.ack(msg);
      log(`[✓] Processed successfully. ${label}`);
    } catch (err) {
      console.error(`[!] Failed to process:`, (err as Error).message);
      resumeChannel.nack(msg, false, true);
    }
  });

  jobChannel.consume(JOB_QUEUE, async (msg: ConsumeMessage | null) => {
    if (msg === null) {
      console.warn('[!] Consumer cancelled by server.');
      return;
    }

    const payload = JSON.parse(msg.content.toString());

    let label = `JOB_QUEUE ${payload.type}`;
    try {
      switch (payload.type) {
        case 'add':
          label = `JOB_QUEUE add titleId=${payload.value.titleId} regionId=${payload.value.regionId}`;
          log(`[x] Received ${label}`);
          await jobAddService.process(payload.value.titleId, payload.value.regionId);
          break;
        case 'add.analysis':
          label = `JOB_QUEUE add.analysis jobId=${payload.value.jobId}`;
          log(`[x] Received ${label}`);
          await jobAddAnalysisService.process(payload.value.jobId);
          break;
        case 'add.application':
          label = `JOB_QUEUE add.application jobId=${payload.value.jobId} resumeId=${payload.value.resumeId}`;
          log(`[x] Received ${label}`);
          await jobAddApplicationService.process(payload.value.jobId, payload.value.resumeId);
          break;
        default:
          console.warn(`[!] Unknown message type`);
      }

      jobChannel.ack(msg);
      log(`[✓] Processed successfully. ${label}`);
    } catch (err) {
      console.error(`[!] Failed to process:`, (err as Error).message);
      jobChannel.nack(msg, false, true);
    }
  });

  questionChannel.consume(QUESTION_QUEUE, async (msg: ConsumeMessage | null) => {
    if (msg === null) {
      console.warn('[!] Consumer cancelled by server.');
      return;
    }

    const payload = JSON.parse(msg.content.toString());

    let label = `QUESTION_QUEUE ${payload.type}`;
    try {
      switch (payload.type) {
        case 'add':
          label = `QUESTION_QUEUE add questionId=${payload.value.questionId}`;
          log(`[x] Received ${label}`);
          await questionAddService.process(payload.value.questionId);
          break;
        case 'add.note':
          label = `QUESTION_QUEUE add.note questionId=${payload.value.questionId}`;
          log(`[x] Received ${label}`);
          await questionAddNoteService.process(payload.value.questionId);
          break;
        default:
          console.warn(`[!] Unknown message type`);
      }

      questionChannel.ack(msg);
      log(`[✓] Processed successfully. ${label}`);
    } catch (err) {
      console.error(`[!] Failed to process:`, (err as Error).message);
      questionChannel.nack(msg, false, true);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    log('\n[*] Shutting down...');
    await resumeChannel.close();
    await jobChannel.close();
    await questionChannel.close();
    await model.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

subscribe().catch((err: Error) => {
  console.error('[!] Failed to start subscriber:', err.message);
  process.exit(1);
});
