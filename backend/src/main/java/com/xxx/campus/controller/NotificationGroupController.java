package com.xxx.campus.controller;

import com.xxx.campus.model.NotificationGroupRequest;
import com.xxx.campus.model.NotificationGroupView;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.NotificationGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notification-groups")
@RequiredArgsConstructor
public class NotificationGroupController {

    private final NotificationGroupService service;

    @GetMapping
    public ResponseEntity<List<NotificationGroupView>> list() {
        return ResponseEntity.ok(service.list());
    }

    @PostMapping
    public ResponseEntity<NotificationGroupView> create(
            @Valid @RequestBody NotificationGroupRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request, user.userId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationGroupView> update(
            @PathVariable Long id,
            @Valid @RequestBody NotificationGroupRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> disable(@PathVariable Long id) {
        service.disable(id);
        return ResponseEntity.noContent().build();
    }
}
