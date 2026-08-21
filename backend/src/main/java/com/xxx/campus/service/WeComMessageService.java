package com.xxx.campus.service;

import com.xxx.campus.config.WeComProperties;
import com.xxx.campus.model.Activity;
import com.xxx.campus.model.UserAccount;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

/**
 * 企业微信应用消息通知服务。
 * 通过 textcard（文本卡片）消息向活动创建者发送状态通知。
 */
@Service
public class WeComMessageService {

    private static final Logger log = LoggerFactory.getLogger(WeComMessageService.class);

    private final WeComClient weComClient;
    private final WeComProperties properties;
    private final UserAccountRepository userAccountRepository;

    public WeComMessageService(WeComClient weComClient,
                               WeComProperties properties,
                               UserAccountRepository userAccountRepository) {
        this.weComClient = weComClient;
        this.properties = properties;
        this.userAccountRepository = userAccountRepository;
    }

    /**
     * 活动发布后通知创建者（含日程卡片）。
     */
    @Async
    public void notifyPublished(Activity activity) {
        if (!properties.isNotificationEnabled()) return;
        sendTextCard(
                activity.getCreatorId(),
                "📅 " + (activity.getTitle() != null ? activity.getTitle() : "新活动已发布"),
                buildCardDesc(activity),
                properties.getFrontendUrl() != null ? properties.getFrontendUrl() : ""
        );
    }

    /**
     * 活动提交审批后通知创建者。
     */
    @Async
    public void notifySubmitted(Activity activity) {
        if (!properties.isNotificationEnabled()) return;
        String msg = activity.getTitle() != null
                ? "「" + activity.getTitle() + "」已提交审批，请等待审核。"
                : "你的活动已提交审批，请等待审核。";
        sendTextMessage(activity.getCreatorId(), msg);
    }

    /**
     * 活动审批通过后通知创建者。
     */
    @Async
    public void notifyApproved(Activity activity) {
        if (!properties.isNotificationEnabled()) return;
        String msg = activity.getTitle() != null
                ? "「" + activity.getTitle() + "」审批已通过。"
                : "你的活动审批已通过。";
        sendTextMessage(activity.getCreatorId(), msg);
    }

    /**
     * 活动被驳回后通知创建者。
     */
    @Async
    public void notifyRejected(Activity activity, String reason) {
        if (!properties.isNotificationEnabled()) return;
        String desc = activity.getTitle() != null
                ? "「" + activity.getTitle() + "」已被驳回，请修改后重新提交。"
                : "你的活动已被驳回，请修改后重新提交。";
        if (reason != null && !reason.isBlank()) {
            desc += "\n驳回原因：" + reason;
        }
        sendTextMessage(activity.getCreatorId(), desc);
    }

    /** 报名提交后通知学生；先到先得直接确认成功，审核制提示等待审核。 */
    @Async
    public void notifyRegistrationCreated(Activity activity, String studentId, boolean approved) {
        if (!properties.isNotificationEnabled()) return;
        String title = activity.getTitle() == null ? "校园活动" : activity.getTitle();
        String status = approved ? "报名成功" : "报名申请已提交，等待发布人审核";
        sendTextCard(
                studentId,
                approved ? "✅ 报名成功" : "📝 报名申请已提交",
                "活动：" + title + "\n" + buildRegistrationDesc(activity, status),
                frontendUrl()
        );
    }

    /** 审核制报名通过后通知学生。 */
    @Async
    public void notifyRegistrationApproved(Activity activity, String studentId) {
        if (!properties.isNotificationEnabled()) return;
        String title = activity.getTitle() == null ? "校园活动" : activity.getTitle();
        sendTextCard(
                studentId,
                "✅ 报名审核通过",
                "活动：" + title + "\n" + buildRegistrationDesc(activity, "报名成功，请按时参加"),
                frontendUrl()
        );
    }

    /** 审核制报名驳回后通知学生，并附带原因。 */
    @Async
    public void notifyRegistrationRejected(Activity activity, String studentId, String reason) {
        if (!properties.isNotificationEnabled()) return;
        String title = activity.getTitle() == null ? "校园活动" : activity.getTitle();
        String content = "活动：" + title + "\n状态：报名未通过";
        if (reason != null && !reason.isBlank()) {
            content += "\n原因：" + reason.trim();
        }
        sendTextCard(studentId, "报名审核结果", content, frontendUrl());
    }

    /**
     * 发送文本消息。
     */
    private void sendTextMessage(String toUser, String content) {
        Optional<String> target = resolveWeComUserId(toUser);
        if (target.isEmpty()) return;
        Map<String, Object> body = Map.of(
                "touser", target.get(),
                "msgtype", "text",
                "agentid", Integer.parseInt(properties.getAgentId()),
                "text", Map.of("content", content)
        );
        weComClient.postQuietly("/cgi-bin/message/send", body, "发送通知消息");
    }

    private void sendTextCard(String toUser, String title, String desc, String url) {
        Optional<String> target = resolveWeComUserId(toUser);
        if (target.isEmpty()) return;
        Map<String, Object> body = Map.of(
                "touser", target.get(),
                "msgtype", "textcard",
                "agentid", Integer.parseInt(properties.getAgentId()),
                "textcard", Map.of(
                        "title", title,
                        "description", desc,
                        "url", url != null && !url.isBlank() ? url : "https://work.weixin.qq.com",
                        "btntxt", "查看详情"
                )
        );
        weComClient.postQuietly("/cgi-bin/message/send", body, "发送卡片通知");
    }

    private Optional<String> resolveWeComUserId(String systemUserId) {
        if (systemUserId == null || systemUserId.isBlank()) {
            log.warn("跳过企业微信通知：系统用户ID为空");
            return Optional.empty();
        }

        Optional<UserAccount> account = userAccountRepository.findByUserId(systemUserId);
        if (account.isPresent()) {
            String boundUserId = account.get().getWecomUserId();
            if (boundUserId != null && !boundUserId.isBlank()) {
                return Optional.of(boundUserId.trim());
            }
            if ("WECOM".equals(account.get().getAuthSource())
                    && account.get().getExternalSubject() != null
                    && !account.get().getExternalSubject().isBlank()) {
                return Optional.of(account.get().getExternalSubject().trim());
            }
        }

        Optional<String> configured = configuredBinding(systemUserId);
        if (configured.isPresent()) return configured;

        log.warn("跳过企业微信通知：系统用户 {} 尚未绑定企微UserId", systemUserId);
        return Optional.empty();
    }

    private Optional<String> configuredBinding(String systemUserId) {
        String bindings = properties.getUserBindings();
        if (bindings == null || bindings.isBlank()) return Optional.empty();
        return Arrays.stream(bindings.split("[,;]"))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .map(item -> item.split("=", 2))
                .filter(parts -> parts.length == 2 && systemUserId.equals(parts[0].trim()))
                .map(parts -> parts[1].trim())
                .filter(value -> !value.isBlank())
                .findFirst();
    }

    private String frontendUrl() {
        return properties.getFrontendUrl() != null ? properties.getFrontendUrl() : "";
    }

    private String buildRegistrationDesc(Activity activity, String status) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM-dd HH:mm");
        StringBuilder sb = new StringBuilder("状态：").append(status);
        if (activity.getStartTime() != null) {
            sb.append("\n时间：").append(activity.getStartTime().format(fmt));
        }
        if (activity.getLocation() != null && !activity.getLocation().isBlank()) {
            sb.append("\n地点：").append(activity.getLocation());
        }
        return sb.toString();
    }

    private String buildCardDesc(Activity activity) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM-dd HH:mm");
        StringBuilder sb = new StringBuilder();
        if (activity.getLocation() != null) {
            sb.append("📍 地点：").append(activity.getLocation()).append("\n");
        }
        if (activity.getStartTime() != null && activity.getEndTime() != null) {
            sb.append("🕐 时间：").append(activity.getStartTime().format(fmt))
                    .append(" — ").append(activity.getEndTime().format(fmt)).append("\n");
        }
        if (activity.getContactInfo() != null) {
            sb.append("📞 咨询：").append(activity.getContactInfo()).append("\n");
        }
        sb.append("\n状态：已发布 ✅");
        return sb.toString();
    }
}
