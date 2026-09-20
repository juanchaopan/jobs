package com.p8499.jobs.common.property;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ftp")
public record FtpProperties(String host, int port, String user, String password) {
}
