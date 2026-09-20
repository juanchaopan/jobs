package com.p8499.jobs.resumeSummary;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.p8499.jobs.common.dto.DataResponse;
import com.p8499.jobs.resumeSummary.dto.ResumeSummaryResponse;

@RestController
@RequestMapping("/api/resume-summaries")
public class ResumeSummaryController {

    private final ResumeSummaryService resumeSummaryService;

    public ResumeSummaryController(ResumeSummaryService resumeSummaryService) {
        this.resumeSummaryService = resumeSummaryService;
    }

    @GetMapping("/{id}")
    public DataResponse<ResumeSummaryResponse> getById(@PathVariable("id") Integer id) {
        ResumeSummary resumeSummary = resumeSummaryService.findById(id);
        return new DataResponse<>(ResumeSummaryMapper.entityToResponse(resumeSummary));
    }
}
