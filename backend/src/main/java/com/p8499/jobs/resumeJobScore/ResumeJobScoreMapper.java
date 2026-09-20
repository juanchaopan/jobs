package com.p8499.jobs.resumeJobScore;

import com.p8499.jobs.job.Job;
import com.p8499.jobs.jobApplication.JobApplication;
import com.p8499.jobs.resumeJobScore.dto.ResumeJobScoreResponse;

public final class ResumeJobScoreMapper {

    private ResumeJobScoreMapper() {
    }

    public static ResumeJobScoreResponse entityToResponse(ResumeJobScore s, Job job, JobApplication jobApplication) {
        ResumeJobScoreResponse r = new ResumeJobScoreResponse();
        r.setId(s.getId());
        r.setResumeId(s.getResumeId());
        r.setJobId(s.getJobId());
        r.setScore(s.getScore());
        if (job != null) {
            r.setTitle(job.getTitle());
            r.setCompany(job.getCompany());
            r.setUrl(job.getUrl());
        }
        if (jobApplication != null) {
            r.setApplicationStatus(jobApplication.getStatus());
            r.setApplicationStatusReason(jobApplication.getReason());
        }
        return r;
    }

}
