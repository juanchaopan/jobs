package com.p8499.jobs.resume;

import com.p8499.jobs.resume.dto.ResumeRequest;
import com.p8499.jobs.resume.dto.ResumeResponse;

public final class ResumeMapper {

	private ResumeMapper() {
	}

	public static Resume requestToEntity(ResumeRequest requestDto) {
		return new Resume(requestDto.getName(), null, null, requestDto.getNote());
	}

	public static ResumeResponse entityToResponse(Resume resume) {
		ResumeResponse responseDto = new ResumeResponse();
		responseDto.setId(resume.getId());
		responseDto.setName(resume.getName());
		responseDto.setExtension(resume.getExtension());
		responseDto.setNote(resume.getNote());
		return responseDto;
	}
}
