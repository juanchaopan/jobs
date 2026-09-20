package com.p8499.jobs.common.config;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

	public static final String RESUME_QUEUE = "resume";
	public static final String JOB_QUEUE = "job";
	public static final String QUESTION_QUEUE = "question";

	@Bean
	public Queue resumeQueue() {
		return new Queue(RESUME_QUEUE, true);
	}

	@Bean
	public Queue jobQueue() {
		return new Queue(JOB_QUEUE, true);
	}

	@Bean
	public Queue questionQueue() {
		return new Queue(QUESTION_QUEUE, true);
	}
}
