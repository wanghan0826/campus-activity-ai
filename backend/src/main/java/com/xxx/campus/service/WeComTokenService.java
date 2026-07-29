package com.xxx.campus.service;

import com.xxx.campus.config.WeComProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 企业微信 access_token 管理 —— 内存缓存 + 定时刷新。
 * token 有效期 7200 秒，本类提前 300 秒（5 分钟）刷新。
 */
@Service
public class WeComTokenService {

    private static final Logger log = LoggerFactory.getLogger(WeComTokenService.class);

    private final RestClient restClient;
    private final WeComProperties properties;

    private volatile String accessToken;
    private volatile long expiresAtSec = 0;   // token 过期时刻（epoch 秒）
    private final ReentrantLock refreshLock = new ReentrantLock();

    public WeComTokenService(WeComProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.create();
    }

    /**
     * 获取当前有效的 access_token，必要时刷新。
     */
    public String getAccessToken() {
        if (isExpiringSoon()) {
            refreshToken();
        }
        if (accessToken == null) {
            throw new IllegalStateException("无法获取企业微信 access_token，请检查 corpid / secret 配置");
        }
        return accessToken;
    }

    /**
     * 判断 token 是否即将过期（距离过期不足 300 秒或已过期）。
     */
    private boolean isExpiringSoon() {
        return accessToken == null || Instant.now().getEpochSecond() >= (expiresAtSec - 300);
    }

    /**
     * 强制刷新 token，加锁防止并发重复刷新。
     */
    private void refreshToken() {
        if (!refreshLock.tryLock()) return; // 其他线程正在刷新，直接返回
        try {
            if (!isExpiringSoon()) return;   // 双重检查：锁拿到后可能已刷新

            String corpId = properties.getCorpId();
            String secret = properties.getSecret();
            if (corpId == null || corpId.isBlank() || secret == null || secret.isBlank()) {
                log.warn("企业微信 corpid/secret 未配置，跳过 token 刷新");
                return;
            }

            String url = properties.getBaseUrl() + "/cgi-bin/gettoken"
                    + "?corpid=" + corpId + "&corpsecret=" + secret;

            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(Map.class);

            if (resp == null || !Integer.valueOf(0).equals(resp.get("errcode"))) {
                String errMsg = resp == null ? "空响应" : String.valueOf(resp.get("errmsg"));
                log.error("获取企业微信 access_token 失败: {}", errMsg);
                throw new RuntimeException("获取企业微信 access_token 失败: " + errMsg);
            }

            this.accessToken = (String) resp.get("access_token");
            Integer expiresIn = (Integer) resp.get("expires_in");
            this.expiresAtSec = Instant.now().getEpochSecond() + (expiresIn != null ? expiresIn : 7200);
            log.info("企业微信 access_token 刷新成功，有效期至 {}", Instant.ofEpochSecond(expiresAtSec));
        } finally {
            refreshLock.unlock();
        }
    }

    /**
     * 每 100 分钟定时刷新一次，确保 token 永不过期。
     */
    @Scheduled(fixedRate = 100 * 60 * 1000)
    public void scheduledRefresh() {
        try {
            refreshToken();
        } catch (Exception e) {
            log.warn("企业微信 access_token 定时刷新失败（配置就绪前可忽略）: {}", e.getMessage());
        }
    }
}
