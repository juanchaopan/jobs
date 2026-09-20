package com.p8499.jobs.job;

import java.util.List;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.p8499.jobs.common.config.RabbitConfig;
import com.p8499.jobs.region.Region;
import com.p8499.jobs.region.RegionRepository;
import com.p8499.jobs.title.Title;
import com.p8499.jobs.title.TitleRepository;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final TitleRepository titleRepository;
    private final RegionRepository regionRepository;
    private final RabbitTemplate rabbitTemplate;

    public JobService(JobRepository jobRepository, TitleRepository titleRepository,
            RegionRepository regionRepository, RabbitTemplate rabbitTemplate) {
        this.jobRepository = jobRepository;
        this.titleRepository = titleRepository;
        this.regionRepository = regionRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public int dispatch() {
        List<Title> titles = titleRepository.findAll();
        List<Region> regions = regionRepository.findAll();
        for (Title title : titles) {
            for (Region region : regions) {
                String payload = String.format("{\"type\":\"add\",\"value\":{\"titleId\":%d,\"regionId\":%d}}",
                        title.getId(), region.getId());
                rabbitTemplate.convertAndSend(RabbitConfig.JOB_QUEUE, payload);
            }
        }
        return titles.size() * regions.size();
    }

    public Page<Job> findAllPaged(int page, int size) {
        return jobRepository.findAll(PageRequest.of(page, size));
    }

    public Job findById(Integer id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }
}
