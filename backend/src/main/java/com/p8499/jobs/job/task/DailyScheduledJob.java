package com.p8499.jobs.job.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.p8499.jobs.job.JobService;

@Component
public class DailyScheduledJob {

    private static final Logger logger = LoggerFactory.getLogger(DailyScheduledJob.class);

    private final JobService jobService;

    public DailyScheduledJob(JobService jobService) {
        this.jobService = jobService;
    }

    // Runs every day at 06:00
    @Scheduled(cron = "0 0 15 * * *", zone = "America/Toronto")
    public void run() {
        int count = jobService.dispatch();
        logger.info("Daily scheduled job executed: {} tasks published", count);
    }
}
