package com.p8499.jobs.resume;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;

import com.p8499.jobs.common.dto.DataResponse;
import com.p8499.jobs.resume.dto.ResumeRequest;
import com.p8499.jobs.resume.dto.ResumeResponse;

@RestController
@RequestMapping("/api/resumes")
@Validated
public class ResumeController {

	private final ResumeService resumeService;

	public ResumeController(ResumeService resumeService) {
		this.resumeService = resumeService;
	}

	@GetMapping
	public DataResponse<List<ResumeResponse>> getAllResumes() {
		List<ResumeResponse> resumes = resumeService.findAll().stream()
				.map(ResumeMapper::entityToResponse)
				.collect(Collectors.toList());
		return new DataResponse<>(resumes);
	}

	@GetMapping("/{id}")
	public DataResponse<ResumeResponse> getResumeById(@PathVariable("id") Integer id) {
		Resume resume = resumeService.findById(id);
		return new DataResponse<>(ResumeMapper.entityToResponse(resume));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public DataResponse<ResumeResponse> createResume(@Valid @RequestBody ResumeRequest resumeRequestDto) {
		Resume createdResume = resumeService.create(ResumeMapper.requestToEntity(resumeRequestDto));
		return new DataResponse<>(ResumeMapper.entityToResponse(createdResume));
	}

	@PutMapping("/{id}")
	public DataResponse<ResumeResponse> updateResume(@PathVariable("id") Integer id, @Valid @RequestBody ResumeRequest resumeRequestDto) {
		Resume updatedResume = resumeService.update(id, ResumeMapper.requestToEntity(resumeRequestDto));
		return new DataResponse<>(ResumeMapper.entityToResponse(updatedResume));
	}

	@PutMapping(value = "/{id}/content", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public DataResponse<ResumeResponse> updateResumeContent(@PathVariable("id") Integer id,
			@RequestPart("file") MultipartFile file) {
		Resume updatedResume = resumeService.updateContent(id, file);
		return new DataResponse<>(ResumeMapper.entityToResponse(updatedResume));
	}

	@GetMapping("/{id}/content")
	public ResponseEntity<Resource> getResumeContent(@PathVariable("id") Integer id) {
		Resume resume = resumeService.findById(id);
		byte[] content = resumeService.getContent(id);
		String extension = resume.getExtension() == null ? "" : resume.getExtension().trim();
		String filename = extension.isEmpty() ? resume.getName() : resume.getName() + "." + extension;

		return ResponseEntity.ok()
				.contentType(MediaType.APPLICATION_OCTET_STREAM)
				.header(HttpHeaders.CONTENT_DISPOSITION,
						ContentDisposition.attachment().filename(filename).build().toString())
				.contentLength(content.length)
				.body(new ByteArrayResource(content));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteResume(@PathVariable("id") Integer id) {
		resumeService.delete(id);
	}
}
