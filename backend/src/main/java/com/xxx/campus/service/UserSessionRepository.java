package com.xxx.campus.service;

import com.xxx.campus.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    Optional<UserSession> findByTokenHashAndRevokedFalse(String tokenHash);

    long deleteByExpiresAtBefore(LocalDateTime expiresAt);
}
