package com.xxx.campus.service;

import com.xxx.campus.model.OperationAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperationAuditLogRepository extends JpaRepository<OperationAuditLog, Long> {
    Page<OperationAuditLog> findByCollegeCodeOrderByCreatedAtDesc(String collegeCode, Pageable pageable);
}
