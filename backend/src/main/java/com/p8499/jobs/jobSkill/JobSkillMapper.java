package com.p8499.jobs.jobSkill;

import com.p8499.jobs.jobSkill.dto.JobSkillResponse;

public final class JobSkillMapper {

    private JobSkillMapper() {
    }

    public static JobSkillResponse entityToResponse(JobSkill s) {
        JobSkillResponse r = new JobSkillResponse();
        r.setId(s.getId());
        r.setName(s.getName());
        r.setRequirement(s.getRequirement());
        r.setWeight(s.getWeight());
        r.setJobId(s.getJobId());
        return r;
    }
}
