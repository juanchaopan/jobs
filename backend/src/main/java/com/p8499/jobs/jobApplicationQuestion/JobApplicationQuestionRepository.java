package com.p8499.jobs.jobApplicationQuestion;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobApplicationQuestionRepository extends JpaRepository<JobApplicationQuestion, Integer> {

    @Query("SELECT q FROM JobApplicationQuestion q WHERE q.jobId = :jobId " +
           "ORDER BY CASE q.status WHEN 'Prepared' THEN 0 WHEN 'Waiting' THEN 1 WHEN 'Ready' THEN 2 ELSE 3 END, " +
           "q.confidence ASC NULLS LAST")
    List<JobApplicationQuestion> findByJobId(@Param("jobId") Integer jobId);

    boolean existsByJobIdAndStatusNot(Integer jobId, String status);
}
