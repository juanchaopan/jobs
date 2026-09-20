import type { Channel } from 'amqplib';
import { TitleRepository } from '../database/title/TitleRepository.js';
import { RegionRepository } from '../database/region/RegionRepository.js';
import { JobRepository } from '../database/job/JobRepository.js';
import { scrape } from '../chrome/scrape.js';
import { JOB_QUEUE } from '../types/queues.js';

export class JobAddService {
  constructor(
    private readonly titleRepository: TitleRepository,
    private readonly regionRepository: RegionRepository,
    private readonly jobRepository: JobRepository,
    private readonly channel: Channel
  ) { }

  async process(titleId: number, regionId: number): Promise<void> {
    const title = await this.titleRepository.findById(titleId);
    const region = await this.regionRepository.findById(regionId);

    if (!title || !region) {
      return;
    }

    const titleName = title.name;
    const regionName = region.name;

    const findCallback = async (jobKey: string) => {
      return await this.jobRepository.existsByKey(jobKey);
    }
    const createCallback = async ({ key, url, company, title, description }: { key: string; url: string; company: string; title: string; description: string }) => {
      const created = await this.jobRepository.create(key, url, company, title, description);
      this.channel.sendToQueue(JOB_QUEUE, Buffer.from(JSON.stringify({ type: 'add.analysis', value: { jobId: created.id } })));
    };

    await scrape(titleName, regionName, findCallback, createCallback);
  }
}
