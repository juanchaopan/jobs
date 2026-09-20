package com.p8499.jobs.title;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.p8499.jobs.common.dto.DataResponse;
import com.p8499.jobs.title.dto.TitleRequest;
import com.p8499.jobs.title.dto.TitleResponse;

@RestController
@RequestMapping("/api/titles")
@Validated
public class TitleController {

    private final TitleService titleService;

    public TitleController(TitleService titleService) {
        this.titleService = titleService;
    }

    @GetMapping
    public DataResponse<List<TitleResponse>> getAllTitles() {
        List<TitleResponse> list = titleService.findAll().stream()
                .map(TitleMapper::entityToResponse)
                .collect(Collectors.toList());
        return new DataResponse<>(list);
    }

    @GetMapping("/{id}")
    public DataResponse<TitleResponse> getTitleById(@PathVariable("id") Integer id) {
        Title title = titleService.findById(id);
        return new DataResponse<>(TitleMapper.entityToResponse(title));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DataResponse<TitleResponse> createTitle(@Valid @RequestBody TitleRequest request) {
        Title created = titleService.create(TitleMapper.requestToEntity(request));
        return new DataResponse<>(TitleMapper.entityToResponse(created));
    }

    @PutMapping("/{id}")
    public DataResponse<TitleResponse> updateTitle(@PathVariable("id") Integer id,
            @Valid @RequestBody TitleRequest request) {
        Title updated = titleService.update(id, TitleMapper.requestToEntity(request));
        return new DataResponse<>(TitleMapper.entityToResponse(updated));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTitle(@PathVariable("id") Integer id) {
        titleService.delete(id);
    }
}
