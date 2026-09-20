package com.p8499.jobs.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI jobsOpenAPI() {
		return new OpenAPI().info(new Info().title("Jobs API")
				.version("v1")
				.description("OpenAPI documentation for the Jobs service"));
	}
}