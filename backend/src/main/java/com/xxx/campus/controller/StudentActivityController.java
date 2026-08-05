package com.xxx.campus.controller;

import com.xxx.campus.model.StudentActivityView;
import com.xxx.campus.service.StudentActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
            @RequestHeader(value = "X-User-Id", defaultValue = "student_001") String studentId,
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireStudent(role);
        return ResponseEntity.ok(studentActivityService.listPublishedActivities(studentId, category, keyword, page, size));
    }

    @GetMapping("/activities/{activityId}")
    public ResponseEntity<StudentActivityView> getActivity(
            @PathVariable Long activityId,
            @RequestHeader(value = "X-User-Id", defaultValue = "student_001") String studentId,
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireStudent(role);
        return ResponseEntity.ok(studentActivityService.getPublishedActivity(activityId, studentId));
    }

    @GetMapping("/registrations")
    public ResponseEntity<List<StudentActivityView>> listMyRegistrations(
            @RequestHeader(value = "X-User-Id", defaultValue = "student_001") String studentId,
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireStudent(role);
        return ResponseEntity.ok(studentActivityService.listMyRegistrations(studentId));
    }

    @PostMapping("/activities/{activityId}/registrations")
    public ResponseEntity<StudentActivityView> register(
            @PathVariable Long activityId,
            @RequestHeader(value = "X-User-Id", defaultValue = "student_001") String studentId,
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireStudent(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(studentActivityService.register(activityId, studentId));
    }

    @DeleteMapping("/activities/{activityId}/registrations")
    public ResponseEntity<StudentActivityView> cancel(
            @PathVariable Long activityId,
            @RequestHeader(value = "X-User-Id", defaultValue = "student_001") String studentId,
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireStudent(role);
        return ResponseEntity.ok(studentActivityService.cancel(activityId, studentId));
    }

    private void requireStudent(String role) {
        if (!"STUDENT".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "请切换为学生身份后操作");
        }
    }
}
