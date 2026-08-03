package com.xxx.campus.controller;

import com.xxx.campus.config.AiRuntimeSettings;
import com.xxx.campus.model.AiSettingsRequest;
import com.xxx.campus.model.AiSettingsResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** 本地原型使用的 AI Key 内存配置接口。永不返回 Key 明文。 */
@RestController
@RequestMapping("/api/ai/settings")
@RequiredArgsConstructor
public class AiSettingsController {

    private final AiRuntimeSettings settings;

    @GetMapping
    public ResponseEntity<AiSettingsResponse> getSettings() {
        return ResponseEntity.ok(toResponse());
    }

    @PutMapping
    public ResponseEntity<AiSettingsResponse> updateSettings(
            @Valid @RequestBody AiSettingsRequest request) {
        settings.updateApiKey(request.getApiKey());
        return ResponseEntity.ok(toResponse());
    }

    @DeleteMapping
    public ResponseEntity<Void> clearSettings() {
        settings.clearApiKey();
        return ResponseEntity.noContent().build();
    }

    private AiSettingsResponse toResponse() {
        return new AiSettingsResponse(
                settings.isConfigured(),
                settings.getMaskedKey(),
                "DeepSeek / OpenAI-compatible",
                settings.getModel()
        );
    }
}
