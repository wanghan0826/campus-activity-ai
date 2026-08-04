package com.xxx.campus.controller;

import com.xxx.campus.model.ImageGenerationRequest;
import com.xxx.campus.model.ImageGenerationResponse;
import com.xxx.campus.service.ImageGenerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/ai/images")
@RequiredArgsConstructor
public class ImageGenerationController {

    private final ImageGenerationService imageGenerationService;

    @PostMapping("/generate")
    public ResponseEntity<ImageGenerationResponse> generate(
            @Valid @RequestBody ImageGenerationRequest request) {
        return ResponseEntity.ok(imageGenerationService.generate(request.getPrompt()));
    }

    @GetMapping(value = "/{fileName}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<Resource> getImage(@PathVariable String fileName) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic())
                .contentType(MediaType.IMAGE_PNG)
                .body(imageGenerationService.loadImage(fileName));
    }
}
