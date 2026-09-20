package com.p8499.jobs.common.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;

import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.p8499.jobs.common.property.FtpProperties;

@Service
public class FtpStorageService {

	private final FtpProperties ftpProperties;

	public FtpStorageService(FtpProperties ftpProperties) {
		this.ftpProperties = ftpProperties;
	}

	public void upload(String filename, byte[] content) {
		System.out.println("[FTP] connecting to " + ftpProperties.host() + ":" + ftpProperties.port());
		FTPClient ftp = new FTPClient();
		try {
			ftp.connect(ftpProperties.host(), ftpProperties.port());
			System.out.println("[FTP] connect reply: " + ftp.getReplyString().trim());
			boolean loggedIn = ftp.login(ftpProperties.user(), ftpProperties.password());
			System.out.println("[FTP] login success=" + loggedIn + " reply: " + ftp.getReplyString().trim());
			ftp.setFileType(FTP.BINARY_FILE_TYPE);
			ftp.enterLocalPassiveMode();
			System.out.println("[FTP] storing file: " + filename);
			boolean stored = ftp.storeFile(filename, new ByteArrayInputStream(content));
			System.out.println("[FTP] stored=" + stored + " reply: " + ftp.getReplyString().trim());
			if (!stored) {
				throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload resume to FTP");
			}
		} catch (ResponseStatusException ex) {
			throw ex;
		} catch (IOException ex) {
			System.out.println("[FTP] IOException: " + ex.getClass().getName() + ": " + ex.getMessage());
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "FTP upload error: " + ex.getMessage());
		} finally {
			if (ftp.isConnected()) {
				try {
					ftp.logout();
					ftp.disconnect();
				} catch (IOException ignored) {
				}
			}
		}
	}
}
