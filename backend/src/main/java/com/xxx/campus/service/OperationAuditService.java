package com.xxx.campus.service;

import com.xxx.campus.model.OperationAuditLog;
import com.xxx.campus.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OperationAuditService {

    private final OperationAuditLogRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuthenticatedUser user, String method, String path, int status) {
        repository.save(OperationAuditLog.builder()
                .operatorId(user.userId())
                .operatorName(user.displayName())
                .role(user.role())
                .collegeCode(user.collegeCode())
                .requestMethod(limit(method, 10))
                .requestPath(limit(path, 500))
                .responseStatus(status)
                .build());
    }

    @Transactional(readOnly = true)
    public Page<OperationAuditLog> list(String collegeCode, int page, int size) {
        return repository.findByCollegeCodeOrderByCreatedAtDesc(
                collegeCode, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
    }

    private String limit(String value, int length) {
        if (value == null) return "";
        return value.length() <= length ? value : value.substring(0, length);
    }
}
