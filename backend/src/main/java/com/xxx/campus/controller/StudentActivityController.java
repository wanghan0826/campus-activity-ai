package com.xxx.campus.controller;

import com.xxx.campus.model.CheckInRequest;
import com.xxx.campus.model.StudentActivityView;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.StudentActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentActivityController {

    private final StudentActivityService studentActivityService;

    @GetMapping("/activities")
    public ResponseEntity<Page<StudentActivityView>> listActivities(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(studentActivityService.listPublishedActivities(
                user.userId(), category, keyword, page, size));
    }

    @GetMapping("/activities/{activityId}")
    public ResponseEntity<StudentActivityView> getActivity(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(studentActivityService.getPublishedActivity(activityId, user.userId()));
    }

    @GetMapping("/registrations")
    public ResponseEntity<List<StudentActivityView>> listMyRegistrations(
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(studentActivityService.listMyRegistrations(user.userId()));
    }

    @PostMapping("/activities/{activityId}/registrations")
    public ResponseEntity<StudentActivityView> register(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(studentActivityService.register(activityId, user.userId()));
    }

    @DeleteMapping("/activities/{activityId}/registrations")
    public ResponseEntity<StudentActivityView> cancel(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(studentActivityService.cancel(activityId, user.userId()));
    }

    @PostMapping("/activities/{activityId}/check-in")
    public ResponseEntity<StudentActivityView> checkIn(
            @PathVariable Long activityId,
            @Valid @RequestBody CheckInRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(studentActivityService.checkIn(activityId, user.userId(), request.getCode()));
    }
}
