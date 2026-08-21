package com.xxx.campus.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** 系统用户。authSource/externalSubject 为后续学校统一身份认证预留。 */
@Entity
@Table(name = "app_user",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_user_id", columnNames = "user_id"),
                @UniqueConstraint(name = "uk_user_username", columnNames = "username"),
                @UniqueConstraint(name = "uk_user_external_identity", columnNames = {"auth_source", "external_subject"})
        },
        indexes = {
                @Index(name = "idx_user_role", columnList = "role"),
                @Index(name = "idx_user_college", columnList = "college_code")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 校内唯一身份编号，后续可直接映射学校认证返回的工号或学号。 */
    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    /** PUBLISHER / COLLEGE_REVIEWER / COLLEGE_LEADER / STUDENT。 */
    @Column(nullable = false, length = 30)
    private String role;

    @Column(name = "college_code", nullable = false, length = 100)
    private String collegeCode;

    @Column(name = "college_name", nullable = false, length = 100)
    private String collegeName;

    /** LOCAL 或 SCHOOL_SSO。 */
    @Column(name = "auth_source", nullable = false, length = 30)
    private String authSource;

    @Column(name = "external_subject", length = 200)
    private String externalSubject;

    /** 企业微信成员 UserId；与登录来源解耦，保留本地测试账号登录能力。 */
    @Column(name = "wecom_user_id", length = 200)
    private String wecomUserId;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

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
