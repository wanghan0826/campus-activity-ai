package com.xxx.campus.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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

    @Column(nullable = false, length = 200)
    private String title;

    /**
     * 活动分类：ART(艺术类) / SPORTS(艺体类) / PRACTICE(实践类) / LIFE(生活类) / FEATURE(特色类)
     */
    @Column(nullable = false, length = 20)
    private String category;

    @Column(length = 100)
    private String campus;

    @Column(nullable = false, length = 200)
    private String location;

    @Column(length = 100)
    private String organizer;

    @Column(length = 500)
    private String coverImage;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String rawDocument;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    private LocalDateTime regStartTime;
    private LocalDateTime regEndTime;
    private LocalDateTime publishTime;
    private LocalDateTime offlineTime;

    private Integer maxParticipants;

    // ── 审批相关（系统匹配）──
    @Column(length = 100)
    private String reviewDept;

    @Column(length = 100)
    private String reviewTeacher;

    @Column(length = 100)
    private String reviewLeader;

    // ── 宣传品 ──
    private Boolean promoApproved;

    // ── 状态 ──
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";
    // DRAFT → PENDING_APPROVAL → APPROVED → PUBLISHED → OFFLINE
    //                              ↘ REJECTED → DRAFT

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
