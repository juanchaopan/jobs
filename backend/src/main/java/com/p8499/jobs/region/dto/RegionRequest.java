package com.p8499.jobs.region.dto;

import jakarta.validation.constraints.NotBlank;

public class RegionRequest {

    @NotBlank
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
