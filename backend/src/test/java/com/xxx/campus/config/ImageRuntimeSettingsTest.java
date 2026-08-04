package com.xxx.campus.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImageRuntimeSettingsTest {

    @Test
    void shouldKeepImageKeyOnlyInMemory() {
        ImageRuntimeSettings settings = new ImageRuntimeSettings(
                "", "https://api.openai.com/v1/images/generations", "gpt-image-2");

        assertThat(settings.isConfigured()).isFalse();
        settings.update("image-key-12345678", "http://localhost:9999/images", "image-model");

        assertThat(settings.isConfigured()).isTrue();
        assertThat(settings.getMaskedKey()).isEqualTo("••••••••5678");
        assertThat(settings.getApiUrl()).isEqualTo("http://localhost:9999/images");
        assertThat(settings.getModel()).isEqualTo("image-model");

        settings.clearApiKey();
        assertThat(settings.isConfigured()).isFalse();
        assertThat(settings.getMaskedKey()).isNull();
    }
}
