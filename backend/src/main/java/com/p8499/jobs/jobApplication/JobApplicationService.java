package com.p8499.jobs.jobApplication;

import java.util.List;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.p8499.jobs.common.config.RabbitConfig;
import com.p8499.jobs.jobApplicationQuestion.JobApplicationQuestionRepository;
import com.p8499.jobs.resumeJobScore.ResumeJobScore;
import com.p8499.jobs.resumeJobScore.ResumeJobScoreRepository;

@Service
public class JobApplicationService {

    private final JobApplicationRepository jobApplicationRepository;
    private final ResumeJobScoreRepository resumeJobScoreRepository;
    private final JobApplicationQuestionRepository jobApplicationQuestionRepository;
    private final RabbitTemplate rabbitTemplate;

    public JobApplicationService(JobApplicationRepository jobApplicationRepository,
            ResumeJobScoreRepository resumeJobScoreRepository,
            JobApplicationQuestionRepository jobApplicationQuestionRepository,
            RabbitTemplate rabbitTemplate) {
        this.jobApplicationRepository = jobApplicationRepository;
        this.resumeJobScoreRepository = resumeJobScoreRepository;
        this.jobApplicationQuestionRepository = jobApplicationQuestionRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public JobApplication create(JobApplication jobApplication) {
        JobApplication saved = jobApplicationRepository.save(jobApplication);

        List<ResumeJobScore> scores = resumeJobScoreRepository.findByJobId(saved.getId());
        scores.forEach(s -> s.setSelected(s.getResumeId().equals(saved.getResumeId())));
        resumeJobScoreRepository.saveAll(scores);

        String payload = String.format("{\"type\":\"add.application\",\"value\":{\"jobId\":%s,\"resumeId\":%s}}",
                saved.getId(), saved.getResumeId());
        rabbitTemplate.convertAndSend(RabbitConfig.JOB_QUEUE, payload);
        return saved;
    }

    public JobApplication retry(Integer id) {
        JobApplication jobApplication = jobApplicationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "JobApplication not found"));
        if (!"Aborted".equals(jobApplication.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only Aborted applications can be retried");
        }
        jobApplication.setStatus("Started");
        jobApplication.setReason("");
        JobApplication saved = jobApplicationRepository.save(jobApplication);

        var questions = jobApplicationQuestionRepository.findByJobId(saved.getId());
        questions.forEach(q -> q.setStatus("Ready"));
        jobApplicationQuestionRepository.saveAll(questions);

        String payload = String.format("{\"type\":\"add.application\",\"value\":{\"jobId\":%s,\"resumeId\":%s}}",
                saved.getId(), saved.getResumeId());
        rabbitTemplate.convertAndSend(RabbitConfig.JOB_QUEUE, payload);
        return saved;
    }

    public JobApplication close(JobApplication jobApplication) {
        if (jobApplicationRepository.existsById(jobApplication.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Application already exists for this job");
        }
        return jobApplicationRepository.save(jobApplication);
    }
}
