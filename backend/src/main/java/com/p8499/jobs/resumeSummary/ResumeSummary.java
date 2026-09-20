package com.p8499.jobs.resumeSummary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "resume_summaries")
public class ResumeSummary {

	@Id
	private Integer id;

	@Column(nullable = true, columnDefinition = "text")
	private String summary;

	protected ResumeSummary() {
	}

	public ResumeSummary(Integer id, String summary) {
		this.id = id;
		this.summary = summary;
	}

	public Integer getId() {
		return id;
	}

	public String getSummary() {
		return summary;
	}

	public void setSummary(String summary) {
		this.summary = summary;
	}
}
