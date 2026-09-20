package com.p8499.jobs.resumeJobSkillScore;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResumeJobSkillScoreRepository extends JpaRepository<ResumeJobSkillScore, Integer> {

    @Query(value = "SELECT r.* FROM resume_job_skill_scores r JOIN job_skills js ON r.job_skill_id = js.id WHERE r.resume_id = :resumeId AND js.job_id = :jobId ORDER BY js.weight DESC", nativeQuery = true)
    List<ResumeJobSkillScore> findByResumeIdAndJobIdOrderByJobSkillWeightDesc(@Param("resumeId") Integer resumeId, @Param("jobId") Integer jobId);

}
