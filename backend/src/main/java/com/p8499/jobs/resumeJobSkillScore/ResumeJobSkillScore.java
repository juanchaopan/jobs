package com.p8499.jobs.resumeJobSkillScore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "resume_job_skill_scores")
public class ResumeJobSkillScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "resume_id", nullable = false)
    private Integer resumeId;

    @Column(name = "job_skill_id", nullable = false)
    private Integer jobSkillId;

    @Column(nullable = false)
    private Integer score;

    protected ResumeJobSkillScore() {
    }

    public ResumeJobSkillScore(Integer resumeId, Integer jobSkillId, Integer score) {
        this.resumeId = resumeId;
        this.jobSkillId = jobSkillId;
        this.score = score;
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

    public Integer getJobSkillId() {
        return jobSkillId;
    }

    public void setJobSkillId(Integer jobSkillId) {
        this.jobSkillId = jobSkillId;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }
}
