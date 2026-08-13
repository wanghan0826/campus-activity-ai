package com.xxx.campus.service;

import com.xxx.campus.config.WeComProperties;
import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityNotificationTarget;
import com.xxx.campus.model.NotificationGroup;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WeComGroupNotificationService {

    private static final Logger log = LoggerFactory.getLogger(WeComGroupNotificationService.class);
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ActivityRepository activityRepository;
    private final NotificationGroupRepository groupRepository;
    private final WeComProperties properties;
    private final RestClient restClient = createRestClient();

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendPublishedActivity(ActivityPublishedEvent event) {
        Activity activity = activityRepository.findById(event.activityId()).orElse(null);
        if (activity == null || activity.getNotificationTargets() == null || activity.getNotificationTargets().isEmpty()) {
            return;
        }
        if (!properties.isGroupNotificationEnabled()) {
            complete(activity, 0, activity.getNotificationTargets().size(), List.of("服务器未启用群聊通知"));
            return;
        }

        int successCount = 0;
        int failedCount = 0;
        List<String> failures = new ArrayList<>();
        for (ActivityNotificationTarget target : activity.getNotificationTargets()) {
            NotificationGroup group = groupRepository.findById(target.getGroupId()).orElse(null);
            if (group == null || !Boolean.TRUE.equals(group.getEnabled())) {
                failedCount++;
                failures.add(target.getGroupName() + "（通知范围已停用）");
                continue;
            }
            DeliveryResult result = send(group, activity);
            if (result.success()) {
                successCount++;
            } else {
                failedCount++;
                failures.add(group.getName() + "（" + result.error() + "）");
            }
        }
        complete(activity, successCount, failedCount, failures);
    }

    @SuppressWarnings("unchecked")
    private DeliveryResult send(NotificationGroup group, Activity activity) {
        try {
            Map<String, Object> response = restClient.post()
                    .uri(group.getWebhookUrl())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "msgtype", "markdown",
                            "markdown", Map.of("content", buildContent(activity))
                    ))
                    .retrieve()
                    .body(Map.class);
            Object errcode = response == null ? null : response.get("errcode");
            boolean ok = errcode instanceof Number number && number.intValue() == 0;
            if (!ok) {
                log.warn("企微群 [{}] 通知失败: {}", group.getName(), response);
                return new DeliveryResult(false, apiError(response));
            }
            return new DeliveryResult(true, null);
        } catch (Exception exception) {
            log.warn("企微群 [{}] 通知异常: {}", group.getName(), exception.getMessage());
            return new DeliveryResult(false, "连接失败或超时");
        }
    }

    private void complete(Activity activity, int successCount, int failedCount, List<String> failures) {
        activity.setNotificationSentAt(java.time.LocalDateTime.now());
        activity.setNotificationDeliveryStatus(failedCount == 0 ? "SENT" : successCount == 0 ? "FAILED" : "PARTIAL");
        String summary;
        if (failedCount == 0) {
            summary = "已发送到 " + successCount + " 个群";
        } else {
            String failureDetail = String.join("、", failures);
            summary = "成功 " + successCount + " 个，失败 " + failedCount + " 个：" + failureDetail;
        }
        activity.setNotificationDeliverySummary(truncate(summary, 200));
        activityRepository.save(activity);
    }

    private String apiError(Map<String, Object> response) {
        if (response == null) return "企微未返回结果";
        Object message = response.get("errmsg");
        return message == null || message.toString().isBlank() ? "企微接口拒绝发送" : message.toString();
    }

    private String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength - 1) + "…";
    }

    private static RestClient createRestClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(8_000);
        requestFactory.setReadTimeout(12_000);
        return RestClient.builder().requestFactory(requestFactory).build();
    }

    private record DeliveryResult(boolean success, String error) {}

    private String buildContent(Activity activity) {
        StringBuilder content = new StringBuilder("### 📣 ")
                .append(markdownText(activity.getTitle(), "校园活动"));
        if (activity.getStartTime() != null) {
            content.append("\n> 时间：").append(activity.getStartTime().format(TIME_FORMAT));
        }
        if (activity.getLocation() != null && !activity.getLocation().isBlank()) {
            content.append("\n> 地点：").append(markdownText(activity.getLocation(), "待定"));
        }
        if (activity.getTargetAudience() != null && !activity.getTargetAudience().isBlank()) {
            content.append("\n> 面向：").append(markdownText(activity.getTargetAudience(), "全体师生"));
        }
        if (activity.getRegEndTime() != null) {
            content.append("\n> 报名截止：").append(activity.getRegEndTime().format(TIME_FORMAT));
        }
        String summary = markdownText(activity.getContent(), "");
        if (!summary.isBlank()) {
            content.append("\n\n").append(summary.length() > 220 ? summary.substring(0, 217) + "…" : summary);
        }
        String frontendUrl = properties.getFrontendUrl();
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            content.append("\n\n[查看活动并报名](").append(frontendUrl.trim()).append(")");
        }
        return content.length() > 3900 ? content.substring(0, 3897) + "…" : content.toString();
    }

    private String markdownText(String value, String fallback) {
        String normalized = value == null || value.isBlank() ? fallback : value.trim();
        return normalized.replace("<", "＜").replace(">", "＞");
    }
}
