package com.p8499.jobs.resumeJobScore;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResumeJobScoreRepository extends JpaRepository<ResumeJobScore, Integer> {

    @Query("SELECT r FROM ResumeJobScore r " +
           "LEFT JOIN JobApplication ja ON ja.id = r.jobId " +
           "WHERE r.resumeId = :resumeId " +
           "AND r.selected = true " +
           "ORDER BY CASE " +
           "WHEN ja.status = 'Processing' THEN 0 " +
           "WHEN ja.status = 'Aborted' THEN 1 " +
           "WHEN ja.status = 'Started' THEN 2 " +
           "WHEN ja.status IS NULL THEN 3 " +
           "WHEN ja.status = 'Closed' THEN 4 " +
           "WHEN ja.status = 'Applied' THEN 5 " +
           "ELSE 6 END, r.score DESC, r.id ASC")
    Page<ResumeJobScore> findByResumeId(@Param("resumeId") Integer resumeId, Pageable pageable);

    List<ResumeJobScore> findByJobId(Integer jobId);

    List<ResumeJobScore> findByJobIdInOrderByJobIdAscScoreDesc(List<Integer> jobIds);
}
