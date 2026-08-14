package com.xxx.campus.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 企业微信配置属性。
 * 对应 application.yml 中 wecom.* 配置块。
 */
@Data
@Component
@ConfigurationProperties(prefix = "wecom")
public class WeComProperties {

    /** 企业 ID */
    private String corpId;

    /** 应用 AgentID */
    private String agentId;

    /** 应用 Secret */
    private String secret;

    /** API 基础地址，默认 https://qyapi.weixin.qq.com */
    private String baseUrl = "https://qyapi.weixin.qq.com";

    /** 是否启用消息通知 */
    private boolean notificationEnabled = true;

    /** 是否启用日程同步 */
    private boolean calendarEnabled = true;

    /** 是否启用已发布活动的企微群机器人通知 */
    private boolean groupNotificationEnabled = true;

    /** 日程组织者的企业微信 userid */
    private String organizerUserid;

    /** 前端地址，用于卡片消息跳转 */
    private String frontendUrl;

    /** 是否在登录页启用企业微信网页授权 */
    private boolean oauthEnabled;

    /** 企业微信授权完成后返回的前端完整地址 */
    private String oauthRedirectUri;

    /** 企业微信网页授权范围 */
    private String oauthScope = "snsapi_base";
}
