package com.xxx.campus.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** 活动审批轨迹。每次提交、通过或驳回都会留下一条不可变记录。 */
@Entity
@Table(name = "activity_approval_record", indexes = {
        @Index(name = "idx_approval_activity", columnList = "activity_id"),
        @Index(name = "idx_approval_operator", columnList = "operator_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "activity_id", nullable = false)
    private Long activityId;

    @Column(name = "approval_round", nullable = false)
    private Integer approvalRound;

    @Column(nullable = false, length = 30)
    private String step;

    @Column(nullable = false, length = 20)
    private String action;

    @Column(name = "operator_id", nullable = false, length = 100)
    private String operatorId;

    @Column(name = "operator_role", nullable = false, length = 30)
    private String operatorRole;

    @Column(length = 500)
    private String comment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
