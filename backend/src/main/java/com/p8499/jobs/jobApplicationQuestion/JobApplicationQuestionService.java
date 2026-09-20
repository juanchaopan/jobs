package com.p8499.jobs.jobApplicationQuestion;

import java.util.List;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.p8499.jobs.common.config.RabbitConfig;
import com.p8499.jobs.jobApplication.JobApplication;
import com.p8499.jobs.jobApplication.JobApplicationRepository;

@Service
public class JobApplicationQuestionService {

    private final JobApplicationQuestionRepository jobApplicationQuestionRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final RabbitTemplate rabbitTemplate;

    public JobApplicationQuestionService(JobApplicationQuestionRepository jobApplicationQuestionRepository,
            JobApplicationRepository jobApplicationRepository,
            RabbitTemplate rabbitTemplate) {
        this.jobApplicationQuestionRepository = jobApplicationQuestionRepository;
        this.jobApplicationRepository = jobApplicationRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public List<JobApplicationQuestion> findByJobId(Integer jobId) {
        return jobApplicationQuestionRepository.findByJobId(jobId);
    }

    public JobApplicationQuestion findById(Integer id) {
        return jobApplicationQuestionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job application question not found"));
    }

    public JobApplicationQuestion submitRemark(Integer id, String remark) {
        JobApplicationQuestion existing = findById(id);
        if (!"Prepared".equals(existing.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Question status is not Prepared");
        }
        existing.setRemark(remark);
        existing.setStatus("Waiting");
        JobApplicationQuestion saved = jobApplicationQuestionRepository.save(existing);
        String payload = String.format("{\"type\":\"add\",\"value\":{\"questionId\":%s}}", id);
        rabbitTemplate.convertAndSend(RabbitConfig.QUESTION_QUEUE, payload);
        return saved;
    }

    public JobApplicationQuestion addNote(Integer id) {
        JobApplicationQuestion existing = findById(id);
        String payload = String.format("{\"type\":\"add.note\",\"value\":{\"questionId\":%s}}", id);
        rabbitTemplate.convertAndSend(RabbitConfig.QUESTION_QUEUE, payload);
        return existing;
    }

    public JobApplicationQuestion approve(Integer id) {
        JobApplicationQuestion existing = findById(id);
        if (!"Prepared".equals(existing.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Question status is not Prepared");
        }
        existing.setStatus("Ready");
        JobApplicationQuestion saved = jobApplicationQuestionRepository.save(existing);
        if (!jobApplicationQuestionRepository.existsByJobIdAndStatusNot(saved.getJobId(), "Ready")) {
            JobApplication jobApplication = jobApplicationRepository.findById(saved.getJobId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job application not found"));
            String payload = String.format("{\"type\":\"add.application\",\"value\":{\"jobId\":%s,\"resumeId\":%s}}", jobApplication.getId(), jobApplication.getResumeId());
            rabbitTemplate.convertAndSend(RabbitConfig.JOB_QUEUE, payload);
        }
        return saved;
    }

}
