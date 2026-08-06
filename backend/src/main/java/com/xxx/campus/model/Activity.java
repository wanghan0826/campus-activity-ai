package com.xxx.campus.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "activity")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String title;

    /**
     * 活动分类：ART(艺术类) / SPORTS(艺体类) / PRACTICE(实践类) / LIFE(生活类) / FEATURE(特色类)
     */
    @Column(length = 20)
    private String category;

    @Column(length = 100)
    private String campus;

    @Column(length = 200)
    private String location;

    @Column(length = 100)
    private String organizer;

    @Column(length = 500)
    private String coverImage;

    @Column(length = 500)
    private String coverImagePrompt;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String rawDocument;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private LocalDateTime regStartTime;
    private LocalDateTime regEndTime;
    private LocalDateTime publishTime;
    private LocalDateTime offlineTime;

    private Integer maxParticipants;

    @Column(precision = 12, scale = 2)
    private BigDecimal budget;

    @Builder.Default
    private Boolean registrationRequired = true;

    @Builder.Default
    private Boolean registrationApprovalRequired = false;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String recognitionType = "NONE";

    @Column(precision = 6, scale = 2)
    private BigDecimal secondClassCredits;

    @Column(precision = 6, scale = 2)
    private BigDecimal volunteerHours;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String checkInMode = "QR";

    @Column(nullable = false)
    @Builder.Default
    private Boolean checkInOpen = false;

    @Column(length = 10)
    private String checkInCode;

    private LocalDateTime checkInOpenedAt;

    @Column(length = 500)
    private String participationRequirements;

    @Column(length = 300)
    private String targetAudience;

    @Column(length = 200)
    private String contactInfo;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String creationMode = "AI";

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "activity_schedule", joinColumns = @JoinColumn(name = "activity_id"))
    @OrderColumn(name = "sort_order")
    @Builder.Default
    private List<ActivityScheduleItem> schedule = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "activity_material", joinColumns = @JoinColumn(name = "activity_id"))
    @Column(name = "material", length = 200)
    @OrderColumn(name = "sort_order")
    @Builder.Default
    private List<String> materials = new ArrayList<>();

    // ── 审批相关（系统匹配）──
    @Column(length = 100)
    private String reviewDept;

    @Column(length = 100)
    private String reviewTeacher;

    @Column(length = 100)
    private String reviewLeader;

    // ── 宣传品 ──
    private Boolean promoApproved;

    @Column(length = 500)
    private String approvalMessage;

    private LocalDateTime submittedAt;

    /** 当前审批节点：COLLEGE_REVIEWER / COLLEGE_LEADER / COMPLETED / REJECTED。 */
    @Column(length = 30)
    private String approvalStage;

    /** 每次驳回后重新提交都会进入新的审批轮次。 */
    @Builder.Default
    private Integer approvalRound = 0;

    private LocalDateTime teacherReviewedAt;

    private LocalDateTime leaderReviewedAt;

    private LocalDateTime approvedAt;

    /** 企业微信日程 ID，用于更新/删除已创建的日程 */
    @Column(length = 100)
    private String calendarEventId;

    // ── 状态 ──
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";
    // DRAFT → PENDING_APPROVAL → APPROVED → PUBLISHED → OFFLINE
    //                 ↘ REJECTED → PENDING_APPROVAL（重新提交）

    @Column(nullable = false, length = 100)
    private String creatorId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
