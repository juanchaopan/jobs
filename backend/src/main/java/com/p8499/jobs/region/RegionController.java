package com.p8499.jobs.region;

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
import com.p8499.jobs.region.dto.RegionRequest;
import com.p8499.jobs.region.dto.RegionResponse;

@RestController
@RequestMapping("/api/regions")
@Validated
public class RegionController {

    private final RegionService regionService;

    public RegionController(RegionService regionService) {
        this.regionService = regionService;
    }

    @GetMapping
    public DataResponse<List<RegionResponse>> getAllRegions() {
        List<RegionResponse> regions = regionService.findAll().stream()
                .map(RegionMapper::entityToResponse)
                .collect(Collectors.toList());
        return new DataResponse<>(regions);
    }

    @GetMapping("/{id}")
    public DataResponse<RegionResponse> getRegionById(@PathVariable("id") Integer id) {
        Region region = regionService.findById(id);
        return new DataResponse<>(RegionMapper.entityToResponse(region));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DataResponse<RegionResponse> createRegion(@Valid @RequestBody RegionRequest request) {
        Region created = regionService.create(RegionMapper.requestToEntity(request));
        return new DataResponse<>(RegionMapper.entityToResponse(created));
    }

    @PutMapping("/{id}")
    public DataResponse<RegionResponse> updateRegion(@PathVariable("id") Integer id,
            @Valid @RequestBody RegionRequest request) {
        Region updated = regionService.update(id, RegionMapper.requestToEntity(request));
        return new DataResponse<>(RegionMapper.entityToResponse(updated));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRegion(@PathVariable("id") Integer id) {
        regionService.delete(id);
    }
}
