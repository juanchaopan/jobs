package com.p8499.jobs.resumeJobScore.dto;

import java.util.List;

public class ResumeJobScoreResponse {

    private Integer id;
    private Integer resumeId;
    private Integer jobId;
    private Integer score;
    private String title;
    private String company;
    private String url;
    private String applicationStatus;
    private String applicationStatusReason;
    private List<JobResumeScore> jobResumeScores;

    public static class JobResumeScore {
        private String resumeName;
        private Integer score;

        public JobResumeScore(String resumeName, Integer score) {
            this.resumeName = resumeName;
            this.score = score;
        }

        public String getResumeName() {
            return resumeName;
        }

        public Integer getScore() {
            return score;
        }
    }

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

    public Integer getJobId() {
        return jobId;
    }

    public void setJobId(Integer jobId) {
        this.jobId = jobId;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getApplicationStatus() {
        return applicationStatus;
    }

    public void setApplicationStatus(String applicationStatus) {
        this.applicationStatus = applicationStatus;
    }

    public String getApplicationStatusReason() {
        return applicationStatusReason;
    }

    public void setApplicationStatusReason(String applicationStatusReason) {
        this.applicationStatusReason = applicationStatusReason;
    }

    public List<JobResumeScore> getJobResumeScores() {
        return jobResumeScores;
    }

    public void setJobResumeScores(List<JobResumeScore> jobResumeScores) {
        this.jobResumeScores = jobResumeScores;
    }
}
