package com.p8499.jobs.common.dto;

public class ErrorResponse extends Response {

	private final String message;

	public ErrorResponse(String message) {
		super("error");
		this.message = message;
	}

	public String getMessage() {
		return message;
	}
}
