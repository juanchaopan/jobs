package com.p8499.jobs.resume;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.p8499.jobs.common.config.RabbitConfig;
import com.p8499.jobs.common.service.FtpStorageService;

@Service
public class ResumeService {

	private final ResumeRepository resumeRepository;
	private final RabbitTemplate rabbitTemplate;
	private final FtpStorageService ftpStorageService;

	public ResumeService(ResumeRepository resumeRepository, RabbitTemplate rabbitTemplate,
			FtpStorageService ftpStorageService) {
		this.resumeRepository = resumeRepository;
		this.rabbitTemplate = rabbitTemplate;
		this.ftpStorageService = ftpStorageService;
	}

	public List<Resume> findAll() {
		return resumeRepository.findAllByOrderByIdAsc();
	}

	public Resume findById(Integer id) {
		return resumeRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resume not found"));
	}

	public Resume create(Resume resume) {
		return resumeRepository.save(resume);
	}

	public Resume update(Integer id, Resume updatedResume) {
		Resume existingResume = findById(id);
		existingResume.setName(updatedResume.getName());
		existingResume.setNote(updatedResume.getNote());
		return resumeRepository.save(existingResume);
	}

	public Resume updateContent(Integer id, MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resume file is required");
		}

		byte[] content;
		try {
			content = file.getBytes();
		} catch (IOException ex) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read resume file");
		}

		Resume existingResume = findById(id);
		existingResume.setContent(content);

		String extension = extractExtensionFromOriginalFilename(file);
		if (extension == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Uploaded file must include an extension in its original filename");
		}
		existingResume.setExtension(extension);
		Resume saved = resumeRepository.save(existingResume);
		ftpStorageService.upload(saved.getId() + "." + saved.getExtension(), saved.getContent());
		String payload = String.format("{\"type\":\"add.content\",\"value\":{\"resumeId\":%s}}", saved.getId());
		rabbitTemplate.convertAndSend(RabbitConfig.RESUME_QUEUE, payload);
		return saved;
	}

	private String extractExtensionFromOriginalFilename(MultipartFile file) {
		String originalFilename = file.getOriginalFilename();
		if (originalFilename != null) {
			int dotIndex = originalFilename.lastIndexOf('.');
			if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
				return originalFilename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
			}
		}

		return null;
	}

	public byte[] getContent(Integer id) {
		Resume resume = findById(id);
		if (resume.getContent() == null || resume.getContent().length == 0) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resume content not found");
		}
		return resume.getContent();
	}

	public void delete(Integer id) {
		if (!resumeRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resume not found");
		}
		resumeRepository.deleteById(id);
		String payload = String.format("{\"type\":\"delete\",\"value\":{\"resumeId\":%s}}", id);
		rabbitTemplate.convertAndSend(RabbitConfig.RESUME_QUEUE, payload);
	}
}
