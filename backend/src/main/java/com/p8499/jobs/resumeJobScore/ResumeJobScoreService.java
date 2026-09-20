package com.p8499.jobs.resumeJobScore;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.p8499.jobs.job.Job;
import com.p8499.jobs.job.JobRepository;
import com.p8499.jobs.jobApplication.JobApplication;
import com.p8499.jobs.jobApplication.JobApplicationRepository;
import com.p8499.jobs.resume.Resume;
import com.p8499.jobs.resume.ResumeRepository;
import com.p8499.jobs.resumeJobScore.dto.ResumeJobScoreResponse;
import com.p8499.jobs.resumeJobScore.dto.ResumeJobScoreResponse.JobResumeScore;

@Service
public class ResumeJobScoreService {

    private final ResumeJobScoreRepository repository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final ResumeRepository resumeRepository;

    public ResumeJobScoreService(ResumeJobScoreRepository repository, JobRepository jobRepository,
            JobApplicationRepository jobApplicationRepository, ResumeRepository resumeRepository) {
        this.repository = repository;
        this.jobRepository = jobRepository;
        this.jobApplicationRepository = jobApplicationRepository;
        this.resumeRepository = resumeRepository;
    }

    public ResumeJobScoreResponse findById(Integer id) {
        ResumeJobScore score = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ResumeJobScore not found"));
        Job job = jobRepository.findById(score.getJobId()).orElse(null);
        JobApplication jobApplication = jobApplicationRepository.findById(score.getJobId()).orElse(null);
        return ResumeJobScoreMapper.entityToResponse(score, job, jobApplication);
    }

    public Page<ResumeJobScoreResponse> findByResumeIdPaged(int page, int size, Integer resumeId) {
        Page<ResumeJobScore> scorePage = repository.findByResumeId(resumeId, PageRequest.of(page, size));
        List<Integer> jobIds = scorePage.getContent().stream().map(ResumeJobScore::getJobId).collect(Collectors.toList());
        Map<Integer, Job> jobMap = jobRepository.findAllById(jobIds).stream().collect(Collectors.toMap(Job::getId, j -> j));
        Map<Integer, JobApplication> jobApplicationMap = jobApplicationRepository.findAllById(jobIds).stream()
                .collect(Collectors.toMap(JobApplication::getId, a -> a));

        List<Integer> jobIdsWithoutApplication = jobIds.stream()
                .filter(id -> !jobApplicationMap.containsKey(id))
                .collect(Collectors.toList());

        Map<Integer, List<JobResumeScore>> jobResumeScoresMap = new HashMap<>();
        if (!jobIdsWithoutApplication.isEmpty()) {
            List<Integer> allResumeIds = repository.findByJobIdInOrderByJobIdAscScoreDesc(jobIdsWithoutApplication)
                    .stream().map(ResumeJobScore::getResumeId).distinct().collect(Collectors.toList());
            Map<Integer, String> resumeNameMap = resumeRepository.findAllById(allResumeIds).stream()
                    .collect(Collectors.toMap(Resume::getId, Resume::getName));
            repository.findByJobIdInOrderByJobIdAscScoreDesc(jobIdsWithoutApplication)
                    .forEach(s -> jobResumeScoresMap
                            .computeIfAbsent(s.getJobId(), k -> new java.util.ArrayList<>())
                            .add(new JobResumeScore(resumeNameMap.get(s.getResumeId()), s.getScore())));
        }

        return scorePage.map(s -> {
            ResumeJobScoreResponse response = ResumeJobScoreMapper.entityToResponse(s, jobMap.get(s.getJobId()),
                    jobApplicationMap.get(s.getJobId()));
            if (!jobApplicationMap.containsKey(s.getJobId())) {
                response.setJobResumeScores(jobResumeScoresMap.get(s.getJobId()));
            }
            return response;
        });
    }
}
