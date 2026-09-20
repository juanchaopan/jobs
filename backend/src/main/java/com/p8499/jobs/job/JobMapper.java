package com.p8499.jobs.job;

import com.p8499.jobs.job.dto.JobResponse;

public class JobMapper {

    public static JobResponse entityToResponse(Job job) {
        JobResponse r = new JobResponse();
        r.setId(job.getId());
        r.setKey(job.getKey());
        r.setUrl(job.getUrl());
        r.setCompany(job.getCompany());
        r.setTitle(job.getTitle());
        r.setDescription(job.getDescription());
        return r;
    }
}
