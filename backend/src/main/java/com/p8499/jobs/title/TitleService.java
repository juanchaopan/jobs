package com.p8499.jobs.title;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TitleService {

    private final TitleRepository titleRepository;

    public TitleService(TitleRepository titleRepository) {
        this.titleRepository = titleRepository;
    }

    public List<Title> findAll() {
        return titleRepository.findAll();
    }

    public Title findById(Integer id) {
        return titleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Title not found"));
    }

    public Title create(Title title) {
        return titleRepository.save(title);
    }

    public Title update(Integer id, Title updated) {
        Title existing = findById(id);
        existing.setName(updated.getName());
        return titleRepository.save(existing);
    }

    public void delete(Integer id) {
        if (!titleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Title not found");
        }
        titleRepository.deleteById(id);
    }
}
