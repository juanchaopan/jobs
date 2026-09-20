package com.p8499.jobs.jobApplication;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "job_applications")
public class JobApplication {

    @Id
    private Integer id;

    @NotBlank
    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String reason;

    @NotNull
    @Column(name = "resume_id", nullable = false)
    private Integer resumeId;

    protected JobApplication() {
    }

    public JobApplication(Integer id, String status, String reason, Integer resumeId) {
        this.id = id;
        this.status = status;
        this.reason = reason;
        this.resumeId = resumeId;
    }

    public Integer getId() {
        return id;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Integer getResumeId() {
        return resumeId;
    }

    public void setResumeId(Integer resumeId) {
        this.resumeId = resumeId;
    }
}
