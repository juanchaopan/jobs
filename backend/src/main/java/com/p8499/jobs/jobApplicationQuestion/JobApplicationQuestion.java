package com.p8499.jobs.jobApplicationQuestion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "job_application_questions")
public class JobApplicationQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "job_id", nullable = false)
    private Integer jobId;

    @NotBlank
    @Column(name = "key", nullable = false, length = 511)
    private String key;

    @NotBlank
    @Column(nullable = false, length = 255)
    private String type;

    @NotNull
    @Column(nullable = false, length = 2047)
    private String question;

    @Column(nullable = true, columnDefinition = "text")
    private String constraints;

    @Column(length = 2047)
    private String answer;

    @Column
    private Integer confidence;

    @Column(length = 2047)
    private String error;

    @Column(length = 2047)
    private String remark;

    @NotBlank
    @Column(nullable = false, length = 255)
    private String status;

    protected JobApplicationQuestion() {
    }

    public JobApplicationQuestion(Integer jobId, String key, String type, String question,
            String constraints, String answer, Integer confidence, String error, String remark, String status) {
        this.jobId = jobId;
        this.key = key;
        this.type = type;
        this.question = question;
        this.constraints = constraints;
        this.answer = answer;
        this.confidence = confidence;
        this.error = error;
        this.remark = remark;
        this.status = status;
    }

    public Integer getId() {
        return id;
    }

    public Integer getJobId() {
        return jobId;
    }

    public void setJobId(Integer jobId) {
        this.jobId = jobId;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getConstraints() {
        return constraints;
    }

    public void setConstraints(String constraints) {
        this.constraints = constraints;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public Integer getConfidence() {
        return confidence;
    }

    public void setConfidence(Integer confidence) {
        this.confidence = confidence;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
