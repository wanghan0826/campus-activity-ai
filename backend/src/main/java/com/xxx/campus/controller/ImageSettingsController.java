package com.xxx.campus.controller;

import com.xxx.campus.config.ImageRuntimeSettings;
import com.xxx.campus.model.ImageSettingsRequest;
import com.xxx.campus.model.ImageSettingsResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;

/** AI 生图接口的内存配置。永不返回 API Key 明文。 */
@RestController
@RequestMapping("/api/ai/image-settings")
@RequiredArgsConstructor
public class ImageSettingsController {

    private final ImageRuntimeSettings settings;

    @GetMapping
    public ResponseEntity<ImageSettingsResponse> getSettings() {
        return ResponseEntity.ok(toResponse());
    }

    @PutMapping
    public ResponseEntity<ImageSettingsResponse> updateSettings(
            @Valid @RequestBody ImageSettingsRequest request) {
        validateApiUrl(request.getApiUrl());
        settings.update(request.getApiKey(), request.getApiUrl(), request.getModel());
        return ResponseEntity.ok(toResponse());
    }

    @DeleteMapping
    public ResponseEntity<Void> clearSettings() {
        settings.clearApiKey();
        return ResponseEntity.noContent().build();
    }

    private ImageSettingsResponse toResponse() {
        return new ImageSettingsResponse(
                settings.isConfigured(),
                settings.getMaskedKey(),
                settings.getApiUrl(),
                settings.getModel()
        );
    }

    private void validateApiUrl(String value) {
        try {
            URI uri = URI.create(value.trim());
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入有效的 HTTP/HTTPS 生图接口地址");
        }
    }
}
