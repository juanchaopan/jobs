package com.p8499.jobs.jobSkill;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.p8499.jobs.common.dto.DataResponse;
import com.p8499.jobs.jobSkill.dto.JobSkillResponse;

@RestController
@RequestMapping("/api/job-skills")
public class JobSkillController {

    private final JobSkillService jobSkillService;

    public JobSkillController(JobSkillService jobSkillService) {
        this.jobSkillService = jobSkillService;
    }

    @GetMapping
    public DataResponse<List<JobSkillResponse>> getByJobId(@RequestParam("jobId") Integer jobId) {
        List<JobSkillResponse> list = jobSkillService.findByJobId(jobId).stream()
                .map(JobSkillMapper::entityToResponse)
                .collect(Collectors.toList());
        return new DataResponse<>(list);
    }
}
