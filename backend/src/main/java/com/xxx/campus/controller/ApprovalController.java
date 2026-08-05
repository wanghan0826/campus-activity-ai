package com.xxx.campus.controller;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ApprovalActionRequest;
import com.xxx.campus.model.ApprovalRecord;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.ApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(approvalService.listPendingTasks(user.role(), user.collegeCode(), keyword, page, size));
    }

    @GetMapping("/{activityId}/history")
    public ResponseEntity<List<ApprovalRecord>> getHistory(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(approvalService.getHistory(
                activityId, user.userId(), user.role(), user.collegeCode()));
    }

    @PostMapping("/{activityId}/approve")
    public ResponseEntity<Activity> approve(
            @PathVariable Long activityId,
            @Valid @RequestBody(required = false) ApprovalActionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(approvalService.approve(
                activityId,
                request == null ? null : request.getComment(),
                user.userId(),
                user.role(),
                user.collegeCode()));
    }

    @PostMapping("/{activityId}/reject")
    public ResponseEntity<Activity> reject(
            @PathVariable Long activityId,
            @Valid @RequestBody ApprovalActionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(approvalService.reject(
                activityId,
                request.getComment(),
                user.userId(),
                user.role(),
                user.collegeCode()));
    }
}
