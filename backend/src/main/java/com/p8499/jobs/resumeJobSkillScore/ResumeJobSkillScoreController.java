package com.p8499.jobs.resumeJobSkillScore;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.p8499.jobs.common.dto.DataResponse;
import com.p8499.jobs.resumeJobSkillScore.dto.ResumeJobSkillScoreResponse;

@RestController
@RequestMapping("/api/resumeJobSkillScore")
public class ResumeJobSkillScoreController {

    private final ResumeJobSkillScoreService service;

    public ResumeJobSkillScoreController(ResumeJobSkillScoreService service) {
        this.service = service;
    }

    @GetMapping
    public DataResponse<List<ResumeJobSkillScoreResponse>> getByResumeIdAndJobId(@RequestParam("resumeId") Integer resumeId,
            @RequestParam("jobId") Integer jobId) {
        List<ResumeJobSkillScoreResponse> list = service.findByResumeIdAndJobId(resumeId, jobId);
        return new DataResponse<>(list);
    }
}
