package com.p8499.jobs.resumeSummary;

import com.p8499.jobs.resumeSummary.dto.ResumeSummaryResponse;

public final class ResumeSummaryMapper {

    private ResumeSummaryMapper() {
    }

    public static ResumeSummaryResponse entityToResponse(ResumeSummary s) {
        ResumeSummaryResponse r = new ResumeSummaryResponse();
        r.setId(s.getId());
        r.setSummary(s.getSummary());
        return r;
    }
}
