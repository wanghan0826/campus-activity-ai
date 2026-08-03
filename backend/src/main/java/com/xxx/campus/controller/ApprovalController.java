package com.xxx.campus.controller;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ApprovalActionRequest;
import com.xxx.campus.model.ApprovalRecord;
import com.xxx.campus.service.ApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 学院审核老师和学院领导的待办、通过、驳回与审批轨迹接口。 */
@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalService approvalService;

    @GetMapping("/tasks")
    public ResponseEntity<Page<Activity>> listTasks(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-User-College") String college) {
        return ResponseEntity.ok(approvalService.listPendingTasks(role, college, keyword, page, size));
    }

    @GetMapping("/{activityId}/history")
    public ResponseEntity<List<ApprovalRecord>> getHistory(
            @PathVariable Long activityId,
            @RequestHeader(value = "X-User-Id", defaultValue = "test_teacher_001") String userId,
            @RequestHeader(value = "X-User-Role", defaultValue = "PUBLISHER") String role,
            @RequestHeader(value = "X-User-College", defaultValue = "INFORMATION_ENGINEERING") String college) {
        return ResponseEntity.ok(approvalService.getHistory(activityId, userId, role, college));
    }

    @PostMapping("/{activityId}/approve")
    public ResponseEntity<Activity> approve(
            @PathVariable Long activityId,
            @Valid @RequestBody(required = false) ApprovalActionRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-User-College") String college) {
        return ResponseEntity.ok(approvalService.approve(
                activityId, request == null ? null : request.getComment(), userId, role, college));
    }

    @PostMapping("/{activityId}/reject")
    public ResponseEntity<Activity> reject(
            @PathVariable Long activityId,
            @Valid @RequestBody ApprovalActionRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-User-College") String college) {
        return ResponseEntity.ok(approvalService.reject(
                activityId, request.getComment(), userId, role, college));
    }
}
