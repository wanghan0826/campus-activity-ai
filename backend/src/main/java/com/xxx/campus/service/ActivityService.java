package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityParsedResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 活动业务逻辑服务
 */
@Service
@RequiredArgsConstructor
public class ActivityService {

    private final AiService aiService;
    private final ActivityRepository activityRepository;

    /**
     * 解析教师文档，返回校验结果
     * @param document 教师粘贴的活动大纲/文档
     * @param creatorId 创建者ID
     * @return 包含 passed（是否通过）、result（AI解析结果）、missingFields（缺失字段）的 Map
     */
    public Map<String, Object> parseDocument(String document, String creatorId) {
        // 调用 AI 服务解析文档
        ActivityParsedResult result = aiService.parseActivity(document);

        // 检查必填字段
        List<String> missingFields = new ArrayList<>();
        if (result.getTitle() == null || result.getTitle().isBlank()) {
            missingFields.add("title");
        }
        if (result.getLocation() == null || result.getLocation().isBlank()) {
            missingFields.add("location");
        }
        if (result.getStartTime() == null || result.getStartTime().isBlank()) {
            missingFields.add("startTime");
        }
        if (result.getEndTime() == null || result.getEndTime().isBlank()) {
            missingFields.add("endTime");
        }

        // 构建返回结果
        Map<String, Object> response = new HashMap<>();
        response.put("passed", missingFields.isEmpty());
        response.put("result", result);
        response.put("missingFields", missingFields);

        return response;
    }

    /**
     * 创建活动（将 AI 解析结果保存到数据库）
     * @param result AI 解析结果（可能经过教师修改）
     * @param creatorId 创建者ID
     * @return 保存后的 Activity 实体
     */
    public Activity createActivity(ActivityParsedResult result, String creatorId) {
        // 将 ActivityParsedResult 转换为 Activity 实体
        Activity activity = Activity.builder()
                .title(result.getTitle())
                .category(result.getCategory())
                .campus(result.getCampus())
                .location(result.getLocation())
                .organizer(result.getOrganizer() != null ? result.getOrganizer() : "待定")
                .coverImage(result.getCoverImagePrompt())
                .content(result.getContent())
                .startTime(parseTime(result.getStartTime()))
                .endTime(parseTime(result.getEndTime()))
                .regStartTime(parseTime(result.getRegStartTime()))
                .regEndTime(parseTime(result.getRegEndTime()))
                .publishTime(parseTime(result.getPublishTime()))
                .offlineTime(parseTime(result.getOfflineTime()))
                .maxParticipants(result.getMaxParticipants())
                .promoApproved(result.getPromoApproved())
                .reviewDept("待审批")
                .reviewTeacher("待审批")
                .reviewLeader("待审批")
                .status("DRAFT")
                .creatorId(creatorId)
                .build();

        // 保存到数据库
        return activityRepository.save(activity);
    }

    /**
     * 解析 ISO 8601 时间字符串为 LocalDateTime
     */
    private LocalDateTime parseTime(String timeString) {
        if (timeString == null || timeString.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(timeString, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            return null;
        }
    }
}
