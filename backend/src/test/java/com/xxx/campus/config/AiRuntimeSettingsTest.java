package com.xxx.campus.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiRuntimeSettingsTest {

    @Test
    void shouldKeepKeyInMemoryAndOnlyExposeMaskedValue() {
        AiRuntimeSettings settings = new AiRuntimeSettings(
                "your-api-key", "https://api.deepseek.com/chat/completions", "deepseek-chat");
        assertThat(settings.isConfigured()).isFalse();

        settings.updateApiKey("example-key-12345678");

        assertThat(settings.isConfigured()).isTrue();
        assertThat(settings.getApiKey()).isEqualTo("example-key-12345678");
        assertThat(settings.getMaskedKey()).isEqualTo("••••••••5678");

        settings.clearApiKey();
        assertThat(settings.isConfigured()).isFalse();
        assertThat(settings.getMaskedKey()).isNull();
    }
}
