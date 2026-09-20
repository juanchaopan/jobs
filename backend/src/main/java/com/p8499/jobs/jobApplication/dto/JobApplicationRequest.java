package com.p8499.jobs.jobApplication.dto;

import jakarta.validation.constraints.NotNull;

public class JobApplicationRequest {

    @NotNull
    private Integer id;

    @NotNull
    private Integer resumeId;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getResumeId() {
        return resumeId;
    }

    public void setResumeId(Integer resumeId) {
        this.resumeId = resumeId;
    }
}
