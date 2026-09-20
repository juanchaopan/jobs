package com.p8499.jobs.job;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.p8499.jobs.common.dto.DataResponse;
import com.p8499.jobs.job.dto.JobResponse;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @ApiResponse(headers = {
            @Header(name = "X-Total-Count", schema = @Schema(type = "integer", format = "int64")),
            @Header(name = "Link", schema = @Schema(type = "string"))
    })
    @GetMapping
    public ResponseEntity<DataResponse<List<JobResponse>>> queryJobs(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        var pageResult = jobService.findAllPaged(page, size);
        List<JobResponse> list = pageResult.getContent().stream()
                .map(JobMapper::entityToResponse)
                .collect(Collectors.toList());

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Total-Count", String.valueOf(pageResult.getTotalElements()));

        StringBuilder link = new StringBuilder();
        String baseUri = ServletUriComponentsBuilder.fromCurrentRequest().replaceQueryParam("page")
                .replaceQueryParam("size").toUriString();
        int totalPages = pageResult.getTotalPages();
        if (totalPages > 0) {
            // first
            link.append("<").append(baseUri).append("?page=0&size=").append(size).append(">; rel=\"first\"");
            // prev
            if (page > 0) {
                link.append(", <").append(baseUri).append("?page=").append(page - 1).append("&size=").append(size)
                        .append(">; rel=\"prev\"");
            }
            // next
            if (page < totalPages - 1) {
                link.append(", <").append(baseUri).append("?page=").append(page + 1).append("&size=").append(size)
                        .append(">; rel=\"next\"");
            }
            // last
            link.append(", <").append(baseUri).append("?page=").append(Math.max(0, totalPages - 1)).append("&size=")
                    .append(size).append(">; rel=\"last\"");
        }

        if (link.length() > 0) {
            headers.add(HttpHeaders.LINK, link.toString());
        }

        DataResponse<List<JobResponse>> body = new DataResponse<>(list);
        return ResponseEntity.ok().headers(headers).body(body);
    }

    @GetMapping("/{id}")
    public DataResponse<JobResponse> getJobById(@PathVariable("id") Integer id) {
        Job job = jobService.findById(id);
        return new DataResponse<>(JobMapper.entityToResponse(job));
    }

    @PostMapping("/dispatch")
    public DataResponse<Integer> dispatch() {
        return new DataResponse<>(jobService.dispatch());
    }
}
