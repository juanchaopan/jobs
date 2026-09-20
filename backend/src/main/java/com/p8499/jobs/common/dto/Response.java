package com.p8499.jobs.common.dto;

public class Response {

	private final String type;

	protected Response(String type) {
		this.type = type;
	}

	public String getType() {
		return type;
	}
}
