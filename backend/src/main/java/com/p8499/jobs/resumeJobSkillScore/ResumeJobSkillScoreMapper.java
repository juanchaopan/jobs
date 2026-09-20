package com.p8499.jobs.resumeJobSkillScore;

import com.p8499.jobs.jobSkill.JobSkill;
import com.p8499.jobs.resumeJobSkillScore.dto.ResumeJobSkillScoreResponse;

public final class ResumeJobSkillScoreMapper {

    private ResumeJobSkillScoreMapper() {
    }

    public static ResumeJobSkillScoreResponse entityToResponse(ResumeJobSkillScore s, JobSkill js) {
        ResumeJobSkillScoreResponse r = new ResumeJobSkillScoreResponse();
        r.setId(s.getId());
        r.setResumeId(s.getResumeId());
        r.setJobSkillId(s.getJobSkillId());
        r.setScore(s.getScore());
        if (js != null) {
            r.setName(js.getName());
            r.setRequirement(js.getRequirement());
            r.setWeight(js.getWeight());
        }
        return r;
    }
}
