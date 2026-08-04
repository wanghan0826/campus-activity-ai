package com.xxx.campus.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** AI 生图配置。API Key 仅保存在当前后端进程内存中。 */
@Component
public class ImageRuntimeSettings {

    private volatile String apiKey;
    private volatile String apiUrl;
    private volatile String model;

    public ImageRuntimeSettings(@Value("${ai.image.api-key:}") String apiKey,
                                @Value("${ai.image.api-url:https://ark.cn-beijing.volces.com/api/v3/images/generations}") String apiUrl,
                                @Value("${ai.image.model:doubao-seedream-4-0-250828}") String model) {
        this.apiKey = normalize(apiKey);
        this.apiUrl = normalize(apiUrl);
        this.model = normalize(model);
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
        return isUsableKey(apiKey) && apiUrl != null && model != null;
    }

    public String getMaskedKey() {
        if (!isUsableKey(apiKey)) return null;
        int visibleLength = Math.min(4, apiKey.length());
        return "••••••••" + apiKey.substring(apiKey.length() - visibleLength);
    }

    public void update(String newApiKey, String newApiUrl, String newModel) {
        this.apiKey = normalize(newApiKey);
        this.apiUrl = normalize(newApiUrl);
        this.model = normalize(newModel);
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
