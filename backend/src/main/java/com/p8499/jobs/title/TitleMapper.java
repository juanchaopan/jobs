package com.p8499.jobs.title;

import com.p8499.jobs.title.dto.TitleRequest;
import com.p8499.jobs.title.dto.TitleResponse;

public final class TitleMapper {

    private TitleMapper() {
    }

    public static Title requestToEntity(TitleRequest request) {
        return new Title(request.getName());
    }

    public static TitleResponse entityToResponse(Title title) {
        TitleResponse response = new TitleResponse();
        response.setId(title.getId());
        response.setName(title.getName());
        return response;
    }
}
