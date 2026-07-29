package com.xxx.campus.service;

import com.xxx.campus.config.WeComProperties;
import com.xxx.campus.model.Activity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * 企业微信应用消息通知服务。
 * 通过 textcard（文本卡片）消息向活动创建者发送状态通知。
 */
@Service
public class WeComMessageService {

    private static final Logger log = LoggerFactory.getLogger(WeComMessageService.class);

    private final WeComClient weComClient;
    private final WeComProperties properties;

    public WeComMessageService(WeComClient weComClient, WeComProperties properties) {
        this.weComClient = weComClient;
        this.properties = properties;
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

    /**
     * 发送文本消息。
     */
    private void sendTextMessage(String toUser, String content) {
        // OAuth 接入前，测试用户发 @all
        String target = (toUser == null || "test_teacher_001".equals(toUser)) ? "@all" : toUser;
        Map<String, Object> body = Map.of(
                "touser", target,
                "msgtype", "text",
                "agentid", Integer.parseInt(properties.getAgentId()),
                "text", Map.of("content", content)
        );
        weComClient.postQuietly("/cgi-bin/message/send", body, "发送通知消息");
    }

    private void sendTextCard(String toUser, String title, String desc, String url) {
        String target = (toUser == null || "test_teacher_001".equals(toUser)) ? "@all" : toUser;
        Map<String, Object> body = Map.of(
                "touser", target,
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
