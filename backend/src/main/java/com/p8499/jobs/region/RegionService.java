package com.p8499.jobs.region;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RegionService {

    private final RegionRepository regionRepository;

    public RegionService(RegionRepository regionRepository) {
        this.regionRepository = regionRepository;
    }

    public List<Region> findAll() {
        return regionRepository.findAll();
    }

    public Region findById(Integer id) {
        return regionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Region not found"));
    }

    public Region create(Region region) {
        return regionRepository.save(region);
    }

    public Region update(Integer id, Region updatedRegion) {
        Region existing = findById(id);
        existing.setName(updatedRegion.getName());
        return regionRepository.save(existing);
    }

    public void delete(Integer id) {
        if (!regionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Region not found");
        }
        regionRepository.deleteById(id);
    }
}
