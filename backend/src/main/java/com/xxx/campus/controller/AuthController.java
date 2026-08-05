package com.xxx.campus.controller;

import com.xxx.campus.model.AuthUserView;
import com.xxx.campus.model.LoginRequest;
import com.xxx.campus.model.LoginResponse;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.AuthService;
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

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
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
