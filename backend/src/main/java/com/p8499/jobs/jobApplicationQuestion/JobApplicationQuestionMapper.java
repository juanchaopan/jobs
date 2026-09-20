package com.p8499.jobs.jobApplicationQuestion;

import com.p8499.jobs.jobApplicationQuestion.dto.JobApplicationQuestionResponse;

public final class JobApplicationQuestionMapper {

    private JobApplicationQuestionMapper() {
    }

    public static JobApplicationQuestionResponse entityToResponse(JobApplicationQuestion q) {
        JobApplicationQuestionResponse r = new JobApplicationQuestionResponse();
        r.setId(q.getId());
        r.setJobId(q.getJobId());
        r.setKey(q.getKey());
        r.setType(q.getType());
        r.setQuestion(q.getQuestion());
        r.setConstraints(q.getConstraints());
        r.setAnswer(q.getAnswer());
        r.setConfidence(q.getConfidence());
        r.setError(q.getError());
        r.setRemark(q.getRemark());
        r.setStatus(q.getStatus());
        return r;
    }
}
