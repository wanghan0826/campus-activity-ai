package com.xxx.campus.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** 登录会话。数据库只保存令牌摘要，原始令牌仅返回给客户端一次。 */
@Entity
@Table(name = "user_session",
        uniqueConstraints = @UniqueConstraint(name = "uk_session_token_hash", columnNames = "token_hash"),
        indexes = {
                @Index(name = "idx_session_user", columnList = "user_account_id"),
                @Index(name = "idx_session_expires", columnList = "expires_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_account_id", nullable = false)
    private UserAccount user;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean revoked;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
