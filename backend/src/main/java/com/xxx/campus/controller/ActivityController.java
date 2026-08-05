package com.xxx.campus.controller;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityParsedResult;
import com.xxx.campus.model.ActivityRequest;
import com.xxx.campus.model.SubmitApprovalRequest;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 活动发布人的创建与管理接口。 */
@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @PostMapping("/parse")
    public ResponseEntity<Map<String, Object>> parseActivity(
            @Valid @RequestBody ActivityRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(activityService.parseDocument(request.getDocument(), user.userId()));
    }

    @PostMapping
    public ResponseEntity<Activity> createActivity(
            @RequestBody ActivityParsedResult result,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(activityService.createActivity(result, user.userId()));
    }

    @GetMapping
    public ResponseEntity<Page<Activity>> listActivities(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(activityService.listActivities(user.userId(), status, keyword, page, size));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats(
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(activityService.getStatusStats(user.userId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Activity> getActivity(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(activityService.getActivity(id, user.userId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Activity> updateActivity(
            @PathVariable Long id,
            @RequestBody ActivityParsedResult result,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(activityService.updateActivity(id, result, user.userId()));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Activity> submitForApproval(
            @PathVariable Long id,
            @RequestBody(required = false) SubmitApprovalRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        String message = request == null ? null : request.getMessage();
        return ResponseEntity.ok(activityService.submitForApproval(id, message, user.userId(), user.collegeCode()));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<Activity> publishActivity(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(activityService.publishActivity(id, user.userId()));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<Activity> duplicateActivity(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(activityService.duplicateActivity(id, user.userId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDraft(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser user) {
        activityService.deleteDraft(id, user.userId());
        return ResponseEntity.noContent().build();
    }
}
