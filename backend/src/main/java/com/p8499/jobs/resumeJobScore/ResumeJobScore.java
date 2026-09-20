package com.p8499.jobs.resumeJobScore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "resume_job_scores")
public class ResumeJobScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "resume_id", nullable = false)
    private Integer resumeId;

    @Column(name = "job_id", nullable = false)
    private Integer jobId;

    @Column(nullable = false)
    private Integer score;

    @Column(nullable = false)
    private Boolean selected;

    protected ResumeJobScore() {
    }

    public ResumeJobScore(Integer resumeId, Integer jobId, Integer score, Boolean selected) {
        this.resumeId = resumeId;
        this.jobId = jobId;
        this.score = score;
        this.selected = selected;
    }

    public Integer getId() {
        return id;
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

    public Boolean getSelected() {
        return selected;
    }

    public void setSelected(Boolean selected) {
        this.selected = selected;
    }
}
