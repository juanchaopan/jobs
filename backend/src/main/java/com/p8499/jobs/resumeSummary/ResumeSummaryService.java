package com.p8499.jobs.resumeSummary;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ResumeSummaryService {

    private final ResumeSummaryRepository resumeSummaryRepository;

    public ResumeSummaryService(ResumeSummaryRepository resumeSummaryRepository) {
        this.resumeSummaryRepository = resumeSummaryRepository;
    }

    public ResumeSummary findById(Integer id) {
        return resumeSummaryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resume summary not found"));
    }
}
