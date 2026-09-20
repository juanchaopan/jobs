package com.p8499.jobs.jobSkill;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface JobSkillRepository extends JpaRepository<JobSkill, Integer> {

    List<JobSkill> findByJobIdOrderByWeightDesc(Integer jobId);
}
