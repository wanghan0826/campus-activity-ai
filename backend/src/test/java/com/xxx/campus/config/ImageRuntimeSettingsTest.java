package com.xxx.campus.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImageRuntimeSettingsTest {

    @Test
    void shouldKeepImageKeyOnlyInMemory() {
        ImageRuntimeSettings settings = new ImageRuntimeSettings(
                "", "https://ark.cn-beijing.volces.com/api/v3/images/generations", "doubao-seedream-5-0-260128");

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
