package com.p8499.jobs.jobApplicationQuestion;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.p8499.jobs.common.dto.DataResponse;
import com.p8499.jobs.jobApplicationQuestion.dto.JobApplicationQuestionRequest;
import com.p8499.jobs.jobApplicationQuestion.dto.JobApplicationQuestionResponse;

@RestController
@RequestMapping("/api/job-application-questions")
public class JobApplicationQuestionController {

    private final JobApplicationQuestionService jobApplicationQuestionService;

    public JobApplicationQuestionController(JobApplicationQuestionService jobApplicationQuestionService) {
        this.jobApplicationQuestionService = jobApplicationQuestionService;
    }

    @GetMapping
    public DataResponse<List<JobApplicationQuestionResponse>> getByJobId(@RequestParam("jobId") Integer jobId) {
        List<JobApplicationQuestionResponse> list = jobApplicationQuestionService.findByJobId(jobId).stream()
                .map(JobApplicationQuestionMapper::entityToResponse)
                .collect(Collectors.toList());
        return new DataResponse<>(list);
    }

    @GetMapping("/{id}")
    public DataResponse<JobApplicationQuestionResponse> getById(@PathVariable("id") Integer id) {
        JobApplicationQuestion question = jobApplicationQuestionService.findById(id);
        return new DataResponse<>(JobApplicationQuestionMapper.entityToResponse(question));
    }

    @PutMapping("/{id}/submit")
    public DataResponse<JobApplicationQuestionResponse> submitRemark(@PathVariable("id") Integer id,
            @RequestBody JobApplicationQuestionRequest request) {
        JobApplicationQuestion updated = jobApplicationQuestionService.submitRemark(id, request.getRemark());
        return new DataResponse<>(JobApplicationQuestionMapper.entityToResponse(updated));
    }

    @PutMapping("/{id}/note")
    public DataResponse<JobApplicationQuestionResponse> addNote(@PathVariable("id") Integer id) {
        JobApplicationQuestion updated = jobApplicationQuestionService.addNote(id);
        return new DataResponse<>(JobApplicationQuestionMapper.entityToResponse(updated));
    }

    @PutMapping("/{id}/approve")
    public DataResponse<JobApplicationQuestionResponse> approve(@PathVariable("id") Integer id) {
        JobApplicationQuestion updated = jobApplicationQuestionService.approve(id);
        return new DataResponse<>(JobApplicationQuestionMapper.entityToResponse(updated));
    }
}
