package com.xxx.campus.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "operation_audit_log", indexes = {
        @Index(name = "idx_audit_college_created", columnList = "college_code,created_at"),
        @Index(name = "idx_audit_operator", columnList = "operator_id")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operator_id", nullable = false, length = 100)
    private String operatorId;

    @Column(name = "operator_name", nullable = false, length = 100)
    private String operatorName;

    @Column(nullable = false, length = 30)
    private String role;

    @Column(name = "college_code", nullable = false, length = 100)
    private String collegeCode;

    @Column(name = "request_method", nullable = false, length = 10)
    private String requestMethod;

    @Column(name = "request_path", nullable = false, length = 500)
    private String requestPath;

    @Column(name = "response_status", nullable = false)
    private int responseStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
