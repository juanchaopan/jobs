package com.p8499.jobs.resumeJobSkillScore;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.p8499.jobs.jobSkill.JobSkill;
import com.p8499.jobs.jobSkill.JobSkillRepository;
import com.p8499.jobs.resumeJobSkillScore.dto.ResumeJobSkillScoreResponse;

@Service
public class ResumeJobSkillScoreService {

    private final ResumeJobSkillScoreRepository repository;
    private final JobSkillRepository jobSkillRepository;

    public ResumeJobSkillScoreService(ResumeJobSkillScoreRepository repository, JobSkillRepository jobSkillRepository) {
        this.repository = repository;
        this.jobSkillRepository = jobSkillRepository;
    }

    public List<ResumeJobSkillScoreResponse> findByResumeIdAndJobId(Integer resumeId, Integer jobId) {
        List<ResumeJobSkillScore> scores = repository.findByResumeIdAndJobIdOrderByJobSkillWeightDesc(resumeId, jobId);
        List<Integer> jobSkillIds = scores.stream().map(ResumeJobSkillScore::getJobSkillId).collect(Collectors.toList());
        Map<Integer, JobSkill> jsMap = jobSkillRepository.findAllById(jobSkillIds).stream()
                .collect(Collectors.toMap(JobSkill::getId, j -> j));
        return scores.stream().map(s -> ResumeJobSkillScoreMapper.entityToResponse(s, jsMap.get(s.getJobSkillId())))
                .collect(Collectors.toList());
    }
}
