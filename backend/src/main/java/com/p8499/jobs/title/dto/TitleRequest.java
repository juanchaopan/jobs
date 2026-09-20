package com.p8499.jobs.title.dto;

import jakarta.validation.constraints.NotBlank;

public class TitleRequest {

    @NotBlank
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
