package com.xxx.campus.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** 学生报名记录，同一学生对同一活动只保留一条记录。 */
@Entity
@Table(name = "activity_registration",
        uniqueConstraints = @UniqueConstraint(name = "uk_registration_activity_student", columnNames = {"activity_id", "student_id"}),
        indexes = {
                @Index(name = "idx_registration_activity", columnList = "activity_id"),
                @Index(name = "idx_registration_student", columnList = "student_id"),
                @Index(name = "idx_registration_status", columnList = "status")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(name = "student_id", nullable = false, length = 100)
    private String studentId;

    /** PENDING：待审核，APPROVED：报名成功，CANCELLED：已取消。 */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
