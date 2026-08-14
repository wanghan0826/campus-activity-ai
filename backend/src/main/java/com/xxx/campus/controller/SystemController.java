package com.xxx.campus.controller;

import com.xxx.campus.model.OperationAuditLog;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.OperationAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SystemController {

    private final DataSource dataSource;
    private final OperationAuditService operationAuditService;

    @Value("${spring.application.name:campus-activity}")
    private String applicationName;

    @GetMapping("/api/system/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean databaseUp = false;
        try (Connection connection = dataSource.getConnection()) {
            databaseUp = connection.isValid(2);
        } catch (Exception ignored) {
            // Health response below reports the database as down.
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", databaseUp ? "UP" : "DOWN");
        result.put("application", applicationName);
        result.put("database", databaseUp ? "UP" : "DOWN");
        result.put("checkedAt", OffsetDateTime.now());
        return ResponseEntity.status(databaseUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(result);
    }

    @GetMapping("/api/audit-logs")
    public ResponseEntity<Page<OperationAuditLog>> auditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(operationAuditService.list(user.collegeCode(), page, size));
    }
}
