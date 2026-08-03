package com.xxx.campus.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * AI 运行时配置。API Key 只保存在当前后端进程内存中，不写入数据库或日志。
 */
@Component
public class AiRuntimeSettings {

    private final String apiUrl;
    private final String model;
    private volatile String apiKey;

    public AiRuntimeSettings(@Value("${ai.api-key:}") String apiKey,
                             @Value("${ai.api-url}") String apiUrl,
                             @Value("${ai.model}") String model) {
        this.apiKey = normalize(apiKey);
        this.apiUrl = apiUrl;
        this.model = model;
    }

    public String getApiKey() {
        return apiKey;
    }

    public String getApiUrl() {
        return apiUrl;
    }

    public String getModel() {
        return model;
    }

    public boolean isConfigured() {
        return isUsableKey(apiKey);
    }

    public String getMaskedKey() {
        if (!isConfigured()) return null;
        int visibleLength = Math.min(4, apiKey.length());
        return "••••••••" + apiKey.substring(apiKey.length() - visibleLength);
    }

    public void updateApiKey(String newApiKey) {
        this.apiKey = normalize(newApiKey);
    }

    public void clearApiKey() {
        this.apiKey = null;
    }

    private boolean isUsableKey(String value) {
        return value != null
                && !value.isBlank()
                && !"your-api-key".equalsIgnoreCase(value)
                && !"test-key".equalsIgnoreCase(value);
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
