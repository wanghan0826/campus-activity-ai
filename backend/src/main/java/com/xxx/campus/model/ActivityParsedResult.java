package com.xxx.campus.model;

import lombok.Data;
import java.util.List;

/**
 * AI 解析文档后返回的结构化数据
 */
@Data
public class ActivityParsedResult {

    private String title;
    private String category;          // ART / SPORTS / PRACTICE / LIFE / FEATURE
    private String campus;
    private String location;
    private String organizer;
    private String coverImagePrompt;  // 封面图生成提示词
    private String content;           // AI 展开的活动描述

    // ── 时间 ──
    private String startTime;         // ISO 格式: 2026-07-25T14:00:00
    private String endTime;
    private String regStartTime;
    private String regEndTime;
    private String publishTime;
    private String offlineTime;

    // ── 其他 ──
    private Integer maxParticipants;
    private Boolean hasPromoMaterial; // 是否有宣传品
    private Boolean promoApproved;

    // ── AI 建议（非必填，给教师参考）──
    private List<ScheduleItem> schedule;    // 活动流程建议
    private List<String> materials;         // 物料清单建议

    @Data
    public static class ScheduleItem {
        private String time;
        private String content;
    }
}
