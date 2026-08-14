package com.xxx.campus.controller;

import com.xxx.campus.model.AuthUserView;
import com.xxx.campus.model.LoginRequest;
import com.xxx.campus.model.LoginResponse;
import com.xxx.campus.model.WeComOAuthCallbackRequest;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.AuthService;
import com.xxx.campus.service.WeComOAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final WeComOAuthService weComOAuthService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/wecom/config")
    public ResponseEntity<?> weComConfig() {
        return ResponseEntity.ok(weComOAuthService.configView());
    }

    @PostMapping("/wecom/authorize")
    public ResponseEntity<?> authorizeWeCom() {
        return ResponseEntity.ok(weComOAuthService.createAuthorization());
    }

    @PostMapping("/wecom/callback")
    public ResponseEntity<LoginResponse> weComCallback(
            @Valid @RequestBody WeComOAuthCallbackRequest request) {
        return ResponseEntity.ok(weComOAuthService.exchange(request.getCode(), request.getState()));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthUserView> me(@AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(user.toView());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal AuthenticatedUser user) {
        authService.logout(user.sessionId());
        return ResponseEntity.noContent().build();
    }
}
