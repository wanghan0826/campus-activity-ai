package com.xxx.campus.model;

import lombok.Data;
import java.math.BigDecimal;
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
    private String coverImage;        // 已生成或手动上传的封面图 URL
    private String coverImagePrompt;  // 封面图生成提示词
    private String content;           // AI 展开的活动描述
    private String rawDocument;       // 教师提交的原始活动文档
    private String creationMode;      // AI / MANUAL
    private String targetAudience;    // 面向对象
    private String contactInfo;       // 联系人及联系方式

    // ── 时间 ──
    private String startTime;         // ISO 格式: 2026-07-25T14:00:00
    private String endTime;
    private String regStartTime;
    private String regEndTime;
    private String publishTime;
    private String offlineTime;

    // ── 其他 ──
    private Integer maxParticipants;
    private BigDecimal budget;        // 预估预算
    private Boolean registrationRequired;         // 是否需要报名
    private Boolean registrationApprovalRequired; // 报名是否需要审核
    private String recognitionType;               // NONE / CREDIT / VOLUNTEER / BOTH
    private BigDecimal secondClassCredits;         // 第二课堂学分
    private BigDecimal volunteerHours;             // 志愿服务时长
    private String checkInMode;                    // QR / LOCATION / MANUAL / NONE
    private String participationRequirements;      // 参与及认定要求
    private Boolean hasPromoMaterial; // 是否有宣传品
    private Boolean promoApproved;

    // ── AI 建议（非必填，给教师参考）──
    private List<ScheduleItem> schedule;    // 活动流程建议
    private List<String> materials;         // 物料清单建议
    private List<Long> notificationGroupIds; // 发布后需要通知的企微群

    @Data
    public static class ScheduleItem {
        private String time;
        private String content;
    }
}
