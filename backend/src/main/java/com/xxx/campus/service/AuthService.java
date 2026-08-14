package com.xxx.campus.service;

import com.xxx.campus.model.LoginRequest;
import com.xxx.campus.model.LoginResponse;
import com.xxx.campus.model.UserAccount;
import com.xxx.campus.model.UserSession;
import com.xxx.campus.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserAccountRepository userAccountRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${auth.session-hours:12}")
    private long sessionHours;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String username = request.getUsername().trim();
        UserAccount user = userAccountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(this::badCredentials);

        if (!user.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "账号已停用，请联系管理员");
        }
        if (!"LOCAL".equals(user.getAuthSource()) || user.getPasswordHash() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "该账号需要使用学校统一身份认证登录");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw badCredentials();
        }

        return createSession(user);
    }

    @Transactional
    public LoginResponse loginExternal(String authSource, String externalSubject) {
        UserAccount user = userAccountRepository.findByAuthSourceAndExternalSubject(authSource, externalSubject)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "该企业微信账号尚未关联校内用户，请联系管理员"));
        if (!user.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "账号已停用，请联系管理员");
        }
        return createSession(user);
    }

    private LoginResponse createSession(UserAccount user) {
        userSessionRepository.deleteByExpiresAtBefore(LocalDateTime.now());
        String token = generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(Math.max(sessionHours, 1));
        UserSession session = userSessionRepository.save(UserSession.builder()
                .user(user)
                .tokenHash(hashToken(token))
                .expiresAt(expiresAt)
                .revoked(false)
                .build());
        user.setLastLoginAt(LocalDateTime.now());
        userAccountRepository.save(user);

        return LoginResponse.builder()
                .token(token)
                .expiresAt(expiresAt)
                .user(AuthenticatedUser.from(user, session.getId()).toView())
                .build();
    }

    @Transactional(readOnly = true)
    public Optional<AuthenticatedUser> authenticateToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return Optional.empty();
        return userSessionRepository.findByTokenHashAndRevokedFalse(hashToken(rawToken))
                .filter(session -> session.getExpiresAt().isAfter(LocalDateTime.now()))
                .filter(session -> session.getUser().isEnabled())
                .map(session -> AuthenticatedUser.from(session.getUser(), session.getId()));
    }

    @Transactional
    public void logout(Long sessionId) {
        userSessionRepository.findById(sessionId).ifPresent(session -> {
            session.setRevoked(true);
            userSessionRepository.save(session);
        });
    }

    public static String hashToken(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private ResponseStatusException badCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
    }
}
