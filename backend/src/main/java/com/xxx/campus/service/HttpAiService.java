package com.xxx.campus.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.campus.config.AiRuntimeSettings;
import com.xxx.campus.model.ActivityParsedResult;
import com.xxx.campus.prompt.ActivityPrompt;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * 第一阶段：直接 HTTP 调 Claude / DeepSeek API
 */
@Service
@ConditionalOnProperty(name = "ai.provider", havingValue = "http", matchIfMissing = true)
public class HttpAiService implements AiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final RelativeDateResolver relativeDateResolver;
    private final AiRuntimeSettings aiSettings;

    public HttpAiService(ObjectMapper objectMapper,
                         RelativeDateResolver relativeDateResolver,
                         AiRuntimeSettings aiSettings) {
        this.objectMapper = objectMapper;
        this.relativeDateResolver = relativeDateResolver;
        this.aiSettings = aiSettings;
        this.restClient = RestClient.builder()
                .baseUrl(aiSettings.getApiUrl())
                .build();
    }

    @Override
    public ActivityParsedResult parseActivity(String document) {
        if (!aiSettings.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "服务器尚未配置文字 AI，请联系管理员");
        }
        // 构建请求 body（兼容 Claude Messages API 和 DeepSeek Chat API）
        Map<String, Object> requestBody = buildRequestBody(document);

        // 发送请求（DeepSeek 用 Bearer Token）
        String response = restClient.post()
                .uri("")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + aiSettings.getApiKey())
                .body(requestBody)
                .retrieve()
                .body(String.class);

        // 提取 JSON 并反序列化
        return extractJson(response);
    }

    private Map<String, Object> buildRequestBody(String document) {
        String userMessage = "请根据以下活动文档提取信息：\n\n" + document;
        String dateContext = relativeDateResolver.buildPromptContext(document);

        return Map.of(
                "model", aiSettings.getModel(),
                "max_tokens", 4096,
                "messages", List.of(
                        Map.of("role", "system", "content", ActivityPrompt.buildSystemPrompt(dateContext)),
                        Map.of("role", "user", "content", userMessage)
                )
        );
    }

    /**
     * 从 AI 响应中提取 JSON —— 兼容 Claude / DeepSeek / GPT 的返回格式
     */
    private ActivityParsedResult extractJson(String responseBody) {
        try {
            // 通用格式：response.content[0].text
            Map<String, Object> responseMap = objectMapper.readValue(responseBody, Map.class);

            // 尝试多个可能的路径
            Object content = responseMap.get("content");
            String text = null;

            if (content instanceof List<?> list && !list.isEmpty()) {
                Object first = list.get(0);
                if (first instanceof Map<?, ?> m) {
                    text = (String) m.get("text");
                }
            } else if (content instanceof String s) {
                text = s;
            }

            // 也兼容 OpenAI/DeepSeek 格式: choices[0].message.content
            if (text == null && responseMap.containsKey("choices")) {
                List<?> choices = (List<?>) responseMap.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
                    Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
                    text = (String) message.get("content");
                }
            }

            if (text == null) {
                throw new RuntimeException("无法从 AI 响应中提取文本内容");
            }

            // 去掉可能的 markdown 代码块标记
            text = text.trim();
            if (text.startsWith("```json")) text = text.substring(7);
            if (text.startsWith("```")) text = text.substring(3);
            if (text.endsWith("```")) text = text.substring(0, text.length() - 3);
            text = text.trim();

            return objectMapper.readValue(text, ActivityParsedResult.class);

        } catch (Exception e) {
            throw new RuntimeException("AI 解析失败: " + e.getMessage(), e);
        }
    }
}
