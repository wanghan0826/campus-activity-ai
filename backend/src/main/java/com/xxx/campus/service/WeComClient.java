package com.xxx.campus.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * 企业微信 API 通用客户端。
 * 封装 GET / POST 请求，自动附带 access_token，统一处理错误响应。
 */
@Service
public class WeComClient {

    private static final Logger log = LoggerFactory.getLogger(WeComClient.class);

    private final RestClient restClient;
    private final WeComTokenService tokenService;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    public WeComClient(WeComTokenService tokenService,
                       com.xxx.campus.config.WeComProperties properties,
                       ObjectMapper objectMapper) {
        this.tokenService = tokenService;
        this.objectMapper = objectMapper;
        this.baseUrl = properties.getBaseUrl();
        this.restClient = RestClient.create();
    }

    /**
     * GET 请求，自动拼接 access_token。
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String path) {
        String url = baseUrl + path + (path.contains("?") ? "&" : "?") + "access_token=" + tokenService.getAccessToken();
        log.debug("WeCom GET: {}", path);
        return restClient.get()
                .uri(url)
                .retrieve()
                .body(Map.class);
    }

    /**
     * POST 请求，自动拼接 access_token。
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> post(String path, Object body) {
        String url = baseUrl + path + "?access_token=" + tokenService.getAccessToken();
        log.debug("WeCom POST: {}", path);
        return restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);
    }

    /**
     * POST 请求，成功返回 true，失败记录日志并返回 false。
     * 用于通知、日程等不应阻塞主流程的调用。
     */
    public boolean postQuietly(String path, Object body, String actionName) {
        try {
            Map<String, Object> resp = post(path, body);
            Object errcode = resp.get("errcode");
            if (errcode != null && Integer.valueOf(0).equals(errcode)) {
                log.info("企业微信 {} 成功", actionName);
                return true;
            }
            log.error("企业微信 {} 失败: errcode={}, errmsg={}", actionName, errcode, resp.get("errmsg"));
            return false;
        } catch (Exception e) {
            log.error("企业微信 {} 调用异常: {}", actionName, e.getMessage(), e);
            return false;
        }
    }
}
