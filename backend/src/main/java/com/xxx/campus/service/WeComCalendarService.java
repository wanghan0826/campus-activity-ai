package com.xxx.campus.service;

import com.xxx.campus.config.WeComProperties;
import com.xxx.campus.model.Activity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 企业微信日程同步服务。
 * 使用 /cgi-bin/oa/schedule/* 接口创建 / 更新 / 删除日程。
 */
@Service
public class WeComCalendarService {

    private static final Logger log = LoggerFactory.getLogger(WeComCalendarService.class);

    private final WeComClient weComClient;
    private final WeComProperties properties;

    public WeComCalendarService(WeComClient weComClient, WeComProperties properties) {
        this.weComClient = weComClient;
        this.properties = properties;
    }

    /**
     * 创建日程，返回 schedule_id。
     */
    public String createSchedule(Activity activity) {
        if (!properties.isCalendarEnabled()) return null;
        if (activity.getStartTime() == null || activity.getEndTime() == null) {
            log.warn("活动 [{}] 缺少时间，跳过日程创建", activity.getId());
            return null;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("schedule", buildSchedule(activity));
        body.put("agentid", Integer.parseInt(properties.getAgentId()));

        Map<String, Object> resp = weComClient.post("/cgi-bin/oa/schedule/add", body);

        if (resp != null && Integer.valueOf(0).equals(resp.get("errcode"))) {
            String scheduleId = (String) resp.get("schedule_id");
            log.info("活动 [{}] 日程创建成功，schedule_id={}", activity.getId(), scheduleId);
            return scheduleId;
        }
        log.error("活动 [{}] 日程创建失败: {}", activity.getId(),
                resp != null ? resp.get("errmsg") : "空响应");
        return null;
    }

    /**
     * 更新日程。
     */
    @Async
    public void updateSchedule(Activity activity) {
        if (!properties.isCalendarEnabled()) return;
        String scheduleId = activity.getCalendarEventId();
        if (scheduleId == null || scheduleId.isBlank()) {
            String newId = createSchedule(activity);
            if (newId != null) {
                activity.setCalendarEventId(newId);
            }
            return;
        }

        Map<String, Object> schedule = buildSchedule(activity);
        schedule.put("schedule_id", scheduleId);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("schedule", schedule);
        body.put("agentid", Integer.parseInt(properties.getAgentId()));

        weComClient.postQuietly("/cgi-bin/oa/schedule/update", body, "更新日程");
    }

    /**
     * 删除日程。
     */
    @Async
    public void deleteSchedule(Activity activity) {
        if (!properties.isCalendarEnabled()) return;
        String scheduleId = activity.getCalendarEventId();
        if (scheduleId == null || scheduleId.isBlank()) return;

        Map<String, Object> body = Map.of("schedule_id", scheduleId);
        boolean ok = weComClient.postQuietly("/cgi-bin/oa/schedule/del", body, "删除日程");
        if (ok) {
            activity.setCalendarEventId(null);
        }
    }

    private Map<String, Object> buildSchedule(Activity activity) {
        Map<String, Object> schedule = new LinkedHashMap<>();

        // 管理员（组织者）
        String admin = resolveOrganizer(activity.getCreatorId());
        schedule.put("admins", List.of(admin));

        // 参与人
        schedule.put("attendees", List.of(Map.of("userid", admin)));

        // 标题
        schedule.put("summary", activity.getTitle() != null ? activity.getTitle() : "校园活动");

        // 描述
        StringBuilder desc = new StringBuilder();
        if (activity.getContent() != null) desc.append(activity.getContent());
        if (activity.getLocation() != null) desc.append("\n地点：").append(activity.getLocation());
        if (activity.getContactInfo() != null) desc.append("\n咨询：").append(activity.getContactInfo());
        String descStr = desc.toString();
        schedule.put("description", descStr.length() > 1000 ? descStr.substring(0, 997) + "..." : descStr);

        // 时间 —— Unix 时间戳
        schedule.put("start_time", activity.getStartTime()
                .atZone(ZoneId.of("Asia/Shanghai")).toEpochSecond());
        schedule.put("end_time", activity.getEndTime()
                .atZone(ZoneId.of("Asia/Shanghai")).toEpochSecond());

        // 地点
        if (activity.getLocation() != null) {
            schedule.put("location", activity.getLocation());
        }

        // 提醒（提前15分钟）
        schedule.put("reminders", Map.of(
                "is_remind", 1,
                "remind_before_event_secs", 900
        ));

        return schedule;
    }

    private String resolveOrganizer(String creatorId) {
        String configured = properties.getOrganizerUserid();
        if (configured != null && !configured.isBlank()) {
            return configured;
        }
        if (creatorId != null && !"test_teacher_001".equals(creatorId)) {
            return creatorId;
        }
        return creatorId != null ? creatorId : "default";
    }
}
