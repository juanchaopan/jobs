package com.p8499.jobs.jobSkill;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class JobSkillService {

    private final JobSkillRepository jobSkillRepository;

    public JobSkillService(JobSkillRepository jobSkillRepository) {
        this.jobSkillRepository = jobSkillRepository;
    }

    public List<JobSkill> findByJobId(Integer jobId) {
        return jobSkillRepository.findByJobIdOrderByWeightDesc(jobId);
    }
}
