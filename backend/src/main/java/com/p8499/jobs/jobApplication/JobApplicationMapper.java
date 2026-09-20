package com.p8499.jobs.jobApplication;

import com.p8499.jobs.jobApplication.dto.JobApplicationRequest;
import com.p8499.jobs.jobApplication.dto.JobApplicationResponse;

public final class JobApplicationMapper {

    private JobApplicationMapper() {
    }

    public static JobApplication requestToEntity(JobApplicationRequest request) {
        return new JobApplication(request.getId(), "Started", "", request.getResumeId());
    }

    public static JobApplication requestToClosedEntity(JobApplicationRequest request) {
        return new JobApplication(request.getId(), "Closed", "Closed by user", request.getResumeId());
    }

    public static JobApplicationResponse entityToResponse(JobApplication jobApplication) {
        JobApplicationResponse response = new JobApplicationResponse();
        response.setId(jobApplication.getId());
        response.setStatus(jobApplication.getStatus());
        response.setReason(jobApplication.getReason());
        response.setResumeId(jobApplication.getResumeId());
        return response;
    }
}
