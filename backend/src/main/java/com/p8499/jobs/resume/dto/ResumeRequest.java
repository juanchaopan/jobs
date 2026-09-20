package com.p8499.jobs.resume.dto;

import jakarta.validation.constraints.NotBlank;

public class ResumeRequest {

	@NotBlank
	private String name;
	@NotBlank
	private String note;

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}
}
