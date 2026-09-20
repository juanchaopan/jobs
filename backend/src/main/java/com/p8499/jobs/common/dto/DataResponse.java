package com.p8499.jobs.common.dto;

public class DataResponse<T> extends Response {

	private final T data;

	public DataResponse(T data) {
		super("data");
		this.data = data;
	}

	public T getData() {
		return data;
	}
}
