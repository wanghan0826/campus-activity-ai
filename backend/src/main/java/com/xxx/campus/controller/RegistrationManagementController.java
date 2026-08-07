package com.xxx.campus.controller;

import com.xxx.campus.model.RegistrationManagementView;
import com.xxx.campus.model.RegistrationReviewRequest;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.RegistrationManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/activities/{activityId}/registrations")
@RequiredArgsConstructor
public class RegistrationManagementController {

    private final RegistrationManagementService registrationManagementService;

    @GetMapping
    public ResponseEntity<RegistrationManagementView> list(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(registrationManagementService.getRegistrations(activityId, user.userId()));
    }

    @PostMapping("/{registrationId}/approve")
    public ResponseEntity<RegistrationManagementView> approve(
            @PathVariable Long activityId,
            @PathVariable Long registrationId,
            @Valid @RequestBody(required = false) RegistrationReviewRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(registrationManagementService.approve(
                activityId, registrationId, user.userId(), request == null ? null : request.getComment()));
    }

    @PostMapping("/{registrationId}/reject")
    public ResponseEntity<RegistrationManagementView> reject(
            @PathVariable Long activityId,
            @PathVariable Long registrationId,
            @Valid @RequestBody(required = false) RegistrationReviewRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(registrationManagementService.reject(
                activityId, registrationId, user.userId(), request == null ? null : request.getComment()));
    }
}
