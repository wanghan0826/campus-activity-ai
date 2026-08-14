package com.xxx.campus.service;

import com.xxx.campus.config.WeComProperties;
import com.xxx.campus.model.LoginResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class WeComOAuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long STATE_VALID_MINUTES = 10;

    private final WeComProperties properties;
    private final WeComClient weComClient;
    private final AuthService authService;
    private final Map<String, Instant> pendingStates = new ConcurrentHashMap<>();

    public Map<String, Object> configView() {
        return Map.of("enabled", isConfigured());
    }

    public Map<String, String> createAuthorization() {
        ensureConfigured();
        Instant cutoff = Instant.now().minus(STATE_VALID_MINUTES, ChronoUnit.MINUTES);
        pendingStates.entrySet().removeIf(entry -> entry.getValue().isBefore(cutoff));

        byte[] stateBytes = new byte[24];
        SECURE_RANDOM.nextBytes(stateBytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(stateBytes);
        pendingStates.put(state, Instant.now());

        String url = "https://open.weixin.qq.com/connect/oauth2/authorize"
                + "?appid=" + encode(properties.getCorpId())
                + "&redirect_uri=" + encode(properties.getOauthRedirectUri())
                + "&response_type=code"
                + "&scope=" + encode(normalizedScope())
                + "&agentid=" + encode(properties.getAgentId())
                + "&state=" + encode(state)
                + "#wechat_redirect";

        Map<String, String> response = new LinkedHashMap<>();
        response.put("url", url);
        return response;
    }

    public LoginResponse exchange(String code, String state) {
        ensureConfigured();
        Instant createdAt = pendingStates.remove(state);
        if (createdAt == null || createdAt.isBefore(Instant.now().minus(STATE_VALID_MINUTES, ChronoUnit.MINUTES))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "登录请求已失效，请重新发起企业微信登录");
        }

        Map<String, Object> response;
        try {
            response = weComClient.get("/cgi-bin/user/getuserinfo?code=" + encode(code));
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "企业微信身份校验失败，请稍后重试");
        }
        Object errcode = response == null ? null : response.get("errcode");
        if (!(errcode instanceof Number number) || number.intValue() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "企业微信身份校验失败，请重新登录");
        }
        String userId = response.get("UserId") == null ? "" : String.valueOf(response.get("UserId")).trim();
        if (userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "当前账号不是该学校企业成员");
        }
        return authService.loginExternal("WECOM", userId);
    }

    private boolean isConfigured() {
        return properties.isOauthEnabled()
                && !isBlank(properties.getCorpId())
                && !isBlank(properties.getAgentId())
                && !isBlank(properties.getSecret())
                && !isBlank(properties.getOauthRedirectUri());
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "企业微信登录尚未配置完成");
        }
    }

    private String normalizedScope() {
        return isBlank(properties.getOauthScope()) ? "snsapi_base" : properties.getOauthScope().trim();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
