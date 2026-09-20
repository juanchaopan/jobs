package com.p8499.jobs.region;

import com.p8499.jobs.region.dto.RegionRequest;
import com.p8499.jobs.region.dto.RegionResponse;

public final class RegionMapper {

    private RegionMapper() {
    }

    public static Region requestToEntity(RegionRequest request) {
        return new Region(request.getName());
    }

    public static RegionResponse entityToResponse(Region region) {
        RegionResponse response = new RegionResponse();
        response.setId(region.getId());
        response.setName(region.getName());
        return response;
    }
}
