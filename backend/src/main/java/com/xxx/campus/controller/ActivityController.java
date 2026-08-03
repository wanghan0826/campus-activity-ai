package com.xxx.campus.controller;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityParsedResult;
import com.xxx.campus.model.ActivityRequest;
import com.xxx.campus.model.SubmitApprovalRequest;
import com.xxx.campus.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 活动创建与管理接口。
 * X-User-Id 是企业微信身份接入前的本地占位，正式环境由登录网关写入。
 */
@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @PostMapping("/parse")
    public ResponseEntity<Map<String, Object>> parseActivity(
            @Valid @RequestBody ActivityRequest request,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        return ResponseEntity.ok(activityService.parseDocument(request.getDocument(), creatorId));
    }

    @PostMapping
    public ResponseEntity<Activity> createActivity(
            @RequestBody ActivityParsedResult result,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(activityService.createActivity(result, creatorId));
    }

    @GetMapping
    public ResponseEntity<Page<Activity>> listActivities(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        return ResponseEntity.ok(activityService.listActivities(creatorId, status, keyword, page, size));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats(
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        return ResponseEntity.ok(activityService.getStatusStats(creatorId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Activity> getActivity(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        return ResponseEntity.ok(activityService.getActivity(id, creatorId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Activity> updateActivity(
            @PathVariable Long id,
            @RequestBody ActivityParsedResult result,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        return ResponseEntity.ok(activityService.updateActivity(id, result, creatorId));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Activity> submitForApproval(
            @PathVariable Long id,
            @RequestBody(required = false) SubmitApprovalRequest request,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId,
            @RequestHeader(value = "X-User-College", defaultValue = "INFORMATION_ENGINEERING") String college) {
        String message = request == null ? null : request.getMessage();
        return ResponseEntity.ok(activityService.submitForApproval(id, message, creatorId, college));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<Activity> publishActivity(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        return ResponseEntity.ok(activityService.publishActivity(id, creatorId));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<Activity> duplicateActivity(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(activityService.duplicateActivity(id, creatorId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDraft(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String creatorId) {
        activityService.deleteDraft(id, creatorId);
        return ResponseEntity.noContent().build();
    }
}
