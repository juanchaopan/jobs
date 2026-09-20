package com.p8499.jobs.resume;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeRepository extends JpaRepository<Resume, Integer> {

    List<Resume> findAllByOrderByIdAsc();
}