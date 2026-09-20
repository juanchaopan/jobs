package com.p8499.jobs.jobApplication;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.p8499.jobs.common.dto.DataResponse;
import com.p8499.jobs.jobApplication.dto.JobApplicationRequest;
import com.p8499.jobs.jobApplication.dto.JobApplicationResponse;

@RestController
@RequestMapping("/api/jobApplications")
@Validated
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;

    public JobApplicationController(JobApplicationService jobApplicationService) {
        this.jobApplicationService = jobApplicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DataResponse<JobApplicationResponse> createJobApplication(@Valid @RequestBody JobApplicationRequest request) {
        JobApplication created = jobApplicationService.create(JobApplicationMapper.requestToEntity(request));
        return new DataResponse<>(JobApplicationMapper.entityToResponse(created));
    }

    @PostMapping("/{id}/retry")
    public DataResponse<JobApplicationResponse> retryJobApplication(@PathVariable Integer id) {
        JobApplication retried = jobApplicationService.retry(id);
        return new DataResponse<>(JobApplicationMapper.entityToResponse(retried));
    }

    @PostMapping("/close")
    @ResponseStatus(HttpStatus.CREATED)
    public DataResponse<JobApplicationResponse> closeJobApplication(@Valid @RequestBody JobApplicationRequest request) {
        JobApplication closed = jobApplicationService.close(JobApplicationMapper.requestToClosedEntity(request));
        return new DataResponse<>(JobApplicationMapper.entityToResponse(closed));
    }
}
